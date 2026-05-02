// /js/writer.js
// Boardwalk Writer — full logic with:
// - IndexedDB + localStorage fallback
// - Front/Back matter add-ons
// - Auto Table of Contents
// - Focus mode
// - Autosave, stats, inspector, preview, publish

// ---------- CONFIG ----------
const DB_NAME = 'boardwalk-db';
const DB_VERSION = 1;
const BOOK_STORE = 'books';
const META_STORE = 'meta';
const LS_BOOKS_KEY = 'books';
const LS_CURRENT_KEY = 'currentBook';
const AUTO_SAVE_DELAY = 800;
const AUTO_SAVE_INTERVAL = 30000;

// ---------- DOM HELPERS ----------
const $ = id => document.getElementById(id);

// Layout
const leftSidebar = $('leftSidebar');
const editorContent = $('editorContent');
const titleInput = $('chapterTitle');
const subtitleInput = $('chapterSubtitle');

// Toolbar
const fontFamilySelect = $('fontFamilySelect');
const fontSizeSelect = $('fontSizeSelect');
const lineSpaceSelect = $('lineSpaceSelect');
const letterSpaceSelect = $('letterSpaceSelect');
const insertSceneBreak = $('insertSceneBreak');

// Stats / inspector
const wordStats = $('wordStats');
const saveIndicator = $('saveIndicator');
const inspectorTitle = $('inspectorTitle');
const inspectorSubtitle = $('inspectorSubtitle');
const inspectorWords = $('inspectorWords');
const inspectorChapters = $('inspectorChapters');
const inspectorSaved = $('inspectorSaved');

// Actions
const saveBtn = $('saveBtn');
const previewBtn = $('previewBtn');
const publishBtn = $('publishBtn');
const focusModeBtn = $('focusModeBtn'); // optional button in HTML

// ---------- IndexedDB ----------
function openDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) return reject(new Error('IndexedDB not supported'));
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
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

function requestToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withIDB(mode, cb) {
  const db = await openDB();
  const tx = db.transaction([BOOK_STORE, META_STORE], mode);
  const stores = {
    books: tx.objectStore(BOOK_STORE),
    meta: tx.objectStore(META_STORE)
  };
  const result = await cb(stores);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
  });
}

// ---------- localStorage fallback ----------
function lsGetBooks() {
  try { return JSON.parse(localStorage.getItem(LS_BOOKS_KEY) || '[]'); } catch { return []; }
}
function lsSaveBooks(arr) { localStorage.setItem(LS_BOOKS_KEY, JSON.stringify(arr)); }
function lsGetCurrent() { return localStorage.getItem(LS_CURRENT_KEY); }
function lsSetCurrent(id) { id == null ? localStorage.removeItem(LS_CURRENT_KEY) : localStorage.setItem(LS_CURRENT_KEY, id); }

// ---------- Storage API ----------
async function listBooks() {
  try {
    return await withIDB('readonly', s => requestToPromise(s.books.getAll()));
  } catch {
    return lsGetBooks();
  }
}

async function getBook(id) {
  if (!id) return null;
  try {
    return await withIDB('readonly', s => requestToPromise(s.books.get(id)));
  } catch {
    return lsGetBooks().find(b => b.id === id) || null;
  }
}

async function saveBook(book) {
  if (!book || !book.id) throw new Error('Book must have an id');
  try {
    return await withIDB('readwrite', async s => {
      await requestToPromise(s.books.put(book));
      await requestToPromise(s.meta.put({ key: 'currentBook', value: book.id }));
      return book;
    });
  } catch {
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
    return await withIDB('readwrite', async s => {
      await requestToPromise(s.books.delete(id));
      const cur = await requestToPromise(s.meta.get('currentBook'));
      if (cur && cur.value === id) await requestToPromise(s.meta.delete('currentBook'));
      return true;
    });
  } catch {
    const books = lsGetBooks().filter(b => b.id !== id);
    lsSaveBooks(books);
    if (lsGetCurrent() === id) lsSetCurrent(null);
    return true;
  }
}

async function getCurrentBookId() {
  try {
    return await withIDB('readonly', async s => {
      const rec = await requestToPromise(s.meta.get('currentBook'));
      return rec ? rec.value : null;
    });
  } catch {
    return lsGetCurrent();
  }
}

async function setCurrentBookId(id) {
  try {
    return await withIDB('readwrite', async s => {
      if (id == null) await requestToPromise(s.meta.delete('currentBook'));
      else await requestToPromise(s.meta.put({ key: 'currentBook', value: id }));
      return id;
    });
  } catch {
    lsSetCurrent(id);
    return id;
  }
}

