const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

function loadDotEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf8");
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) return;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  });
}

loadDotEnv();

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");
const TMDB_BASE = "https://api.themoviedb.org/3";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
};

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

function serveStatic(req, res, url) {
  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = path.join(PUBLIC_DIR, pathname);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      sendJson(res, 404, { error: "Not found" });
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "text/plain" });
    res.end(data);
  });
}

async function proxyTmdb(res, url) {
  try {
    const tmdbRes = await fetch(url);
    const body = await tmdbRes.text();
    res.writeHead(tmdbRes.status, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(body);
  } catch (err) {
    sendJson(res, 500, { error: "Failed to reach TMDB" });
  }
}

async function handleApi(req, res, url) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    sendJson(res, 500, { error: "Missing TMDB_API_KEY" });
    return;
  }

  const pathname = url.pathname;
  const query = url.searchParams.get("query") || "";
  const page = url.searchParams.get("page") || "1";
  const id = url.searchParams.get("id");

  if (pathname === "/api/search") {
    const tmdbUrl =
      `${TMDB_BASE}/search/movie?api_key=${apiKey}` +
      `&query=${encodeURIComponent(query)}` +
      `&page=${page}`;
    await proxyTmdb(res, tmdbUrl);
    return;
  }

  if (pathname === "/api/trending") {
    const tmdbUrl =
      `${TMDB_BASE}/trending/movie/day?api_key=${apiKey}` + `&page=${page}`;
    await proxyTmdb(res, tmdbUrl);
    return;
  }

  if (pathname === "/api/movie") {
    if (!id) {
      sendJson(res, 400, { error: "Missing movie id" });
      return;
    }
    const tmdbUrl = `${TMDB_BASE}/movie/${encodeURIComponent(
      id
    )}?api_key=${apiKey}`;
    await proxyTmdb(res, tmdbUrl);
    return;
  }

  if (pathname === "/api/videos") {
    if (!id) {
      sendJson(res, 400, { error: "Missing movie id" });
      return;
    }
    const tmdbUrl = `${TMDB_BASE}/movie/${encodeURIComponent(
      id
    )}/videos?api_key=${apiKey}`;
    await proxyTmdb(res, tmdbUrl);
    return;
  }

  if (pathname === "/api/genres") {
    const tmdbUrl =
      `${TMDB_BASE}/genre/movie/list?api_key=${apiKey}` + `&language=en-US`;
    await proxyTmdb(res, tmdbUrl);
    return;
  }

  sendJson(res, 404, { error: "Unknown API route" });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname.startsWith("/api/")) {
    await handleApi(req, res, url);
    return;
  }
  serveStatic(req, res, url);
});

server.listen(PORT, () => {
  console.log(`Movie Search running at http://localhost:${PORT}`);
});
