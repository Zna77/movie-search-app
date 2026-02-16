import { NextResponse } from "next/server";

export async function GET(request) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing TMDB_API_KEY" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const page = searchParams.get("page") || "1";

  const url = `https://api.themoviedb.org/3/trending/all/day?api_key=${apiKey}&page=${page}`;

  try {
    const tmdbRes = await fetch(url, { next: { revalidate: 300 } });
    const data = await tmdbRes.json();
    return NextResponse.json(data, { status: tmdbRes.ok ? 200 : tmdbRes.status });
  } catch {
    return NextResponse.json({ error: "Failed to reach TMDB" }, { status: 500 });
  }
}
