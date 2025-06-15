// Pagination, Favorites & Autocomplete State
// at top of file
let isTrending = false;
let currentQuery = "";
let currentPage = 1;
let totalPages = 1;
let isLoading = false;
const favorites = new Set(
  JSON.parse(localStorage.getItem("favorites") || "[]")
);

// 1) Grab the switch checkbox
const themeSwitch = document.getElementById("theme-toggle");

// 2) On load, initialize its state from localStorage
const savedTheme = localStorage.getItem("theme") || "light";
document.documentElement.setAttribute("data-theme", savedTheme);
themeSwitch.checked = savedTheme === "dark";

// 3) When the user toggles it, flip the theme, persist, and update CSS
themeSwitch.addEventListener("change", () => {
  const newTheme = themeSwitch.checked ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
});

// DOM Elements
const form = document.getElementById("search-form");
const input = document.getElementById("search-input");
const resultsSection = document.getElementById("results");
const acList = document.getElementById("autocomplete-list");
const sortSelect = document.getElementById("sort-select");
const yearFilter = document.getElementById("year-filter");

// Page title clear-home behavior
const title = document.querySelector("header h1");
title.style.cursor = "pointer";
title.addEventListener("click", () => {
  // Reset input and controls
  input.value = "";
  acList.innerHTML = "";
  yearFilter.value = "";
  sortSelect.value = "pop_desc";
  // Reset state and clear results
  currentQuery = "";
  currentPage = 1;
  totalPages = 1;
  resultsSection.innerHTML = "";

  // switch back to trending mode
  isTrending = true;
  fetchTrending(1);
});

// Modal Elements
const modal = document.getElementById("modal");
const modalBody = document.getElementById("modal-body");
const modalClose = document.getElementById("modal-close");

// Debounce helper
function debounce(fn, wait) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}

// Autocomplete on type
input.addEventListener("input", debounce(onType, 300));
async function onType() {
  const q = input.value.trim();
  acList.innerHTML = "";
  if (q.length < 2) return;
  try {
    const res = await fetch(
      `/api/search?query=${encodeURIComponent(q)}&page=1`
    );
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

// Clear autocomplete when clicking outside
document.addEventListener("click", (e) => {
  if (!form.contains(e.target)) acList.innerHTML = "";
});

// Form submission
form.addEventListener("submit", (e) => {
  e.preventDefault();
  acList.innerHTML = "";
  applyControls(input.value.trim());
});

// Apply filters & sort, then search
function applyControls(query) {
  if (!query) return;
  isTrending = false;
  currentQuery = query;
  currentPage = 1;
  resultsSection.innerHTML = "";
  searchMovies(query, 1);
}

// Controls change triggers new search
sortSelect.addEventListener("change", () => applyControls(currentQuery));
yearFilter.addEventListener("input", () => applyControls(currentQuery));

// On page load, show trending
document.addEventListener("DOMContentLoaded", () => {
  isTrending = true;
  currentPage = 1;
  resultsSection.innerHTML = "";
  fetchTrending(currentPage);
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
    if (isTrending) {
      fetchTrending(currentPage);
    } else {
      searchMovies(currentQuery, currentPage);
    }
  }
});

const backToTop = document.getElementById("back-to-top");

// Show/hide button on scroll
window.addEventListener("scroll", () => {
  if (window.scrollY > 300) {
    backToTop.classList.add("show");
  } else {
    backToTop.classList.remove("show");
  }
});

// Smooth scroll to top on click
backToTop.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// Fetch & render trending movies (daily)
async function fetchTrending(page = 1) {
  if (isLoading) return;
  isLoading = true;

  try {
    const res = await fetch(`/api/trending?page=${page}`);
    const data = await res.json();
    totalPages = data.total_pages || 1;
    renderMovies(data.results);
  } catch {
    if (page === 1) showNoResults("Error loading trending movies.");
  } finally {
    isLoading = false;
  }
}

// Fetch movies with pagination
async function searchMovies(query, page = 1) {
  if (isLoading) return;
  isLoading = true;
  try {
    const res = await fetch(
      `/api/search?query=${encodeURIComponent(currentQuery)}&page=${page}`
    );

    const data = await res.json();
    totalPages = data.total_pages || 1;

    if (data.results && data.results.length) {
      // client-side filter & sort
      let movies = data.results.slice();
      const year = yearFilter.value.trim();
      if (year) {
        movies = movies.filter(
          (m) => m.release_date && m.release_date.startsWith(year)
        );
      }
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
    } else if (page === 1) {
      showNoResults("No movies found.");
    }
  } catch {
    if (page === 1) showNoResults("Error fetching data.");
  } finally {
    isLoading = false;
  }
}

// Render movie cards
function renderMovies(movies) {
  movies.forEach((movie) => {
    const card = document.createElement("div");
    card.classList.add("card");

    const img = document.createElement("img");
    img.src = movie.poster_path
      ? `https://image.tmdb.org/t/p/original${movie.poster_path}`
      : "https://via.placeholder.com/150x225?text=No+Image";
    img.alt = `${movie.title} Poster`;

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
    yearEl.textContent = movie.release_date
      ? movie.release_date.slice(0, 4)
      : "N/A";
    info.append(titleEl, yearEl);

    card.append(img, star, info);
    card.addEventListener("click", () => showDetails(movie.id));
    resultsSection.appendChild(card);
  });
}

// Toggle favorite
function toggleFavorite(id) {
  if (favorites.has(id)) favorites.delete(id);
  else favorites.add(id);
  localStorage.setItem("favorites", JSON.stringify([...favorites]));
}

// Show movie details modal
async function showDetails(id) {
  modalBody.innerHTML = "<p>Loading...</p>";
  modal.classList.add("show");
  try {
    // use your Vercel function instead:
    const res = await fetch(`/api/movie/${id}`);
    const data = await res.json();
    const genres = data.genres.map((g) => g.name).join(", ");

    // right after fetching `data`
    const rating = data.vote_average.toFixed(1).replace(".", ".");
    const hours = Math.floor(data.runtime / 60);
    const mins = data.runtime % 60;
    const runtimeStr =
      hours > 0 ? `${hours}h${mins ? ` ${mins}min` : ""}` : `${mins}min`;

    modalBody.innerHTML = `
      <h2>${data.title} (${data.release_date.slice(0, 4)})</h2>
      <p><img src="${
        data.poster_path
          ? `https://image.tmdb.org/t/p/original${data.poster_path}`
          : "https://via.placeholder.com/200x300?text=No+Image"
      }" alt="${data.title} Poster" /></p>
      <p><strong>Rating:</strong> ${rating} / 10</p>
      <p><strong>Runtime:</strong> ${runtimeStr}</p>
      <p><strong>Genres:</strong> ${genres}</p>
      <p>${data.overview}</p>
    `;
  } catch {
    modalBody.innerHTML = "<p>Error loading details.</p>";
  }
}

// Close modal
modalClose.addEventListener("click", () => modal.classList.remove("show"));
modal.addEventListener("click", (e) => {
  if (e.target === modal) modal.classList.remove("show");
});

// Show no results message
function showNoResults(msg) {
  resultsSection.innerHTML = `<p class="no-results">${msg}</p>`;
}

// grab it once
const themeSwitchEl = document.querySelector(".theme-switch");

// on scroll: if user has scrolled past 100px, hide it; otherwise show it
window.addEventListener("scroll", () => {
  if (window.scrollY > 100) {
    themeSwitchEl.classList.add("hidden");
  } else {
    themeSwitchEl.classList.remove("hidden");
  }
});
