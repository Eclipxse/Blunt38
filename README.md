# Discord Premium Bot

A UI-first Discord bot built with TypeScript and discord.js.

## Features

- Slash commands only, so Message Content Intent can stay off.
- Premium setup panel with buttons, channel selects, role selects, and modals.
- Give/remove role commands and autorole on join.
- Configurable welcome messages with `{user}` and `{server}` placeholders.
- Ticket panel with ticket creation, claim, lock, transcript, and close actions.
- Role panel with dropdown-based self roles.
- Moderation panel with warn, timeout, kick, ban, and history.
- Giveaways with entry buttons, winner picking, and background ending.
- Polls with live vote buttons.
- Suggestion panel with modal input and approve/deny/discuss buttons.
- Temp VC generator with join-to-create voice channels and empty-channel cleanup.
- Leveling, rank, and leaderboard commands.
- Embed builder modal.
- Birthday tracking and daily birthday announcements.
- Server info and user info commands.
- Emoji and sticker manager commands.
- AI chat channel with admin setup, plus `/ai ask` for one-off replies anywhere.
- Mini games: coinflip, dice, and Rock Paper Scissors buttons.
- Music playback through Lavalink with slash commands and button controls.
- JSON or Supabase Postgres-backed configuration.

## Local Setup

```bash
npm install
copy .env.example .env
npm run dev
```

Paste your token into `.env` as `DISCORD_TOKEN`. Keep `.env` private.

For fast slash-command updates while testing, set `DISCORD_GUILD_ID` to your test server ID. If you leave it empty, commands are registered globally and may take longer to show.

## Storage

Local testing uses JSON by default:

```env
STORAGE_DRIVER=json
```

Production should use Supabase Postgres:

```env
STORAGE_DRIVER=postgres
DATABASE_URL=postgresql://postgres:your_database_password@db.yutvxacmxcsnibrxosfw.supabase.co:5432/postgres?sslmode=require
```

The Supabase project used for this bot is `Browniezzz` at `https://yutvxacmxcsnibrxosfw.supabase.co`. Get the real database password/connection string from Supabase Project Settings -> Database, paste it into `.env`, then restart the bot.

The schema is saved in `supabase/migrations/001_discord_bot_core_schema.sql` and has already been applied to the `Browniezzz` project.

## Web Dashboard

The dashboard lives in `dashboard/` and runs as a separate Next.js app. It uses Discord OAuth to verify admins, reads the bot's guild list with the bot token, and saves server settings into the same Supabase `guild_configs` table the bot already uses.

Dashboard `.env`:

```env
DISCORD_CLIENT_ID=your_discord_application_client_id
DISCORD_CLIENT_SECRET=your_discord_oauth_client_secret
DISCORD_TOKEN=your_bot_token
DASHBOARD_BASE_URL=http://31.42.125.11:3000
DASHBOARD_SESSION_SECRET=replace_with_a_long_random_secret
DATABASE_URL=postgresql://postgres.your_project_ref:your_password@aws-1-region.pooler.supabase.com:5432/postgres
```

In the Discord Developer Portal, add this OAuth2 redirect URI:

```text
http://31.42.125.11:3000/api/auth/callback
```

Local run:

```bash
cd dashboard
npm install
copy .env.example .env
npm run dev
```

Production run:

```bash
cd dashboard
npm ci
npm run build
pm2 start npm --name browniezzz-dashboard -- start -- -p 3000
pm2 save
```

## Developer Portal Settings

Recommended first setup:

- Public Bot: on
- Requires OAuth2 Code Grant: off
- Presence Intent: off
- Server Members Intent: on
- Message Content Intent: off unless you enable AI channel auto-replies

Invite scopes:

- `bot`
- `applications.commands`

Start with Administrator permission while testing. Later, reduce permissions to only what you use.

## Discord Intents

The bot code uses:

