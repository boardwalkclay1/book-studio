// js/writer.js
// IndexedDB-backed writer logic with localStorage fallback.
// Features: list/get/save/delete books, autosave, image compression, export/import.
// Place at /js/writer.js and include in pages/writer.html

/* eslint-disable no-console */

const DB_NAME = 'boardwalk-db';
const DB_VERSION = 1;
const BOOK_STORE = 'books';
const META_STORE = 'meta'; // for currentBook pointer, settings, etc.
const AUTO_SAVE_DELAY = 800; // ms
const AUTO_SAVE_INTERVAL = 30000; // ms

// ---------- DOM helpers ----------
const $ = id => document.getElementById(id);

// UI elements (guarded)
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

// ---------- IndexedDB wrapper ----------
function openDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) return reject(new Error('IndexedDB not supported'));
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (ev) => {
      const db = ev.target.result;
      if (!db.objectStoreNames.contains(BOOK_STORE)) {
        const store = db.createObjectStore(BOOK_STORE, { keyPath: 'id' });
        store.createIndex('byTitle', 'title', { unique: false });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withIDB(txMode, callback) {
  try {
    const db = await openDB();
    const tx = db.transaction([BOOK_STORE, META_STORE], txMode);
    const stores = {
      books: tx.objectStore(BOOK_STORE),
      meta: tx.objectStore(META_STORE)
    };
    const result = await callback(stores);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
    });
  } catch (err) {
    throw err;
  }
}

// ---------- localStorage fallback ----------
const LS_BOOKS_KEY = 'books';
const LS_CURRENT_KEY = 'currentBook';

function lsGetBooks() {
  try {
    return JSON.parse(localStorage.getItem(LS_BOOKS_KEY) || '[]');
  } catch {
    return [];
  }
}
function lsSaveBooks(arr) {
  localStorage.setItem(LS_BOOKS_KEY, JSON.stringify(arr));
}
function lsGetCurrent() {
  return localStorage.getItem(LS_CURRENT_KEY);
}
function lsSetCurrent(id) {
  if (id == null) localStorage.removeItem(LS_CURRENT_KEY);
  else localStorage.setItem(LS_CURRENT_KEY, id);
}

// ---------- Storage API (prefers IndexedDB, falls back to localStorage) ----------
async function listBooks() {
  try {
    return await withIDB('readonly', async (stores) => {
      const req = stores.books.getAll();
      return await requestToPromise(req);
    });
  } catch (err) {
    // fallback
    return lsGetBooks();
  }
}

async function getBook(id) {
  if (!id) return null;
  try {
    return await withIDB('readonly', async (stores) => {
      const req = stores.books.get(id);
      return await requestToPromise(req);
    });
  } catch (err) {
    const books = lsGetBooks();
    return books.find(b => b.id === id) || null;
  }
}

async function saveBook(book) {
  if (!book || !book.id) throw new Error('Book must have an id');
  try {
    return await withIDB('readwrite', async (stores) => {
      const req = stores.books.put(book);
      await requestToPromise(req);
      // also update meta currentBook
      await requestToPromise(stores.meta.put({ key: 'currentBook', value: book.id }));
      return book;
    });
  } catch (err) {
    // fallback to localStorage
    const books = lsGetBooks();
    const idx = books.findIndex(b => b.id === book.id);
    if (idx === -1) books.push(book); else books[idx] = book;
    lsSaveBooks(books);
    lsSetCurrent(book.id);
    return book;
  }
}

async function deleteBook(id) {
  try {
    return await withIDB('readwrite', async (stores) => {
      await requestToPromise(stores.books.delete(id));
      // if currentBook, clear it
      const cur = await requestToPromise(stores.meta.get('currentBook'));
      if (cur && cur.value === id) await requestToPromise(stores.meta.delete('currentBook'));
      return true;
    });
  } catch (err) {
    const books = lsGetBooks().filter(b => b.id !== id);
    lsSaveBooks(books);
    if (lsGetCurrent() === id) lsSetCurrent(null);
    return true;
  }
}

async function getCurrentBookId() {
  try {
    return await withIDB('readonly', async (stores) => {
      const rec = await requestToPromise(stores.meta.get('currentBook'));
      return rec ? rec.value : null;
    });
  } catch {
    return lsGetCurrent();
  }
}

async function setCurrentBookId(id) {
  try {
    return await withIDB('readwrite', async (stores) => {
      if (id == null) await requestToPromise(stores.meta.delete('currentBook'));
      else await requestToPromise(stores.meta.put({ key: 'currentBook', value: id }));
      return id;
    });
  } catch {
    lsSetCurrent(id);
    return id;
  }
}