// ---------- Utils ----------
function uid(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}
function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
}
function countWordsFromHtml(input = '') {
  if (input == null) return 0;
  if (typeof input !== 'string') input = String(input);
  const text = input.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return 0;
  return text.split(' ').filter(Boolean).length;
}

// ---------- App state ----------
let currentPage = null;
let autoSaveTimer = null;

// ---------- Init ----------
async function init() {
  try {
    let books = await listBooks();
    if (!books || !books.length) {
      const demo = createDemoBook();
      await saveBook(demo);
      await setCurrentBookId(demo.id);
      books = [demo];
    }

    await renderSidebar();

    const currentId = await getCurrentBookId();
    const book = currentId ? await getBook(currentId) : (books[0] || null);
    if (book) {
      await ensureBookStructure(book);
      const first = getFirstPage(book.structure);
      if (first) await loadPage(first.id);
    }

    applyEditorSettings();
    updateWordStats();
    refreshInspector();

    setInterval(() => persistCurrentPage(), AUTO_SAVE_INTERVAL);
  } catch (err) {
    console.error('Writer init error', err);
  }
}

function createDemoBook() {
  return {
    id: uid('book'),
    title: 'Untitled Book',
    author: '',
    created: new Date().toISOString(),
    structure: {
      frontMatter: [
        { id: 'fm-title', type: 'front', label: 'Title Page', subtitle: '', content: '' },
        { id: 'fm-toc', type: 'toc', label: 'Table of Contents', subtitle: '', content: '' }
      ],
      parts: [
        {
          id: 'part1',
          type: 'part',
          label: 'Part 1',
          subtitle: '',
          chapters: [
            { id: 'part1-ch1', type: 'chapter', label: 'Chapter 1', subtitle: '', content: '<p>Start writing...</p>' }
          ]
        }
      ],
      backMatter: [
        { id: 'bm-about', type: 'back', label: 'About the Author', subtitle: '', content: '' }
      ]
    }
  };
}

// ---------- Structure helpers ----------
async function ensureBookStructure(book) {
  if (!book.structure) {
    book.structure = { frontMatter: [], parts: [], backMatter: [] };
    await saveBook(book);
  }
  book.structure.frontMatter ||= [];
  book.structure.parts ||= [];
  book.structure.backMatter ||= [];
}

function getFirstPage(structure) {
  return (structure.frontMatter && structure.frontMatter[0]) ||
         (structure.parts && structure.parts[0] && structure.parts[0].chapters && structure.parts[0].chapters[0]) ||
         (structure.backMatter && structure.backMatter[0]) ||
         null;
}

function findPageById(structure, id) {
  if (!structure) return null;
  let p = (structure.frontMatter || []).find(x => x.id === id);
  if (p) return p;
  for (const part of (structure.parts || [])) {
    if (part.id === id) return part;
    const ch = (part.chapters || []).find(c => c.id === id);
    if (ch) return ch;
  }
  p = (structure.backMatter || []).find(x => x.id === id);
  return p || null;
}

// ---------- Sidebar ----------
async function renderSidebar() {
  if (!leftSidebar) return;
  const bookId = await getCurrentBookId();
  const book = bookId ? await getBook(bookId) : null;
  if (!book) {
    leftSidebar.innerHTML = `<div class="empty-state">No active book.</div>`;
    return;
  }
  await ensureBookStructure(book);
  leftSidebar.innerHTML = buildTreeHtml(book.structure);
  attachSidebarEvents();
}

function buildTreeHtml(structure) {
  let html = '';

  // Front matter
  html += `<div class="tree-block"><h4>Front Matter</h4><ul>`;
  (structure.frontMatter || []).forEach(p => {
    html += `<li data-id="${p.id}" class="tree-node">${escapeHtml(p.label)}</li>`;
  });
  html += `</ul><button class="tree-add-front">+ Add Front Matter Page</button></div>`;

  // Parts / chapters
  html += `<div class="tree-block"><h4>Parts</h4><button class="tree-add-part">+ Add Part</button><div class="parts">`;
  (structure.parts || []).forEach(part => {
    html += `<div class="part" data-id="${part.id}">
      <div class="part-label tree-node" data-id="${part.id}">${escapeHtml(part.label)}</div>
      <button class="tree-add-chapter" data-part="${part.id}">+ Add Chapter</button>
      <ul>`;
    (part.chapters || []).forEach(ch => {
      html += `<li data-id="${ch.id}" class="tree-node">${escapeHtml(ch.label)}</li>`;
    });
    html += `</ul></div>`;
  });
  html += `</div></div>`;

  // Back matter
  html += `<div class="tree-block"><h4>Back Matter</h4><ul>`;
  (structure.backMatter || []).forEach(p => {
    html += `<li data-id="${p.id}" class="tree-node">${escapeHtml(p.label)}</li>`;
  });
  html += `</ul><button class="tree-add-back">+ Add Back Matter Page</button></div>`;

  return html;
}

