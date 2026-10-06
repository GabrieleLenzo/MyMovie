"use strict";

const STORAGE_KEY = "mymovie.movies.v1";
const MAX_IMAGE_SIZE = 640; // px, lato lungo dell'immagine salvata

const $ = (id) => document.getElementById(id);

const overlay = $("modalOverlay");
const modalTitle = $("modalTitle");
const openBtn = $("openModalBtn");
const closeBtn = $("closeModalBtn");
const cancelBtn = $("cancelBtn");
const form = $("movieForm");

const titleInput = $("movieTitle");
const fileInput = $("movieFile");
const reviewInput = $("movieReview");
const preview = $("imagePreview");
const formError = $("formError");

const moviesGrid = $("moviesGrid");
const emptyState = $("emptyState");
const movieCount = $("movieCount");
const searchInput = $("searchInput");
const sortSelect = $("sortSelect");
const toast = $("toast");

let movies = loadMovies();
let editingId = null; // id del film in modifica, null = nuovo
let currentImage = null; // data URL dell'immagine nel form
let lastFocused = null;
let toastTimer = null;

/* ---------- STORAGE ---------- */

function loadMovies() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveMovies() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(movies));
    return true;
  } catch {
    showToast("Spazio di archiviazione pieno: impossibile salvare.");
    return false;
  }
}

/* ---------- IMMAGINI ---------- */

// Ridimensiona e comprime l'immagine per poterla salvare in localStorage.
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_IMAGE_SIZE / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Immagine non valida"));
    };
    img.src = url;
  });
}

fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  if (!file) return;
  try {
    currentImage = await fileToDataUrl(file);
    showPreview(currentImage);
    hideError();
  } catch {
    currentImage = null;
    fileInput.value = "";
    preview.classList.add("hidden");
    showError("Il file selezionato non è un'immagine valida.");
  }
});

function showPreview(src) {
  preview.src = src;
  preview.classList.remove("hidden");
}

/* ---------- MODALE ---------- */

function openModal(movie = null) {
  lastFocused = document.activeElement;
  editingId = movie ? movie.id : null;
  form.reset();
  hideError();
  currentImage = movie ? movie.image : null;

  modalTitle.textContent = movie ? "Modifica film" : "Aggiungi film";
  fileInput.required = !movie;

  if (movie) {
    titleInput.value = movie.title;
    reviewInput.value = movie.review;
    form.elements.rating.value = String(movie.rating);
    showPreview(movie.image);
  } else {
    preview.classList.add("hidden");
  }

  overlay.classList.remove("hidden");
  overlay.setAttribute("aria-hidden", "false");
  document.body.classList.add("no-scroll");
  titleInput.focus();
}

function closeModal() {
  overlay.classList.add("hidden");
  overlay.setAttribute("aria-hidden", "true");
  document.body.classList.remove("no-scroll");
  form.reset();
  editingId = null;
  currentImage = null;
  if (lastFocused && document.contains(lastFocused)) lastFocused.focus();
}

openBtn.addEventListener("click", () => openModal());
closeBtn.addEventListener("click", closeModal);
cancelBtn.addEventListener("click", closeModal);

overlay.addEventListener("mousedown", (e) => {
  if (e.target === overlay) closeModal();
});

document.addEventListener("keydown", (e) => {
  if (overlay.classList.contains("hidden")) return;

  if (e.key === "Escape") {
    closeModal();
    return;
  }

  // Focus trap dentro la modale
  if (e.key === "Tab") {
    const focusable = overlay.querySelectorAll(
      "button, input, textarea, select, [href], [tabindex]:not([tabindex='-1'])"
    );
    const items = [...focusable].filter((el) => !el.disabled && el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
});

function showError(msg) {
  formError.textContent = msg;
  formError.classList.remove("hidden");
}

function hideError() {
  formError.textContent = "";
  formError.classList.add("hidden");
}

/* ---------- SUBMIT ---------- */

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const title = titleInput.value.trim();
  const review = reviewInput.value.trim();
  const rating = Number(form.elements.rating.value);

  if (!title || !review) {
    showError("Titolo e recensione non possono essere vuoti.");
    return;
  }
  if (!currentImage) {
    showError("Seleziona un'immagine.");
    return;
  }
  if (!(rating >= 1 && rating <= 5)) {
    showError("Seleziona un voto da 1 a 5.");
    return;
  }

  const previous = movies;
  if (editingId) {
    movies = movies.map((m) =>
      m.id === editingId ? { ...m, title, review, rating, image: currentImage } : m
    );
  } else {
    movies = [
      { id: crypto.randomUUID(), title, review, rating, image: currentImage, createdAt: Date.now() },
      ...movies,
    ];
  }

  if (!saveMovies()) {
    movies = previous;
    return;
  }

  const wasEditing = Boolean(editingId);
  closeModal();
  render();
  showToast(wasEditing ? "Film aggiornato." : "Film aggiunto.");
});

