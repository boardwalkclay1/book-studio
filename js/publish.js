// =========================
// STORAGE HELPERS
// =========================
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

// =========================
// DOM
// =========================
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

// =========================
// STATUS / LOG HELPERS
// =========================
function setStatus(message, type = "info") {
  statusEl.textContent = message;
  statusEl.className = "publish-status " + type;
}

// =========================
// BOOK METRICS
// =========================
function getBookMetrics(book) {
  const structure = book.structure || null;
  if (!structure) {
    return {
      totalChapters: 0,
      totalWords: 0,
      estPages: 0
    };
  }

  let totalWords = 0;
  let totalChapters = 0;

  const countWords = html => {
    if (!html) return 0;
    const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!text) return 0;
    return text.split(" ").length;
  };

  structure.parts.forEach(part => {
    part.chapters.forEach(ch => {
      totalChapters += 1;
      totalWords += countWords(ch.content || "");
    });
  });

  // crude estimate: ~300 words per page
  const estPages = totalWords > 0 ? Math.max(1, Math.round(totalWords / 300)) : 0;

  return { totalChapters, totalWords, estPages };
}

// =========================
// ISBN VALIDATION (BASIC)
// =========================
function isValidISBN(isbnRaw) {
  const isbn = isbnRaw.replace(/[-\s]/g, "");
  if (!isbn) return false;
  if (isbn.length !== 10 && isbn.length !== 13) return false;
  if (!/^[0-9Xx]+$/.test(isbn)) return false;
  return true; // not doing full checksum here, just sanity
}

// =========================
// INIT
// =========================
function init() {
  const book = getCurrentBook();
  if (!book) {
    metaContainer.innerHTML = `<div class="publish-meta-line">No active book selected.</div>`;
    setStatus("No active book. Go back to the library.", "error");
    disableAllActions();
    return;
  }

  // Render meta
  const metrics = getBookMetrics(book);
  metaContainer.innerHTML = `
    <div class="publish-meta-title">${book.title || "Untitled Book"}</div>
    ${book.subtitle ? `<div class="publish-meta-subtitle">${book.subtitle}</div>` : ""}
    <div class="publish-meta-line">Author: ${book.author || "Unknown"}</div>
    ${book.genre ? `<div class="publish-meta-line">Genre: ${book.genre}</div>` : ""}
    ${book.audience ? `<div class="publish-meta-line">Audience: ${book.audience}</div>` : ""}
    <div class="publish-meta-line">Chapters: ${metrics.totalChapters}</div>
    <div class="publish-meta-line">Words (est): ${metrics.totalWords.toLocaleString()}</div>
    <div class="publish-meta-line">Pages (est): ${metrics.estPages}</div>
  `;

  // Load cover
  if (book.coverDataUrl || book.cover) {
    setCoverPreview(book.coverDataUrl || book.cover);
  } else {
    coverPreview.innerHTML = `<span class="cover-placeholder-text">No cover uploaded</span>`;
  }

  // Load notes & settings
  notesInput.value = book.publishNotes || "";
  trimSizeSelect.value = book.publishTrimSize || "6x9";
  interiorSelect.value = book.publishInterior || "b&w";
  paperSelect.value = book.publishPaper || "cream";
  imprintInput.value = book.publishImprint || "";
  isbnInput.value = book.publishISBN || "";
  yearInput.value = book.publishYear || new Date().getFullYear();

  setStatus("Ready to configure publishing.");
}

function disableAllActions() {
  [previewExportBtn, downloadExportBtn, finalPublishBtn, coverInput, removeCoverBtn].forEach(btn => {
    if (btn) btn.disabled = true;
  });
}

// =========================
// COVER
// =========================
function setCoverPreview(dataUrl) {
  coverPreview.innerHTML = `<img src="${dataUrl}" alt="Cover preview">`;
}

coverInput.onchange = e => {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    setStatus("Cover must be an image file.", "error");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result;
    setCoverPreview(dataUrl);
    updateCurrentBook(b => {
      b.coverDataUrl = dataUrl;
      b.cover = dataUrl; // keep both for compatibility
    });
    setStatus("Cover updated.", "success");
  };
  reader.readAsDataURL(file);
};

removeCoverBtn.onclick = () => {
  coverPreview.innerHTML = `<span class="cover-placeholder-text">No cover uploaded</span>`;
  updateCurrentBook(b => {
    delete b.coverDataUrl;
    delete b.cover;
  });
  setStatus("Cover removed.", "info");
};

