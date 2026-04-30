// IMPORT YOUR MODULES
import bookTree from "../modules/bookTree.js";
import initEditor from "../modules/editor.js";
import initToolbar from "../modules/toolbar.js";

// DOM
const leftSidebar = document.getElementById("leftSidebar");
const editor = document.getElementById("editorContent");
const titleInput = document.getElementById("chapterTitle");
const subtitleInput = document.getElementById("chapterSubtitle");

// ======================================================
// BOOK STATE (REAL BOOK STRUCTURE)
// ======================================================
export const book = {
  frontMatter: [
    { id: "titlePage", type: "page", label: "Title Page", content: "" },
    { id: "toc", type: "toc", label: "Table of Contents", content: "" },
    { id: "dedication", type: "page", label: "Dedication", content: "" },
    { id: "acknowledgments", type: "page", label: "Acknowledgments", content: "" },
    { id: "copyright", type: "page", label: "Copyright", content: "" }
  ],

  parts: [],

  backMatter: [
    { id: "aboutAuthor", type: "page", label: "About the Author", content: "" },
    { id: "notes", type: "page", label: "Notes", content: "" },
    { id: "bibliography", type: "page", label: "Bibliography", content: "" }
  ]
};

let currentPage = null;

// ======================================================
// RENDER SIDEBAR
// ======================================================
function renderSidebar() {
  leftSidebar.innerHTML = bookTree(book);
  attachSidebarEvents();
}

// ======================================================
// CLICK HANDLERS
// ======================================================
function attachSidebarEvents() {
  document.querySelectorAll("[data-id]").forEach(item => {
    item.onclick = () => loadPage(item.dataset.id);
  });

  document.querySelector(".tree-add-part").onclick = addPart;

  document.querySelectorAll(".tree-add-chapter").forEach(btn => {
    btn.onclick = () => addChapter(btn.dataset.part);
  });
}

// ======================================================
// LOAD PAGE INTO EDITOR
// ======================================================
function loadPage(id) {
  currentPage = findPage(id);
  if (!currentPage) return;

  titleInput.value = currentPage.label || "";
  subtitleInput.value = currentPage.subtitle || "";
  editor.innerHTML = currentPage.content || "";

  if (currentPage.type === "toc") {
    generateTOC();
  }
}

// ======================================================
// SAVE PAGE
// ======================================================
editor.oninput = () => {
  if (currentPage) currentPage.content = editor.innerHTML;
};

titleInput.oninput = () => {
  if (currentPage) {
    currentPage.label = titleInput.value;
    renderSidebar();
  }
};

subtitleInput.oninput = () => {
  if (currentPage) {
    currentPage.subtitle = subtitleInput.value;
  }
};

// ======================================================
// FIND PAGE BY ID
// ======================================================
function findPage(id) {
  let fm = book.frontMatter.find(p => p.id === id);
  if (fm) return fm;

  let bm = book.backMatter.find(p => p.id === id);
  if (bm) return bm;

  for (const part of book.parts) {
    if (part.id === id) return part;
    const ch = part.chapters.find(c => c.id === id);
    if (ch) return ch;
  }

  return null;
}

// ======================================================
// ADD PART
// ======================================================
function addPart() {
  const num = book.parts.length + 1;

  const newPart = {
    id: `part${num}`,
    type: "part",
    label: `Part ${num}`,
    subtitle: "",
    content: "",
    chapters: []
  };

  book.parts.push(newPart);
  renderSidebar();
  loadPage(newPart.id);
}

// ======================================================
// ADD CHAPTER
// ======================================================
function addChapter(partId) {
  const part = book.parts.find(p => p.id === partId);
  const num = part.chapters.length + 1;

  const newChapter = {
    id: `${partId}-ch${num}`,
    type: "chapter",
    label: `Chapter ${num}`,
    subtitle: "",
    content: ""
  };

  part.chapters.push(newChapter);
  renderSidebar();
  loadPage(newChapter.id);
}

// ======================================================
// AUTO‑GENERATE TABLE OF CONTENTS
// ======================================================
function generateTOC() {
  let tocHTML = "";

  book.parts.forEach(part => {
    tocHTML += `<h2>${part.label}</h2>`;
    part.chapters.forEach(ch => {
      tocHTML += `<p>${ch.label}${ch.subtitle ? " — " + ch.subtitle : ""}</p>`;
    });
  });

  currentPage.content = tocHTML;
  editor.innerHTML = tocHTML;
}

// ======================================================
// INIT
// ======================================================
renderSidebar();
initEditor(book);
initToolbar();
loadPage("titlePage");
