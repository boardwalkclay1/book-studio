// DOM
const bookGrid = document.getElementById("bookGrid");
const newBookBtn = document.getElementById("newBookBtn");
const newBookModal = document.getElementById("newBookModal");

const titleInput = document.getElementById("newBookTitle");
const subtitleInput = document.getElementById("newBookSubtitle");
const authorInput = document.getElementById("newBookAuthor");
const genreInput = document.getElementById("newBookGenre");
const audienceInput = document.getElementById("newBookAudience");

const createBookConfirm = document.getElementById("createBookConfirm");
const closeModal = document.getElementById("closeModal");

// LOAD BOOKS
function loadBooks() {
  const books = JSON.parse(localStorage.getItem("books") || "[]");

  bookGrid.innerHTML = books
    .map(
      b => `
      <div class="book-card" data-id="${b.id}">
        <div class="book-title">${b.title}</div>
        <div class="book-author">${b.author}</div>
      </div>
    `
    )
    .join("");

  document.querySelectorAll(".book-card").forEach(card => {
    card.onclick = () => openBook(card.dataset.id);
  });
}

// OPEN BOOK → GO TO WRITER
function openBook(id) {
  localStorage.setItem("currentBook", id);
  window.location.href = "writer.html";
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
    created: Date.now()
  };

  const books = JSON.parse(localStorage.getItem("books") || "[]");
  books.push(newBook);
  localStorage.setItem("books", JSON.stringify(books));

  newBookModal.classList.add("hidden");
  loadBooks();
};

// INIT
loadBooks();
