// api/trending.js
export default async function handler(req, res) {
  const { page = "1" } = req.query;
  const apiKey = process.env.TMDB_API_KEY;
  const tmdbRes = await fetch(
    `https://api.themoviedb.org/3/trending/movie/day` +
      `?api_key=${apiKey}&page=${page}`
  );
  const data = await tmdbRes.json();
  res.status(tmdbRes.ok ? 200 : tmdbRes.status).json(data);
}