function attachSidebarEvents() {
  if (!leftSidebar) return;

  leftSidebar.querySelectorAll('.tree-node').forEach(el => {
    el.onclick = () => loadPage(el.dataset.id);
  });

  const addPartBtn = leftSidebar.querySelector('.tree-add-part');
  if (addPartBtn) addPartBtn.onclick = addPart;

  leftSidebar.querySelectorAll('.tree-add-chapter').forEach(btn => {
    btn.onclick = () => addChapter(btn.dataset.part);
  });

  const addFrontBtn = leftSidebar.querySelector('.tree-add-front');
  if (addFrontBtn) addFrontBtn.onclick = addFrontMatterPage;

  const addBackBtn = leftSidebar.querySelector('.tree-add-back');
  if (addBackBtn) addBackBtn.onclick = addBackMatterPage;
}

// ---------- Add pages ----------
async function addFrontMatterPage() {
  const bookId = await getCurrentBookId();
  if (!bookId) return;
  const book = await getBook(bookId);
  if (!book) return;

  book.structure.frontMatter ||= [];
  const idx = book.structure.frontMatter.length + 1;
  const page = {
    id: `fm-${idx}-${uid('page')}`,
    type: 'front',
    label: `Front Page ${idx}`,
    subtitle: '',
    content: ''
  };
  book.structure.frontMatter.push(page);
  await saveBook(book);
  await renderSidebar();
  await loadPage(page.id);
}

async function addBackMatterPage() {
  const bookId = await getCurrentBookId();
  if (!bookId) return;
  const book = await getBook(bookId);
  if (!book) return;

  book.structure.backMatter ||= [];
  const idx = book.structure.backMatter.length + 1;
  const page = {
    id: `bm-${idx}-${uid('page')}`,
    type: 'back',
    label: `Back Page ${idx}`,
    subtitle: '',
    content: ''
  };
  book.structure.backMatter.push(page);
  await saveBook(book);
  await renderSidebar();
  await loadPage(page.id);
}

async function addPart() {
  const bookId = await getCurrentBookId();
  if (!bookId) return;
  const book = await getBook(bookId);
  if (!book) return;

  book.structure.parts ||= [];
  const idx = book.structure.parts.length + 1;
  const part = {
    id: `part${idx}`,
    type: 'part',
    label: `Part ${idx}`,
    subtitle: '',
    chapters: []
  };
  book.structure.parts.push(part);
  await saveBook(book);
  await renderSidebar();
  await loadPage(part.id);
}

async function addChapter(partId) {
  const bookId = await getCurrentBookId();
  if (!bookId) return;
  const book = await getBook(bookId);
  if (!book) return;

  const part = (book.structure.parts || []).find(p => p.id === partId);
  if (!part) return;

  part.chapters ||= [];
  const num = part.chapters.length + 1;
  const chapter = {
    id: `${partId}-ch${num}`,
    type: 'chapter',
    label: `Chapter ${num}`,
    subtitle: '',
    content: ''
  };
  part.chapters.push(chapter);
  await saveBook(book);
  await renderSidebar();
  await loadPage(chapter.id);
}

// ---------- Load / Save page ----------
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
  if (editorContent) editorContent.innerHTML = page.content || '';

  if (page.type === 'toc') {
    await generateTOC(book);
  }

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

  await saveBook(book);

  const now = new Date().toLocaleString();
  if (saveIndicator) saveIndicator.textContent = `Saved ${now}`;
  if (inspectorSaved) inspectorSaved.textContent = now;

  updateWordStats();

  // Keep TOC in sync if it exists
  await refreshTOCIfPresent(book);
}

function scheduleAutoSave() {
  if (saveIndicator) saveIndicator.textContent = 'Saving…';
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => persistCurrentPage(), AUTO_SAVE_DELAY);
}

// ---------- TOC ----------
async function generateTOC(book) {
  if (!book || !book.structure) return;
  let html = '';

  (book.structure.parts || []).forEach((part, pIndex) => {
    html += `<h3>Part ${pIndex + 1}: ${escapeHtml(part.label)}</h3>`;
    (part.chapters || []).forEach((ch, cIndex) => {
      html += `<p>${pIndex + 1}.${cIndex + 1} ${escapeHtml(ch.label)}${ch.subtitle ? ' — ' + escapeHtml(ch.subtitle) : ''}</p>`;
    });
  });

  const tocPage = (book.structure.frontMatter || []).find(p => p.type === 'toc') ||
                  (book.structure.frontMatter || []).find(p => p.id === 'fm-toc');

  if (tocPage) {
    tocPage.content = html;
    if (currentPage && currentPage.id === tocPage.id && editorContent) {
      editorContent.innerHTML = html;
    }
    await saveBook(book);
  }
}

