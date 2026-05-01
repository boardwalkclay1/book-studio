// js/publish.js
// Publish page logic for Boardwalk Book Studio
// - Loads books from IndexedDB (same DB used by writer.js) with localStorage fallback
// - Renders preview (HTML) and a printable preview (user can Print -> Save as PDF)
// - Exports: HTML, Plain Text, JSON (full book), and a best-effort EPUB (if JSZip available)
// - Provides a PDF preview via the browser print dialog (opens a preview window)
// - Handles cover images (blobs) and embeds them in exported HTML/preview
//
// Install: place at /js/publish.js and include in pages/publish.html as:
// <script type="module" src="../js/publish.js"></script>
//
// Notes:
// - This script intentionally uses only browser APIs and graceful fallbacks.
// - For a fully packaged EPUB with compression, include JSZip and the code will use it.
// - For server/cloud export, call the provided `uploadBookForSync(book)` placeholder.

const DB_NAME = 'boardwalk-db';
const DB_VERSION = 1;
const BOOK_STORE = 'books';
const META_STORE = 'meta';
const LS_BOOKS_KEY = 'books';
const LS_CURRENT_KEY = 'currentBook';

// ---------- DOM helpers ----------
const $ = id => document.getElementById(id);

// Expected DOM IDs on publish page (adjust if your markup differs)
const bookSelect = $('publishBookSelect');      // <select> of books
const previewArea = $('publishPreview');       // container to render preview HTML
const previewModal = $('publishPreviewModal'); // modal wrapper for preview
const previewClose = $('publishPreviewClose'); // close button
const downloadHtmlBtn = $('downloadHtml');
const downloadTextBtn = $('downloadText');
const downloadJsonBtn = $('downloadJson');
const downloadEpubBtn = $('downloadEpub');
const printPdfBtn = $('printPdf');
const exportAllBtn = $('exportAll');           // optional: export all books
const coverInput = $('publishCoverInput');     // optional: cover override input

// ---------- IndexedDB helpers ----------
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
function requestToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbGetAllBooks() {
  try {
    const db = await openDB();
    const tx = db.transaction(BOOK_STORE, 'readonly');
    const store = tx.objectStore(BOOK_STORE);
    const req = store.getAll();
    return await requestToPromise(req);
  } catch {
    // fallback to localStorage
    try {
      return JSON.parse(localStorage.getItem(LS_BOOKS_KEY) || '[]');
    } catch {
      return [];
    }
  }
}
async function idbGetBook(id) {
  if (!id) return null;
  try {
    const db = await openDB();
    const tx = db.transaction(BOOK_STORE, 'readonly');
    const store = tx.objectStore(BOOK_STORE);
    const req = store.get(id);
    return await requestToPromise(req);
  } catch {
    const books = JSON.parse(localStorage.getItem(LS_BOOKS_KEY) || '[]');
    return books.find(b => b.id === id) || null;
  }
}

