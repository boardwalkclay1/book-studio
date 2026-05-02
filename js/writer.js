/*  
===========================================================
 BOARDWALK BOOK STUDIO — WRITER ENGINE
 Modular • Self‑Contained • No Imports • No 404s
===========================================================
*/

////////////////////////////////////////////////////////////
// DOM HELPERS
////////////////////////////////////////////////////////////
const $ = id => document.getElementById(id);

////////////////////////////////////////////////////////////
// ELEMENTS
////////////////////////////////////////////////////////////
const leftSidebar = $('leftSidebar');
const editorContent = $('editorContent');
const titleInput = $('chapterTitle');
const subtitleInput = $('chapterSubtitle');

const fontFamilySelect = $('fontFamilySelect');
const fontSizeSelect = $('fontSizeSelect');
const lineSpaceSelect = $('lineSpaceSelect');
const letterSpaceSelect = $('letterSpaceSelect');
const insertSceneBreak = $('insertSceneBreak');

const wordStats = $('wordStats');
const saveIndicator = $('saveIndicator');

const inspectorTitle = $('inspectorTitle');
const inspectorSubtitle = $('inspectorSubtitle');
const inspectorWords = $('inspectorWords');
const inspectorChapters = $('inspectorChapters');
const inspectorSaved = $('inspectorSaved');

const saveBtn = $('saveBtn');
const previewBtn = $('previewBtn');
const publishBtn = $('publishBtn');

////////////////////////////////////////////////////////////
// DATABASE CONFIG
////////////////////////////////////////////////////////////
const DB_NAME = "boardwalk-db";
const DB_VERSION = 1;
const BOOK_STORE = "books";
const META_STORE = "meta";

const LS_BOOKS_KEY = "books";
const LS_CURRENT_KEY = "currentBook";

////////////////////////////////////////////////////////////
// UTILITIES
////////////////////////////////////////////////////////////
const uid = (p="id") => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;

