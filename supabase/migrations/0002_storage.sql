-- =============================================================
-- Куда пойти — хранилище фотографий
--
-- Отступление от Р-3: по ТЗ фото должны лежать в Cloudflare R2, но R2
-- невозможно включить без платёжного метода. Кладём в Supabase Storage.
-- Схема таблицы `photos` не меняется: `r2_key` хранит путь в бакете,
-- `url` — публичную ссылку. Переезд на R2 потом = новый адаптер в src/api/.
--
-- Ограничения бесплатного тарифа: 1 ГБ хранилища, 5 ГБ исходящего в месяц.
-- При превышении Supabase отдаёт 402 и перестаёт отвечать целиком, включая
-- ленту и вход, — поэтому в настройках приложения есть счётчик занятого места.
-- =============================================================


-- ---------- 1. Бакет ----------
-- public = true: ссылка на фото работает без подписи, файлы кэшируются
-- браузером и CDN. Ссылки содержат случайный UUID и нигде не публикуются,
-- но угадать их нельзя, а перебрать — тем более.
--
-- Б-5: только изображения, не больше 15 МБ до сжатия. Клиент ужимает файл
-- заранее (Ф-3), этот предел — предохранитель на случай обхода формы.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'photos',
  'photos',
  true,
  15728640,                                   -- 15 МБ
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
set public             = excluded.public,
    file_size_limit    = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;


-- ---------- 2. Права на объекты ----------
-- Файл лежит по пути <user_id>/<uuid>.webp. Первый сегмент пути и есть
-- владелец: колонка `owner` в разных версиях Supabase называется по-разному,
-- а путь стабилен.

drop policy if exists photos_read   on storage.objects;
drop policy if exists photos_insert on storage.objects;
drop policy if exists photos_delete on storage.objects;

create policy photos_read on storage.objects
  for select to authenticated
  using (bucket_id = 'photos');

create policy photos_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Ф-5: удаляет тот, кто загрузил.
create policy photos_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ---------- 3. Размер файла ----------
-- Для счётчика занятого места в настройках. Держим в таблице, а не считаем
-- по storage.objects: та требует прав, которых у обычного пользователя нет,
-- а обходить это функцией с security definer ради счётчика — лишнее.

alter table photos add column if not exists bytes int;

comment on column photos.bytes is 'Размер сжатого файла в байтах. Заполняется при загрузке.';
