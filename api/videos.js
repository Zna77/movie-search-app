// api/videos.js
export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "Missing movie id" });
  const apiKey = process.env.TMDB_API_KEY;
  const tmdbRes = await fetch(
    `https://api.themoviedb.org/3/movie/${id}/videos?api_key=${apiKey}`
  );
  const data = await tmdbRes.json();
  res.status(tmdbRes.ok ? 200 : tmdbRes.status).json(data);
}