/* ---------- RENDER ---------- */

function stars(rating) {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

function getVisibleMovies() {
  const q = searchInput.value.trim().toLowerCase();
  const list = movies.filter(
    (m) => !q || m.title.toLowerCase().includes(q) || m.review.toLowerCase().includes(q)
  );

  const sorters = {
    newest: (a, b) => b.createdAt - a.createdAt,
    oldest: (a, b) => a.createdAt - b.createdAt,
    "rating-desc": (a, b) => b.rating - a.rating || b.createdAt - a.createdAt,
    "rating-asc": (a, b) => a.rating - b.rating || b.createdAt - a.createdAt,
    title: (a, b) => a.title.localeCompare(b.title, "it", { sensitivity: "base" }),
  };
  return list.sort(sorters[sortSelect.value] || sorters.newest);
}

function createCard(movie) {
  const card = document.createElement("article");
  card.className = "card";
  card.dataset.id = movie.id;

  const img = document.createElement("img");
  img.className = "card__img";
  img.src = movie.image;
  img.alt = `Locandina di ${movie.title}`;
  img.loading = "lazy";

  const body = document.createElement("div");
  body.className = "card__body";

  const h3 = document.createElement("h3");
  h3.className = "card__title";
  h3.textContent = movie.title;

  const meta = document.createElement("div");
  meta.className = "card__meta";
  meta.setAttribute("aria-label", `Voto: ${movie.rating} su 5`);
  const starsEl = document.createElement("span");
  starsEl.className = "stars";
  starsEl.setAttribute("aria-hidden", "true");
  starsEl.textContent = stars(movie.rating);
  const date = document.createElement("span");
  date.className = "card__date";
  date.textContent = new Date(movie.createdAt).toLocaleDateString("it-IT");
  meta.append(starsEl, date);

  const p = document.createElement("p");
  p.className = "card__review";
  p.textContent = movie.review;

  const actions = document.createElement("div");
  actions.className = "card__actions";
  actions.append(
    actionButton("Modifica", "edit", `Modifica ${movie.title}`),
    actionButton("Elimina", "delete", `Elimina ${movie.title}`, true)
  );

  body.append(h3, meta, p, actions);
  card.append(img, body);
  return card;
}

function actionButton(label, action, ariaLabel, danger = false) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "btn btn--small " + (danger ? "btn--danger" : "btn--ghost");
  b.dataset.action = action;
  b.textContent = label;
  b.setAttribute("aria-label", ariaLabel);
  return b;
}

function render() {
  const visible = getVisibleMovies();
  moviesGrid.replaceChildren(...visible.map(createCard));
  movieCount.textContent = String(movies.length);

  if (!visible.length) {
    emptyState.textContent = movies.length
      ? "Nessun film corrisponde alla ricerca."
      : "Nessun film ancora. Clicca “Aggiungi film” per iniziare!";
    emptyState.classList.remove("hidden");
  } else {
    emptyState.classList.add("hidden");
  }
}

moviesGrid.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const id = btn.closest(".card").dataset.id;
  const movie = movies.find((m) => m.id === id);
  if (!movie) return;

  if (btn.dataset.action === "edit") {
    openModal(movie);
  } else if (btn.dataset.action === "delete") {
    if (!confirm(`Eliminare “${movie.title}”?`)) return;
    const previous = movies;
    movies = movies.filter((m) => m.id !== id);
    if (!saveMovies()) movies = previous;
    render();
    showToast("Film eliminato.");
  }
});

searchInput.addEventListener("input", render);
sortSelect.addEventListener("change", render);

/* ---------- TOAST ---------- */

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add("hidden"), 2500);
}

render();
