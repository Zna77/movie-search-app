// api/movie.js
export default async function handler(req, res) {
  const { id } = req.query;
  const apiKey = process.env.TMDB_API_KEY;
  const tmdbRes = await fetch(
    `https://api.themoviedb.org/3/movie/${id}?api_key=${apiKey}`
  );
  const data = await tmdbRes.json();
  res.status(tmdbRes.ok ? 200 : tmdbRes.status).json(data);
}
