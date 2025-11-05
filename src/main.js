const API_KEY = "95bbd2d6";
const API_URL = "https://www.omdbapi.com/";

const input = document.querySelector("#searchInput");
const filter = document.querySelector("#typeFilter");
const results = document.querySelector("#results");
const loadBtn = document.querySelector("#loadMore");

let currentController = null;
let lastQuery = "";
let lastType = "";
let page = 1;
let totalResults = 0;

function debounce(fn, ms = 400) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function capFirst(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
function clamp(s, n = 40) { return s.length > n ? s.slice(0, n - 1) + "…" : s; }

async function fetchMovies(query, type, pageNum = 1) {
  if (!query || query.trim().length < 2) return { Search: [], Response: "False" };

  if (currentController) currentController.abort();
  currentController = new AbortController();

  const params = new URLSearchParams({
    apikey: API_KEY,
    s: query.trim(),
    type: type || "",
    page: String(pageNum),
  });

  const res = await fetch(`${API_URL}?${params.toString()}`, { signal: currentController.signal });
  if (!res.ok) throw new Error(res.status);
  return res.json();
}

function showEmpty(msg = "No results") { results.innerHTML = `<div class="state">${msg}</div>`; }
function showLoading() { results.innerHTML = `<div class="state loading">Loading<span class="dots"></span></div>`; }
function showError() { results.innerHTML = `<div class="state">Error occurred</div>`; }

function renderCards(list, { append = false } = {}) {
  if (!list || !list.length) {
    if (!append) showEmpty("No results");
    return;
  }

  const html = `
    <div class="movies-grid">
      ${list.map(m => {
    const poster = m.Poster && m.Poster !== "N/A"
      ? m.Poster
      : "https://dummyimage.com/600x900/111a33/ffffff&text=No+Poster";
    return `
          <article class="card">
            <img class="poster" src="${poster}" alt="${m.Title}" />
            <div class="caption">
              <div class="cap-title">${clamp(capFirst(m.Title), 28)}</div>
              <div class="cap-year">${m.Year || ""}</div>
            </div>
          </article>
        `;
  }).join("")}
    </div>
  `;

  if (append && results.firstElementChild?.classList.contains("movies-grid")) {
    results.firstElementChild.insertAdjacentHTML("beforeend",
      html.match(/<div class="movies-grid">([\s\S]*)<\/div>/)[1]
    );
  } else {
    results.innerHTML = html;
  }
}

const onSearch = debounce(async () => {
  input.value = capFirst(input.value);
  const q = input.value.trim();
  const t = filter.value;

  if (q.length < 2) {
    showEmpty("Type at least 2 characters…");
    loadBtn.hidden = true;
    return;
  }

  try {
    showLoading();
    page = 1;
    lastQuery = q;
    lastType = t;

    const data = await fetchMovies(q, t, page);
    if (data.Response === "True") {
      totalResults = Number(data.totalResults || 0);
      renderCards(data.Search);
      loadBtn.hidden = (page * 10 >= totalResults);
    } else {
      showEmpty("No results");
      loadBtn.hidden = true;
    }
  } catch (e) {
    if (e.name !== "AbortError") showError();
    loadBtn.hidden = true;
  }
}, 400);

input.addEventListener("input", onSearch);
filter.addEventListener("change", onSearch);

loadBtn.addEventListener("click", async () => {
  try {
    loadBtn.disabled = true;
    loadBtn.textContent = "Loading…";
    page++;
    const data = await fetchMovies(lastQuery, lastType, page);
    if (data.Response === "True") {
      renderCards(data.Search, { append: true });
    }
    loadBtn.hidden = (page * 10 >= totalResults);
  } finally {
    loadBtn.disabled = false;
    loadBtn.textContent = "Load more";
  }
});

input.value = "Supernatural";
onSearch();
