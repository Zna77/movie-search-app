"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const POSTER_BASE = "https://image.tmdb.org/t/p";
const POSTER_SIZE_CARD = "w342";
const POSTER_SIZE_MODAL = "w500";
const FALLBACK_POSTER = "/poster-placeholder.svg";
const VIDSRC_BASE = process.env.NEXT_PUBLIC_VIDSRC_BASE || "https://vidsrc-embed.ru";

function getMediaType(item) {
  if (item?.media_type === "tv" || item?.name || item?.first_air_date) return "tv";
  return "movie";
}

function getMediaTitle(item) {
  return item?.title || item?.name || "Untitled";
}

function getMediaDate(item) {
  return item?.release_date || item?.first_air_date || "";
}

function getMediaYear(item) {
  const date = getMediaDate(item);
  return date ? date.slice(0, 4) : "N/A";
}

function toPlayable(item) {
  const mediaType = getMediaType(item);
  if (mediaType !== "movie" && mediaType !== "tv") return null;
  return { ...item, media_type: mediaType };
}

function filterPlayable(list) {
  return (list || []).map(toPlayable).filter(Boolean);
}

function getMediaIdentity(item) {
  return `${item.media_type}-${item.id}`;
}

function dedupeMedia(list) {
  const map = new Map();
  for (const item of list || []) {
    if (!item || item.id == null || !item.media_type) continue;
    const key = getMediaIdentity(item);
    if (!map.has(key)) {
      map.set(key, item);
    }
  }
  return Array.from(map.values());
}

function buildPlayerUrl(mediaType, id, season = 1, episode = 1) {
  const base = VIDSRC_BASE.replace(/\/$/, "");
  if (mediaType === "tv") {
    return `${base}/embed/tv/${encodeURIComponent(String(id))}/${season}-${episode}`;
  }
  return `${base}/embed/movie/${encodeURIComponent(String(id))}`;
}

function getPosterUrl(path, size) {
  return path ? `${POSTER_BASE}/${size}${path}` : FALLBACK_POSTER;
}

function handlePosterError(event) {
  if (event.currentTarget.src.includes(FALLBACK_POSTER)) return;
  event.currentTarget.src = FALLBACK_POSTER;
}

function sortMedia(arr, sort) {
  const list = [...arr];
  switch (sort) {
    case "pop_asc":
      list.sort((a, b) => (a.popularity || 0) - (b.popularity || 0));
      break;
    case "pop_desc":
      list.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
      break;
    case "date_asc":
      list.sort((a, b) => new Date(getMediaDate(a) || 0) - new Date(getMediaDate(b) || 0));
      break;
    case "date_desc":
      list.sort((a, b) => new Date(getMediaDate(b) || 0) - new Date(getMediaDate(a) || 0));
      break;
    case "title_asc":
      list.sort((a, b) => getMediaTitle(a).localeCompare(getMediaTitle(b)));
      break;
    case "title_desc":
      list.sort((a, b) => getMediaTitle(b).localeCompare(getMediaTitle(a)));
      break;
    default:
      break;
  }
  return list;
}

