# 🐦 Twitter Video Downloader

Download videos from Twitter/X posts. Simple, fast, no BS.

## Quick Start

```bash
# Install dependencies
bun install

# Start the web server
bun run src/index.ts
# → http://localhost:3456

# Or use the CLI
bun run src/cli.ts <twitter-url> [output-dir]
```

## Usage

### Web UI
1. Go to `http://localhost:3456`
2. Paste a Twitter/X link
3. Click Download
4. Get the video

### CLI
```bash
bun run src/cli.ts https://x.com/user/status/123456
bun run src/cli.ts https://x.com/user/status/123456 ~/Downloads
```

### API
```bash
# Start download
curl -X POST http://localhost:3456/api/download \
  -H "Content-Type: application/json" \
  -d '{"url": "https://x.com/user/status/123456"}'

# Check status
curl http://localhost:3456/api/download/<id>

# Download file
curl -O http://localhost:3456/api/download/<id>/file
```

## How It Works

Uses Twitter's GraphQL API with guest tokens to extract video URLs, with syndication API as fallback. Downloads the highest quality MP4 available. No yt-dlp dependency needed.

## Stack
- **Runtime:** Bun
- **Server:** Hono
- **Dependencies:** hono, uuid (that's it)
