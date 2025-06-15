// api/search.js
export default async function handler(req, res) {
  const { query = "", page = "1" } = req.query;
  const apiKey = process.env.TMDB_API_KEY;
  const tmdbRes = await fetch(
    `https://api.themoviedb.org/3/search/movie` +
      `?api_key=${apiKey}` +
      `&query=${encodeURIComponent(query)}` +
      `&page=${page}`
  );
  const data = await tmdbRes.json();
  res.status(tmdbRes.ok ? 200 : tmdbRes.status).json(data);
}
