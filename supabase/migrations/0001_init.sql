-- =============================================================
-- Куда пойти — начальная миграция
-- Учтены правки после разбора прототипа:
--   * категории вынесены в таблицу (редактируются пользователем)
--   * идея = место без адреса (флаг is_idea)
--   * у планов есть время
-- Вход: аккаунты создаются вручную в панели Supabase.
--       Публичная регистрация должна быть ОТКЛЮЧЕНА:
--       Authentication → Providers → Email → Allow new users to sign up = off
-- =============================================================

-- ---------- 1. Типы ----------

create type place_status as enum ('want', 'visited', 'rejected');
create type price_level  as enum ('free', 'low', 'medium', 'high');


-- ---------- 2. Профили ----------

create table profiles (
  id           uuid primary key references auth.users on delete cascade,
  display_name text not null,
  avatar_url   text,
  created_at   timestamptz not null default now()
);

-- Профиль создаётся автоматически при заведении пользователя в дашборде.
create function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();


-- ---------- 3. Категории ----------

create table categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique check (char_length(name) between 1 and 40),
  emoji      text,
  sort_order int not null default 0,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

insert into categories (name, emoji, sort_order) values
  ('Кафе',       '☕', 10),
  ('Ресторан',   '🍽', 20),
  ('Бар',        '🍸', 30),
  ('Парк',       '🌳', 40),
  ('Музей',      '🏛', 50),
  ('Активность', '🎯', 60),
  ('Природа',    '⛰', 70),
  ('Событие',    '🎪', 80),
  ('Другое',     '📍', 90);


-- ---------- 4. Места ----------

create table places (
  id            uuid primary key default gen_random_uuid(),
  title         text not null check (char_length(title) between 1 and 200),
  category_id   uuid references categories(id) on delete set null,
  status        place_status not null default 'want',
  is_idea       boolean not null default false,
  description   text,
  address       text,
  lat           double precision check (lat between -90 and 90),
  lng           double precision check (lng between -180 and 180),
  source_url    text,
  source_title  text,
  price         price_level,
  opening_hours jsonb,          -- {"mon": [["10:00","22:00"]], ...}
  author_id     uuid not null references profiles(id) on delete cascade,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- идея не может иметь координат; обычное место без координат допустимо
  constraint idea_has_no_coords check (not is_idea or (lat is null and lng is null))
);

create function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger places_touch
  before update on places
  for each row execute function touch_updated_at();


-- ---------- 5. Отзывы ----------
-- Объявляются ДО photos: photos на них ссылается.

create table reviews (
  id         uuid primary key default gen_random_uuid(),
  place_id   uuid not null references places(id)   on delete cascade,
  author_id  uuid not null references profiles(id) on delete cascade,
  rating     smallint not null check (rating between 1 and 5),
  text       text,
  visited_at date,
  created_at timestamptz not null default now(),
  unique (place_id, author_id)          -- один отзыв на место от пользователя
);


-- ---------- 6. Фотографии ----------
-- Файлы лежат в Cloudflare R2, здесь только ссылки.

create table photos (
  id          uuid primary key default gen_random_uuid(),
  place_id    uuid references places(id)  on delete cascade,
  review_id   uuid references reviews(id) on delete cascade,
  r2_key      text not null,
  url         text not null,
  width       int,
  height      int,
  sort_order  int not null default 0,
  uploaded_by uuid not null references profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  constraint photo_belongs_to_one check (num_nonnulls(place_id, review_id) = 1)
);


-- ---------- 7. Теги ----------

create table tags (
  id   uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 30)
);

create table place_tags (
  place_id uuid references places(id) on delete cascade,
  tag_id   uuid references tags(id)   on delete cascade,
  primary key (place_id, tag_id)
);


-- ---------- 8. Планы ----------

create table plans (
  id           uuid primary key default gen_random_uuid(),
  place_id     uuid not null references places(id) on delete cascade,
  planned_date date not null,
  planned_time time,
  note         text,
  created_by   uuid not null references profiles(id) on delete cascade,
  created_at   timestamptz not null default now()
);


-- ---------- 9. Голоса (свайпы) ----------

create table place_votes (
  place_id uuid references places(id)   on delete cascade,
  user_id  uuid references profiles(id) on delete cascade,
  wants    boolean not null,
  voted_at timestamptz not null default now(),
  primary key (place_id, user_id)
);

