// js/writer.js
// Single-file writer logic for pages/writer.html
// - left tree: front matter / parts / back matter
// - center editor with formatting toolbar (bold/italic/underline/font/size/line/letter)
// - right inspector shows current page metadata
// - localStorage keys: "books" (array) and "currentBook" (id)

const $ = id => document.getElementById(id);

// DOM refs
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

// storage helpers
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

// structure helpers
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
  let p = structure.frontMatter.find(x => x.id === id); if (p) return p;
  for (const part of structure.parts) {
    if (part.id === id) return part;
    const ch = (part.chapters || []).find(c => c.id === id); if (ch) return ch;
  }
  p = structure.backMatter.find(x => x.id === id); return p || null;
}

// render left tree
function renderSidebar() {
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
  structure.frontMatter.forEach(p => html += `<li data-id="${p.id}" class="tree-node">${escapeHtml(p.label)}</li>`);
  html += `</ul></div>`;

  html += `<div class="tree-block"><h4>Parts</h4><button class="tree-add-part">+ Add Part</button><div class="parts">`;
  structure.parts.forEach(part => {
    html += `<div class="part" data-id="${part.id}"><div class="part-label" data-id="${part.id}">${escapeHtml(part.label)}</div>`;
    html += `<button class="tree-add-chapter" data-part="${part.id}">+ Chapter</button><ul>`;
    (part.chapters || []).forEach(ch => html += `<li data-id="${ch.id}" class="tree-node">${escapeHtml(ch.label)}</li>`);
    html += `</ul></div>`;
  });
  html += `</div></div>`;

  html += `<div class="tree-block"><h4>Back Matter</h4><ul>`;
  structure.backMatter.forEach(p => html += `<li data-id="${p.id}" class="tree-node">${escapeHtml(p.label)}</li>`);
  html += `</ul></div>`;
  return html;
}
function attachSidebarEvents() {
  leftSidebar.querySelectorAll('.tree-node').forEach(el => el.onclick = () => loadPage(el.dataset.id));
  leftSidebar.querySelectorAll('.tree-add-part').forEach(btn => btn.onclick = addPart);
  leftSidebar.querySelectorAll('.tree-add-chapter').forEach(btn => btn.onclick = () => addChapter(btn.dataset.part));
}

// page load/save
let currentPage = null;
let autoSaveTimer = null;

function loadPage(id) {
  const book = getCurrentBook(); if (!book) return;
  const page = findPageById(book.structure, id); if (!page) return;
  currentPage = page;
  titleInput.value = page.label || '';
  subtitleInput.value = page.subtitle || '';
  editorContent.innerHTML = page.content || '';
  if (page.type === 'toc') generateTOC();
  updateWordStats();
  refreshInspector();
}
function persistCurrentPage() {
  if (!currentPage) return;
  currentPage.label = titleInput.value;
  currentPage.subtitle = subtitleInput.value;
  currentPage.content = editorContent.innerHTML;
  updateCurrentBook(b => { b.structure = b.structure; });
  const now = new Date().toLocaleString();
  saveIndicator.textContent = `Saved ${now}`;
  inspectorSaved.textContent = now;
  updateWordStats();
}
function scheduleAutoSave() {
  saveIndicator.textContent = 'Saving…';
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => persistCurrentPage(), 800);
}

// add / edit structure
function addPart() {
  const book = getCurrentBook(); if (!book) return;
  const parts = book.structure.parts;
  const idx = parts.length + 1;
  const newPart = { id: `part${idx}`, type: 'part', label: `Part ${idx}`, subtitle: '', chapters: [] };
  parts.push(newPart);
  updateCurrentBook(b => { b.structure = book.structure; });
  renderSidebar();
  loadPage(newPart.id);
}
function addChapter(partId) {
  const book = getCurrentBook(); if (!book) return;
  const part = book.structure.parts.find(p => p.id === partId); if (!part) return;
  const num = (part.chapters || []).length + 1;
  const newChapter = { id: `${partId}-ch${num}`, type: 'chapter', label: `Chapter ${num}`, subtitle: '', content: '' };
  part.chapters = part.chapters || []; part.chapters.push(newChapter);
  updateCurrentBook(b => { b.structure = book.structure; });
  renderSidebar();
  loadPage(newChapter.id);
}

// TOC & metrics
function generateTOC() {
  const book = getCurrentBook(); if (!book) return;
  let html = '';
  book.structure.parts.forEach(part => {
    html += `<h3>${escapeHtml(part.label)}</h3>`;
    (part.chapters || []).forEach(ch => {
      html += `<p>${escapeHtml(ch.label)}${ch.subtitle ? ' — ' + escapeHtml(ch.subtitle) : ''}</p>`;
    });
  });
  if (currentPage) { currentPage.content = html; editorContent.innerHTML = html; persistCurrentPage(); }
}
function countWordsFromHtml(html = '') {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); if (!text) return 0; return text.split(' ').length;
}
function updateWordStats() {
  const book = getCurrentBook(); if (!book) { wordStats.textContent = 'Words: 0 • Chapters: 0'; return; }
  let totalWords = 0, totalChapters = 0;
  (book.structure.parts || []).forEach(part => { (part.chapters || []).forEach(ch => { totalChapters++; totalWords += countWordsFromHtml(ch.content || ''); }); });
  if (currentPage && currentPage.type !== 'chapter') totalWords += countWordsFromHtml(currentPage.content || '');
  wordStats.textContent = `Words: ${totalWords.toLocaleString()} • Chapters: ${totalChapters}`;
  inspectorWords.textContent = countWordsFromHtml(editorContent.innerHTML || 0);
  inspectorChapters.textContent = totalChapters;
}