const escapeHtml = s => String(s)
  .replace(/&/g,"&amp;")
  .replace(/</g,"&lt;")
  .replace(/>/g,"&gt;")
  .replace(/"/g,"&quot;")
  .replace(/'/g,"&#039;");

const countWords = html =>
  html.replace(/<[^>]+>/g," ").trim().split(/\s+/).filter(Boolean).length;

////////////////////////////////////////////////////////////
// INDEXEDDB WRAPPER
////////////////////////////////////////////////////////////
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(BOOK_STORE)) {
        db.createObjectStore(BOOK_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: "key" });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGetAllBooks() {
  try {
    const db = await openDB();
    const tx = db.transaction([BOOK_STORE], "readonly");
    const store = tx.objectStore(BOOK_STORE);
    return await new Promise((resolve, reject) => {
      const r = store.getAll();
      r.onsuccess = () => resolve(r.result || []);
      r.onerror = () => reject(r.error);
    });
  } catch {
    return JSON.parse(localStorage.getItem(LS_BOOKS_KEY) || "[]");
  }
}

async function idbGetBook(id) {
  try {
    const db = await openDB();
    const tx = db.transaction([BOOK_STORE], "readonly");
    const store = tx.objectStore(BOOK_STORE);
    return await new Promise((resolve, reject) => {
      const r = store.get(id);
      r.onsuccess = () => resolve(r.result || null);
      r.onerror = () => reject(r.error);
    });
  } catch {
    const books = JSON.parse(localStorage.getItem(LS_BOOKS_KEY) || "[]");
    return books.find(b => b.id === id) || null;
  }
}

async function idbSaveBook(book) {
  try {
    const db = await openDB();
    const tx = db.transaction([BOOK_STORE, META_STORE], "readwrite");
    tx.objectStore(BOOK_STORE).put(book);
    tx.objectStore(META_STORE).put({ key: "currentBook", value: book.id });
    return await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(book);
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    const books = JSON.parse(localStorage.getItem(LS_BOOKS_KEY) || "[]");
    const idx = books.findIndex(b => b.id === book.id);
    if (idx === -1) books.push(book); else books[idx] = book;
    localStorage.setItem(LS_BOOKS_KEY, JSON.stringify(books));
    localStorage.setItem(LS_CURRENT_KEY, book.id);
    return book;
  }
}

async function idbGetCurrentBookId() {
  try {
    const db = await openDB();
    const tx = db.transaction([META_STORE], "readonly");
    const store = tx.objectStore(META_STORE);
    return await new Promise(resolve => {
      const r = store.get("currentBook");
      r.onsuccess = () => resolve(r.result?.value || null);
      r.onerror = () => resolve(null);
    });
  } catch {
    return localStorage.getItem(LS_CURRENT_KEY);
  }
}

////////////////////////////////////////////////////////////
// BOOK INITIALIZATION
////////////////////////////////////////////////////////////
function createDefaultBook() {
  return {
    id: uid("book"),
    title: "Untitled Book",
    author: "",
    created: new Date().toISOString(),
    structure: {
      frontMatter: [
        { id: "fm-title", type: "front", label: "Title Page", content: "" },
        { id: "fm-toc", type: "toc", label: "Table of Contents", content: "" }
      ],
      parts: [
        {
          id: "part1",
          type: "part",
          label: "Part 1",
          chapters: [
            { id: "part1-ch1", type: "chapter", label: "Chapter 1", content: "<p>Start writing...</p>" }
          ]
        }
      ],
      backMatter: [
        { id: "bm-about", type: "back", label: "About the Author", content: "" }
      ]
    }
  };
}

////////////////////////////////////////////////////////////
// SIDEBAR RENDERING
////////////////////////////////////////////////////////////
function renderSidebar(structure) {
  let html = "";

  // FRONT MATTER
  html += `<div class="tree-block"><h4>Front Matter</h4><ul>`;
  structure.frontMatter.forEach(p => {
    html += `<li class="tree-node" data-id="${p.id}">${escapeHtml(p.label)}</li>`;
  });
  html += `</ul><button class="tree-add-front">+ Add Front Matter</button></div>`;

  // PARTS + CHAPTERS
  html += `<div class="tree-block"><h4>Parts</h4><button class="tree-add-part">+ Add Part</button>`;
  structure.parts.forEach(part => {
    html += `
      <div class="part">
        <div class="tree-node" data-id="${part.id}">${escapeHtml(part.label)}</div>
        <button class="tree-add-chapter" data-part="${part.id}">+ Add Chapter</button>
        <ul>
    `;
    part.chapters.forEach(ch => {
      html += `<li class="tree-node" data-id="${ch.id}">${escapeHtml(ch.label)}</li>`;
    });
    html += `</ul></div>`;
  });
  html += `</div>`;

  // BACK MATTER
  html += `<div class="tree-block"><h4>Back Matter</h4><ul>`;
  structure.backMatter.forEach(p => {
    html += `<li class="tree-node" data-id="${p.id}">${escapeHtml(p.label)}</li>`;
  });
  html += `</ul><button class="tree-add-back">+ Add Back Matter</button></div>`;

  leftSidebar.innerHTML = html;
}

////////////////////////////////////////////////////////////
// PAGE LOADING
////////////////////////////////////////////////////////////
let currentPage = null;
let currentBook = null;

async function loadPage(id) {
  const page = findPage(id);
  if (!page) return;

  currentPage = page;

  titleInput.value = page.label || "";
  subtitleInput.value = page.subtitle || "";
  editorContent.innerHTML = page.content || "";

  if (page.type === "toc") buildTOC();

  updateInspector();
  updateStats();
}

function findPage(id) {
  const s = currentBook.structure;

  return (
    s.frontMatter.find(p => p.id === id) ||
    s.parts.flatMap(p => [p, ...p.chapters]).find(p => p.id === id) ||
    s.backMatter.find(p => p.id === id)
  );
}

////////////////////////////////////////////////////////////
// TOC GENERATION
////////////////////////////////////////////////////////////
function buildTOC() {
  const s = currentBook.structure;
  let html = "";

  s.parts.forEach((part, pIndex) => {
    html += `<h3>Part ${pIndex + 1}: ${escapeHtml(part.label)}</h3>`;
    part.chapters.forEach((ch, cIndex) => {
      html += `<p>${pIndex + 1}.${cIndex + 1} ${escapeHtml(ch.label)}</p>`;
    });
  });

  const toc = s.frontMatter.find(p => p.type === "toc");
  if (toc) toc.content = html;

  if (currentPage.id === toc.id) editorContent.innerHTML = html;
}

////////////////////////////////////////////////////////////
// ADDING PAGES
////////////////////////////////////////////////////////////
function addFrontMatter() {
  const page = {
    id: uid("fm"),
    type: "front",
    label: "Front Matter Page",
    content: ""
  };
  currentBook.structure.frontMatter.push(page);
  saveBook();
  refreshSidebar();
  loadPage(page.id);
}

function addBackMatter() {
  const page = {
    id: uid("bm"),
    type: "back",
    label: "Back Matter Page",
    content: ""
  };
  currentBook.structure.backMatter.push(page);
  saveBook();
  refreshSidebar();
  loadPage(page.id);
}

function addPart() {
  const part = {
    id: uid("part"),
    type: "part",
    label: "New Part",
    chapters: []
  };
  currentBook.structure.parts.push(part);
  saveBook();
  refreshSidebar();
  loadPage(part.id);
}

function addChapter(partId) {
  const part = currentBook.structure.parts.find(p => p.id === partId);
  const ch = {
    id: uid("ch"),
    type: "chapter",
    label: `Chapter ${part.chapters.length + 1}`,
    content: ""
  };
  part.chapters.push(ch);
  saveBook();
  refreshSidebar();
  loadPage(ch.id);
}

////////////////////////////////////////////////////////////
// SAVE / AUTOSAVE
////////////////////////////////////////////////////////////
let autosaveTimer = null;

function scheduleAutosave() {
  saveIndicator.textContent = "Saving…";
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(saveBook, 800);
}

async function saveBook() {
  if (!currentPage) return;

  currentPage.label = titleInput.value;
  currentPage.subtitle = subtitleInput.value;
  currentPage.content = editorContent.innerHTML;

  await idbSaveBook(currentBook);

  const now = new Date().toLocaleTimeString();
  saveIndicator.textContent = `Saved ${now}`;
  inspectorSaved.textContent = now;

  updateStats();
  buildTOC();
}

////////////////////////////////////////////////////////////
// INSPECTOR + STATS
////////////////////////////////////////////////////////////
function updateInspector() {
  inspectorTitle.textContent = titleInput.value || "—";
  inspectorSubtitle.textContent = subtitleInput.value || "—";
}

function updateStats() {
  const s = currentBook.structure;
  const chapters = s.parts.flatMap(p => p.chapters);
  const totalWords = chapters.reduce((sum, ch) => sum + countWords(ch.content), 0);

  const liveWords = countWords(editorContent.innerHTML);

  wordStats.textContent = `Words: ${totalWords.toLocaleString()} • Chapters: ${chapters.length}`;
  inspectorWords.textContent = liveWords;
  inspectorChapters.textContent = chapters.length;
}

////////////////////////////////////////////////////////////
// FOCUS MODE
////////////////////////////////////////////////////////////
function toggleFocus() {
  document.body.classList.toggle("focus-mode");
}

////////////////////////////////////////////////////////////
// PREVIEW + PUBLISH
////////////////////////////////////////////////////////////
function previewPage() {
  const html = `
    <html>
      <head>
        <title>${escapeHtml(titleInput.value)}</title>
        <style>
          body { font-family: Inter, system-ui; padding: 40px; max-width: 700px; margin: auto; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(titleInput.value)}</h1>
        ${subtitleInput.value ? `<h3>${escapeHtml(subtitleInput.value)}</h3>` : ""}
        ${editorContent.innerHTML}
      </body>
    </html>
  `;
  const w = window.open("", "_blank");
  w.document.write(html);
  w.document.close();
}

function goPublish() {
  saveBook();
  window.location.href = "../pages/publish.html";
}

////////////////////////////////////////////////////////////
// EVENT BINDINGS
////////////////////////////////////////////////////////////
function bindEvents() {
  // Sidebar clicks
  leftSidebar.addEventListener("click", e => {
    if (e.target.classList.contains("tree-node")) {
      loadPage(e.target.dataset.id);
    }
    if (e.target.classList.contains("tree-add-front")) addFrontMatter();
    if (e.target.classList.contains("tree-add-back")) addBackMatter();
    if (e.target.classList.contains("tree-add-part")) addPart();
    if (e.target.classList.contains("tree-add-chapter")) addChapter(e.target.dataset.part);
  });

  // Editor
  editorContent.addEventListener("input", () => {
    scheduleAutosave();
    updateStats();
  });

  titleInput.addEventListener("input", () => {
    scheduleAutosave();
    updateInspector();
  });

  subtitleInput.addEventListener("input", () => {
    scheduleAutosave();
    updateInspector();
  });

  // Toolbar
  document.querySelectorAll("[data-cmd]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.execCommand(btn.dataset.cmd, false, null);
      editorContent.focus();
      scheduleAutosave();
    });
  });

  // Scene break
  insertSceneBreak.addEventListener("click", () => {
    const div = document.createElement("div");
    div.innerHTML = `<hr><p style="text-align:center;opacity:.6">***</p><hr>`;
    editorContent.appendChild(div);
    scheduleAutosave();
  });

  // Buttons
  saveBtn.addEventListener("click", saveBook);
  previewBtn.addEventListener("click", previewPage);
  publishBtn.addEventListener("click", goPublish);
}

////////////////////////////////////////////////////////////
// INIT
////////////////////////////////////////////////////////////
async function initWriter() {
  let books = await idbGetAllBooks();

  if (!books.length) {
    const book = createDefaultBook();
    await idbSaveBook(book);
    books = [book];
  }

  const currentId = await idbGetCurrentBookId() || books[0].id;
  currentBook = await idbGetBook(currentId);

  renderSidebar(currentBook.structure);
  bindEvents();

  const first = currentBook.structure.frontMatter[0] ||
                currentBook.structure.parts[0]?.chapters[0] ||
                currentBook.structure.backMatter[0];

  loadPage(first.id);
}

initWriter();
