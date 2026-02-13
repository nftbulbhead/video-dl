# Video Downloader — Product Plan

## Vision
A clean, fast tool to download videos from multiple platforms. Start simple, do it well.

## Supported Platforms
- **Twitter/X** — tweets with video/GIF
- **YouTube** — standard videos
- **YouTube Shorts** — short-form vertical videos

## MVP Scope (v0.1)
- **Input:** Video URL from any supported platform
- **Output:** Direct video file download (best available quality)
- **Interface:** 
  1. CLI tool (`bun run src/cli.ts <url>`)
  2. HTTP API endpoint (`POST /api/download` with `{url}`)
  3. Simple web UI (select platform, paste link, get video)

## Technical Approach
- **Runtime:** Bun
- **Video extraction:** Direct API calls per platform (no yt-dlp dependency)
  - Twitter: Guest API / syndication API for video URLs
  - YouTube: Direct stream extraction from YouTube pages
- **Server:** Hono
- **Web UI:** Single HTML page, minimal JS, no framework

## Architecture
```
┌─────────────┐     ┌──────────────┐     ┌──────────────────┐
│  Web UI     │────▶│  API Server  │────▶│  Platform APIs    │
│  (HTML/JS)  │     │  (Hono/Bun)  │     │  (Twitter/YT)    │
└─────────────┘     └──────────────┘     └──────────────────┘
                           │
                    ┌──────┴──────┐
                    │  /downloads │
                    │  (temp dir) │
                    └─────────────┘
```

## API Design
```
POST /api/download
Body: { "url": "https://x.com/user/status/123" }
Response: { "id": "abc123", "status": "processing" }

GET /api/download/:id
Response: { "status": "ready", "filename": "video.mp4", "size": 12345 }

GET /api/download/:id/file
Response: video file stream
```

## Success Criteria
- Paste a video URL → get the video file
- Works across all three supported platforms
- Clean error handling (private content, deleted posts, invalid URLs)
- Response time < 10s for typical videos

## Future
- Quality selection (720p, 1080p, etc.)
- More platforms (Instagram, TikTok, etc.)
- Thumbnail extraction
- Batch downloads
