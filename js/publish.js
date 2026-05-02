// /js/publish.js
// Modular Publishing System for Boardwalk Book Studio

import { idbGetBook, idbGetAllBooks } from "./writer-shared.js"; 
// (I will generate this shared file next)

const $ = id => document.getElementById(id);

// PANEL NAVIGATION
const navButtons = document.querySelectorAll(".nav-btn");
const panels = document.querySelectorAll("main .panel");

navButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.panel;
    panels.forEach(p => p.classList.add("hidden"));
    document.getElementById(target).classList.remove("hidden");
  });
});

// TRIM SIZE MODULE
$("#applyTrim")?.addEventListener("click", () => {
  const trim = $("#trimSelect").value;
  console.log("Apply trim:", trim);
});

// ISBN + BARCODE MODULE
$("#generateBarcode")?.addEventListener("click", () => {
  const isbn = $("#isbnInput").value.trim();
  if (!isbn) return alert("Enter ISBN first.");

  // Placeholder — real barcode generator added next
  $("#barcodePreview").innerHTML = `<div class="barcode-placeholder">[BARCODE FOR ${isbn}]</div>`;
});

// LAYOUT MODES MODULE
document.querySelectorAll(".layout-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const mode = btn.dataset.mode;
    console.log("Switch layout mode:", mode);
  });
});

// EXPORT MODULE
$("#exportPDF")?.addEventListener("click", () => {
  console.log("Exporting print-ready PDF...");
});

$("#exportEPUB")?.addEventListener("click", () => {
  console.log("Exporting EPUB 3...");
});

$("#exportKDP")?.addEventListener("click", () => {
  console.log("Exporting KDP package...");
});

// ANALYTICS MODULE
async function loadAnalytics() {
  const books = await idbGetAllBooks();
  const current = books[0]; // Replace with actual selected book

  if (!current) return;

  const chapters = current.structure.parts.flatMap(p => p.chapters);
  const totalWords = chapters.reduce((sum, ch) => sum + countWords(ch.content), 0);

  $("#analyticsWords").textContent = `Total Words: ${totalWords}`;
  $("#analyticsChapters").textContent = `Chapters: ${chapters.length}`;
  $("#analyticsReadingTime").textContent = `Reading Time: ${Math.round(totalWords / 250)} min`;
}

function countWords(html) {
  return html.replace(/<[^>]+>/g, " ").trim().split(/\s+/).length;
}

loadAnalytics();