// formatting toolbar (uses execCommand for simplicity)
document.querySelectorAll('[data-cmd]').forEach(btn => {
  btn.addEventListener('click', () => {
    const cmd = btn.dataset.cmd;
    document.execCommand(cmd, false, null);
    editorContent.focus();
    scheduleAutoSave();
  });
});

// font family/size/line/letter
fontFamilySelect.addEventListener('change', () => {
  document.execCommand('fontName', false, fontFamilySelect.value);
  editorContent.focus();
  scheduleAutoSave();
});
fontSizeSelect.addEventListener('change', () => {
  // apply font-size by wrapping selection in span
  applyStyleToSelection('font-size', `${fontSizeSelect.value}px`);
  scheduleAutoSave();
});
lineSpaceSelect.addEventListener('change', () => {
  editorContent.style.lineHeight = lineSpaceSelect.value;
  scheduleAutoSave();
});
letterSpaceSelect.addEventListener('input', () => {
  editorContent.style.letterSpacing = `${letterSpaceSelect.value}px`;
  scheduleAutoSave();
});

// helper to apply inline style to selection
function applyStyleToSelection(prop, value) {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  const span = document.createElement('span');
  span.style[prop] = value;
  span.appendChild(range.extractContents());
  range.insertNode(span);
  // move caret after span
  range.setStartAfter(span);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

// scene break
insertSceneBreak.addEventListener('click', () => {
  const marker = document.createElement('div');
  marker.className = 'scene-break';
  marker.innerHTML = '<hr style="opacity:.25"><p style="text-align:center;opacity:.6">***</p><hr style="opacity:.25">';
  insertNodeAtCaret(marker);
  scheduleAutoSave();
});
function insertNodeAtCaret(node) {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) { editorContent.appendChild(node); return; }
  const range = sel.getRangeAt(0);
  range.deleteContents();
  range.insertNode(node);
  range.setStartAfter(node);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

// editor events
editorContent.addEventListener('input', () => { scheduleAutoSave(); updateWordStats(); });
titleInput.addEventListener('input', () => { scheduleAutoSave(); refreshInspector(); });
subtitleInput.addEventListener('input', () => { scheduleAutoSave(); refreshInspector(); });

// inspector refresh
function refreshInspector() {
  inspectorTitle.textContent = titleInput.value || '—';
  inspectorSubtitle.textContent = subtitleInput.value || '—';
}

// save / preview / publish
saveBtn.addEventListener('click', () => { persistCurrentPage(); });
previewBtn.addEventListener('click', () => {
  const html = `<html><head><title>${escapeHtml(titleInput.value || 'Preview')}</title><style>body{font-family:Inter,system-ui;padding:40px;background:#fff;color:#111}</style></head><body><h1>${escapeHtml(titleInput.value || '')}</h1><h3>${escapeHtml(subtitleInput.value || '')}</h3>${editorContent.innerHTML}</body></html>`;
  const w = window.open('', '_blank'); w.document.open(); w.document.write(html); w.document.close();
});
publishBtn.addEventListener('click', () => { persistCurrentPage(); window.location.href = '../pages/publish.html'; });

// utilities
function escapeHtml(str = '') {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

// init
function init() {
  // ensure there is at least one book for demo if none exists
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
    leftSidebar.innerHTML = `<div class="empty-state">No active book selected. Open the library and choose a book.</div>`;
    editorContent.setAttribute('contenteditable', 'false');
    titleInput.disabled = true; subtitleInput.disabled = true;
    saveBtn.disabled = true; previewBtn.disabled = true; publishBtn.disabled = true;
    return;
  }

  ensureBookStructure(book);
  renderSidebar();

  // default load: first front matter title page or first chapter
  const firstFront = book.structure.frontMatter[0];
  if (firstFront) loadPage(firstFront.id);
  else if (book.structure.parts.length && book.structure.parts[0].chapters.length) loadPage(book.structure.parts[0].chapters[0].id);

  applyEditorSettings();
  updateWordStats();

  // autosave safety net
  setInterval(() => persistCurrentPage(), 30000);
}
function applyEditorSettings() {
  editorContent.style.lineHeight = lineSpaceSelect.value;
  editorContent.style.letterSpacing = `${letterSpaceSelect.value}px`;
  editorContent.style.fontSize = `${fontSizeSelect.value}px`;
  editorContent.style.fontFamily = fontFamilySelect.value;
}
init();
