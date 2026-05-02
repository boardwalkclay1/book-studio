/*  
===========================================================
 BOARDWALK BOOK STUDIO — PUBLISH ENGINE
 Modular • Self‑Contained • No Imports • No 404s
===========================================================
*/

////////////////////////////////////////////////////////////
// DOM HELPER
////////////////////////////////////////////////////////////
const $ = id => document.getElementById(id);

////////////////////////////////////////////////////////////
// INDEXEDDB HELPERS (same engine as writer.js)
////////////////////////////////////////////////////////////
const DB_NAME = "boardwalk-db";
const DB_VERSION = 1;
const BOOK_STORE = "books";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(BOOK_STORE)) {
        db.createObjectStore(BOOK_STORE, { keyPath: "id" });
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
    return JSON.parse(localStorage.getItem("books") || "[]");
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
    const books = JSON.parse(localStorage.getItem("books") || "[]");
    return books.find(b => b.id === id) || null;
  }
}

////////////////////////////////////////////////////////////
// PANEL NAVIGATION
////////////////////////////////////////////////////////////
const navButtons = document.querySelectorAll(".nav-btn");
const panels = document.querySelectorAll("main .panel");

navButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.panel;

    panels.forEach(p => p.classList.add("hidden"));
    document.getElementById(target).classList.remove("hidden");

    navButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  });
});

////////////////////////////////////////////////////////////
// TRIM SIZE MODULE
////////////////////////////////////////////////////////////
$("#applyTrim")?.addEventListener("click", () => {
  const trim = $("#trimSelect").value;
  console.log("Trim size applied:", trim);
});

////////////////////////////////////////////////////////////
// ISBN + BARCODE MODULE
////////////////////////////////////////////////////////////
$("#generateBarcode")?.addEventListener("click", () => {
  const isbn = $("#isbnInput").value.trim();
  if (!isbn) return alert("Enter ISBN first.");

  $("#barcodePreview").innerHTML = `
    <div class="barcode-placeholder">
      [BARCODE GENERATED FOR ${isbn}]
    </div>
  `;
});

////////////////////////////////////////////////////////////
// LAYOUT MODES MODULE
////////////////////////////////////////////////////////////
document.querySelectorAll(".layout-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const mode = btn.dataset.mode;
    console.log("Layout mode switched:", mode);
  });
});

////////////////////////////////////////////////////////////
// EXPORT MODULE
////////////////////////////////////////////////////////////
$("#exportPDF")?.addEventListener("click", () => {
  console.log("Exporting print-ready PDF…");
});

$("#exportEPUB")?.addEventListener("click", () => {
  console.log("Exporting EPUB 3…");
});

$("#exportKDP")?.addEventListener("click", () => {
  console.log("Exporting KDP package…");
});

////////////////////////////////////////////////////////////
// ANALYTICS MODULE
////////////////////////////////////////////////////////////
function countWords(html) {
  return html.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
}

async function loadAnalytics() {
  const books = await idbGetAllBooks();
  const current = books[0]; // Later: replace with selected book

  if (!current) return;

  const chapters = current.structure.parts.flatMap(p => p.chapters);
  const totalWords = chapters.reduce((sum, ch) => sum + countWords(ch.content || ""), 0);

  $("#analyticsWords").textContent = `Total Words: ${totalWords}`;
  $("#analyticsChapters").textContent = `Chapters: ${chapters.length}`;
  $("#analyticsReadingTime").textContent = `Reading Time: ${Math.round(totalWords / 250)} min`;
}

loadAnalytics();
