// api/search.js
// Proxies TMDB /search/movie endpoint; no client-specific filtering here
export default async function handler(req, res) {
  const { query = "", page = "1" } = req.query;
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Missing TMDB_API_KEY" });
  }
  const url =
    `https://api.themoviedb.org/3/search/movie` +
    `?api_key=${apiKey}` +
    `&query=${encodeURIComponent(query)}` +
    `&page=${page}`;

  const tmdbRes = await fetch(url);
  const data = await tmdbRes.json();

  // Simply forward the TMDB response
  res.status(tmdbRes.ok ? 200 : tmdbRes.status).json(data);
}
