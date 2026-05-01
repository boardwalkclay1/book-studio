// js/writer.js
// Entry point for Writer page. Assumes this file lives in /js and modules (optional) live in /modules

// -------------------- Storage helpers --------------------
function getBooks() {
  try {
    return JSON.parse(localStorage.getItem('books') || '[]');
  } catch {
    return [];
  }
}

function saveBooks(books) {
  localStorage.setItem('books', JSON.stringify(books));
}

function getCurrentBookId() {
  return localStorage.getItem('currentBook');
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

// -------------------- DOM references --------------------
const leftSidebar = document.getElementById('leftSidebar');
const editorContent = document.getElementById('editorContent');
const titleInput = document.getElementById('chapterTitle');
const subtitleInput = document.getElementById('chapterSubtitle');

const fontSizeSelect = document.getElementById('fontSizeSelect');
const lineSpaceSelect = document.getElementById('lineSpaceSelect');
const letterSpaceSelect = document.getElementById('letterSpaceSelect');
const insertSceneBreak = document.getElementById('insertSceneBreak');

const wordStats = document.getElementById('wordStats');
const saveIndicator = document.getElementById('saveIndicator');

const saveBtn = document.getElementById('saveBtn');
const previewBtn = document.getElementById('previewBtn');
const publishBtn = document.getElementById('publishBtn');
const exportBtn = document.getElementById('exportBtn');
const toolsBtn = document.getElementById('toolsBtn');

// Optional module hooks (if you add modules later)
let initEditor = null;
let initToolbar = null;
try {
  // dynamic import if modules exist
  import('../modules/editor.js').then(m => { initEditor = m.default || m.initEditor; }).catch(()=>{});
  import('../modules/toolbar.js').then(m => { initToolbar = m.default || m.initToolbar; }).catch(()=>{});
} catch (e) { /* ignore if modules not present */ }

// -------------------- Book structure helpers --------------------
function ensureBookStructure(book) {
  if (!book.structure) {
    book.structure = {
      frontMatter: [
        { id: 'titlePage', type: 'page', label: 'Title Page', content: '' },
        { id: 'toc', type: 'toc', label: 'Table of Contents', content: '' }
      ],
      parts: [],
      backMatter: [
        { id: 'aboutAuthor', type: 'page', label: 'About the Author', content: '' }
      ]
    };
    updateCurrentBook(b => { b.structure = book.structure; });
  }
}

function findPageById(structure, id) {
  if (!structure) return null;
  let p = structure.frontMatter.find(x => x.id === id);
  if (p) return p;
  for (const part of structure.parts) {
    if (part.id === id) return part;
    const ch = (part.chapters || []).find(c => c.id === id);
    if (ch) return ch;
  }
  p = structure.backMatter.find(x => x.id === id);
  return p || null;
}

// -------------------- Sidebar rendering --------------------
function renderSidebar() {
  const book = getCurrentBook();
  if (!book) {
    leftSidebar.innerHTML = `<div class="empty-state">No active book. Go back to the library.</div>`;
    return;
  }
  ensureBookStructure(book);
  leftSidebar.innerHTML = buildTreeHtml(book.structure);
  attachSidebarEvents();
}

function buildTreeHtml(structure) {
  // simple HTML tree: front matter, parts with chapters, back matter
  let html = `<div class="tree-block"><h4>Front Matter</h4><ul>`;
  structure.frontMatter.forEach(p => {
    html += `<li data-id="${p.id}" class="tree-node">${escapeHtml(p.label)}</li>`;
  });
  html += `</ul></div>`;

  html += `<div class="tree-block"><h4>Parts</h4>`;
  html += `<button class="tree-add-part">+ Add Part</button>`;
  html += `<div class="parts">`;
  structure.parts.forEach(part => {
    html += `<div class="part" data-id="${part.id}"><div class="part-label" data-id="${part.id}">${escapeHtml(part.label)}</div>`;
    html += `<button class="tree-add-chapter" data-part="${part.id}">+ Chapter</button>`;
    html += `<ul>`;
    (part.chapters || []).forEach(ch => {
      html += `<li data-id="${ch.id}" class="tree-node">${escapeHtml(ch.label)}</li>`;
    });
    html += `</ul></div>`;
  });
  html += `</div></div>`;

  html += `<div class="tree-block"><h4>Back Matter</h4><ul>`;
  structure.backMatter.forEach(p => {
    html += `<li data-id="${p.id}" class="tree-node">${escapeHtml(p.label)}</li>`;
  });
  html += `</ul></div>`;

  return html;
}

function attachSidebarEvents() {
  leftSidebar.querySelectorAll('.tree-node').forEach(el => {
    el.onclick = () => loadPage(el.dataset.id);
  });

  leftSidebar.querySelectorAll('.tree-add-part').forEach(btn => {
    btn.onclick = addPart;
  });

  leftSidebar.querySelectorAll('.tree-add-chapter').forEach(btn => {
    btn.onclick = () => addChapter(btn.dataset.part);
  });
}

// -------------------- Page load/save --------------------
let currentPage = null;
let autoSaveTimer = null;

function loadPage(id) {
  const book = getCurrentBook();
  if (!book || !book.structure) return;
  const page = findPageById(book.structure, id);
  if (!page) return;
  currentPage = page;

  titleInput.value = page.label || '';
  subtitleInput.value = page.subtitle || '';
  editorContent.innerHTML = page.content || '';

  if (page.type === 'toc') generateTOC();

  updateWordStats();
}

function persistCurrentPage() {
  if (!currentPage) return;
  currentPage.label = titleInput.value;
  currentPage.subtitle = subtitleInput.value;
  currentPage.content = editorContent.innerHTML;
  updateCurrentBook(b => { b.structure = b.structure; });
  saveIndicator.textContent = 'Saved';
  updateWordStats();
}

function scheduleAutoSave() {
  saveIndicator.textContent = 'Saving…';
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    persistCurrentPage();
  }, 800);
}

