<p align="center">
  <img src="dashboard/public/brand/blunt38-banner.jpg" alt="38 reasons, none explained" width="100%" />
</p>

<p align="center">
  <img src="dashboard/public/brand/blunt38-logo.jpg" alt="blunt38" width="132" />
</p>

<h1 align="center">blunt38</h1>

<p align="center">
  <code>38 reasons. none explained.</code><br />
  the discord bot that somehow became an entire operating system.
</p>

<p align="center">
  <img alt="TypeScript" src="https://img.shields.io/badge/TYPE-scripted-6f4b8b?style=for-the-badge&labelColor=211329" />
  <img alt="discord.js" src="https://img.shields.io/badge/SIGNAL-discord.js_v14-63d8d2?style=for-the-badge&labelColor=211329" />
  <img alt="Supabase" src="https://img.shields.io/badge/MEMORY-supabase-b7ef72?style=for-the-badge&labelColor=211329" />
  <img alt="Lavalink" src="https://img.shields.io/badge/AUDIO-lavalink-ffd166?style=for-the-badge&labelColor=211329" />
  <img alt="Status" src="https://img.shields.io/badge/STATUS-probably_online-c56bdf?style=for-the-badge&labelColor=211329" />
</p>

---

```text
[ transmission detected ]

subject: blunt38
class: discord multipurpose bot
commands: 26
memory: postgres
voice: lavalink
personality: configurable
normal behavior: not guaranteed
```

## // what is this thing

`blunt38` is a UI-first Discord bot for communities that are tired of stacking twelve random bots and praying they do not fight each other.

It handles moderation, AI replies, music, tickets, roles, leveling, giveaways, temporary voice channels, server setup, a browser dashboard, and a live multiplayer drawing game. lowkey excessive. exactly the point.

The bot runs on Node.js and TypeScript. Persistent data lives in Supabase Postgres, music runs through Lavalink, AI can route through Groq or other OpenAI-compatible providers, and the dashboard is built with Next.js.

## // observed abilities

| Signal | What blunt38 actually does |
| --- | --- |
| Control surface | `/setup` opens a button, menu, channel-select, role-select, and modal based configuration panel |
| AI brain | One-off `/ai ask`, one dedicated auto-reply channel, custom prompts, personas, Groq, OpenRouter, and OpenAI-compatible routing |
| Music deck | Exact-result search, link playback, paginated queue, previous/replay/seek, autoplay, EQ filters, DJ access, and complete button controls |
| Draw Party | Real-time browser drawing rooms with word choices, brush, fill, eraser, colors, sounds, guesses, rounds, and scoring |
| Tickets | Modal intake, category routing, staff claims, locks, transcripts, and close confirmation |
| Moderation | Warnings, timeouts, kicks, bans, stored cases, history, and voice disconnect controls |
| Community | Independent welcome and goodbye messages with visual cards, autoroles, self-role menus, polls, suggestions, birthdays, and giveaways |
| Leveling | XP, rank cards, leaderboards, and configurable level-up announcements |
| Voice | Join-to-create temporary channels with automatic empty-room cleanup |
| Server builder | Preview, build, and clean complete server layouts with roles, categories, channels, panels, and bot wiring |
| Dashboard | Discord OAuth, guild selection, live roles/channels, Supabase-backed settings, and eleven visual Studios |
| Visual Studios | Welcome, Goodbye, Ticket, Music, Rank, Level Up, Starboard, Birthday, Announcement, Logging, and Moderation editors |

## // command index

```text
/help           /ai              /setup           /welcome
/goodbye        /role            /role-panel      /ticket-panel
/moderate       /purge           /server          /poll
/suggest-panel  /tempvc          /giveaway        /leveling
/rank           /leaderboard     /embed           /birthday
/serverinfo     /userinfo        /emoji           /sticker
/minigame       /music           /voice           /draw
```

The heavier command groups have subcommands. The important ones:

```text
/ai ask | setup | disable | prompt | persona | status
/goodbye set | test | clear
/music play | search | pause | resume | previous | replay | skip | stop
       queue | nowplaying | volume | loop | shuffle | clear | seek
       autoplay | filters | move | remove | settings
/role create | permissions | preset | give | remove | autorole | clear-autorole
/birthday set | remove | list | channel
/server preview | build | cleanup
/voice disconnect
/draw start
```