- Guilds
- Guild Members
- Guild Moderation
- Guild Messages
- Guild Voice States
- Message Content only when `ENABLE_MESSAGE_CONTENT_INTENT=true`

Enable **Server Members Intent** in the Developer Portal for welcome and autorole. Enable **Message Content Intent** only if you want AI to auto-reply to normal messages in the configured AI channel.

## AI Replies

Set these in `.env`:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-5.4-mini
ENABLE_MESSAGE_CONTENT_INTENT=true
```

For fast Groq replies:

```env
AI_PROVIDER=groq
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.1-8b-instant
ENABLE_MESSAGE_CONTENT_INTENT=true
```

For OpenRouter:

```env
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=your_openrouter_key
OPENROUTER_MODEL=openrouter/free
OPENROUTER_APP_NAME=Nexus Discord Bot
ENABLE_MESSAGE_CONTENT_INTENT=true
```

Use a chat model for Discord replies. Rerank models such as `nvidia/llama-nemotron-rerank-vl-1b-v2:free` are for sorting documents by relevance and cannot generate normal chat replies.

Groq model notes:

- `llama-3.1-8b-instant` is the recommended fast model for Discord auto-replies.
- `llama-3.3-70b-versatile` gives stronger replies, but is slower and has tighter limits.

Useful commands:

- `/ai ask` asks a one-off question in any channel.
- `/ai setup channel:#chat` makes the bot auto-reply only in that channel.
- `/ai persona preset:Gen Z girl` gives the bot a casual slang-heavy personality.
- `/ai prompt` changes the bot's personality for this server.
- `/ai disable` turns auto replies off.

Speed knobs in `.env`:

```env
AI_MAX_TOKENS=140
AI_TIMEOUT_MS=15000
```

Lower `AI_MAX_TOKENS` means shorter, usually faster replies. Groq is usually much faster than free OpenRouter routes for short Discord replies.

## Music

Music uses Lavalink, which is a separate Java audio server. Start Lavalink first, then start this bot.

Bot `.env`:

```env
LAVALINK_HOST=127.0.0.1
LAVALINK_PORT=2333
LAVALINK_PASSWORD=youshallnotpass
LAVALINK_SECURE=false
MUSIC_SEARCH_SOURCE=ytmsearch
MUSIC_DEFAULT_VOLUME=80
```

Copy `lavalink/application.example.yml` to your VPS as `/opt/lavalink/application.yml`, then run Lavalink with Java 17+:

```bash
java -Xmx1G -jar Lavalink.jar
```

See `lavalink/README.md` for the full VPS setup and systemd service.

Music commands:

- `/music play query:song name or link`
- `/music pause`
- `/music resume`
- `/music skip`
- `/music stop`
- `/music queue`
- `/music nowplaying`
- `/music volume percent:80`
- `/music loop mode:off|track|queue`
- `/music shuffle`
- `/music remove position:1`

YouTube and YouTube Music search work through the Lavalink YouTube plugin. Spotify/Apple/Deezer links need the optional LavaSrc plugin plus Spotify developer credentials, and they resolve metadata rather than ripping audio directly from Spotify.

## Main Commands

- `/setup`
- `/ai`
- `/welcome`
- `/role`
- `/ticket-panel`
- `/role-panel`
- `/moderate`
- `/giveaway`
- `/poll`
- `/suggest-panel`
- `/tempvc`
- `/leveling`
- `/rank`
- `/leaderboard`
- `/embed create`
- `/birthday`
- `/serverinfo`
- `/userinfo`
- `/emoji`
- `/sticker`
- `/minigame`
- `/music`

## Hosting Size

For one bot serving a small-to-medium set of Discord servers:

- Minimum without music: 1 vCPU, 1 GB RAM
- Minimum with music: 1 vCPU, 2 GB RAM
- Comfortable with website + bot + Lavalink: 2 vCPU, 4 GB RAM

This version can store data in JSON for quick launch or Supabase Postgres for production. Use Postgres before putting the bot in client servers long-term.