-- Мэтчи: места, которые все проголосовавшие отметили как желаемые
-- и по которым проголосовало больше одного человека.
create view matches as
select p.*
from places p
join place_votes v on v.place_id = p.id
group by p.id
having count(*) > 1 and bool_and(v.wants);


-- ---------- 10. Индексы ----------

create index idx_places_status   on places(status);
create index idx_places_category on places(category_id);
create index idx_places_author   on places(author_id);
create index idx_places_created  on places(created_at desc);
create index idx_places_idea     on places(is_idea);
create index idx_places_coords   on places(lat, lng) where lat is not null;
create index idx_reviews_place   on reviews(place_id);
create index idx_photos_place    on photos(place_id);
create index idx_photos_review   on photos(review_id);
create index idx_plans_date      on plans(planned_date);
create index idx_votes_user      on place_votes(user_id);


-- ---------- 11. RLS ----------
-- Модель: любой авторизованный читает всё, изменяет только своё.

alter table profiles    enable row level security;
alter table categories  enable row level security;
alter table places      enable row level security;
alter table reviews     enable row level security;
alter table photos      enable row level security;
alter table tags        enable row level security;
alter table place_tags  enable row level security;
alter table plans       enable row level security;
alter table place_votes enable row level security;

-- Чтение: всё, всем авторизованным
create policy read_all on profiles    for select to authenticated using (true);
create policy read_all on categories  for select to authenticated using (true);
create policy read_all on places      for select to authenticated using (true);
create policy read_all on reviews     for select to authenticated using (true);
create policy read_all on photos      for select to authenticated using (true);
create policy read_all on tags        for select to authenticated using (true);
create policy read_all on place_tags  for select to authenticated using (true);
create policy read_all on plans       for select to authenticated using (true);
create policy read_all on place_votes for select to authenticated using (true);

-- Профиль: только свой
create policy update_own on profiles
  for update to authenticated using (id = auth.uid());

-- Места
create policy insert_own on places
  for insert to authenticated with check (author_id = auth.uid());
create policy update_own on places
  for update to authenticated using (author_id = auth.uid());
create policy delete_own on places
  for delete to authenticated using (author_id = auth.uid());

-- Отзывы
create policy insert_own on reviews
  for insert to authenticated with check (author_id = auth.uid());
create policy update_own on reviews
  for update to authenticated using (author_id = auth.uid());
create policy delete_own on reviews
  for delete to authenticated using (author_id = auth.uid());

-- Фото
create policy insert_own on photos
  for insert to authenticated with check (uploaded_by = auth.uid());
create policy delete_own on photos
  for delete to authenticated using (uploaded_by = auth.uid());

-- Планы и голоса: общие, каждый управляет своими записями
create policy insert_own on plans
  for insert to authenticated with check (created_by = auth.uid());
create policy update_own on plans
  for update to authenticated using (created_by = auth.uid());
create policy delete_own on plans
  for delete to authenticated using (created_by = auth.uid());

create policy upsert_own on place_votes
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Категории и теги: общие справочники, создаёт и правит любой авторизованный
create policy write_all on categories for insert to authenticated with check (true);
create policy edit_all  on categories for update to authenticated using (true);
create policy drop_all  on categories for delete to authenticated using (true);
create policy write_all on tags       for insert to authenticated with check (true);
create policy write_all on place_tags for all    to authenticated using (true) with check (true);


-- ---------- 12. Смена статуса места ----------
-- ФТ-2.5: статус меняет любой пользователь, не только автор.
-- Общая политика update этого не позволяет, поэтому отдельная функция.

create function set_place_status(p_place_id uuid, p_status place_status)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  update places set status = p_status where id = p_place_id;
end;
$$;

revoke all on function set_place_status(uuid, place_status) from public;
grant execute on function set_place_status(uuid, place_status) to authenticated;


-- ---------- 13. Гранты для Data API ----------
-- Обязательно для проектов, созданных после 30 мая 2026:
-- без явных грантов PostgREST вернёт пустой результат.

grant usage on schema public to authenticated;

grant select                         on all tables in schema public to authenticated;
grant insert, update, delete         on places, reviews, photos, plans,
                                        place_votes, categories, tags, place_tags
                                     to authenticated;
grant update                         on profiles to authenticated;
