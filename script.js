// API key for local TMDB calls
const apiKey = "fbed1e47b7b4825cba22123afb2690fe";

// Pagination, Favorites & Autocomplete State
let isTrending = false;
let currentQuery = "";
let currentPage = 1;
let totalPages = 1;
let isLoading = false;
const favorites = new Set(
  JSON.parse(localStorage.getItem("favorites") || "[]")
);

// Helper: TMDB URL builder (always direct)

function buildUrl(endpoint, queryParams = {}) {
  const params = new URLSearchParams(queryParams).toString();
  return `/api${endpoint}?${params}`;
}

// DOM Elements
const themeSwitch = document.getElementById("theme-toggle");
const form = document.getElementById("search-form");
const input = document.getElementById("search-input");
const resultsSection = document.getElementById("results");
const acList = document.getElementById("autocomplete-list");
const sortSelect = document.getElementById("sort-select");
const yearFilter = document.getElementById("year-filter");
const title = document.querySelector("header h1");
const backToTop = document.getElementById("back-to-top");
const modal = document.getElementById("modal");
const modalBody = document.getElementById("modal-body");
const modalClose = document.getElementById("modal-close");

// Theme toggle setup
const savedTheme = localStorage.getItem("theme") || "light";
document.documentElement.setAttribute("data-theme", savedTheme);
themeSwitch.checked = savedTheme === "dark";
themeSwitch.addEventListener("change", () => {
  const newTheme = themeSwitch.checked ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
});

// Title click resets to trending home
title.style.cursor = "pointer";
title.addEventListener("click", () => {
  input.value = "";
  acList.innerHTML = "";
  yearFilter.value = "";
  sortSelect.value = "pop_desc";
  currentQuery = "";
  currentPage = 1;
  totalPages = 1;
  resultsSection.innerHTML = "";
  isTrending = true;
  fetchTrending(1);
});

// Debounce helper
function debounce(fn, wait) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}

// Autocomplete
input.addEventListener("input", debounce(onType, 300));
async function onType() {
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
        applyControls(m.title);
      });
      acList.appendChild(li);
    });
  } catch {
    /* silent */
  }
}

document.addEventListener("click", (e) => {
  if (!form.contains(e.target)) acList.innerHTML = "";
});

// Form submit
form.addEventListener("submit", (e) => {
  e.preventDefault();
  acList.innerHTML = "";
  applyControls(input.value.trim());
});

function applyControls(query) {
  if (!query) return;
  isTrending = false;
  currentQuery = query;
  currentPage = 1;
  resultsSection.innerHTML = "";
  searchMovies(query, 1);
}

sortSelect.addEventListener("change", () => applyControls(currentQuery));
yearFilter.addEventListener("input", () => applyControls(currentQuery));

// Initial load: show trending
document.addEventListener("DOMContentLoaded", () => {
  isTrending = true;
  currentPage = 1;
  resultsSection.innerHTML = "";
  fetchTrending(1);
});

// Infinite scroll
window.addEventListener("scroll", () => {
  const { scrollTop, scrollHeight } = document.documentElement;
  if (
    !isLoading &&
    currentPage < totalPages &&
    scrollTop + window.innerHeight >= scrollHeight - 100
  ) {
    currentPage++;
    if (isTrending) fetchTrending(currentPage);
    else searchMovies(currentQuery, currentPage);
  }
});

// Back to top
backToTop.addEventListener("click", () =>
  window.scrollTo({ top: 0, behavior: "smooth" })
);
window.addEventListener("scroll", () => {
  backToTop.classList.toggle("show", window.scrollY > 300);
});

// Fetch trending
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

// Search movies
async function searchMovies(query, page = 1) {
  if (isLoading) return;
  isLoading = true;
  try {
    const res = await fetch(buildUrl("/search", { query, page }));
    const data = await res.json();
    totalPages = data.total_pages || 1;

    if (data.results?.length) {
      let movies = data.results.slice();
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
      renderMovies(movies);
    } else if (page === 1) showNoResults("No movies found.");
  } catch {
    if (page === 1) showNoResults("Error fetching data.");
  } finally {
    isLoading = false;
  }
}

// Render cards
function renderMovies(movies) {
  movies.forEach((movie) => {
    const card = document.createElement("div");
    card.classList.add("card");

    const img = document.createElement("img");
    img.src = movie.poster_path
      ? `https://image.tmdb.org/t/p/original${movie.poster_path}`
      : "https://via.placeholder.com/150x225?text=No+Image";
    img.alt = movie.title + " Poster";

    const star = document.createElement("span");
    star.classList.add("star");
    star.textContent = favorites.has(movie.id) ? "★" : "☆";
    star.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFavorite(movie.id);
      star.textContent = favorites.has(movie.id) ? "★" : "☆";
    });

    const info = document.createElement("div");
    info.classList.add("info");
    const titleEl = document.createElement("h3");
    titleEl.textContent = movie.title;
    const yearEl = document.createElement("p");
    yearEl.textContent = movie.release_date?.slice(0, 4) || "N/A";
    info.append(titleEl, yearEl);

    card.append(img, star, info);
    card.addEventListener("click", () => showDetails(movie.id));
    resultsSection.appendChild(card);
  });
}

// Toggle favorite
function toggleFavorite(id) {
  favorites.has(id) ? favorites.delete(id) : favorites.add(id);
  localStorage.setItem("favorites", JSON.stringify([...favorites]));
}

// Show details
async function showDetails(id) {
  modalBody.innerHTML = "<p>Loading...</p>";
  modal.classList.add("show");
  try {
    // 1) main movie details
    const detailsRes = await fetch(buildUrl("/movie", { id }));
    const data = await detailsRes.json();

    // 2) fetch videos (trailers, teasers, etc.)
    const vidsRes = await fetch(buildUrl("/movie/videos", { id }));
    const vids = (await vidsRes.json()).results;
    // pick the first YouTube trailer
    const trailer = vids.find(
      (v) => v.site === "YouTube" && v.type === "Trailer"
    );
    const genres = data.genres.map((g) => g.name).join(", ");
    const rating = data.vote_average.toFixed(1).replace(".", ",");
    const hours = Math.floor(data.runtime / 60);
    const mins = data.runtime % 60;
    const runtimeStr =
      hours > 0 ? `${hours}h${mins ? ` ${mins}min` : ``}` : `${mins}min`;

    // build the details HTML
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

    // if we have a trailer, embed it:
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
  } catch {
    modalBody.innerHTML = "<p>Error loading details.</p>";
  }
}

// Close modal
modalClose.addEventListener("click", () => modal.classList.remove("show"));
modal.addEventListener("click", (e) => {
  if (e.target === modal) modal.classList.remove("show");
});

// No results
function showNoResults(msg) {
  resultsSection.innerHTML = `<p class="no-results">${msg}</p>`;
}

// Hide theme switch on scroll
const themeSwitchEl = document.querySelector(".theme-switch");
window.addEventListener("scroll", () => {
  themeSwitchEl.classList.toggle("hidden", window.scrollY > 100);
});
