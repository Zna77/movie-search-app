//----------------------------------------------------------------------------
// CONFIG & STATE
//----------------------------------------------------------------------------

// Your TMDB key (used only in local/GH fallback)
const apiKey = "fbed1e47b7b4825cba22123afb2690fe";
let isTrending = false;
let currentQuery = "";
let currentPage = 1;
let totalPages = 1;
let isLoading = false;

//----------------------------------------------------------------------------
// HELPERS
//----------------------------------------------------------------------------

/**
 * Build URL for TMDB (local/GH) or /api (Vercel).
 */
function buildUrl(endpoint, qp = {}) {
  const params = new URLSearchParams(qp).toString();
  const host = location.hostname;
  const isLocal = host === "localhost" || host.startsWith("127.");
  const isGH = host.endsWith("github.io");
  const base = "https://api.themoviedb.org/3";

  // Normalize: drop any leading slash
  const key = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;

  // LOCAL or GH-PAGES → direct TMDB
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
      default:
        console.warn("buildUrl: unrecognized endpoint", endpoint);
        return `${base}/${key}?api_key=${apiKey}&${params}`;
    }
  }

  // PRODUCTION (Vercel) → serverless
  return `/api${
    endpoint.startsWith("/") ? endpoint : "/" + endpoint
  }?${params}`;
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
const titleEl = document.querySelector("header h1");
const resultsGrid = document.getElementById("results");
const backToTopBtn = document.getElementById("back-to-top");
const modal = document.getElementById("modal");
const modalBody = document.getElementById("modal-body");
const modalCloseBtn = document.getElementById("modal-close");

//----------------------------------------------------------------------------
// THEME TOGGLE
//----------------------------------------------------------------------------

const savedTheme = localStorage.getItem("theme") || "light";
document.documentElement.setAttribute("data-theme", savedTheme);
themeSwitch.checked = savedTheme === "dark";
themeSwitch.addEventListener("change", () => {
  const newTheme = themeSwitch.checked ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
});

//----------------------------------------------------------------------------
// EVENT LISTENERS
//----------------------------------------------------------------------------

titleEl.style.cursor = "pointer";
titleEl.addEventListener("click", () => {
  resetToTrending();
  fetchTrending(1);
});

input.addEventListener("input", debounce(handleType, 300));

document.addEventListener("click", (e) => {
  if (!form.contains(e.target)) acList.innerHTML = "";
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  acList.innerHTML = "";
  startSearch(input.value.trim());
});

sortSelect.addEventListener("change", () => startSearch(currentQuery));
yearFilter.addEventListener("input", () => startSearch(currentQuery));

window.addEventListener("scroll", () => {
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
});

backToTopBtn.addEventListener("click", () =>
  window.scrollTo({ top: 0, behavior: "smooth" })
);
window.addEventListener("scroll", () => {
  backToTopBtn.classList.toggle("show", window.scrollY > 300);
});

modalCloseBtn.addEventListener("click", () => modal.classList.remove("show"));
modal.addEventListener("click", (e) => {
  if (e.target === modal) modal.classList.remove("show");
});

document.addEventListener("DOMContentLoaded", () => {
  resetToTrending();
  fetchTrending(1);
});

//----------------------------------------------------------------------------
// CORE LOGIC
//----------------------------------------------------------------------------

function resetToTrending() {
  input.value = "";
  acList.innerHTML = "";
  sortSelect.value = "pop_desc";
  yearFilter.value = "";
  currentQuery = "";
  currentPage = 1;
  totalPages = 1;
  resultsGrid.innerHTML = "";
  isTrending = true;
}

async function handleType() {
  const q = input.value.trim();
  acList.innerHTML = "";
  if (q.length < 2) return;
  try {
    const res = await fetch(buildUrl("/search", { query: q, page: 1 }));
    const { results } = await res.json();
    results.slice(0, 5).forEach((m) => {
      const li = document.createElement("li");
      li.textContent = m.title;
      li.addEventListener("click", () => {
        input.value = m.title;
        acList.innerHTML = "";
        startSearch(m.title);
      });
      acList.appendChild(li);
    });
  } catch {
    /* silent */
  }
}

function startSearch(q) {
  if (!q) return;
  isTrending = false;
  currentQuery = q;
  currentPage = 1;
  totalPages = 1;
  resultsGrid.innerHTML = "";
  searchMovies(q, 1);
}

