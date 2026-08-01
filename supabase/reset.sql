-- =============================================================
-- Полная очистка схемы. Выполнять в SQL Editor ПЕРЕД повторным
-- применением 0001_init.sql, если та упала на полпути и оставила
-- часть объектов ("type place_status already exists" и подобное).
--
-- ⚠️ Удаляет все данные: места, отзывы, фото, планы, голоса.
--    Аккаунты в Authentication не трогает — они живут в схеме auth.
--    После очистки профили заведённых пользователей исчезнут; чтобы
--    триггер создал их заново, пользователей нужно пересоздать.
-- =============================================================

-- Триггер на auth.users — не в public, сам не удалится
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists handle_new_user();

drop view if exists matches;

drop table if exists place_votes cascade;
drop table if exists plans      cascade;
drop table if exists place_tags cascade;
drop table if exists tags       cascade;
drop table if exists photos     cascade;
drop table if exists reviews    cascade;
drop table if exists places     cascade;
drop table if exists categories cascade;
drop table if exists profiles   cascade;

-- Функцию удаляем до типа: в её сигнатуре стоит place_status
drop function if exists set_place_status(uuid, place_status);
drop function if exists touch_updated_at();

drop type if exists place_status;
drop type if exists price_level;
