# Movie Search App

Search, filter, and explore movie details using TMDB.

## Setup
- Create a `.env` file from `.env.example` and set `TMDB_API_KEY`.
- Node.js 18+ is recommended (uses built-in `fetch`).

## Local development
Run the local dev server (serves static files and proxies `/api`):

```bash
node dev-server.js
```

Then open `http://localhost:3000`. The server auto-loads `.env` if present.

## Project structure
- `public/` static files (HTML, CSS, JS, service worker).
- `api/` serverless functions for Vercel deployments.
- `dev-server.js` local dev server proxying TMDB.

## Deployment (Vercel)
- Set `TMDB_API_KEY` as an environment variable.
- Vercel serves `public/` at the site root and `api/` as serverless routes.
