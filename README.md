# Movie & Series Search App (Next.js)

A Next.js movie and TV search app powered by TMDB, with embedded playback via Vidsrc.

## Prerequisites
- Node.js 18+ (Node 20+ recommended)

## Setup
Create a `.env.local` file:

```bash
TMDB_API_KEY=your_tmdb_api_key_here
NEXT_PUBLIC_VIDSRC_BASE=https://vidsrcme.ru
```

`NEXT_PUBLIC_VIDSRC_BASE` is optional. If omitted, the app defaults to `https://vidsrc-embed.ru`.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Build and start

```bash
npm run build
npm run start
```

## API routes
- `GET /api/search?query=...&page=...`
- `GET /api/trending?page=...`
- `GET /api/movie?id=...&type=movie|tv`
- `GET /api/videos?id=...&type=movie|tv`
- `GET /api/genres`
