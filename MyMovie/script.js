const overlay = document.getElementById("modalOverlay");
const openBtn = document.getElementById("openModalBtn");
const closeBtn = document.getElementById("closeModalBtn");
const cancelBtn = document.getElementById("cancelBtn");
const form = document.getElementById("movieForm");

const titleInput = document.getElementById("movieTitle");
const fileInput = document.getElementById("movieFile");
const reviewInput = document.getElementById("movieReview");
const ratingInput = document.getElementById("movieRating");

const moviesGrid = document.getElementById("moviesGrid");

/* OPEN MODAL */
openBtn.addEventListener("click", () => {
  overlay.classList.remove("hidden");
  overlay.setAttribute("aria-hidden", "false");
  titleInput.focus();
});

/* CLOSE MODAL */
function closeModal() {
  overlay.classList.add("hidden");
  overlay.setAttribute("aria-hidden", "true");
  form.reset();
}

closeBtn.addEventListener("click", closeModal);
cancelBtn.addEventListener("click", closeModal);

overlay.addEventListener("click", (e) => {
  if (e.target === overlay) closeModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !overlay.classList.contains("hidden")) {
    closeModal();
  }
});

/* SUBMIT → CREA CARD */
form.addEventListener("submit", (e) => {
  e.preventDefault();

  const title = titleInput.value.trim();
  const review = reviewInput.value.trim();
  const rating = Number(ratingInput.value);
  const file = fileInput.files[0];

  if (!file) return;

  const imgUrl = URL.createObjectURL(file);

  const card = document.createElement("article");
  card.className = "card";

  const img = document.createElement("img");
  img.className = "card__img";
  img.src = imgUrl;
  img.alt = title || "Movie image";

  const body = document.createElement("div");
  body.className = "card__body";

  const h3 = document.createElement("h3");
  h3.className = "card__title";
  h3.textContent = title;

  const meta = document.createElement("div");
  meta.className = "card__meta";
  meta.textContent = `Rating: ${rating}/5`;

  const p = document.createElement("p");
  p.className = "card__review";
  p.textContent = review;

  body.appendChild(h3);
  body.appendChild(meta);
  body.appendChild(p);

  card.appendChild(img);
  card.appendChild(body);

  moviesGrid.prepend(card);

  closeModal();
});
