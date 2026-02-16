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

## Deploy (GitHub + Vercel)

1. Push code to GitHub.
2. Import the GitHub repository in Vercel.
3. In Vercel Project Settings -> Environment Variables, add:
   - `TMDB_API_KEY`
   - `NEXT_PUBLIC_VIDSRC_BASE` (optional)
4. Deploy the `main` branch.

Or with Vercel CLI:

```bash
vercel login
vercel link
vercel env add TMDB_API_KEY
vercel env add NEXT_PUBLIC_VIDSRC_BASE
vercel --prod
```

## API routes
- `GET /api/search?query=...&page=...`
- `GET /api/trending?page=...`
- `GET /api/movie?id=...&type=movie|tv`
- `GET /api/videos?id=...&type=movie|tv`
- `GET /api/genres`
