-- Ф-9: порядок фотографий меняется перетаскиванием.
--
-- Первая по порядку становится обложкой места, поэтому это не украшение,
-- а способ выбрать главный снимок.
--
-- Почему функция, а не обычный update: политики на photos есть только на
-- insert и delete — «своё». Порядок же общий, как и статус места (М-5):
-- фотографии лежат у общего места, и переставлять их должны оба. Отдельная
-- функция с `security definer` разрешает ровно это и ничего больше —
-- переписать ссылку или автора снимка через неё нельзя.

create or replace function set_photo_order(p_ids uuid[])
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  -- Порядок задаётся положением в массиве: первый элемент — обложка.
  update photos p
  set sort_order = i.ord - 1
  from unnest(p_ids) with ordinality as i(id, ord)
  where p.id = i.id;
end;
$$;

revoke all on function set_photo_order(uuid[]) from public;
grant execute on function set_photo_order(uuid[]) to authenticated;
