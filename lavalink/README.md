# Lavalink Music Server

This bot uses Lavalink as the audio backend. The Discord bot connects to Lavalink over `127.0.0.1:2333`, then Lavalink does the actual searching, loading, and voice audio work.

## What Works

- Song names through YouTube Music search.
- YouTube links and playlists.
- SoundCloud, Bandcamp, Twitch, Vimeo, direct HTTP audio links if the source supports the link.
- Spotify/Apple/Deezer links only after you enable LavaSrc and add Spotify developer credentials. Spotify is used for metadata and matching, not ripping audio from Spotify.

## VPS Install

Run these on the Ubuntu VPS:

```bash
sudo apt update
sudo apt install -y openjdk-17-jre-headless ffmpeg curl
java -version
```

Create the Lavalink folder:

```bash
sudo mkdir -p /opt/lavalink
sudo chown -R $USER:$USER /opt/lavalink
cd /opt/lavalink
curl -L -o Lavalink.jar https://github.com/lavalink-devs/Lavalink/releases/latest/download/Lavalink.jar
```

Copy `lavalink/application.example.yml` from this project to `/opt/lavalink/application.yml`, then start it:

```bash
cd /opt/lavalink
java -Djava.net.preferIPv4Stack=true -Xms256M -Xmx1G -jar Lavalink.jar
```

If it says the server started on port `2333`, Lavalink is alive.

## Keep It Running With systemd

Install the tracked service unit:

```bash
sudo install -m 0644 /opt/blunt38/lavalink/lavalink.service /etc/systemd/system/lavalink.service
```

Enable it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now lavalink
sudo systemctl status lavalink --no-pager -l
```

Logs:

```bash
sudo journalctl -u lavalink -n 100 --no-pager
```

## Bot `.env`

Use these values when Lavalink runs on the same VPS as the bot:

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
```

The `LAVALINK_PASSWORD` must match `lavalink.server.password` in `application.yml`.

Verify the authenticated health endpoint before testing Discord playback:

```bash
set -a
source /opt/blunt38/.env
set +a
curl -fsS -H "Authorization: $LAVALINK_PASSWORD" \
  "http://$LAVALINK_HOST:$LAVALINK_PORT/v4/info"
```

The bot retries the Lavalink connection continuously. Once this endpoint responds, music commands recover without another bot restart.

When YouTube does not expose playable formats to Lavalink on a VPS, install the official yt-dlp executable and enable the resolver above. yt-dlp resolves only the requested YouTube video or the first result for the requested song name; Lavalink continues to handle queueing, filters, seeking, and Discord audio.

## Spotify Links

For Spotify links:

1. Create a free app at `https://developer.spotify.com/dashboard`.
2. Copy the client ID and client secret.
3. Uncomment the LavaSrc plugin and `plugins.lavasrc` block in `application.yml`.
4. Paste the Spotify credentials.
5. Restart Lavalink.

Spotify links resolve metadata and then Lavalink searches playable sources for matching audio.
