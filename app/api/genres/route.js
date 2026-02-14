import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing TMDB_API_KEY" }, { status: 500 });
  }

  try {
    const [movieRes, tvRes] = await Promise.all([
      fetch(
        `https://api.themoviedb.org/3/genre/movie/list?api_key=${apiKey}&language=en-US`,
        { cache: "no-store" }
      ),
      fetch(
        `https://api.themoviedb.org/3/genre/tv/list?api_key=${apiKey}&language=en-US`,
        { cache: "no-store" }
      ),
    ]);

    const [movieData, tvData] = await Promise.all([movieRes.json(), tvRes.json()]);
    if (!movieRes.ok || !tvRes.ok) {
      return NextResponse.json(
        movieRes.ok ? tvData : movieData,
        { status: movieRes.ok ? tvRes.status : movieRes.status }
      );
    }

    const byId = new Map();
    for (const genre of movieData.genres || []) {
      byId.set(genre.id, genre);
    }
    for (const genre of tvData.genres || []) {
      if (!byId.has(genre.id)) {
        byId.set(genre.id, genre);
      }
    }

    return NextResponse.json({ genres: Array.from(byId.values()) }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Failed to reach TMDB" }, { status: 500 });
  }
}