export default function Home() {
  const [theme, setTheme] = useState("light");
  const [searchInput, setSearchInput] = useState("");
  const [autocomplete, setAutocomplete] = useState([]);

  const [sort, setSort] = useState("pop_desc");
  const [year, setYear] = useState("");
  const [genre, setGenre] = useState("");
  const [genres, setGenres] = useState([]);

  const [results, setResults] = useState([]);
  const [noResultsMessage, setNoResultsMessage] = useState("");

  const [isTrending, setIsTrending] = useState(true);
  const [currentQuery, setCurrentQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [isLoading, setIsLoading] = useState(false);
  const loadingRef = useRef(false);
  const autocompleteCacheRef = useRef(new Map());

  const [showBackToTop, setShowBackToTop] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modalItem, setModalItem] = useState(null);
  const [modalMediaType, setModalMediaType] = useState("movie");
  const [seasonInput, setSeasonInput] = useState(1);
  const [episodeInput, setEpisodeInput] = useState(1);
  const [playerUrl, setPlayerUrl] = useState("");
  const [playerState, setPlayerState] = useState("idle");
  const [trailerKey, setTrailerKey] = useState("");

  const fetchTrending = useCallback(async (page = 1, genreOverride = "") => {
    if (loadingRef.current) return;

    loadingRef.current = true;
    setIsLoading(true);

    try {
      const response = await fetch(`/api/trending?page=${page}`);
      const data = await response.json();

      const playable = filterPlayable(data.results);
      const filtered = genreOverride
        ? playable.filter((item) => item.genre_ids?.includes(Number(genreOverride)))
        : playable;

      setTotalPages(data.total_pages || 1);
      setResults((prev) => {
        const merged = page === 1 ? filtered : [...prev, ...filtered];
        return dedupeMedia(merged);
      });
      if (page === 1) {
        setNoResultsMessage(filtered.length === 0 ? "No results found." : "");
      }
    } catch {
      if (page === 1) {
        setResults([]);
        setNoResultsMessage("Error loading trending content.");
      }
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  }, []);

  const searchMedia = useCallback(
    async (query, page = 1, options = {}) => {
      if (loadingRef.current) return;

      const selectedYear = options.year ?? year;
      const selectedGenre = options.genre ?? genre;
      const selectedSort = options.sort ?? sort;

      loadingRef.current = true;
      setIsLoading(true);

      try {
        const response = await fetch(`/api/search?query=${encodeURIComponent(query)}&page=${page}`);
        const data = await response.json();

        let list = filterPlayable(data.results);
        if (selectedYear) {
          list = list.filter((item) => getMediaDate(item).startsWith(selectedYear));
        }
        if (selectedGenre) {
          list = list.filter((item) => item.genre_ids?.includes(Number(selectedGenre)));
        }

        list = sortMedia(list, selectedSort);

        setTotalPages(data.total_pages || 1);
        setResults((prev) => {
          const merged = page === 1 ? list : [...prev, ...list];
          return dedupeMedia(merged);
        });
        if (page === 1) {
          setNoResultsMessage(list.length === 0 ? "No results found." : "");
        }
      } catch {
        if (page === 1) {
          setResults([]);
          setNoResultsMessage("Error fetching data.");
        }
      } finally {
        loadingRef.current = false;
        setIsLoading(false);
      }
    },
    [genre, sort, year]
  );

  const resetToTrending = useCallback(async () => {
    setSearchInput("");
    setAutocomplete([]);
    setSort("pop_desc");
    setYear("");
    setGenre("");
    setCurrentQuery("");
    setCurrentPage(1);
    setTotalPages(1);
    setResults([]);
    setNoResultsMessage("");
    setIsTrending(true);
    await fetchTrending(1, "");
  }, [fetchTrending]);

  const showDetails = useCallback(async (id, mediaType) => {
    setModalOpen(true);
    setModalLoading(true);
    setModalError("");
    setModalItem(null);
    setTrailerKey("");
    setSeasonInput(1);
    setEpisodeInput(1);
    setPlayerUrl(buildPlayerUrl(mediaType, id, 1, 1));
    setPlayerState("loading");
    setModalMediaType(mediaType);

    try {
      const [detailRes, videoRes] = await Promise.all([
        fetch(`/api/movie?id=${id}&type=${mediaType}`),
        fetch(`/api/videos?id=${id}&type=${mediaType}`),
      ]);

      if (!detailRes.ok || !videoRes.ok) {
        throw new Error("Failed to load details");
      }

      const detailData = await detailRes.json();
      const videoData = await videoRes.json();

      const trailer = (videoData.results || []).find(
        (video) => video.site === "YouTube" && video.type === "Trailer"
      );

      setModalItem({ ...detailData, media_type: mediaType });
      setTrailerKey(trailer?.key || "");
    } catch {
      setModalError("Error loading details.");
    } finally {
      setModalLoading(false);
    }
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "light";
    setTheme(savedTheme);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const loadGenres = async () => {
      try {
        const response = await fetch("/api/genres");
        const data = await response.json();
        setGenres(data.genres || []);
      } catch {
        setGenres([]);
      }
    };

    loadGenres();
    fetchTrending(1, "");
  }, [fetchTrending]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const query = searchInput.trim();
      if (query.length < 2) {
        setAutocomplete([]);
        return;
      }

      const cached = autocompleteCacheRef.current.get(query);
      if (cached) {
        setAutocomplete(cached);
        return;
      }

      try {
        const response = await fetch(`/api/search?query=${encodeURIComponent(query)}&page=1`);
        const data = await response.json();
        const list = dedupeMedia(filterPlayable(data.results)).slice(0, 5);
        autocompleteCacheRef.current.set(query, list);
        setAutocomplete(list);
      } catch {
        setAutocomplete([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let rafId = null;

    const onScroll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;

        const scrollTop = window.scrollY;
        const scrollHeight = document.documentElement.scrollHeight;
        const bottomReached = scrollTop + window.innerHeight >= scrollHeight - 100;

        setShowBackToTop(scrollTop > 300);

        if (bottomReached && !loadingRef.current && currentPage < totalPages) {
          const nextPage = currentPage + 1;
          setCurrentPage(nextPage);
          if (isTrending) {
            fetchTrending(nextPage, genre);
          } else if (currentQuery) {
            searchMedia(currentQuery, nextPage);
          }
        }
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [currentPage, totalPages, isTrending, currentQuery, genre, fetchTrending, searchMedia]);

  useEffect(() => {
    const onEscape = (event) => {
      if (event.key === "Escape") {
        setModalOpen(false);
      }
    };

    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, []);

  const startSearch = async (query) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setIsTrending(false);
    setCurrentQuery(trimmed);
    setCurrentPage(1);
    setTotalPages(1);
    setResults([]);
    setNoResultsMessage("");
    await searchMedia(trimmed, 1);
  };

  const onSortChange = async (event) => {
    const newSort = event.target.value;
    setSort(newSort);

    if (!isTrending && currentQuery) {
      setCurrentPage(1);
      setTotalPages(1);
      setResults([]);
      setNoResultsMessage("");
      await searchMedia(currentQuery, 1, { sort: newSort });
    }
  };

  const onYearChange = async (event) => {
    const newYear = event.target.value;
    setYear(newYear);

    if (!isTrending && currentQuery) {
      setCurrentPage(1);
      setTotalPages(1);
      setResults([]);
      setNoResultsMessage("");
      await searchMedia(currentQuery, 1, { year: newYear });
    }
  };

  const onGenreChange = async (event) => {
    const newGenre = event.target.value;
    setGenre(newGenre);
    setCurrentPage(1);
    setTotalPages(1);
    setResults([]);
    setNoResultsMessage("");

    if (isTrending) {
      await fetchTrending(1, newGenre);
      return;
    }

    if (currentQuery) {
      await searchMedia(currentQuery, 1, { genre: newGenre });
    }
  };

  const updateEpisodePlayback = (seasonValue, episodeValue) => {
    const parsedSeason = Number.parseInt(String(seasonValue), 10);
    const parsedEpisode = Number.parseInt(String(episodeValue), 10);

    const seasonNumber = Number.isFinite(parsedSeason)
      ? Math.max(1, parsedSeason)
      : 1;
    const episodeNumber = Number.isFinite(parsedEpisode)
      ? Math.max(1, parsedEpisode)
      : 1;

    const safeSeasonNumber = seasonCount > 0 ? Math.min(seasonNumber, seasonCount) : seasonNumber;
    setSeasonInput(safeSeasonNumber);
    setEpisodeInput(episodeNumber);

    if (modalItem && modalMediaType === "tv") {
      setPlayerUrl(buildPlayerUrl("tv", modalItem.id, safeSeasonNumber, episodeNumber));
      setPlayerState("loading");
    }
  };

  const adjustEpisodeValue = (field, delta) => {
    if (field === "season") {
      updateEpisodePlayback(seasonInput + delta, episodeInput);
      return;
    }
    updateEpisodePlayback(seasonInput, episodeInput + delta);
  };

  const modalYear = modalItem ? getMediaYear(modalItem) : "N/A";
  const modalRating = Number.isFinite(modalItem?.vote_average)
    ? modalItem.vote_average.toFixed(1).replace(".", ",")
    : "N/A";

  const movieMinutes = Number.isFinite(modalItem?.runtime) ? modalItem.runtime : 0;
  const hours = Math.floor(movieMinutes / 60);
  const minutes = movieMinutes % 60;
  const movieRuntime = movieMinutes
    ? hours > 0
      ? `${hours}h${minutes ? ` ${minutes}min` : ""}`
      : `${minutes}min`
    : "N/A";

  const seasonCount = Number.isFinite(modalItem?.number_of_seasons)
    ? modalItem.number_of_seasons
    : 0;
  const episodeCount = Number.isFinite(modalItem?.number_of_episodes)
    ? modalItem.number_of_episodes
    : 0;
  const tvRuntime = seasonCount
    ? `${seasonCount} season${seasonCount > 1 ? "s" : ""}${
        episodeCount ? ` - ${episodeCount} episodes` : ""
      }`
    : "N/A";

  useEffect(() => {
    if (!playerUrl || !modalOpen) return;
    setPlayerState("loading");

    const timeout = window.setTimeout(() => {
      setPlayerState((prev) => (prev === "ready" ? prev : "error"));
    }, 9000);

    return () => window.clearTimeout(timeout);
  }, [playerUrl, modalOpen]);

  return (
    <>
      <div className="theme-switch">
        <input
          type="checkbox"
          id="theme-toggle"
          aria-label="Toggle light and dark mode"
          checked={theme === "dark"}
          onChange={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
        />
        <label htmlFor="theme-toggle" className="switch" />
      </div>

      <div className="container">
        <header>
          <h1 onClick={resetToTrending}>🎬 Movie & Series Search App</h1>
        </header>

        <form
          id="search-form"
          autoComplete="off"
          onSubmit={async (event) => {
            event.preventDefault();
            setAutocomplete([]);
            await startSearch(searchInput);
          }}
        >
          <input
            type="text"
            id="search-input"
            placeholder="Search for movies or series..."
            required
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
          {autocomplete.length > 0 && (
            <div className="autocomplete">
              <ul>
                {autocomplete.map((item) => (
                  <li
                    key={`${item.media_type}-${item.id}`}
                    onClick={async () => {
                      setSearchInput(getMediaTitle(item));
                      setAutocomplete([]);
                      await startSearch(getMediaTitle(item));
                    }}
                  >
                    {getMediaTitle(item)} ({item.media_type === "tv" ? "TV" : "Movie"})
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button type="submit">Search</button>
        </form>

        <div className="controls">
          <select value={sort} onChange={onSortChange}>
            <option value="pop_desc">Popularity ↓</option>
            <option value="pop_asc">Popularity ↑</option>
            <option value="date_desc">Release Date ↓</option>
            <option value="date_asc">Release Date ↑</option>
            <option value="title_asc">Title A-Z</option>
            <option value="title_desc">Title Z-A</option>
          </select>

          <input
            type="number"
            placeholder="Year (e.g. 2020)"
            min="1900"
            max="2099"
            value={year}
            onChange={onYearChange}
          />

          <select id="genre-select" value={genre} onChange={onGenreChange}>
            <option value="">All Genres</option>
            {genres.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        <section className="results-grid">
          {results.map((item, index) => (
            <button
              key={getMediaIdentity(item)}
              className="card"
              onClick={() => showDetails(item.id, item.media_type)}
            >
              <img
                loading={index < 4 ? "eager" : "lazy"}
                fetchPriority={index < 2 ? "high" : "auto"}
                decoding="async"
                src={getPosterUrl(item.poster_path, POSTER_SIZE_CARD)}
                alt={getMediaTitle(item)}
                width="342"
                height="513"
                onError={handlePosterError}
              />
              <div className="info">
                <h3>{getMediaTitle(item)}</h3>
                <p>{getMediaYear(item)}</p>
                <p className="media-badge">{item.media_type === "tv" ? "TV Series" : "Movie"}</p>
              </div>
            </button>
          ))}
        </section>

        {noResultsMessage && <p className="no-results">{noResultsMessage}</p>}
        {isLoading && currentPage === 1 && <p className="no-results">Loading...</p>}
      </div>

      <div
        className={`modal ${modalOpen ? "show" : ""}`}
        onClick={(event) => {
          if (event.target.classList.contains("modal")) {
            setModalOpen(false);
          }
        }}
      >
        <div className="modal-content">
          <button className="modal-close" onClick={() => setModalOpen(false)}>
            &times;
          </button>
          {modalLoading && <p>Loading...</p>}
          {modalError && <p>{modalError}</p>}
          {!modalLoading && !modalError && modalItem && (
            <>
              <h2>
                {getMediaTitle(modalItem)} ({modalYear})
              </h2>
              <p>
                <strong>Type:</strong> {modalMediaType === "tv" ? "TV Series" : "Movie"}
              </p>
              <p>
                <img
                  src={getPosterUrl(modalItem.poster_path, POSTER_SIZE_MODAL)}
                  alt={`${getMediaTitle(modalItem)} Poster`}
                  width="500"
                  height="750"
                  decoding="async"
                  onError={handlePosterError}
                />
              </p>
              <p>
                <strong>Rating:</strong> {modalRating} / 10
              </p>
              <p>
                <strong>{modalMediaType === "tv" ? "Length:" : "Runtime:"}</strong>{" "}
                {modalMediaType === "tv" ? tvRuntime : movieRuntime}
              </p>
              <p>
                <strong>Genres:</strong> {(modalItem.genres || []).map((item) => item.name).join(", ") || "N/A"}
              </p>
              <p>{modalItem.overview || "No overview available."}</p>

              {playerUrl && (
                <>
                  <h3>Watch Now</h3>
                  <a
                    className="player-open-link"
                    href={playerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open Player in Full Screen
                  </a>
                  {playerState !== "ready" && (
                    <p className="player-hint">
                      If playback looks empty on mobile, use the button above to open the player directly.
                    </p>
                  )}
                  {modalMediaType === "tv" && (
                    <div className="episode-controls" role="group" aria-label="Season and episode selector">
                      <label className="episode-field" htmlFor="season-input">
                        <span className="episode-label">Season</span>
                        <div className="stepper">
                          <button
                            type="button"
                            className="step-btn"
                            aria-label="Previous season"
                            onClick={() => adjustEpisodeValue("season", -1)}
                            disabled={seasonInput <= 1}
                          >
                            -
                          </button>
                          <input
                            id="season-input"
                            type="number"
                            min="1"
                            max={seasonCount || undefined}
                            value={seasonInput}
                            onChange={(event) =>
                              updateEpisodePlayback(event.target.value, episodeInput)
                            }
                            inputMode="numeric"
                            pattern="[0-9]*"
                            aria-label="Season number"
                          />
                          <button
                            type="button"
                            className="step-btn"
                            aria-label="Next season"
                            onClick={() => adjustEpisodeValue("season", 1)}
                            disabled={seasonCount > 0 && seasonInput >= seasonCount}
                          >
                            +
                          </button>
                        </div>
                      </label>

                      <label className="episode-field" htmlFor="episode-input">
                        <span className="episode-label">Episode</span>
                        <div className="stepper">
                          <button
                            type="button"
                            className="step-btn"
                            aria-label="Previous episode"
                            onClick={() => adjustEpisodeValue("episode", -1)}
                            disabled={episodeInput <= 1}
                          >
                            -
                          </button>
                          <input
                            id="episode-input"
                            type="number"
                            min="1"
                            value={episodeInput}
                            onChange={(event) =>
                              updateEpisodePlayback(seasonInput, event.target.value)
                            }
                            inputMode="numeric"
                            pattern="[0-9]*"
                            aria-label="Episode number"
                          />
                          <button
                            type="button"
                            className="step-btn"
                            aria-label="Next episode"
                            onClick={() => adjustEpisodeValue("episode", 1)}
                          >
                            +
                          </button>
                        </div>
                      </label>
                    </div>
                  )}
                  <div className="video-container">
                    <iframe
                      src={playerUrl}
                      allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                      allowFullScreen
                      title="Embedded Player"
                      referrerPolicy="unsafe-url"
                      onLoad={() => setPlayerState("ready")}
                      onError={() => setPlayerState("error")}
                    />
                  </div>
                  {playerState === "error" && (
                    <p className="player-error">
                      Mobile browser blocked the embedded player. Tap "Open Player in Full Screen" to watch.
                    </p>
                  )}
                </>
              )}

              {trailerKey && (
                <>
                  <h3>Trailer</h3>
                  <div className="video-container">
                    <iframe
                      src={`https://www.youtube.com/embed/${trailerKey}`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title="Movie Trailer"
                    />
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <button
        className={`back-to-top ${showBackToTop ? "show" : ""}`}
        aria-label="Back to top"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        ⬆️
      </button>
    </>
  );
}