async function refreshTOCIfPresent(book) {
  const hasTOC = (book.structure.frontMatter || []).some(p => p.type === 'toc' || p.id === 'fm-toc');
  if (hasTOC) await generateTOC(book);
}

// ---------- Stats ----------
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

  if (currentPage && currentPage.type === 'chapter') {
    const storedChapter = (book.structure.parts || [])
      .flatMap(p => p.chapters || [])
      .find(c => c.id === currentPage.id);
    if (storedChapter) {
      const stored = countWordsFromHtml(storedChapter.content || '');
      totalWords = totalWords - stored + liveWords;
    } else {
      totalWords += liveWords;
    }
  } else {
    totalWords += liveWords;
  }

  wordStats.textContent = `Words: ${totalWords.toLocaleString()} • Chapters: ${totalChapters}`;
  if (inspectorWords) inspectorWords.textContent = String(liveWords);
  if (inspectorChapters) inspectorChapters.textContent = String(totalChapters);
}

// ---------- Editor settings ----------
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

// Scene break
if (insertSceneBreak) {
  insertSceneBreak.onclick = () => {
    const marker = document.createElement('div');
    marker.className = 'scene-break';
    marker.innerHTML = '<hr style="opacity:.25"><p style="text-align:center;opacity:.6">***</p><hr style="opacity:.25">';
    insertNodeAtCaret(marker);
    scheduleAutoSave();
  };
}

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

// ---------- Editor events ----------
if (editorContent) {
  editorContent.addEventListener('input', () => {
    scheduleAutoSave();
    updateWordStats();
  });
}
if (titleInput) titleInput.addEventListener('input', () => {
  scheduleAutoSave();
  refreshInspector();
});
if (subtitleInput) subtitleInput.addEventListener('input', () => {
  scheduleAutoSave();
  refreshInspector();
});

// Formatting toolbar (bold/italic/underline)
document.querySelectorAll('[data-cmd]').forEach(btn => {
  btn.addEventListener('click', () => {
    const cmd = btn.dataset.cmd;
    try { document.execCommand(cmd, false, null); } catch (e) { console.warn('execCommand failed', e); }
    if (editorContent) editorContent.focus();
    scheduleAutoSave();
  });
});

// ---------- Inspector ----------
function refreshInspector() {
  if (inspectorTitle) inspectorTitle.textContent = (titleInput ? titleInput.value : '') || '—';
  if (inspectorSubtitle) inspectorSubtitle.textContent = (subtitleInput ? subtitleInput.value : '') || '—';
}

// ---------- Focus mode ----------
if (focusModeBtn) {
  focusModeBtn.addEventListener('click', () => {
    document.body.classList.toggle('focus-mode');
  });
}

// ---------- Save / Preview / Publish ----------
if (saveBtn) {
  saveBtn.addEventListener('click', () => {
    persistCurrentPage();
  });
}

if (previewBtn) {
  previewBtn.addEventListener('click', () => {
    if (!editorContent) return;
    const title = titleInput ? titleInput.value || 'Preview' : 'Preview';
    const subtitle = subtitleInput ? subtitleInput.value || '' : '';
    const html = `
      <html>
        <head>
          <title>${escapeHtml(title)}</title>
          <style>
            body{font-family:Inter,system-ui;padding:40px;background:#fff;color:#111;max-width:700px;margin:0 auto;}
            h1{margin-bottom:0.25em;}
            h3{margin-top:0;color:#666;font-weight:400;}
          </style>
        </head>
        <body>
          <h1>${escapeHtml(title)}</h1>
          ${subtitle ? `<h3>${escapeHtml(subtitle)}</h3>` : ''}
          ${editorContent.innerHTML}
        </body>
      </html>`;
    const w = window.open('', '_blank');
    if (w) {
      w.document.open();
      w.document.write(html);
      w.document.close();
    }
  });
}

if (publishBtn) {
  publishBtn.addEventListener('click', async () => {
    await persistCurrentPage();
    window.location.href = '../pages/publish.html';
  });
}

// ---------- Public API ----------
window.BoardwalkWriter = {
  listBooks,
  getBook,
  saveBook,
  deleteBook
};

// ---------- Start ----------
init().catch(err => console.error('Writer init failed', err));
