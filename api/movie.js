// api/movie.js
// Proxies TMDB /movie/{id} endpoint
export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: "Missing movie id" });
  }

  const apiKey = process.env.TMDB_API_KEY;
  try {
    const tmdbRes = await fetch(
      `https://api.themoviedb.org/3/movie/${encodeURIComponent(
        id
      )}?api_key=${apiKey}`
    );
    const data = await tmdbRes.json();
    return res.status(tmdbRes.ok ? 200 : tmdbRes.status).json(data);
  } catch (error) {
    console.error("Error fetching movie details:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
