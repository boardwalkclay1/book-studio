// Helpers
function getBooks() {
  return JSON.parse(localStorage.getItem("books") || "[]");
}

function saveBooks(books) {
  localStorage.setItem("books", JSON.stringify(books));
}

function getCurrentBookId() {
  return localStorage.getItem("currentBook");
}

function getCurrentBook() {
  const id = getCurrentBookId();
  if (!id) return null;
  const books = getBooks();
  return books.find(b => b.id === id) || null;
}

function updateCurrentBook(updater) {
  const id = getCurrentBookId();
  if (!id) return;
  const books = getBooks();
  const idx = books.findIndex(b => b.id === id);
  if (idx === -1) return;
  updater(books[idx]);
  saveBooks(books);
}

// DOM
const metaContainer = document.getElementById("publishBookMeta");
const coverPreview = document.getElementById("coverPreview");
const coverInput = document.getElementById("coverInput");
const removeCoverBtn = document.getElementById("removeCoverBtn");
const notesInput = document.getElementById("publishNotes");

const trimSizeSelect = document.getElementById("publishTrimSize");
const interiorSelect = document.getElementById("publishInterior");
const paperSelect = document.getElementById("publishPaper");
const imprintInput = document.getElementById("publishImprint");
const isbnInput = document.getElementById("publishISBN");
const yearInput = document.getElementById("publishYear");

const backToWriterBtn = document.getElementById("backToWriterBtn");
const previewExportBtn = document.getElementById("previewExportBtn");
const downloadExportBtn = document.getElementById("downloadExportBtn");
const finalPublishBtn = document.getElementById("finalPublishBtn");

const statusEl = document.getElementById("publishStatus");

// INIT
function init() {
  const book = getCurrentBook();
  if (!book) {
    metaContainer.innerHTML = `<div class="publish-meta-line">No active book selected.</div>`;
    statusEl.textContent = "No active book. Go back to the library.";
    return;
  }

  // Render meta
  metaContainer.innerHTML = `
    <div class="publish-meta-title">${book.title || "Untitled Book"}</div>
    ${book.subtitle ? `<div class="publish-meta-subtitle">${book.subtitle}</div>` : ""}
    <div class="publish-meta-line">Author: ${book.author || "Unknown"}</div>
    ${book.genre ? `<div class="publish-meta-line">Genre: ${book.genre}</div>` : ""}
    ${book.audience ? `<div class="publish-meta-line">Audience: ${book.audience}</div>` : ""}
  `;

  // Load cover
  if (book.coverDataUrl) {
    setCoverPreview(book.coverDataUrl);
  }

  // Load notes & settings
  notesInput.value = book.publishNotes || "";
  trimSizeSelect.value = book.publishTrimSize || "6x9";
  interiorSelect.value = book.publishInterior || "b&w";
  paperSelect.value = book.publishPaper || "cream";
  imprintInput.value = book.publishImprint || "";
  isbnInput.value = book.publishISBN || "";
  yearInput.value = book.publishYear || new Date().getFullYear();
}

// COVER
function setCoverPreview(dataUrl) {
  coverPreview.innerHTML = `<img src="${dataUrl}" alt="Cover preview">`;
}

coverInput.onchange = e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result;
    setCoverPreview(dataUrl);
    updateCurrentBook(b => {
      b.coverDataUrl = dataUrl;
    });
    statusEl.textContent = "Cover updated.";
  };
  reader.readAsDataURL(file);
};

removeCoverBtn.onclick = () => {
  coverPreview.innerHTML = `<span class="cover-placeholder-text">No cover uploaded</span>`;
  updateCurrentBook(b => {
    delete b.coverDataUrl;
  });
  statusEl.textContent = "Cover removed.";
};

// NOTES & SETTINGS SAVE
notesInput.oninput = () => {
  updateCurrentBook(b => {
    b.publishNotes = notesInput.value;
  });
};

trimSizeSelect.onchange = () => {
  updateCurrentBook(b => {
    b.publishTrimSize = trimSizeSelect.value;
  });
};

interiorSelect.onchange = () => {
  updateCurrentBook(b => {
    b.publishInterior = interiorSelect.value;
  });
};

paperSelect.onchange = () => {
  updateCurrentBook(b => {
    b.publishPaper = paperSelect.value;
  });
};

imprintInput.oninput = () => {
  updateCurrentBook(b => {
    b.publishImprint = imprintInput.value;
  });
};

isbnInput.oninput = () => {
  updateCurrentBook(b => {
    b.publishISBN = isbnInput.value;
  });
};

yearInput.oninput = () => {
  updateCurrentBook(b => {
    b.publishYear = yearInput.value;
  });
};

// NAV
backToWriterBtn.onclick = () => {
  window.location.href = "writer.html";
};

// EXPORT FORMAT
function getSelectedExportFormat() {
  const checked = document.querySelector('input[name="exportFormat"]:checked');
  return checked ? checked.value : "pdf-print";
}

// EXPORT ACTIONS (STUBS WITH CLEAR HOOKS)
previewExportBtn.onclick = () => {
  const format = getSelectedExportFormat();
  statusEl.textContent = `Generating preview for ${format.toUpperCase()}... (stub)`;
  // TODO: hook into real preview engine
};

downloadExportBtn.onclick = () => {
  const format = getSelectedExportFormat();
  statusEl.textContent = `Preparing ${format.toUpperCase()} download... (stub)`;
  // TODO: generate file and trigger download
};

finalPublishBtn.onclick = () => {
  updateCurrentBook(b => {
    b.publishedAt = Date.now();
  });
  statusEl.textContent = "Book marked as published. (You can now distribute your exported file.)";
};

// RUN
init();
