// api/genres.js
export default async function handler(req, res) {
  const key = process.env.TMDB_API_KEY;
  if (!key) {
    return res.status(500).json({ error: "Missing TMDB_API_KEY" });
  }
  const tmdbRes = await fetch(
    `https://api.themoviedb.org/3/genre/movie/list?api_key=${key}&language=en-US`
  );
  const data = await tmdbRes.json();
  res.status(tmdbRes.ok ? 200 : tmdbRes.status).json(data);
}
