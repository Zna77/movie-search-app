//----------------------------------------------------------------------------
// CONFIG & STATE
//----------------------------------------------------------------------------
const apiKey = "fbed1e47b7b4825cba22123afb2690fe";
let isTrending = false;
let currentQuery = "";
let currentPage = 1;
let totalPages = 1;
let isLoading = false;

//----------------------------------------------------------------------------
// HELPERS
//----------------------------------------------------------------------------

/** Build URL for TMDB (local/GH fallback) or /api (Vercel), including genres */
function buildUrl(endpoint, qp = {}) {
  const params = new URLSearchParams(qp).toString();
  const host = location.hostname;
  const isLocal = host === "localhost" || host.startsWith("127.");
  const isGH = host.endsWith("github.io");
  const base = "https://api.themoviedb.org/3";
  const key = endpoint.replace(/^\//, "");

  if (isLocal || isGH) {
    switch (key) {
      case "search":
        return `${base}/search/movie?api_key=${apiKey}&${params}`;
      case "trending":
        return `${base}/trending/movie/day?api_key=${apiKey}&${params}`;
      case "movie":
        return `${base}/movie/${qp.id}?api_key=${apiKey}&${params}`;
      case "videos":
        return `${base}/movie/${qp.id}/videos?api_key=${apiKey}&${params}`;
      case "genres":
        return `${base}/genre/movie/list?api_key=${apiKey}&${params}`;
      default:
        return `${base}/${key}?api_key=${apiKey}&${params}`;
    }
  }

  const route = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `/api${route}?${params}`;
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

//----------------------------------------------------------------------------
// DOM ELEMENTS
//----------------------------------------------------------------------------
const themeSwitch = document.getElementById("theme-toggle");
const form = document.getElementById("search-form");
const input = document.getElementById("search-input");
const acList = document.getElementById("autocomplete-list");
const sortSelect = document.getElementById("sort-select");
const yearFilter = document.getElementById("year-filter");
const genreSelect = document.getElementById("genre-select");
const titleEl = document.querySelector("header h1");
const resultsGrid = document.getElementById("results");
const backToTopBtn = document.getElementById("back-to-top");
const modal = document.getElementById("modal");
const modalBody = document.getElementById("modal-body");
const modalCloseBtn = document.getElementById("modal-close");

//----------------------------------------------------------------------------
// INITIALIZE
//----------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  setupTheme();
  loadGenres();
  resetToTrending();
  fetchTrending(1);
  attachEvents();
});

function setupTheme() {
  const saved = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", saved);
  themeSwitch.checked = saved === "dark";
  themeSwitch.addEventListener("change", () => {
    const mode = themeSwitch.checked ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", mode);
    localStorage.setItem("theme", mode);
  });
}

function attachEvents() {
  titleEl.addEventListener("click", () => {
    resetToTrending();
    fetchTrending(1);
  });
  input.addEventListener("input", debounce(onType, 300));
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    acList.innerHTML = "";
    startSearch(input.value.trim());
  });
  document.addEventListener("click", (e) => {
    if (!form.contains(e.target)) acList.innerHTML = "";
  });
  sortSelect.addEventListener("change", () => startSearch(currentQuery));
  yearFilter.addEventListener("input", () => startSearch(currentQuery));
  genreSelect.addEventListener("change", () => {
    currentPage = 1;
    resultsGrid.innerHTML = "";
    isTrending ? fetchTrending(1) : startSearch(currentQuery);
  });
  window.addEventListener("scroll", onScroll);
  backToTopBtn.addEventListener("click", () =>
    window.scrollTo({ top: 0, behavior: "smooth" })
  );
  window.addEventListener("scroll", () =>
    backToTopBtn.classList.toggle("show", window.scrollY > 300)
  );
  modalCloseBtn.addEventListener("click", () => modal.classList.remove("show"));
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.remove("show");
  });
}

function onScroll() {
  const { scrollTop, scrollHeight } = document.documentElement;
  if (
    !isLoading &&
    currentPage < totalPages &&
    scrollTop + window.innerHeight >= scrollHeight - 100
  ) {
    currentPage++;
    isTrending
      ? fetchTrending(currentPage)
      : searchMovies(currentQuery, currentPage);
  }
}

//----------------------------------------------------------------------------
// LOAD GENRES
//----------------------------------------------------------------------------
async function loadGenres() {
  try {
    const res = await fetch(buildUrl("/genres"));
    const data = await res.json(); // { genres: [...] }
    const list = data.genres || []; // ← get the actual array

    // reset & add the “All Genres”
    genreSelect.innerHTML = `<option value="">All Genres</option>`;

    // now loop over the array, not an object
    list.forEach((g) => {
      const opt = document.createElement("option");
      opt.value = g.id;
      opt.textContent = g.name;
      genreSelect.appendChild(opt);
    });
  } catch (err) {
    console.error("Could not load genres:", err);
  }
}

//----------------------------------------------------------------------------
// CORE LOGIC
//----------------------------------------------------------------------------
function resetToTrending() {
  input.value = "";
  acList.innerHTML = "";
  sortSelect.value = "pop_desc";
  yearFilter.value = "";
  genreSelect.value = "";
  currentQuery = "";
  currentPage = 1;
  totalPages = 1;
  resultsGrid.innerHTML = "";
  isTrending = true;
}