// ---------- Utilities ----------
function uid(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;
}
function escapeHtml(s = '') {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function blobToDataURL(blob) {
  return new Promise((resolve) => {
    if (!blob) return resolve(null);
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---------- Render helpers ----------
function buildBookHtml(book, options = {}) {
  // options: { includeCover: true, inlineStyles: true }
  const title = escapeHtml(book.title || 'Untitled');
  const subtitle = escapeHtml(book.subtitle || '');
  const author = escapeHtml(book.author || '');
  const created = book.created || '';
  const coverDataUrl = options.coverDataUrl || null;

  // Build content from structure: frontMatter, parts, backMatter
  let bodyHtml = '';
  const appendPage = (p) => {
    if (!p) return;
    bodyHtml += `<section class="page" data-id="${escapeHtml(p.id || '')}">`;
    if (p.type !== 'toc' && p.label) bodyHtml += `<h2 class="page-title">${escapeHtml(p.label)}</h2>`;
    if (p.subtitle) bodyHtml += `<h3 class="page-subtitle">${escapeHtml(p.subtitle)}</h3>`;
    bodyHtml += `<div class="page-content">${p.content || ''}</div>`;
    bodyHtml += `</section>`;
  };

  (book.structure.frontMatter || []).forEach(appendPage);
  (book.structure.parts || []).forEach(part => {
    bodyHtml += `<section class="part" data-id="${escapeHtml(part.id)}"><h2 class="part-title">${escapeHtml(part.label)}</h2>`;
    (part.chapters || []).forEach(appendPage);
    bodyHtml += `</section>`;
  });
  (book.structure.backMatter || []).forEach(appendPage);

  // Minimal CSS for exported HTML / preview
  const css = `
    body{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial; margin:28px; color:#111; background:#fff}
    .book-header{display:flex;gap:18px;align-items:center;margin-bottom:18px}
    .cover{width:160px;height:220px;object-fit:cover;border:1px solid rgba(0,0,0,0.06);box-shadow:0 6px 18px rgba(0,0,0,0.06)}
    .meta{flex:1}
    h1{font-family:"Great Vibes",serif;font-size:44px;margin:0;color:#b8861f}
    h2.part-title{font-size:20px;margin:18px 0 8px 0;color:#333}
    h2.page-title{font-size:18px;margin:12px 0 6px 0;color:#222}
    h3.page-subtitle{font-size:14px;margin:0 0 8px 0;color:#555}
    .page-content{font-size:16px;line-height:1.6;color:#111}
    .page{page-break-after:always;padding-bottom:18px}
  `;

  const coverHtml = coverDataUrl ? `<img class="cover" src="${coverDataUrl}" alt="Cover" />` : '';

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>${css}</style>
</head>
<body>
  <div class="book-header">
    ${coverHtml}
    <div class="meta">
      <h1>${title}</h1>
      ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
      ${author ? `<div class="author">By ${author}</div>` : ''}
      ${created ? `<div class="created">Created: ${escapeHtml(created)}</div>` : ''}
    </div>
  </div>
  ${bodyHtml}
</body>
</html>`;

  return html;
}

// ---------- Preview & Print (PDF) ----------
async function openPrintPreview(book) {
  // Build HTML and open in new window; call print to let user Save as PDF
  const coverDataUrl = book.cover && (book.cover instanceof Blob || book.cover instanceof File) ? await blobToDataURL(book.cover) : (book.cover || null);
  const html = buildBookHtml(book, { coverDataUrl });
  const w = window.open('', '_blank', 'noopener');
  if (!w) {
    alert('Popup blocked. Allow popups for this site to preview/print.');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  // Give the new window a moment to render, then focus and show print dialog when user clicks Print Preview button
  // We do not call w.print() automatically to avoid unexpected dialogs; provide a visible "Print" button in the preview instead.
  // Insert a small print button at top of preview
  const script = `
    (function(){
      const btn = document.createElement('button');
      btn.textContent = 'Print / Save as PDF';
      btn.style.position='fixed';btn.style.right='18px';btn.style.top='18px';btn.style.zIndex=9999;
      btn.style.padding='10px 14px';btn.style.background='#b8861f';btn.style.color='#111';btn.style.border='none';btn.style.borderRadius='8px';
      btn.onclick = () => { window.print(); };
      document.body.appendChild(btn);
    })();
  `;
  const s = w.document.createElement('script');
  s.textContent = script;
  w.document.head.appendChild(s);
  w.focus();
}

// ---------- Download handlers ----------
async function downloadHtml(book) {
  const coverDataUrl = book.cover && (book.cover instanceof Blob || book.cover instanceof File) ? await blobToDataURL(book.cover) : (book.cover || null);
  const html = buildBookHtml(book, { coverDataUrl });
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const safeTitle = (book.title || 'book').replace(/[^\w\-]+/g, '_').slice(0,120);
  downloadBlob(blob, `${safeTitle}.html`);
}

async function downloadPlainText(book) {
  // Flatten structure into readable plain text
  let text = '';
  text += `${book.title || 'Untitled'}\n`;
  if (book.subtitle) text += `${book.subtitle}\n`;
  if (book.author) text += `By ${book.author}\n`;
  text += `\n\n`;
  const appendPage = (p) => {
    if (!p) return;
    if (p.label) text += `${p.label}\n`;
    if (p.subtitle) text += `${p.subtitle}\n`;
    // strip HTML tags from content
    const content = (p.content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    text += `${content}\n\n`;
  };
  (book.structure.frontMatter || []).forEach(appendPage);
  (book.structure.parts || []).forEach(part => {
    text += `${part.label}\n\n`;
    (part.chapters || []).forEach(appendPage);
  });
  (book.structure.backMatter || []).forEach(appendPage);

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const safeTitle = (book.title || 'book').replace(/[^\w\-]+/g, '_').slice(0,120);
  downloadBlob(blob, `${safeTitle}.txt`);
}

async function downloadJson(book) {
  // Convert any Blob cover to base64 data URL for portability
  const copy = JSON.parse(JSON.stringify(book));
  if (book.cover && (book.cover instanceof Blob || book.cover instanceof File)) {
    copy.cover = await blobToDataURL(book.cover);
  }
  const blob = new Blob([JSON.stringify(copy, null, 2)], { type: 'application/json' });
  const safeTitle = (book.title || 'book').replace(/[^\w\-]+/g, '_').slice(0,120);
  downloadBlob(blob, `${safeTitle}.json`);
}

async function downloadEpub(book) {
  // Best-effort EPUB creation:
  // - If JSZip is available (window.JSZip), use it to create a proper EPUB container.
  // - Otherwise, fall back to offering HTML/JSON and inform user.
  if (window.JSZip) {
    try {
      const zip = new window.JSZip();
      // required mimetype file (must be uncompressed and first entry in EPUB)
      zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

      // META-INF/container.xml
      zip.folder('META-INF').file('container.xml', `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/package.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

      // OEBPS content
      const oebps = zip.folder('OEBPS');
      // simple stylesheet
      oebps.file('styles.css', `body{font-family:serif;padding:1em;color:#111}h1{color:#b8861f}`);
      // cover image
      let coverHref = null;
      if (book.cover) {
        const coverBlob = (book.cover instanceof Blob || book.cover instanceof File) ? book.cover : base64ToBlob(book.cover);
        coverHref = 'images/cover.jpg';
        oebps.folder('images').file('cover.jpg', coverBlob);
      }
      // content files
      let manifestItems = [];
      let spineItems = [];
      let idx = 1;
      const addContent = (p, idPrefix = '') => {
        const id = `item${idx++}`;
        const filename = `page-${id}.xhtml`;
        const content = `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>${escapeHtml(p.label || '')}</title><link rel="stylesheet" href="styles.css"/></head>
<body>
<h2>${escapeHtml(p.label || '')}</h2>
${p.content || ''}
</body></html>`;
        oebps.file(filename, content);
        manifestItems.push(`<item id="${id}" href="${filename}" media-type="application/xhtml+xml"/>`);
        spineItems.push(`<itemref idref="${id}"/>`);
      };
      (book.structure.frontMatter || []).forEach(p => addContent(p));
      (book.structure.parts || []).forEach(part => {
        // part label as its own file
        addContent({ label: part.label, content: '' });
        (part.chapters || []).forEach(ch => addContent(ch));
      });
      (book.structure.backMatter || []).forEach(p => addContent(p));

      // package.opf
      const packageOpf = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${escapeHtml(book.title || '')}</dc:title>
    <dc:language>en</dc:language>
    ${book.author ? `<dc:creator>${escapeHtml(book.author)}</dc:creator>` : ''}
    <dc:identifier id="bookid">${escapeHtml(book.id || uid('book'))}</dc:identifier>
  </metadata>
  <manifest>
    ${manifestItems.join('\n')}
    ${coverHref ? `<item id="cover" href="${coverHref}" media-type="image/jpeg"/>` : ''}
    <item id="css" href="styles.css" media-type="text/css"/>
  </manifest>
  <spine toc="ncx">
    ${spineItems.join('\n')}
  </spine>
</package>`;
      oebps.file('package.opf', packageOpf);

      // create zip and download as .epub
      const content = await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
      const safeTitle = (book.title || 'book').replace(/[^\w\-]+/g, '_').slice(0,120);
      downloadBlob(content, `${safeTitle}.epub`);
      return;
    } catch (e) {
      console.warn('EPUB generation failed', e);
      alert('EPUB generation failed. Falling back to HTML/JSON exports.');
    }
  }

  // fallback
  alert('EPUB export requires JSZip (optional). Downloading HTML instead.');
  await downloadHtml(book);
}

// helper to convert base64 dataURL to Blob
function base64ToBlob(dataURL) {
  if (!dataURL) return null;
  const parts = dataURL.split(',');
  const meta = parts[0].match(/:(.*?);/);
  const mime = meta ? meta[1] : 'application/octet-stream';
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8 = new Uint8Array(n);
  while (n--) u8[n] = bstr.charCodeAt(n);
  return new Blob([u8], { type: mime });
}

// ---------- Export all books (JSON) ----------
async function exportAllBooks() {
  const books = await idbGetAllBooks();
  // convert any Blob covers to base64
  const serialized = await Promise.all(books.map(async (b) => {
    const copy = JSON.parse(JSON.stringify(b));
    if (b.cover && (b.cover instanceof Blob || b.cover instanceof File)) {
      copy.cover = await blobToDataURL(b.cover);
    }
    return copy;
  }));
  const blob = new Blob([JSON.stringify(serialized, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `boardwalk-books-export-${Date.now()}.json`);
}

// ---------- UI wiring ----------
async function populateBookSelect() {
  if (!bookSelect) return;
  bookSelect.innerHTML = '<option value="">Loading…</option>';
  const books = await idbGetAllBooks();
  if (!books || !books.length) {
    bookSelect.innerHTML = '<option value="">No books found</option>';
    return;
  }
  bookSelect.innerHTML = books.map(b => `<option value="${escapeHtml(b.id)}">${escapeHtml(b.title || 'Untitled')}</option>`).join('');
  // select first
  bookSelect.selectedIndex = 0;
  // render preview for selected
  await onBookChange();
}

async function onBookChange() {
  if (!bookSelect) return;
  const id = bookSelect.value;
  if (!id) {
    if (previewArea) previewArea.innerHTML = '<div class="empty-state">Select a book to preview</div>';
    return;
  }
  const book = await idbGetBook(id);
  if (!book) {
    previewArea.innerHTML = '<div class="empty-state">Book not found</div>';
    return;
  }
  // render a compact preview in the page (not the print preview)
  const coverDataUrl = book.cover && (book.cover instanceof Blob || book.cover instanceof File) ? await blobToDataURL(book.cover) : (book.cover || null);
  const html = buildBookHtml(book, { coverDataUrl });
  if (previewArea) previewArea.innerHTML = html;
}

async function wireButtons() {
  if (bookSelect) bookSelect.addEventListener('change', onBookChange);
  if (downloadHtmlBtn) downloadHtmlBtn.addEventListener('click', async () => {
    const id = bookSelect.value; if (!id) return alert('Select a book first');
    const book = await idbGetBook(id);
    await downloadHtml(book);
  });
  if (downloadTextBtn) downloadTextBtn.addEventListener('click', async () => {
    const id = bookSelect.value; if (!id) return alert('Select a book first');
    const book = await idbGetBook(id);
    await downloadPlainText(book);
  });
  if (downloadJsonBtn) downloadJsonBtn.addEventListener('click', async () => {
    const id = bookSelect.value; if (!id) return alert('Select a book first');
    const book = await idbGetBook(id);
    await downloadJson(book);
  });
  if (downloadEpubBtn) downloadEpubBtn.addEventListener('click', async () => {
    const id = bookSelect.value; if (!id) return alert('Select a book first');
    const book = await idbGetBook(id);
    await downloadEpub(book);
  });
  if (printPdfBtn) printPdfBtn.addEventListener('click', async () => {
    const id = bookSelect.value; if (!id) return alert('Select a book first');
    const book = await idbGetBook(id);
    await openPrintPreview(book);
  });
  if (exportAllBtn) exportAllBtn.addEventListener('click', async () => {
    if (!confirm('Export all books to a JSON file?')) return;
    await exportAllBooks();
  });
  if (previewClose && previewModal) previewClose.addEventListener('click', () => previewModal.classList.add('hidden'));
  if (coverInput) coverInput.addEventListener('change', async (ev) => {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    // allow user to override cover for preview/download
    const id = bookSelect.value; if (!id) return alert('Select a book first');
    const book = await idbGetBook(id);
    if (!book) return;
    book.cover = file;
    // update preview area
    await onBookChange();
  });
}

// ---------- Initialization ----------
async function initPublishPage() {
  try {
    await populateBookSelect();
    await wireButtons();
  } catch (e) {
    console.error('Publish init failed', e);
    // fallback: try to populate from localStorage
    const books = JSON.parse(localStorage.getItem(LS_BOOKS_KEY) || '[]');
    if (bookSelect) {
      if (!books.length) bookSelect.innerHTML = '<option value="">No books found</option>';
      else bookSelect.innerHTML = books.map(b => `<option value="${escapeHtml(b.id)}">${escapeHtml(b.title || 'Untitled')}</option>`).join('');
    }
  }
}

// Run init on module load
initPublishPage();

// ---------- Placeholder for server sync (optional) ----------
async function uploadBookForSync(book) {
  // Implement server upload here if you add a backend.
  // This function is intentionally a placeholder so the UI can call it later.
  // Example: POST /api/books with JSON + multipart for cover
  throw new Error('Server sync not implemented');
}

// Export some functions for console/testing
window.BoardwalkPublish = {
  idbGetAllBooks,
  idbGetBook,
  downloadHtml,
  downloadPlainText,
  downloadJson,
  downloadEpub,
  openPrintPreview,
  exportAllBooks,
  uploadBookForSync
};