// helper to convert IDBRequest to Promise
function requestToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ---------- Image compression helper ----------
async function compressImageFile(file, maxWidth = 1200, quality = 0.78) {
  if (!file) return null;
  if (!file.type.startsWith('image/')) return file;
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let { width, height } = img;
      if (width > maxWidth) {
        const ratio = maxWidth / width;
        width = maxWidth;
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        // if compression produced larger blob, return original file
        if (!blob || blob.size >= file.size) resolve(file);
        else {
          // convert blob to File for consistent handling
          const compressed = new File([blob], file.name, { type: blob.type });
          resolve(compressed);
        }
      }, 'image/jpeg', quality);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

// ---------- Utility helpers ----------
function uid(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;
}

function escapeHtml(str = '') {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

// ---------- App logic (structure similar to previous writer.js) ----------
let currentPage = null;
let autoSaveTimer = null;

async function init() {
  // ensure DB available or fallback
  let books = [];
  try {
    books = await listBooks();
  } catch (e) {
    console.warn('Storage listBooks failed, falling back to localStorage', e);
    books = lsGetBooks();
  }

  if (!books || !books.length) {
    // create demo book
    const demo = {
      id: 'book-1',
      title: 'Untitled Book',
      author: '',
      created: new Date().toISOString(),
      structure: {
        frontMatter: [{ id: 'titlePage', type: 'page', label: 'Title Page', subtitle: '', content: '' }, { id: 'toc', type: 'toc', label: 'Table of Contents', subtitle: '', content: '' }],
        parts: [{ id: 'part1', type: 'part', label: 'Part 1', subtitle: '', chapters: [{ id: 'part1-ch1', type: 'chapter', label: 'Chapter 1', subtitle: '', content: '<p>Start writing...</p>' }] }],
        backMatter: [{ id: 'aboutAuthor', type: 'page', label: 'About the Author', subtitle: '', content: '' }]
      }
    };
    try {
      await saveBook(demo);
      await setCurrentBookId(demo.id);
      books = [demo];
    } catch (e) {
      // fallback localStorage
      lsSaveBooks([demo]);
      lsSetCurrent(demo.id);
      books = [demo];
    }
  }

  // render sidebar and load first page
  await renderSidebar();
  const currentId = await getCurrentBookId();
  const book = currentId ? await getBook(currentId) : (books[0] || null);
  if (book) {
    await ensureBookStructure(book);
    // load first front matter or first chapter
    const firstFront = (book.structure.frontMatter && book.structure.frontMatter[0]) || null;
    if (firstFront) loadPage(firstFront.id);
    else if (book.structure.parts && book.structure.parts[0] && book.structure.parts[0].chapters && book.structure.parts[0].chapters[0]) {
      loadPage(book.structure.parts[0].chapters[0].id);
    }
  }

  applyEditorSettings();
  updateWordStats();
  refreshInspector();

  // autosave safety net
  setInterval(() => persistCurrentPage(), AUTO_SAVE_INTERVAL);
}

// ---------- Structure helpers ----------
async function ensureBookStructure(book) {
  if (!book.structure) {
    book.structure = {
      frontMatter: [
        { id: 'titlePage', type: 'page', label: 'Title Page', subtitle: '', content: '' },
        { id: 'toc', type: 'toc', label: 'Table of Contents', subtitle: '', content: '' }
      ],
      parts: [],
      backMatter: [
        { id: 'aboutAuthor', type: 'page', label: 'About the Author', subtitle: '', content: '' }
      ]
    };
    await saveBook(book);
  }
}

function findPageById(structure, id) {
  if (!structure) return null;
  let p = (structure.frontMatter || []).find(x => x.id === id); if (p) return p;
  for (const part of (structure.parts || [])) {
    if (part.id === id) return part;
    const ch = (part.chapters || []).find(c => c.id === id); if (ch) return ch;
  }
  p = (structure.backMatter || []).find(x => x.id === id); return p || null;
}

// ---------- Sidebar rendering ----------
async function renderSidebar() {
  if (!leftSidebar) return;
  const bookId = await getCurrentBookId();
  const book = bookId ? await getBook(bookId) : null;
  if (!book) {
    leftSidebar.innerHTML = `<div class="empty-state">No active book. Open the library.</div>`;
    return;
  }
  await ensureBookStructure(book);
  leftSidebar.innerHTML = buildTreeHtml(book.structure);
  attachSidebarEvents();
}

function buildTreeHtml(structure) {
  let html = `<div class="tree-block"><h4>Front Matter</h4><ul>`;
  (structure.frontMatter || []).forEach(p => html += `<li data-id="${p.id}" class="tree-node">${escapeHtml(p.label)}</li>`);
  html += `</ul></div>`;

  html += `<div class="tree-block"><h4>Parts</h4><button class="tree-add-part">+ Add Part</button><div class="parts">`;
  (structure.parts || []).forEach(part => {
    html += `<div class="part" data-id="${part.id}"><div class="part-label" data-id="${part.id}">${escapeHtml(part.label)}</div>`;
    html += `<button class="tree-add-chapter" data-part="${part.id}">+ Chapter</button><ul>`;
    (part.chapters || []).forEach(ch => html += `<li data-id="${ch.id}" class="tree-node">${escapeHtml(ch.label)}</li>`);
    html += `</ul></div>`;
  });
  html += `</div></div>`;

  html += `<div class="tree-block"><h4>Back Matter</h4><ul>`;
  (structure.backMatter || []).forEach(p => html += `<li data-id="${p.id}" class="tree-node">${escapeHtml(p.label)}</li>`);
  html += `</ul></div>`;
  return html;
}

function attachSidebarEvents() {
  if (!leftSidebar) return;
  leftSidebar.querySelectorAll('.tree-node').forEach(el => el.onclick = () => loadPage(el.dataset.id));
  leftSidebar.querySelectorAll('.tree-add-part').forEach(btn => btn.onclick = addPart);
  leftSidebar.querySelectorAll('.tree-add-chapter').forEach(btn => btn.onclick = () => addChapter(btn.dataset.part));
}

// ---------- Page load / save ----------
async function loadPage(id) {
  const bookId = await getCurrentBookId();
  if (!bookId) return;
  const book = await getBook(bookId);
  if (!book || !book.structure) return;
  const page = findPageById(book.structure, id);
  if (!page) return;
  currentPage = page;

  if (titleInput) titleInput.value = page.label || '';
  if (subtitleInput) subtitleInput.value = page.subtitle || '';
  if (editorContent) editorContent.innerHTML = (typeof page.content === 'string') ? page.content : (page.content == null ? '' : String(page.content));

  if (page.type === 'toc') generateTOC();

  updateWordStats();
  refreshInspector();
  await setCurrentBookId(bookId);
}

async function persistCurrentPage() {
  if (!currentPage) return;
  const bookId = await getCurrentBookId();
  if (!bookId) return;
  const book = await getBook(bookId);
  if (!book) return;

  if (titleInput) currentPage.label = titleInput.value;
  if (subtitleInput) currentPage.subtitle = subtitleInput.value;
  if (editorContent) currentPage.content = String(editorContent.innerHTML || '');

  // update structure in book and save
  await saveBook(book);

  const now = new Date().toLocaleString();
  if (saveIndicator) saveIndicator.textContent = `Saved ${now}`;
  if (inspectorSaved) inspectorSaved.textContent = now;
  updateWordStats();
}

function scheduleAutoSave() {
  if (saveIndicator) saveIndicator.textContent = 'Saving…';
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => persistCurrentPage(), AUTO_SAVE_DELAY);
}

