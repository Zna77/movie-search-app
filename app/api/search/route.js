import { NextResponse } from "next/server";

export async function GET(request) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing TMDB_API_KEY" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") || "";
  const page = searchParams.get("page") || "1";

  const url =
    `https://api.themoviedb.org/3/search/multi?api_key=${apiKey}` +
    `&query=${encodeURIComponent(query)}&page=${page}&include_adult=false&language=en-US`;

  try {
    const tmdbRes = await fetch(url, { next: { revalidate: 120 } });
    const data = await tmdbRes.json();
    return NextResponse.json(data, { status: tmdbRes.ok ? 200 : tmdbRes.status });
  } catch {
    return NextResponse.json({ error: "Failed to reach TMDB" }, { status: 500 });
  }
}