// -------------------- Add / Edit structure --------------------
function addPart() {
  const book = getCurrentBook();
  if (!book) return;
  const parts = book.structure.parts;
  const idx = parts.length + 1;
  const newPart = {
    id: `part${idx}`,
    type: 'part',
    label: `Part ${idx}`,
    subtitle: '',
    chapters: []
  };
  parts.push(newPart);
  updateCurrentBook(b => { b.structure = book.structure; });
  renderSidebar();
  loadPage(newPart.id);
}

function addChapter(partId) {
  const book = getCurrentBook();
  if (!book) return;
  const part = book.structure.parts.find(p => p.id === partId);
  if (!part) return;
  const num = (part.chapters || []).length + 1;
  const newChapter = {
    id: `${partId}-ch${num}`,
    type: 'chapter',
    label: `Chapter ${num}`,
    subtitle: '',
    content: ''
  };
  part.chapters = part.chapters || [];
  part.chapters.push(newChapter);
  updateCurrentBook(b => { b.structure = book.structure; });
  renderSidebar();
  loadPage(newChapter.id);
}

// -------------------- TOC generator & metrics --------------------
function generateTOC() {
  const book = getCurrentBook();
  if (!book) return;
  let html = '';
  book.structure.parts.forEach(part => {
    html += `<h3>${escapeHtml(part.label)}</h3>`;
    (part.chapters || []).forEach(ch => {
      html += `<p>${escapeHtml(ch.label)}${ch.subtitle ? ' — ' + escapeHtml(ch.subtitle) : ''}</p>`;
    });
  });
  if (currentPage) {
    currentPage.content = html;
    editorContent.innerHTML = html;
    persistCurrentPage();
  }
}

function countWordsFromHtml(html = '') {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return 0;
  return text.split(' ').length;
}

function updateWordStats() {
  const book = getCurrentBook();
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
  if (currentPage && currentPage.type !== 'chapter') {
    totalWords += countWordsFromHtml(currentPage.content || '');
  }
  wordStats.textContent = `Words: ${totalWords.toLocaleString()} • Chapters: ${totalChapters}`;
}

// -------------------- Editor integrations & UI bindings --------------------
function applyEditorSettings() {
  const size = fontSizeSelect.value;
  const line = lineSpaceSelect.value;
  const letter = letterSpaceSelect.value;
  editorContent.style.fontSize = `${size}px`;
  editorContent.style.lineHeight = line;
  editorContent.style.letterSpacing = `${letter}px`;
}

fontSizeSelect.onchange = applyEditorSettings;
lineSpaceSelect.onchange = applyEditorSettings;
letterSpaceSelect.oninput = applyEditorSettings;

insertSceneBreak.onclick = () => {
  const marker = document.createElement('div');
  marker.className = 'scene-break';
  marker.innerHTML = '<hr style="opacity:.25"><p style="text-align:center;opacity:.6">***</p><hr style="opacity:.25">';
  insertNodeAtCaret(marker);
  scheduleAutoSave();
};

function insertNodeAtCaret(node) {
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

// editor content events
editorContent.addEventListener('input', () => {
  scheduleAutoSave();
  updateWordStats();
});

// title/subtitle events
titleInput.addEventListener('input', scheduleAutoSave);
subtitleInput.addEventListener('input', scheduleAutoSave);

// save button
saveBtn.onclick = () => {
  persistCurrentPage();
  saveIndicator.textContent = 'Saved';
};

// preview button
previewBtn.onclick = () => {
  const html = `
    <html><head><title>${escapeHtml(titleInput.value || 'Preview')}</title>
    <style>body{font-family:Inter,system-ui; padding:40px; background:#fff; color:#111}</style>
    </head><body>
    <h1>${escapeHtml(titleInput.value || '')}</h1>
    <h3>${escapeHtml(subtitleInput.value || '')}</h3>
    ${editorContent.innerHTML}
    </body></html>`;
  const w = window.open('', '_blank');
  w.document.open();
  w.document.write(html);
  w.document.close();
};

// publish button
publishBtn.onclick = () => {
  persistCurrentPage();
  window.location.href = '../pages/publish.html';
};

// export/tools placeholders
exportBtn.onclick = () => {
  persistCurrentPage();
  alert('Export feature not yet implemented. Use Preview to check content.');
};
toolsBtn.onclick = () => {
  alert('Tools coming soon.');
};

// -------------------- Utilities --------------------
function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// -------------------- Initialization --------------------
function init() {
  const book = getCurrentBook();
  if (!book) {
    leftSidebar.innerHTML = `<div class="empty-state">No active book selected. Open the library and choose a book.</div>`;
    editorContent.setAttribute('contenteditable', 'false');
    titleInput.disabled = true;
    subtitleInput.disabled = true;
    saveBtn.disabled = true;
    previewBtn.disabled = true;
    publishBtn.disabled = true;
    return;
  }

  ensureBookStructure(book);
  // initialize optional modules if available
  try { if (typeof initEditor === 'function') initEditor(editorContent, { book }); } catch(e){console.warn(e);}
  try { if (typeof initToolbar === 'function') initToolbar(document.getElementById('editorToolbar')); } catch(e){console.warn(e);}

  renderSidebar();

  const firstFront = book.structure.frontMatter[0];
  if (firstFront) loadPage(firstFront.id);
  else if (book.structure.parts.length && book.structure.parts[0].chapters.length) {
    loadPage(book.structure.parts[0].chapters[0].id);
  }

  applyEditorSettings();
  updateWordStats();

  setInterval(() => persistCurrentPage(), 30000);
}

init();
