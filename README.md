# 🎬 Video Downloader

A clean, fast video downloader supporting **Twitter/X**, **YouTube**, and **YouTube Shorts**. Simple web UI, CLI, and API.

## Quick Start

```bash
# Install dependencies
bun install

# Start the web server
bun run src/index.ts
# → http://localhost:3456

# Or use the CLI
bun run src/cli.ts <video-url> [output-dir]
```

## Supported Platforms

| Platform | Example URL |
|----------|------------|
| Twitter/X | `https://x.com/user/status/123456` |
| YouTube | `https://youtube.com/watch?v=abc123` |
| YT Shorts | `https://youtube.com/shorts/abc123` |

## Usage

### Web UI
1. Go to `http://localhost:3456`
2. Select the platform
3. Paste the video link
4. Click Download

### CLI
```bash
bun run src/cli.ts https://x.com/user/status/123456
bun run src/cli.ts https://youtube.com/watch?v=abc123 ~/Downloads
bun run src/cli.ts https://youtube.com/shorts/abc123
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

- **Twitter/X:** Uses Twitter's GraphQL API with guest tokens to extract video URLs, with syndication API as fallback
- **YouTube/Shorts:** Direct extraction of video streams from YouTube pages

Downloads the highest quality MP4 available. No yt-dlp dependency needed.

## Stack
- **Runtime:** Bun
- **Server:** Hono
- **Dependencies:** hono, uuid (that's it)
