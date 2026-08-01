# Подключение Supabase — по шагам

Три разных места, куда вводятся команды. Их легко перепутать, поэтому каждый
шаг подписан.

| Обозначение | Куда вводить |
|---|---|
| 🖥 **Терминал** | приложение «Терминал» на маке, в папке проекта |
| 🗄 **SQL Editor** | дашборд Supabase → SQL Editor → New query → вставить → Run |
| 🖱 **Дашборд** | мышкой в интерфейсе Supabase, ничего не печатать |

> [!warning] Частая ошибка
> Команды с 🖥 в SQL Editor не работают — он понимает только SQL.
> `pbcopy`, `pnpm`, `cd` — это терминал.

---

## Шаг 0 · Проверить окружение

🖥 **Терминал**

```bash
cd /Users/ly/Desktop/WhereGO && node -v && pnpm -v
```

Ожидается Node `v20.19+` (или `v22.12+`) и pnpm `10.x`.
Если pnpm ругается на версию Node:

```bash
corepack prepare pnpm@10.18.0 --activate
```

---

## Шаг 1 · Создать проект

🖱 **Дашборд** — [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**

- **Region**: `Central EU (Frankfurt)` — ближайший к Петербургу
- **Database password**: сгенерировать и сохранить в менеджер паролей.
  Нужен только для прямого подключения к БД, приложению — нет.

Проект поднимается 1–2 минуты.

---

## Шаг 2 · Применить миграцию

Делать **до** создания аккаунтов: миграция ставит триггер, который заводит
профиль при появлении пользователя. Аккаунты, созданные раньше, останутся без
профилей, и всё посыпется на внешних ключах.

🖥 **Терминал** — положить миграцию в буфер обмена:

```bash
pbcopy < /Users/ly/Desktop/WhereGO/supabase/migrations/0001_init.sql
```

🗄 **SQL Editor** — новый запрос, `Cmd+V`, **Run**.

Первая строка вставленного должна быть `-- ====...`, последняя —
`grant update on profiles to authenticated;`

Ожидаемый ответ: **Success. No rows returned.** Миграция ничего не выбирает,
только создаёт.

### Если упало с «already exists»

Значит, часть объектов осталась с прошлой попытки.

🖥 **Терминал**

```bash
pbcopy < /Users/ly/Desktop/WhereGO/supabase/reset.sql
```

🗄 **SQL Editor** — вставить, **Run**, затем повторить шаг 2 с начала.

### Проверка

🗄 **SQL Editor**

```sql
select table_name from information_schema.tables
where table_schema = 'public' order by table_name;
```

Девять таблиц: `categories`, `photos`, `place_tags`, `place_votes`, `places`,
`plans`, `profiles`, `reviews`, `tags`.

```sql
select emoji, name from categories order by sort_order;
```

Девять категорий, от «☕ Кафе» до «📍 Другое».

---

## Шаг 3 · Закрыть регистрацию

🖱 **Дашборд** — **Authentication → Sign In / Providers → Email**

**Allow new users to sign up** → **OFF** → Save.

Не формальность. Политики RLS написаны как «читает любой авторизованный» и не
различают своего и чужого. Пока регистрация открыта, любой человек
регистрируется, получает роль `authenticated` — и база честно отдаёт ему все
ваши места.

Проверять после каждого пересоздания проекта.

---

## Шаг 4 · Завести два аккаунта

🖱 **Дашборд** — **Authentication → Users → Add user → Create new user**

Для каждого из двоих:

1. Email и пароль (пароли вводите сами).
2. Галочка **Auto Confirm User** — иначе вход не пустит без подтверждения почты.
3. Раскрыть **User Metadata** и вписать:

```json
{ "display_name": "Ly" }
```

Без метаданных триггер возьмёт имя из адреса до собачки: получится `ly` вместо
`Ly`, и это имя полезет в интерфейс.

### Проверка

🗄 **SQL Editor**

```sql
select p.display_name, u.email, u.email_confirmed_at is not null as confirmed
from profiles p join auth.users u on u.id = p.id;
```

Две строки, нужные имена, `confirmed = true`.

Пусто или одна строка — аккаунты создавались до миграции. Удалить их в
**Authentication → Users** и завести заново.

---

## Шаг 5 · Ключи в проект

🖱 **Дашборд** — **Project Settings → API Keys**. Понадобятся **Project URL** и
ключ **anon / public**.

🖥 **Терминал**

```bash
cp /Users/ly/Desktop/WhereGO/.env.example /Users/ly/Desktop/WhereGO/.env.local && open -e /Users/ly/Desktop/WhereGO/.env.local
```

Откроется TextEdit. Вписать значения без кавычек и пробелов вокруг `=`:

```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

Сохранить (`Cmd+S`), закрыть.

> [!danger] Только anon
> Ключ `service_role` в этот файл не класть. Он обходит RLS целиком, а всё из
> `.env.local` попадает в бандл и читается любым посетителем сайта.

`.env.local` в `.gitignore` — в репозиторий не уедет.

---

## Шаг 6 · Запустить

🖥 **Терминал**

```bash
cd /Users/ly/Desktop/WhereGO && pnpm dev
```

Vite читает переменные окружения только при старте: если сервер уже был
запущен — остановить (`Ctrl+C`) и запустить заново.

Открыть [localhost:5173](http://localhost:5173). Признак успеха: на экране входа
**пропала** плашка «Supabase ещё не подключён — работают демо-данные».

Войти под аккаунтом из шага 4. Лента будет пустой — это правильно, мест ещё нет.
Добавить первое кнопкой «+».

### Если лента пустая, но место не сохраняется

🗄 **SQL Editor** — проверить, что гранты на месте:

```sql
select grantee, privilege_type, table_name
from information_schema.role_table_grants
where table_schema = 'public' and grantee = 'authenticated'
order by table_name, privilege_type;
```

Для `places` должны быть `SELECT`, `INSERT`, `UPDATE`, `DELETE`. Если пусто —
раздел 13 миграции не выполнился, применить его отдельно.

---

## Шаг 7 · Перегенерировать типы

`src/types/database.ts` написан вручную по миграции, чтобы проект собирался без
бэкенда. Теперь его нужно получить из реальной схемы — иначе расхождение вылезет
не на типах, а в рантайме.

🖥 **Терминал**

```bash
brew install supabase/tap/supabase
```

```bash
cd /Users/ly/Desktop/WhereGO && supabase login
```

Откроется браузер, подтвердить вход.

`ВАШ_REF` — часть адреса дашборда: `supabase.com/dashboard/project/<вот это>`

```bash
cd /Users/ly/Desktop/WhereGO && supabase link --project-ref ВАШ_REF && pnpm types:gen
```

Проверить, что проект собирается с новыми типами:

```bash
cd /Users/ly/Desktop/WhereGO && pnpm build
```

---

## Шаг 8 · UptimeRobot

Бесплатный проект Supabase засыпает через **7 дней** без запросов и поднимается
только руками из дашборда. Для приложения, куда заходят раз в две недели, это
смерть.

🖱 [uptimerobot.com](https://uptimerobot.com) → **Add New Monitor**

- Type: **HTTP(s)**
- URL: ваш Project URL из шага 5
- Interval: **5 минут**

GitHub Actions для пинга не годится: планировщик отключается после 60 дней без
коммитов, и пинг отвалится ровно тогда, когда проект перестанут дорабатывать.

---

## Шаг 9 · Зафиксировать

🖥 **Терминал**

```bash
cd /Users/ly/Desktop/WhereGO && git add -A && git commit -m "Типы из реальной схемы Supabase" && git push
```

`.env.local` не попадёт — он в `.gitignore`. Проверить перед пушем можно так:

```bash
cd /Users/ly/Desktop/WhereGO && git status --short
```

Строки `.env.local` в выводе быть не должно.

---

## Шпаргалка: что где

| Команда | Где |
|---|---|
| `pbcopy < …` | 🖥 терминал |
| `cp`, `cd`, `open -e` | 🖥 терминал |
| `pnpm dev`, `pnpm build`, `pnpm types:gen` | 🖥 терминал |
| `brew install`, `supabase login/link` | 🖥 терминал |
| `git add/commit/push` | 🖥 терминал |
| `select …`, `create …`, `drop …`, `grant …` | 🗄 SQL Editor |
| Тумблеры, кнопки, поля с ключами | 🖱 дашборд |