## // signal path

```mermaid
flowchart LR
  Human["server admin"] --> Discord["Discord UI"]
  Human --> Dashboard["blunt38 dashboard"]
  Discord --> Bot["blunt38 core"]
  Dashboard --> OAuth["Discord OAuth"]
  Dashboard --> DB["Supabase Postgres"]
  Bot --> DB
  Bot --> AI["Groq / OpenRouter / OpenAI"]
  Bot --> Lava["Lavalink"]
  Bot --> Draw["Draw Party server"]
  Lava --> Voice["Discord voice"]
  Draw --> Browser["multiplayer browser rooms"]
```

## // files recovered

```text
.
|-- src/
|   |-- commands/          slash command definitions
|   |-- interactions/      buttons, menus, modals
|   |-- services/          AI, music, storage, games, schedulers
|   `-- utils/             shared UI and formatting
|-- dashboard/             Next.js control panel
|-- public/draw/           multiplayer Draw Party client
|-- lavalink/              music-node configuration
|-- supabase/migrations/   production database schema
|-- .env.example           runtime configuration template
`-- README.md              you are here. unfortunate.
```

## // summon it locally

Requirements:

- Node.js 24
- npm
- a Discord application and bot token

```bash
git clone https://github.com/Eclipxse/Blunt38.git blunt38
cd blunt38
npm install
copy .env.example .env
npm run dev
```

Linux and macOS use `cp .env.example .env` instead of `copy`.

Minimum `.env`:

```env
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_application_id
DISCORD_GUILD_ID=your_test_server_id
REGISTER_COMMANDS_ON_START=true
BOT_BRAND_NAME=blunt38
```

`DISCORD_GUILD_ID` makes command updates appear quickly in one test server. Remove it when you want global commands everywhere. Global registration can take longer to propagate because Discord likes suspense.

## // developer portal ritual

