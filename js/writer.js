// js/writer.js
// Robust writer logic with defensive checks and fixed word-count function.
// Place at /js/writer.js (loaded by pages/writer.html)

const $ = id => document.getElementById(id);

// DOM refs (guarded later)
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

// ---------- Storage helpers ----------
function getBooks() {
  try { return JSON.parse(localStorage.getItem('books') || '[]'); } catch { return []; }
}
function saveBooks(books) { localStorage.setItem('books', JSON.stringify(books)); }
function getCurrentBookId() { return localStorage.getItem('currentBook'); }
function getCurrentBook() {
  const id = getCurrentBookId(); if (!id) return null;
  return getBooks().find(b => b.id === id) || null;
}
function updateCurrentBook(updater) {
  const id = getCurrentBookId(); if (!id) return;
  const books = getBooks(); const idx = books.findIndex(b => b.id === id); if (idx === -1) return;
  updater(books[idx]); saveBooks(books);
}

// ---------- Structure helpers ----------
function ensureBookStructure(book) {
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
    updateCurrentBook(b => { b.structure = book.structure; });
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
function renderSidebar() {
  if (!leftSidebar) return;
  const book = getCurrentBook();
  if (!book) {
    leftSidebar.innerHTML = `<div class="empty-state">No active book. Open the library.</div>`;
    return;
  }
  ensureBookStructure(book);
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
let currentPage = null;
let autoSaveTimer = null;

function loadPage(id) {
  const book = getCurrentBook(); if (!book || !book.structure) return;
  const page = findPageById(book.structure, id); if (!page) return;
  currentPage = page;

  if (titleInput) titleInput.value = page.label || '';
  if (subtitleInput) subtitleInput.value = page.subtitle || '';

  // ensure content is string
  if (editorContent) {
    editorContent.innerHTML = (typeof page.content === 'string') ? page.content : (page.content == null ? '' : String(page.content));
  }

  if (page.type === 'toc') generateTOC();

  updateWordStats();
  refreshInspector();
}

function persistCurrentPage() {
  if (!currentPage) return;
  if (titleInput) currentPage.label = titleInput.value;
  if (subtitleInput) currentPage.subtitle = subtitleInput.value;
  if (editorContent) currentPage.content = String(editorContent.innerHTML || '');
  updateCurrentBook(b => { b.structure = b.structure; });
  const now = new Date().toLocaleString();
  if (saveIndicator) saveIndicator.textContent = `Saved ${now}`;
  if (inspectorSaved) inspectorSaved.textContent = now;
  updateWordStats();
}

function scheduleAutoSave() {
  if (saveIndicator) saveIndicator.textContent = 'Saving…';
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => persistCurrentPage(), 800);
}

// ---------- Add / Edit structure ----------
function addPart() {
  const book = getCurrentBook(); if (!book) return;
  book.structure.parts = book.structure.parts || [];
  const idx = book.structure.parts.length + 1;
  const newPart = { id: `part${idx}`, type: 'part', label: `Part ${idx}`, subtitle: '', chapters: [] };
  book.structure.parts.push(newPart);
  updateCurrentBook(b => { b.structure = book.structure; });
  renderSidebar();
  loadPage(newPart.id);
}

function addChapter(partId) {
  const book = getCurrentBook(); if (!book) return;
  const part = (book.structure.parts || []).find(p => p.id === partId); if (!part) return;
  part.chapters = part.chapters || [];
  const num = part.chapters.length + 1;
  const newChapter = { id: `${partId}-ch${num}`, type: 'chapter', label: `Chapter ${num}`, subtitle: '', content: '' };
  part.chapters.push(newChapter);
  updateCurrentBook(b => { b.structure = book.structure; });
  renderSidebar();
  loadPage(newChapter.id);
}

// ---------- TOC & metrics ----------
function generateTOC() {
  const book = getCurrentBook(); if (!book) return;
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
    persistCurrentPage();
  }
}