// ---------- Add / Edit structure ----------
async function addPart() {
  const bookId = await getCurrentBookId();
  if (!bookId) return;
  const book = await getBook(bookId);
  if (!book) return;
  book.structure.parts = book.structure.parts || [];
  const idx = book.structure.parts.length + 1;
  const newPart = { id: `part${idx}`, type: 'part', label: `Part ${idx}`, subtitle: '', chapters: [] };
  book.structure.parts.push(newPart);
  await saveBook(book);
  await renderSidebar();
  loadPage(newPart.id);
}

async function addChapter(partId) {
  const bookId = await getCurrentBookId();
  if (!bookId) return;
  const book = await getBook(bookId);
  if (!book) return;
  const part = (book.structure.parts || []).find(p => p.id === partId);
  if (!part) return;
  part.chapters = part.chapters || [];
  const num = part.chapters.length + 1;
  const newChapter = { id: `${partId}-ch${num}`, type: 'chapter', label: `Chapter ${num}`, subtitle: '', content: '' };
  part.chapters.push(newChapter);
  await saveBook(book);
  await renderSidebar();
  loadPage(newChapter.id);
}

// ---------- TOC & metrics ----------
async function generateTOC() {
  const bookId = await getCurrentBookId();
  if (!bookId) return;
  const book = await getBook(bookId);
  if (!book) return;
  let html = '';
  (book.structure.parts || []).forEach(part => {
    html += `<h3>${escapeHtml(part.label)}</h3>`;
    (part.chapters || []).forEach(ch => {
      html += `<p>${escapeHtml(ch.label)}${ch.subtitle ? ' — ' + escapeHtml(ch.subtitle) : ''}</p>`;
    });
  });
  if (currentPage) {
    currentPage.content = html;
    if (editorContent) editorContent.innerHTML = html;
    await persistCurrentPage();
  }
}