// =========================
// NOTES & SETTINGS SAVE
// =========================
notesInput.oninput = () => {
  updateCurrentBook(b => {
    b.publishNotes = notesInput.value;
  });
};

trimSizeSelect.onchange = () => {
  updateCurrentBook(b => {
    b.publishTrimSize = trimSizeSelect.value;
  });
  setStatus(`Trim size set to ${trimSizeSelect.value}.`, "info");
};

interiorSelect.onchange = () => {
  updateCurrentBook(b => {
    b.publishInterior = interiorSelect.value;
  });
  setStatus(`Interior set to ${interiorSelect.value}.`, "info");
};

paperSelect.onchange = () => {
  updateCurrentBook(b => {
    b.publishPaper = paperSelect.value;
  });
  setStatus(`Paper set to ${paperSelect.value}.`, "info");
};

imprintInput.oninput = () => {
  updateCurrentBook(b => {
    b.publishImprint = imprintInput.value;
  });
};

isbnInput.oninput = () => {
  const val = isbnInput.value.trim();
  updateCurrentBook(b => {
    b.publishISBN = val;
  });

  if (val && !isValidISBN(val)) {
    setStatus("ISBN looks invalid (length/characters). Double-check before publishing.", "warning");
  } else if (val) {
    setStatus("ISBN format looks okay.", "success");
  }
};

yearInput.oninput = () => {
  const year = parseInt(yearInput.value, 10);
  const currentYear = new Date().getFullYear();
  if (isNaN(year) || year < 1900 || year > currentYear + 1) {
    setStatus("Publishing year looks off. Check it.", "warning");
  }
  updateCurrentBook(b => {
    b.publishYear = yearInput.value;
  });
};

// =========================
// NAV
// =========================
backToWriterBtn.onclick = () => {
  window.location.href = "writer.html";
};

// =========================
// EXPORT FORMAT
// =========================
function getSelectedExportFormat() {
  const checked = document.querySelector('input[name="exportFormat"]:checked');
  return checked ? checked.value : "pdf-print";
}

// =========================
// PRE-PUBLISH VALIDATION
// =========================
function validateBeforeExport() {
  const book = getCurrentBook();
  if (!book) {
    setStatus("No active book.", "error");
    return { ok: false };
  }

  const metrics = getBookMetrics(book);
  if (metrics.totalChapters === 0 || metrics.totalWords === 0) {
    setStatus("Book has no content. Add chapters and words before exporting.", "error");
    return { ok: false };
  }

  if (!book.title || !book.author) {
    setStatus("Book needs at least a title and author before export.", "error");
    return { ok: false };
  }

  return { ok: true, book, metrics };
}

// =========================
// EXPORT ACTIONS (STUBS WITH CLEAR HOOKS)
// =========================
previewExportBtn.onclick = () => {
  const { ok, book, metrics } = validateBeforeExport();
  if (!ok) return;

  const format = getSelectedExportFormat();
  setStatus(`Generating preview for ${format.toUpperCase()}...`, "info");

  // HOOK: here you’d call your real preview engine
  // e.g. generatePreview(book, format).then(...)
  setTimeout(() => {
    setStatus(
      `Preview ready for ${format.toUpperCase()} — est. ${metrics.estPages} pages, ${metrics.totalWords.toLocaleString()} words.`,
      "success"
    );
  }, 800);
};

downloadExportBtn.onclick = () => {
  const { ok, book, metrics } = validateBeforeExport();
  if (!ok) return;

  const format = getSelectedExportFormat();
  setStatus(`Preparing ${format.toUpperCase()} download...`, "info");

  // HOOK: here you’d generate the actual file and trigger download
  // e.g. generateFile(book, format).then(blob => triggerDownload(blob))
  setTimeout(() => {
    setStatus(
      `${format.toUpperCase()} export simulated — integrate real export engine here. Est. ${metrics.estPages} pages.`,
      "success"
    );
  }, 1000);
};

finalPublishBtn.onclick = () => {
  const { ok, book } = validateBeforeExport();
  if (!ok) return;

  if (!book.publishISBN) {
    setStatus("Add an ISBN before final publishing.", "error");
    return;
  }

  if (!isValidISBN(book.publishISBN)) {
    setStatus("ISBN format looks invalid. Fix it before final publishing.", "error");
    return;
  }

  updateCurrentBook(b => {
    b.publishedAt = Date.now();
    b.publishStatus = "published";
  });

  setStatus("Book marked as published. Export files are ready for distribution.", "success");
};

// =========================
// RUN
// =========================
init();