// Robust word counting: accepts strings, DOM nodes, numbers, arrays, objects
function countWordsFromHtml(input = '') {
  if (input == null) return 0;

  // If DOM node, use textContent
  if (typeof input === 'object' && input.nodeType && typeof input.textContent === 'string') {
    input = input.textContent;
  } else if (Array.isArray(input)) {
    // join array elements
    input = input.map(i => (i == null ? '' : (typeof i === 'string' ? i : String(i)))).join(' ');
  } else if (typeof input !== 'string') {
    // fallback to string coercion for numbers/objects
    try { input = String(input); } catch { input = ''; }
  }

  // strip HTML tags if present
  const text = input.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return 0;
  return text.split(' ').filter(Boolean).length;
}

function updateWordStats() {
  if (!wordStats) return;
  const book = getCurrentBook();
  if (!book) {
    wordStats.textContent = 'Words: 0 • Chapters: 0';
    if (inspectorWords) inspectorWords.textContent = '0';
    if (inspectorChapters) inspectorChapters.textContent = '0';
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

  // live editor content
  const liveWords = editorContent ? countWordsFromHtml(editorContent.innerHTML || '') : 0;

  if (currentPage) {
    if (currentPage.type === 'chapter') {
      // find stored chapter and replace its stored count with live count
      const storedChapter = (book.structure.parts || []).flatMap(p => p.chapters || []).find(c => c.id === currentPage.id);
      if (storedChapter) {
        const stored = countWordsFromHtml(storedChapter.content || '');
        totalWords = totalWords - stored + liveWords;
      } else {
        totalWords += liveWords;
      }
    } else {
      // non-chapter pages: include live content
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
if (publishBtn) publishBtn.addEventListener('click', () => { persistCurrentPage(); window.location.href = '../pages/publish.html'; });

// ---------- Utilities ----------
function escapeHtml(str = '') {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

// ---------- Initialization ----------
function init() {
  // create demo book if none exists (keeps UI usable)
  let books = getBooks();
  if (!books.length) {
    const demo = {
      id: 'book-1',
      title: 'Untitled Book',
      author: '',
      structure: {
        frontMatter: [{ id: 'titlePage', type: 'page', label: 'Title Page', subtitle: '', content: '' }, { id: 'toc', type: 'toc', label: 'Table of Contents', subtitle: '', content: '' }],
        parts: [{ id: 'part1', type: 'part', label: 'Part 1', subtitle: '', chapters: [{ id: 'part1-ch1', type: 'chapter', label: 'Chapter 1', subtitle: '', content: '<p>Start writing...</p>' }] }],
        backMatter: [{ id: 'aboutAuthor', type: 'page', label: 'About the Author', subtitle: '', content: '' }]
      }
    };
    books = [demo];
    saveBooks(books);
    localStorage.setItem('currentBook', demo.id);
  }

  const book = getCurrentBook();
  if (!book) {
    if (leftSidebar) leftSidebar.innerHTML = `<div class="empty-state">No active book selected. Open the library and choose a book.</div>`;
    if (editorContent) editorContent.setAttribute('contenteditable', 'false');
    if (titleInput) titleInput.disabled = true; if (subtitleInput) subtitleInput.disabled = true;
    if (saveBtn) saveBtn.disabled = true; if (previewBtn) previewBtn.disabled = true; if (publishBtn) publishBtn.disabled = true;
    return;
  }

  ensureBookStructure(book);
  renderSidebar();

  // default load: first front matter title page or first chapter
  const firstFront = book.structure.frontMatter && book.structure.frontMatter[0];
  if (firstFront) loadPage(firstFront.id);
  else if (book.structure.parts && book.structure.parts.length && book.structure.parts[0].chapters && book.structure.parts[0].chapters.length) {
    loadPage(book.structure.parts[0].chapters[0].id);
  }

  applyEditorSettings();
  updateWordStats();
  refreshInspector();

  // autosave safety net
  setInterval(() => persistCurrentPage(), 30000);
}

init();
