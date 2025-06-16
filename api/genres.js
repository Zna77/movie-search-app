// api/genres.js
import fetch from "node-fetch";
export default async function handler(req, res) {
  const key = process.env.TMDB_API_KEY;
  const tmdb = await fetch(
    `https://api.themoviedb.org/3/genre/movie/list?api_key=${key}&language=en-US`
  );
  const { genres } = await tmdb.json();
  res.status(200).json(genres);
}
