// IMPORT YOUR MODULES
import bookTree from "../modules/bookTree.js";
import initEditor from "../modules/editor.js";
import initToolbar from "../modules/toolbar.js";
import initChapters from "../modules/chapters.js";

// DOM
const leftSidebar = document.getElementById("leftSidebar");
const editor = document.getElementById("editorContent");
const chapterTitleInput = document.getElementById("chapterTitle");

// BOOK STATE
export const book = {
  identity: {
    title: "",
    subtitle: "",
    author: "",
    genre: "",
    audience: ""
  },

  frontMatter: {
    titlePage: { id: "titlePage", label: "Title Page", content: "" },
    copyright: { id: "copyright", label: "Copyright", content: "" },
    dedication: { id: "dedication", label: "Dedication", content: "" },
    acknowledgments: { id: "acknowledgments", label: "Acknowledgments", content: "" },
    foreword: { id: "foreword", label: "Foreword", content: "" },
    preface: { id: "preface", label: "Preface", content: "" }
  },

  parts: [],

  backMatter: {
    aboutAuthor: { id: "aboutAuthor", label: "About the Author", content: "" },
    extras: { id: "extras", label: "Extras / Notes", content: "" },
    bibliography: { id: "bibliography", label: "Bibliography", content: "" }
  },

  layout: {
    id: "layout",
    label: "Layout Settings",
    content: ""
  }
};

let currentPage = null;

// RENDER LEFT SIDEBAR
function renderSidebar() {
  leftSidebar.innerHTML = bookTree(book);
  attachSidebarEvents();
}

// CLICK HANDLERS
function attachSidebarEvents() {
  document.querySelectorAll("[data-id]").forEach(item => {
    item.onclick = () => loadPage(item.dataset.id);
  });

  document.querySelectorAll(".tree-add-part").forEach(btn => {
    btn.onclick = addPart;
  });

  document.querySelectorAll(".tree-add-chapter").forEach(btn => {
    btn.onclick = () => addChapter(btn.dataset.part);
  });
}

// LOAD PAGE INTO EDITOR
function loadPage(id) {
  currentPage = findPage(id);
  if (!currentPage) return;

  chapterTitleInput.value = currentPage.label || "";
  editor.innerHTML = currentPage.content || "";
}

// SAVE PAGE
editor.oninput = () => {
  if (currentPage) currentPage.content = editor.innerHTML;
};

chapterTitleInput.oninput = () => {
  if (currentPage) {
    currentPage.label = chapterTitleInput.value;
    renderSidebar();
  }
};

// FIND PAGE
function findPage(id) {
  if (book.frontMatter[id]) return book.frontMatter[id];
  if (book.backMatter[id]) return book.backMatter[id];
  if (id === "layout") return book.layout;

  for (const part of book.parts) {
    if (part.id === id) return part;
    const ch = part.chapters.find(c => c.id === id);
    if (ch) return ch;
  }

  return null;
}

// ADD PART
function addPart() {
  const num = book.parts.length + 1;
  book.parts.push({
    id: `part${num}`,
    label: `Part ${num}`,
    chapters: []
  });
  renderSidebar();
}

// ADD CHAPTER
function addChapter(partId) {
  const part = book.parts.find(p => p.id === partId);
  const num = part.chapters.length + 1;

  part.chapters.push({
    id: `${partId}-ch${num}`,
    label: `Chapter ${num}`,
    content: ""
  });

  renderSidebar();
}

// INIT
renderSidebar();
initEditor(book);
initToolbar();