function countWordsFromHtml(input = '') {
  if (input == null) return 0;
  if (typeof input === 'object' && input.nodeType && typeof input.textContent === 'string') {
    input = input.textContent;
  } else if (Array.isArray(input)) {
    input = input.map(i => (i == null ? '' : (typeof i === 'string' ? i : String(i)))).join(' ');
  } else if (typeof input !== 'string') {
    try { input = String(input); } catch { input = ''; }
  }
  const text = input.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return 0;
  return text.split(' ').filter(Boolean).length;
}

async function updateWordStats() {
  if (!wordStats) return;
  const bookId = await getCurrentBookId();
  if (!bookId) {
    wordStats.textContent = 'Words: 0 • Chapters: 0';
    if (inspectorWords) inspectorWords.textContent = '0';
    if (inspectorChapters) inspectorChapters.textContent = '0';
    return;
  }
  const book = await getBook(bookId);
  if (!book) {
    wordStats.textContent = 'Words: 0 • Chapters: 0';
    return;
  }

  let totalWords = 0;
  let totalChapters = 0;

  (book.structure.parts || []).forEach(part => {
    (part.chapters || []).forEach(ch => {
      totalChapters++;
      totalWords += countWordsFromHtml(ch.content || '');
    });
  });

  const liveWords = editorContent ? countWordsFromHtml(editorContent.innerHTML || '') : 0;

  if (currentPage) {
    if (currentPage.type === 'chapter') {
      const storedChapter = (book.structure.parts || []).flatMap(p => p.chapters || []).find(c => c.id === currentPage.id);
      if (storedChapter) {
        const stored = countWordsFromHtml(storedChapter.content || '');
        totalWords = totalWords - stored + liveWords;
      } else {
        totalWords += liveWords;
      }
    } else {
      totalWords += liveWords;
    }
  }

  wordStats.textContent = `Words: ${totalWords.toLocaleString()} • Chapters: ${totalChapters}`;
  if (inspectorWords) inspectorWords.textContent = String(liveWords);
  if (inspectorChapters) inspectorChapters.textContent = String(totalChapters);
}

// ---------- Editor integrations & UI bindings ----------
function applyEditorSettings() {
  const size = fontSizeSelect ? fontSizeSelect.value : '16';
  const line = lineSpaceSelect ? lineSpaceSelect.value : '1.6';
  const letter = letterSpaceSelect ? letterSpaceSelect.value : '0';
  const family = fontFamilySelect ? fontFamilySelect.value : '';
  if (editorContent) {
    editorContent.style.fontSize = `${size}px`;
    editorContent.style.lineHeight = line;
    editorContent.style.letterSpacing = `${letter}px`;
    if (family) editorContent.style.fontFamily = family;
  }
}

if (fontSizeSelect) fontSizeSelect.onchange = applyEditorSettings;
if (lineSpaceSelect) lineSpaceSelect.onchange = applyEditorSettings;
if (letterSpaceSelect) letterSpaceSelect.oninput = applyEditorSettings;
if (fontFamilySelect) fontFamilySelect.onchange = applyEditorSettings;

if (insertSceneBreak) insertSceneBreak.onclick = () => {
  const marker = document.createElement('div');
  marker.className = 'scene-break';
  marker.innerHTML = '<hr style="opacity:.25"><p style="text-align:center;opacity:.6">***</p><hr style="opacity:.25">';
  insertNodeAtCaret(marker);
  scheduleAutoSave();
};

function insertNodeAtCaret(node) {
  if (!editorContent) return;
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) {
    editorContent.appendChild(node);
    return;
  }
  const range = sel.getRangeAt(0);
  range.deleteContents();
  range.insertNode(node);
  range.setStartAfter(node);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

// formatting toolbar (if present)
document.querySelectorAll('[data-cmd]').forEach(btn => {
  btn.addEventListener('click', () => {
    const cmd = btn.dataset.cmd;
    try { document.execCommand(cmd, false, null); } catch (e) { console.warn('execCommand failed', e); }
    if (editorContent) editorContent.focus();
    scheduleAutoSave();
  });
});

