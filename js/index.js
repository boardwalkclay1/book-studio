// DOM
const bookGrid = document.getElementById("bookGrid");
const newBookBtn = document.getElementById("newBookBtn");
const newBookModal = document.getElementById("newBookModal");

const titleInput = document.getElementById("newBookTitle");
const subtitleInput = document.getElementById("newBookSubtitle");
const authorInput = document.getElementById("newBookAuthor");
const genreInput = document.getElementById("newBookGenre");
const audienceInput = document.getElementById("newBookAudience");
const descInput = document.getElementById("newBookDescription");

const createBookConfirm = document.getElementById("createBookConfirm");
const closeModal = document.getElementById("closeModal");

// HELPERS
function getBooks() {
  return JSON.parse(localStorage.getItem("books") || "[]");
}

function saveBooks(books) {
  localStorage.setItem("books", JSON.stringify(books));
}

function openBook(id) {
  localStorage.setItem("currentBook", id);
  window.location.href = "writer.html";
}

// RENDER BOOK GRID
function loadBooks() {
  const books = getBooks();

  if (books.length === 0) {
    bookGrid.innerHTML = `
      <div class="empty-state">
        <p>You haven't created any books yet.</p>
        <p>Click <strong>Create New Book</strong> to get started.</p>
      </div>
    `;
    return;
  }

  bookGrid.innerHTML = books
    .map(
      b => `
      <div class="book-card" data-id="${b.id}">
        
        <div class="book-cover">
          ${
            b.coverDataUrl
              ? `<img src="${b.coverDataUrl}" alt="Cover">`
              : `<div class="cover-placeholder">No Cover</div>`
          }
        </div>

        <div class="book-info">
          <div class="book-title">${b.title}</div>
          ${
            b.subtitle
              ? `<div class="book-subtitle">${b.subtitle}</div>`
              : ""
          }
          <div class="book-author">by ${b.author || "Unknown"}</div>
        </div>

      </div>
    `
    )
    .join("");

  document.querySelectorAll(".book-card").forEach(card => {
    card.onclick = () => openBook(card.dataset.id);
  });
}

// SHOW MODAL
newBookBtn.onclick = () => {
  newBookModal.classList.remove("hidden");
};

// CLOSE MODAL
closeModal.onclick = () => {
  newBookModal.classList.add("hidden");
};

// CREATE NEW BOOK
createBookConfirm.onclick = () => {
  const title = titleInput.value.trim();
  if (!title) return alert("Book needs a title.");

  const newBook = {
    id: "book-" + Date.now(),
    title,
    subtitle: subtitleInput.value.trim(),
    author: authorInput.value.trim(),
    genre: genreInput.value.trim(),
    audience: audienceInput.value.trim(),
    description: descInput.value.trim(),
    created: Date.now(),
    coverDataUrl: null
  };

  const books = getBooks();
  books.push(newBook);
  saveBooks(books);

  newBookModal.classList.add("hidden");
  loadBooks();
};

// INIT
loadBooks();