async function onType() {
  const q = input.value.trim();
  acList.innerHTML = "";
  if (q.length < 2) return;
  try {
    const { results } = await (
      await fetch(buildUrl("/search", { query: q, page: 1 }))
    ).json();
    results.slice(0, 5).forEach((m) => {
      const li = document.createElement("li");
      li.textContent = m.title;
      li.onclick = () => {
        input.value = m.title;
        acList.innerHTML = "";
        startSearch(m.title);
      };
      acList.append(li);
    });
  } catch {}
}

function startSearch(query) {
  if (!query) return;
  isTrending = false;
  currentQuery = query;
  currentPage = 1;
  totalPages = 1;
  resultsGrid.innerHTML = "";
  searchMovies(query, 1);
}

async function fetchTrending(page = 1) {
  if (isLoading) return;
  isLoading = true;
  try {
    const { results, total_pages } = await (
      await fetch(buildUrl("/trending", { page }))
    ).json();
    totalPages = total_pages || 1;
    let list = results || [];
    const gid = genreSelect.value;
    if (gid) list = list.filter((m) => m.genre_ids?.includes(+gid));
    appendMovies(list);
  } catch (err) {
    if (page === 1) showNoResults("Error loading trending movies.");
  } finally {
    isLoading = false;
  }
}

async function searchMovies(query, page = 1) {
  if (isLoading) return;
  isLoading = true;
  try {
    const { results, total_pages } = await (
      await fetch(buildUrl("/search", { query, page }))
    ).json();
    totalPages = total_pages || 1;
    let list = (results || []).slice();
    const yr = yearFilter.value.trim();
    if (yr) list = list.filter((m) => m.release_date?.startsWith(yr));
    const gid = genreSelect.value;
    if (gid) list = list.filter((m) => m.genre_ids?.includes(+gid));
    sortList(list);
    if (list.length) appendMovies(list);
    else if (page === 1) showNoResults("No movies found.");
  } catch (err) {
    if (page === 1) showNoResults("Error fetching data.");
  } finally {
    isLoading = false;
  }
}

function sortList(arr) {
  switch (sortSelect.value) {
    case "pop_asc":
      arr.sort((a, b) => a.popularity - b.popularity);
      break;
    case "pop_desc":
      arr.sort((a, b) => b.popularity - a.popularity);
      break;
    case "date_asc":
      arr.sort((a, b) => new Date(a.release_date) - new Date(b.release_date));
      break;
    case "date_desc":
      arr.sort((a, b) => new Date(b.release_date) - new Date(a.release_date));
      break;
    case "title_asc":
      arr.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case "title_desc":
      arr.sort((a, b) => b.title.localeCompare(a.title));
      break;
  }
}

function appendMovies(movies) {
  movies.forEach((m) => {
    const card = document.createElement("div");
    card.className = "card";
    const img = document.createElement("img");
    img.loading = "lazy";
    img.src = m.poster_path
      ? `https://image.tmdb.org/t/p/original${m.poster_path}`
      : "https://via.placeholder.com/150x225?text=No+Image";
    img.alt = m.title;
    const info = document.createElement("div");
    info.className = "info";
    const h3 = document.createElement("h3");
    h3.textContent = m.title;
    const p = document.createElement("p");
    p.textContent = m.release_date?.slice(0, 4) || "N/A";
    info.append(h3, p);
    card.append(img, info);
    card.onclick = () => showDetails(m.id);
    resultsGrid.append(card);
  });
}

async function showDetails(id) {
  modalBody.innerHTML = "<p>Loading...</p>";
  modal.classList.add("show");
  try {
    const [dRes, vRes] = await Promise.all([
      fetch(buildUrl("/movie", { id })),
      fetch(buildUrl("/videos", { id })),
    ]);
    const data = await dRes.json(),
      vids = (await vRes.json()).results;
    const trailer = vids.find(
      (v) => v.site === "YouTube" && v.type === "Trailer"
    );
    const genres = data.genres.map((g) => g.name).join(", ");
    const rating = data.vote_average.toFixed(1).replace(".", ",");
    const h = Math.floor(data.runtime / 60),
      m = data.runtime % 60;
    const runtime = h > 0 ? `${h}h${m ? ` ${m}min` : ``}` : `${m}min`;
    let html = `<h2>${data.title} (${data.release_date.slice(0, 4)})</h2>
      <p><img src="${
        data.poster_path
          ? `https://image.tmdb.org/t/p/original${data.poster_path}`
          : "https://via.placeholder.com/200x300?text=No+Image"
      }" alt="${data.title} Poster"/></p>
      <p><strong>Rating:</strong> ${rating} / 10</p>
      <p><strong>Runtime:</strong> ${runtime}</p>
      <p><strong>Genres:</strong> ${genres}</p>
      <p>${data.overview}</p>`;
    if (trailer) {
      html += `<h3>Trailer</h3><div class="video-container"><iframe src="https://www.youtube.com/embed/${trailer.key}" frameborder="0" allowfullscreen></iframe></div>`;
    }
    modalBody.innerHTML = html;
  } catch (err) {
    console.error(err);
    modalBody.innerHTML = "<p>Error loading details.</p>";
  }
}

function showNoResults(msg) {
  resultsGrid.innerHTML = `<p class="no-results">${msg}</p>`;
}
