# Open Cloud

Personal cloud storage where **Telegram is the real file storage layer** and the application database is only the metadata index.

```
User upload → Open Cloud validates → streams to Telegram Bot API
→ receives message_id + file_id → stores metadata in DB → lists file
Download: DB lookup → getFile → stream from Telegram file server → user
```

No fake features: every number, progress bar, preview, and status shown in the UI comes from a working implementation. File contents are **never** stored in the app database or on the server disk (except transient streaming temp files, deleted immediately).

## Features (all working)

- **Telegram Login** (official Login Widget, HMAC-verified) — never asks for phone/password/OTP
- **Storage setup wizard**: create bot via @BotFather → paste token (validated with `getMe`, AES-256-GCM encrypted, never returned) → configure storage chat (auto-detect via `getUpdates` or manual ID) → real connection test (`getMe` + `getChat` + `sendChatAction`) → ready
- **Uploads**: drag & drop, file picker, folder upload (recreates subfolders), multiple files, **real per-file progress (XHR)**, retry, duplicate handling (Replace / Keep Both), SHA-256 integrity, no DB entry until Telegram confirms
- **File manager**: rename, move, favorites, create/rename/move/delete folders, breadcrumbs, search (name/extension/folder), sort (name/size/dates/type), grid/list (persisted), pagination, multi-select + bulk actions
- **Trash**: soft delete → restore / permanent delete (removes Telegram message + metadata) / empty trash; configurable “trash first vs permanent”
- **Previews**: images (zoom, next/prev), video (seek/volume/fullscreen, Range streaming), audio, PDF, text — streamed, not buffered; “preview unavailable” otherwise
- **Storage usage** computed from real rows; **orphan detection** (`Verify storage` marks `unavailable` instead of crashing)
- **i18n**: English + Arabic with proper RTL layout and Arabic font stack; **themes**: light/dark/system
- **Security**: sessions in httpOnly SameSite cookies, per-user authorization on every query, input validation, rate limiting, CSRF header check, encrypted tokens, no secrets in logs/frontend
- **Limits respected**: Bot API ~50 MB cap enforced with a real error; streaming everywhere (multer disk temp → Telegram stream → DB), Range-supported downloads

## Quick start

```bash
npm install
cp .env.example .env   # then edit (see below)
npm start               # http://localhost:3000
```

### 1. Telegram Login setup (required for real login)

1. Talk to [@BotFather](https://t.me/BotFather) → `/newbot` → get a token.
2. Send `/setdomain` to BotFather → choose the bot → enter your app origin (e.g. `localhost` for dev — Telegram allows `localhost` for testing, use a tunnel/HTTPS domain in production).
3. Put in `.env`:
   ```
   TELEGRAM_LOGIN_BOT_TOKEN=<login bot token>
   TELEGRAM_LOGIN_BOT_NAME=<login bot username without @>
   ```
4. Reload — the login page now shows the official “Log in with Telegram” button.

Before this is configured, the login page explains what to do. `DEV_ALLOW_LOCAL_LOGIN=true` (non-production only) enables a clearly-labelled dev login for trying the app end-to-end.

### 2. Storage bot (per user, in the UI wizard)

1. @BotFather → `/newbot` → copy token (this can be a different bot than the login bot).
2. Open the new bot in Telegram → press **Start** (bots can’t message first).
3. In Open Cloud wizard: paste token → Detect (or paste chat ID) → Test → Ready.

For channels/groups: add the bot as admin and use that chat ID.

## Environment

| Var | Required | Description |
|---|---|---|
| `PORT` | no | default 3000 |
| `DATABASE_PATH` | no | SQLite file, default `./data/opencloud.db` (Postgres schema in `database/schema.postgres.sql`) |
| `SESSION_SECRET` | prod | long random string |
| `ENCRYPTION_KEY` | prod | 64 hex chars (32 bytes). `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `TELEGRAM_LOGIN_BOT_TOKEN` / `TELEGRAM_LOGIN_BOT_NAME` | for login | official widget config |
| `MAX_UPLOAD_BYTES` | no | default 52428800 (Telegram Bot API bot limit) |
| `DEV_ALLOW_LOCAL_LOGIN` | no | `true` enables dev-only login (never in production) |

## API

```
POST /api/auth/telegram   GET /api/auth/me   POST /api/auth/logout[-all]
GET  /api/storage/connection   POST /api/storage/connect|/chat|/test|/disconnect   GET /api/storage/detect
GET  /api/files  POST /api/files/upload  GET|PATCH|DELETE /api/files/:id
GET  /api/files/:id/download|/preview   POST /api/files/:id/check
POST /api/folders  PATCH|DELETE /api/folders/:id  GET /api/folders/tree|/:id/path
GET  /api/search   GET|POST|DELETE /api/trash...   GET /api/storage/usage   GET|PUT /api/settings
```

## Tests

```bash
npm test
```

Integration tests boot the app with a mocked Telegram Bot API and cover auth, token validation/encryption, failed-upload rollback, rename/move/search/sort, trash lifecycle, orphan detection, and cross-user authorization.

## Notes / limits

- Telegram Bot API bots: **~50 MB** max file up/down. Larger files are rejected with an explicit error (Telegram-side limit, not ours).
- `getUpdates`-based chat detection only sees *recent pending* updates — the user must message the bot shortly before pressing Detect.
- Telegram files persist as long as their messages exist; permanent delete removes the message best-effort, then the metadata (never orphaned).
- SQLite (WAL) fits single-node personal use; migrate with `database/schema.postgres.sql` for multi-instance deployments.