// font family/size handlers
if (fontFamilySelect) fontFamilySelect.addEventListener('change', () => {
  try { document.execCommand('fontName', false, fontFamilySelect.value); } catch (e) { /* ignore */ }
  if (editorContent) editorContent.focus();
  scheduleAutoSave();
});
if (fontSizeSelect) fontSizeSelect.addEventListener('change', () => {
  applyStyleToSelection('font-size', `${fontSizeSelect.value}px`);
  scheduleAutoSave();
});

function applyStyleToSelection(prop, value) {
  if (!editorContent) return;
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  const span = document.createElement('span');
  span.style[prop] = value;
  span.appendChild(range.extractContents());
  range.insertNode(span);
  range.setStartAfter(span);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

// ---------- Editor events ----------
if (editorContent) {
  editorContent.addEventListener('input', () => { scheduleAutoSave(); updateWordStats(); });
}
if (titleInput) titleInput.addEventListener('input', () => { scheduleAutoSave(); refreshInspector(); });
if (subtitleInput) subtitleInput.addEventListener('input', () => { scheduleAutoSave(); refreshInspector(); });

// ---------- Inspector ----------
function refreshInspector() {
  if (inspectorTitle) inspectorTitle.textContent = (titleInput ? titleInput.value : '') || '—';
  if (inspectorSubtitle) inspectorSubtitle.textContent = (subtitleInput ? subtitleInput.value : '') || '—';
}

// ---------- Save / preview / publish ----------
if (saveBtn) saveBtn.addEventListener('click', () => { persistCurrentPage(); });
if (previewBtn) previewBtn.addEventListener('click', () => {
  if (!editorContent) return;
  const html = `<html><head><title>${escapeHtml(titleInput ? titleInput.value || 'Preview' : 'Preview')}</title><style>body{font-family:Inter,system-ui;padding:40px;background:#fff;color:#111}</style></head><body><h1>${escapeHtml(titleInput ? titleInput.value || '' : '')}</h1><h3>${escapeHtml(subtitleInput ? subtitleInput.value || '' : '')}</h3>${editorContent.innerHTML}</body></html>`;
  const w = window.open('', '_blank'); if (w) { w.document.open(); w.document.write(html); w.document.close(); }
});
if (publishBtn) publishBtn.addEventListener('click', async () => { await persistCurrentPage(); window.location.href = '../pages/publish.html'; });

// ---------- Export / Import ----------
async function exportAllBooks() {
  // returns a Blob (application/json) representing all books (metadata + base64 blobs for images)
  const books = await listBooks();
  // convert any File/Blob fields to base64 to include in JSON
  const serialized = await Promise.all(books.map(async (b) => {
    const copy = JSON.parse(JSON.stringify(b));
    // if cover is a Blob/File, convert to base64
    if (copy.cover && (copy.cover instanceof Blob || copy.cover instanceof File)) {
      copy.cover = await blobToBase64(copy.cover);
    }
    return copy;
  }));
  const blob = new Blob([JSON.stringify(serialized)], { type: 'application/json' });
  return blob;
}

async function importBooks(file) {
  // file: File object (JSON)
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!Array.isArray(parsed)) throw new Error('Invalid import format');
        // convert base64 cover back to Blob if present
        for (const b of parsed) {
          if (b.cover && typeof b.cover === 'string' && b.cover.startsWith('data:')) {
            b.cover = base64ToBlob(b.cover);
          }
          // ensure id exists
          if (!b.id) b.id = uid('book');
          await saveBook(b);
        }
        await renderSidebar();
        resolve(true);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
function base64ToBlob(dataURL) {
  const parts = dataURL.split(',');
  const meta = parts[0].match(/:(.*?);/);
  const mime = meta ? meta[1] : 'application/octet-stream';
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8 = new Uint8Array(n);
  while (n--) u8[n] = bstr.charCodeAt(n);
  return new Blob([u8], { type: mime });
}

// ---------- Utilities ----------
function escapeHtml(str = '') {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

// ---------- Initialization ----------
init().catch(err => {
  console.error('Writer init failed', err);
  // fallback: try to render sidebar from localStorage
  const books = lsGetBooks();
  if (leftSidebar) {
    if (!books.length) leftSidebar.innerHTML = `<div class="empty-state">No active book. Open the library.</div>`;
    else leftSidebar.innerHTML = '<div class="tree-block"><h4>Books</h4><ul>' + books.map(b => `<li class="tree-node">${escapeHtml(b.title || 'Untitled')}</li>`).join('') + '</ul></div>';
  }
});