async function fetchTrending(page = 1) {
  if (isLoading) return;
  isLoading = true;
  try {
    const res = await fetch(buildUrl("/trending", { page }));
    const data = await res.json();
    totalPages = data.total_pages || 1;
    renderMovies(data.results);
  } catch {
    if (page === 1) showNoResults("Error loading trending movies.");
  } finally {
    isLoading = false;
  }
}

async function searchMovies(query, page = 1) {
  if (isLoading) return;
  isLoading = true;
  try {
    const res = await fetch(buildUrl("/search", { query, page }));
    const data = await res.json();
    totalPages = data.total_pages || 1;
    let movies = (data.results || []).slice();
    const year = yearFilter.value.trim();
    if (year) movies = movies.filter((m) => m.release_date?.startsWith(year));
    switch (sortSelect.value) {
      case "pop_asc":
        movies.sort((a, b) => a.popularity - b.popularity);
        break;
      case "pop_desc":
        movies.sort((a, b) => b.popularity - a.popularity);
        break;
      case "date_asc":
        movies.sort(
          (a, b) => new Date(a.release_date) - new Date(b.release_date)
        );
        break;
      case "date_desc":
        movies.sort(
          (a, b) => new Date(b.release_date) - new Date(a.release_date)
        );
        break;
      case "title_asc":
        movies.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "title_desc":
        movies.sort((a, b) => b.title.localeCompare(a.title));
        break;
    }
    if (movies.length) renderMovies(movies);
    else if (page === 1) showNoResults("No movies found.");
  } catch {
    if (page === 1) showNoResults("Error fetching data.");
  } finally {
    isLoading = false;
  }
}

function renderMovies(movies) {
  movies.forEach((movie) => {
    const card = document.createElement("div");
    card.className = "card";
    const img = document.createElement("img");
    img.loading = "lazy";
    img.src = movie.poster_path
      ? `https://image.tmdb.org/t/p/original${movie.poster_path}`
      : "https://via.placeholder.com/150x225?text=No+Image";
    img.alt = movie.title;
    const info = document.createElement("div");
    info.className = "info";
    const h3 = document.createElement("h3");
    h3.textContent = movie.title;
    const p = document.createElement("p");
    p.textContent = movie.release_date?.slice(0, 4) || "N/A";
    info.append(h3, p);
    card.append(img, info);
    card.addEventListener("click", () => showDetails(movie.id));
    resultsGrid.appendChild(card);
  });
}

async function showDetails(id) {
  modalBody.innerHTML = "<p>Loading...</p>";
  modal.classList.add("show");
  try {
    const dRes = await fetch(buildUrl("/movie", { id }));
    const data = await dRes.json();
    const vRes = await fetch(buildUrl("/videos", { id }));
    const vids = (await vRes.json()).results;
    const trailer = vids.find(
      (v) => v.site === "YouTube" && v.type === "Trailer"
    );
    const genres = data.genres.map((g) => g.name).join(", ");
    const rating = data.vote_average.toFixed(1).replace(".", ",");
    const hours = Math.floor(data.runtime / 60);
    const mins = data.runtime % 60;
    const runtimeStr =
      hours > 0 ? `${hours}h${mins ? ` ${mins}min` : ``}` : `${mins}min`;
    let html = `
      <h2>${data.title} (${data.release_date.slice(0, 4)})</h2>
      <p><img src="${
        data.poster_path
          ? `https://image.tmdb.org/t/p/original${data.poster_path}`
          : `https://via.placeholder.com/200x300?text=No+Image`
      }" alt="${data.title} Poster"/></p>
      <p><strong>Rating:</strong> ${rating} / 10</p>
      <p><strong>Runtime:</strong> ${runtimeStr}</p>
      <p><strong>Genres:</strong> ${genres}</p>
      <p>${data.overview}</p>
    `;
    if (trailer) {
      html += `
        <h3>Trailer</h3>
        <div class="video-container">
          <iframe
            src="https://www.youtube.com/embed/${trailer.key}"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          ></iframe>
        </div>
      `;
    }
    modalBody.innerHTML = html;
  } catch (err) {
    console.error("Detail load error:", err);
    modalBody.innerHTML = "<p>Error loading details.</p>";
  }
}

function showNoResults(msg) {
  resultsGrid.innerHTML = `<p class="no-results">${msg}</p>`;
}
