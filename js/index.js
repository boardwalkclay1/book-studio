// js/index.js

// LEFT‑SIDE STRUCTURE MODULES
import bookIdentity from "../modules/bookIdentity.js";
import frontMatter from "../modules/frontMatter.js";
import backMatter from "../modules/backMatter.js";
import pageLayout from "../modules/pageLayout.js";
import chapterIndex from "../modules/chapterIndex.js";

// FUNCTIONAL MODULES
import initChapters from "../modules/chapters.js";
import initEditor from "../modules/editor.js";
import initToolbar from "../modules/toolbar.js";
import initWordStats from "../modules/word-stats.js";
import initAutoSave from "../modules/auto-save.js";
import initNextStepGuide from "../modules/next-step-guide.js";
import initLayout from "../modules/layout.js";

// ROOT DOM
const leftSidebar = document.getElementById("leftSidebar");

// ------------------------------------------------------
// BOOK STATE (SINGLE SOURCE OF TRUTH)
// ------------------------------------------------------
export const book = {
  identity: {
    title: "",
    subtitle: "",
    author: "",
    genre: "",
    audience: ""
  },
  frontMatter: {
    dedication: { enabled: true, content: "" },
    acknowledgments: { enabled: true, content: "" },
    copyright: { enabled: true, content: "" }
  },
  backMatter: {
    aboutAuthor: { enabled: true, content: "" },
    extras: { enabled: false, content: "" }
  },
  layout: {
    trimSize: "6x9",
    marginPreset: "standard"
  },
  parts: [] // chapters.js will manage parts/chapters here
};

// ------------------------------------------------------
// BUILD LEFT SIDEBAR FROM MODULES YOU ALREADY MADE
// ------------------------------------------------------
function renderLeftSidebar() {
  leftSidebar.innerHTML =
    bookIdentity() +
    frontMatter() +
    backMatter() +
    pageLayout() +
    chapterIndex();

  // let the functional modules attach their own listeners
  initLayout(book);
  initChapters(book); // handles parts/chapters + click → load into editor
}

// ------------------------------------------------------
// INIT RIGHT‑SIDE MODULES
// ------------------------------------------------------
function initRightSide() {
  initEditor(book);        // knows how to load/save current page content
  initToolbar();           // bold/italic/etc
  initWordStats();         // word/char counts
  initAutoSave(book);      // saving indicator
  initNextStepGuide(book); // guidance based on current state
}

// ------------------------------------------------------
// BOOT
// ------------------------------------------------------
renderLeftSidebar();
initRightSide();