Create the application in the [Discord Developer Portal](https://discord.com/developers/applications), add a bot, then configure:

| Setting | Recommended value |
| --- | --- |
| Public Bot | On if other people should invite it |
| Requires OAuth2 Code Grant | Off |
| Server Members Intent | On |
| Message Content Intent | On when AI auto-replies are enabled |
| Presence Intent | Off unless a feature needs it |

Invite scopes:

```text
bot
applications.commands
```

Administrator is convenient while testing. Production servers should eventually use only the permissions their enabled modules need.

## // memory implant

Quick local testing can use JSON:

```env
STORAGE_DRIVER=json
```

Production should use Supabase Postgres:

```env
STORAGE_DRIVER=postgres
DATABASE_URL=postgresql://postgres.project_ref:password@pooler.supabase.com:5432/postgres
```

Apply:

```text
supabase/migrations/001_discord_bot_core_schema.sql
supabase/migrations/002_visual_studio_foundation.sql
supabase/migrations/003_visual_asset_library.sql
supabase/migrations/004_starboard_engine.sql
supabase/migrations/005_goodbye_messages.sql
```

Run the migrations in numeric order. The database stores guild configuration, moderation cases, polls, role panels, giveaways, XP, birthdays, temporary voice state, visual Studio documents, and immutable template versions. It remembers the lore so the process does not have to.

## // visual studios

Open the dashboard, choose a server, then enter **Studios**. Every surface uses the same visual-document engine while keeping its own canvas, variables, presets, saved document, and immutable version history.

- Canvas formats range from 960x360 event cards to 1200x600 announcement covers.
- **Publish** stores a sanitized document and creates a new immutable version in Supabase.
- Each editor exposes only the runtime variables that its event understands.
- With Supabase Storage configured, uploads become reusable per-server assets capped at 8 MB.
- Without Storage credentials, editor uploads fall back to embedded images so local work still functions.
- The bot renders active templates through `@napi-rs/canvas` for joins, exits, ticket panels, music, rank, level-up, birthdays, announcements, logging, and moderation.
- `/starboard setup` adds reaction thresholds, duplicate protection, and visual community highlights.
- If a template is missing or rendering fails, blunt38 sends the existing embed or text response instead.

Asset storage is server-only. Never expose `SUPABASE_SERVICE_ROLE_KEY` to browser code.

## // give it a brain

Groq is the recommended fast route:

```env
AI_PROVIDER=groq
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.1-8b-instant
AI_MAX_TOKENS=140
AI_TIMEOUT_MS=15000
ENABLE_MESSAGE_CONTENT_INTENT=true
```

OpenRouter also works:

```env
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=your_openrouter_key
OPENROUTER_MODEL=openrouter/free
OPENROUTER_APP_NAME=blunt38
ENABLE_MESSAGE_CONTENT_INTENT=true
```

Use a chat model. Rerank models sort documents; they do not know how to yap back.

AI auto-replies happen only inside the channel selected with `/ai setup`. `/ai ask` still works anywhere the bot can answer.

## // make it sing

Music runs through a separate Lavalink process:

```env
LAVALINK_HOST=127.0.0.1
LAVALINK_PORT=2333
LAVALINK_PASSWORD=youshallnotpass
LAVALINK_SECURE=false
MUSIC_SEARCH_SOURCE=ytsearch
MUSIC_DEFAULT_VOLUME=80
MUSIC_YTDLP_ENABLED=true
MUSIC_YTDLP_PATH=/usr/local/bin/yt-dlp
MUSIC_YTDLP_TIMEOUT_MS=25000
MUSIC_YTDLP_CACHE_TTL_MS=7200000
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REFRESH_TOKEN=
SPOTIFY_REDIRECT_URI=http://127.0.0.1:8888/callback
SPOTIFY_MARKET=IN
SPOTIFY_CACHE_TTL_MS=3600000
MUSIC_RESOLVE_CONCURRENCY=3
```

Start Lavalink before the bot:

```bash
java -Xms256M -Xmx1G -jar Lavalink.jar
```

When `MUSIC_YTDLP_ENABLED=true`, exact YouTube links are resolved by yt-dlp first, while ordinary `/music play` song-name searches use Lavalink's faster search path. If a YouTube track stalls, the bot automatically retries that exact track through yt-dlp direct audio before trying another source. Signed audio streams are cached for up to `MUSIC_YTDLP_CACHE_TTL_MS` (and never past their provider expiry), so recovered and repeated tracks remain quick without slowing every first-time search.

Spotify track and album metadata uses `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`. Spotify's playlist-items API is now limited to playlists owned by or shared with the authorized user. blunt38 uses the official user-authorized API for those playlists and falls back to Spotify's public embed metadata for other public playlists. Add `SPOTIFY_REDIRECT_URI` to the Spotify app dashboard, run `npm run spotify:authorize`, approve the account once, and restart the bot to enable owned, private, and collaborative playlists. The helper writes the refresh token to `.env` without printing it, and blunt38 refreshes access automatically afterward.

For a bot running on a VPS, keep the callback on loopback and forward it from the computer running your browser:

```bash
ssh -L 8888:127.0.0.1:8888 root@your-server
```

Then run `npm run spotify:authorize` in the bot directory on the VPS and open the printed Spotify URL. blunt38 uses Spotify only for metadata, resolves a confident YouTube Music match through Lavalink first, optionally falls back to yt-dlp when enabled, then tries a matching SoundCloud result. It never plays Spotify audio or bypasses Spotify DRM. Private, unavailable, and local Spotify tracks are skipped with a clear queue summary. Use `/music play <Spotify URL>` or `!play <Spotify URL>`; the legacy `!play` bridge requires Discord's Message Content Intent and `ENABLE_MESSAGE_CONTENT_INTENT=true`.

The upgraded deck includes an exact-result picker, previous and replay controls, timestamp seeking, queue pagination and reordering, session autoplay, and native Lavalink filters for balanced EQ, bass boost, nightcore, vaporwave, and karaoke. `/music settings` or the dashboard Music page configures the guild DJ role, starting volume, and autoplay default. Without a DJ role, everyone in the active voice channel keeps normal control access.

More node setup lives in [`lavalink/README.md`](lavalink/README.md).

## // side quest: Draw Party

```env
DRAW_GAME_ENABLED=true
DRAW_GAME_PORT=8787
DRAW_GAME_PUBLIC_URL=https://draw.your-domain.com
```

Run `/draw start`, hit the Join Game button, choose a name, and begin ruining friendships with questionable drawings.

For production, reverse proxy the public domain to `127.0.0.1:8787` and include WebSocket upgrade headers. Health check:

```bash
curl http://127.0.0.1:8787/draw/health
```

## // control room

The dashboard lives in `dashboard/` and provides Discord login, admin-only guild access, real channel and role selectors, configuration previews, and database-backed saves. `Ctrl+K` opens the command palette, the home screen tracks setup completion, and live diagnostics probe Discord, Supabase, and Lavalink independently with actual response latency.

```env
DISCORD_CLIENT_ID=your_application_id
DISCORD_CLIENT_SECRET=your_oauth_secret
DISCORD_TOKEN=your_bot_token
DASHBOARD_BASE_URL=https://bot.your-domain.com
DASHBOARD_SESSION_SECRET=replace_with_a_long_random_secret
DATABASE_URL=your_supabase_pooler_url
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_server_only_service_role_key
LAVALINK_HOST=127.0.0.1
LAVALINK_PORT=2333
LAVALINK_PASSWORD=youshallnotpass
LAVALINK_SECURE=false
```

OAuth callback:

```text
https://bot.your-domain.com/api/auth/callback
```

Local dashboard:

```bash
cd dashboard
npm install
copy .env.example .env.local
npm run dev
```

## // keep the signal alive

Recommended VPS for the complete stack: **2 vCPU, 4 GB RAM, 40+ GB storage**.

```bash
apt update
apt install -y git curl unzip openjdk-17-jre

cd /opt
git clone https://github.com/Eclipxse/Blunt38.git blunt38
cd /opt/blunt38
npm ci
npm run build
npm run deploy:commands

pm2 start dist/index.js --name blunt38-bot
pm2 save
```

Dashboard:

```bash
cd /opt/blunt38/dashboard
npm ci
npm run build
pm2 start npm --name blunt38-dashboard -- start -- -p 3000
pm2 save
```

Useful checks:

```bash
pm2 status
pm2 logs blunt38-bot
systemctl status lavalink --no-pager -l
curl -H "Authorization: youshallnotpass" http://127.0.0.1:2333/v4/info
```

## // when the signal dies

| Symptom | Usually means |
| --- | --- |
| `The application did not respond` | The bot is offline, blocked on network/database work, or did not defer the interaction in time |
| AI command fails | Wrong provider, key, model, timeout, or rate limit |
| Auto replies stay silent | Message Content Intent is off or `/ai setup` points somewhere else |
| Lavalink offline | The Java service is stopped, still starting, or its host/password does not match |
| Music link source not enabled | The required Lavalink source plugin is missing |
| Draw room uses the wrong URL | `DRAW_GAME_PUBLIC_URL` is stale in the active process environment |
| Supabase authentication fails | Wrong pooler string, password, username, SSL mode, or URL encoding |
| Dashboard OAuth fails | Redirect URI and `DASHBOARD_BASE_URL` do not match exactly |
| Commands are missing | Deploy commands again and verify `DISCORD_CLIENT_ID` |

The bot keeps retrying its Lavalink node, so a late or restarted audio service no longer requires a second bot restart. Repair and verify the VPS service with:

```bash
sudo systemctl restart lavalink
sudo systemctl status lavalink --no-pager -l
set -a; source /opt/blunt38/.env; set +a
curl -fsS -H "Authorization: $LAVALINK_PASSWORD" \
  "http://$LAVALINK_HOST:$LAVALINK_PORT/v4/info"
```

If Lavalink is healthy but playback reports `Track was stuck`, update yt-dlp,
set `MUSIC_YTDLP_ENABLED=true` and `MUSIC_YTDLP_PATH=/usr/local/bin/yt-dlp`
in `/opt/blunt38/.env`, then restart the bot. YouTube timeouts now fall back to
other configured sources, and stalled YouTube tracks retry through yt-dlp direct
audio before the deck reports a final failure.

## // opsec, because apparently we need to say it

- Never commit `.env`.
- Never paste live tokens into screenshots, chat, commits, or issue reports.
- Rotate a Discord token immediately after it leaks.
- Keep database credentials and OAuth secrets on the server.
- Do not run multiple bot processes with one token unless sharding is intentional.
- Back up Supabase before destructive schema changes.

## // visual identity

```text
dashboard/public/brand/blunt38-banner.jpg
dashboard/public/brand/blunt38-logo.jpg
```

The code is documented. The 38 reasons are not.

<p align="center">
  <sub>always watching // still not explaining</sub>
</p>
