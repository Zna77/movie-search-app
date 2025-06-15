// api/movie/videos.js
// Serverless function to fetch trailers/videos for a given movie ID
export default async function handler(req, res) {
  const { id } = req.query;
  const apiKey = process.env.TMDB_API_KEY;
  // Fetch the videos list from TMDB
  const tmdbRes = await fetch(
    `https://api.themoviedb.org/3/movie/${id}/videos?api_key=${apiKey}`
  );
  const data = await tmdbRes.json();
  // Return the JSON payload directly
  res.status(tmdbRes.ok ? 200 : tmdbRes.status).json(data);
}
