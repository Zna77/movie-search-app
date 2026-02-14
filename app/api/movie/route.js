import { NextResponse } from "next/server";

export async function GET(request) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing TMDB_API_KEY" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const type = searchParams.get("type") === "tv" ? "tv" : "movie";
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const url = `https://api.themoviedb.org/3/${type}/${encodeURIComponent(id)}?api_key=${apiKey}`;

  try {
    const tmdbRes = await fetch(url, { cache: "no-store" });
    const data = await tmdbRes.json();
    return NextResponse.json(data, { status: tmdbRes.ok ? 200 : tmdbRes.status });
  } catch {
    return NextResponse.json({ error: "Failed to reach TMDB" }, { status: 500 });
  }
}
