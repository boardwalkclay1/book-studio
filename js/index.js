// ------------------------------
// STATE
// ------------------------------
export let chapters = [
  {
    id: "ch1",
    title: "Chapter 1",
    content: "Start writing your story..."
  }
];

export let currentId = "ch1";

// ------------------------------
// DOM REFS
// ------------------------------
const chaptersList = document.getElementById("chaptersList");
const addChapterBtn = document.getElementById("addChapterBtn");
const chapterTitleInput = document.getElementById("chapterTitle");
const editor = document.getElementById("editorContent");

// ------------------------------
// RENDER CHAPTER LIST
// ------------------------------
function renderChapters() {
  chaptersList.innerHTML = "";
  chapters.forEach(ch => {
    const div = document.createElement("div");
    div.className = "chapter-item" + (ch.id === currentId ? " active" : "");
    div.textContent = ch.title || "Untitled chapter";
    div.onclick = () => selectChapter(ch.id);
    chaptersList.appendChild(div);
  });
}

// ------------------------------
// SELECT CHAPTER
// ------------------------------
function selectChapter(id) {
  currentId = id;
  const ch = chapters.find(c => c.id === id);
  if (!ch) return;

  chapterTitleInput.value = ch.title;
  editor.innerHTML = ch.content;

  renderChapters();
}

// ------------------------------
// ADD CHAPTER
// ------------------------------
addChapterBtn.onclick = () => {
  const id = "ch" + (chapters.length + 1);
  const ch = {
    id,
    title: "New Chapter " + chapters.length,
    content: "This is a new chapter. Start writing..."
  };
  chapters.push(ch);
  selectChapter(id);
};

// ------------------------------
// SYNC TITLE
// ------------------------------
chapterTitleInput.addEventListener("input", () => {
  const ch = chapters.find(c => c.id === currentId);
  if (ch) ch.title = chapterTitleInput.value;
  renderChapters();
});

// ------------------------------
// SYNC CONTENT
// ------------------------------
editor.addEventListener("input", () => {
  const ch = chapters.find(c => c.id === currentId);
  if (ch) ch.content = editor.innerHTML;
});

// ------------------------------
// TOOLBAR MODULE
// ------------------------------
function initToolbar() {
  const toolbar = document.getElementById("editorToolbar");

  const buttons = [
    { cmd: "bold", icon: "B" },
    { cmd: "italic", icon: "I" },
    { cmd: "underline", icon: "U" },
    { cmd: "strikeThrough", icon: "S" },
    { cmd: "justifyLeft", icon: "⟸" },
    { cmd: "justifyCenter", icon: "⟺" },
    { cmd: "justifyRight", icon: "⟹" },
    { cmd: "insertUnorderedList", icon: "•" },
    { cmd: "insertOrderedList", icon: "1." },
    { cmd: "formatBlock", arg: "blockquote", icon: "❝" },
    { cmd: "formatBlock", arg: "h1", icon: "H1" },
    { cmd: "formatBlock", arg: "h2", icon: "H2" },
    { cmd: "undo", icon: "↺" },
    { cmd: "redo", icon: "↻" }
  ];

  buttons.forEach(btn => {
    const b = document.createElement("button");
    b.className = "tool-btn";
    b.innerHTML = btn.icon;
    b.onclick = () => {
      if (btn.arg) {
        document.execCommand(btn.cmd, false, btn.arg);
      } else {
        document.execCommand(btn.cmd);
      }
      editor.focus();
    };
    toolbar.appendChild(b);
  });

  // Font size
  document.getElementById("fontSizeSelect").onchange = e => {
    document.execCommand("fontSize", false, e.target.value);
    editor.focus();
  };

  // Line spacing
  document.getElementById("lineSpaceSelect").onchange = e => {
    editor.style.lineHeight = e.target.value;
  };

  // Letter spacing
  document.getElementById("letterSpaceSelect").oninput = e => {
    editor.style.letterSpacing = e.target.value + "px";
  };

  // Scene break
  document.getElementById("insertSceneBreak").onclick = () => {
    document.execCommand(
      "insertHTML",
      false,
      `<div style="text-align:center;margin:20px 0;color:#D4AF37;">✦ ✦ ✦</div>`
    );
  };
}

// ------------------------------
// INIT
// ------------------------------
renderChapters();
selectChapter("ch1");
initToolbar();

// ------------------------------
// MODULE PACK HOOKS
// ------------------------------
import editingPowerPack from "./editingPowerPack.js";
import storytellingPack from "./storytellingPack.js";
import publishingPack from "./publishingPack.js";
import uiUxPack from "./uiUxPack.js";

editingPowerPack();
storytellingPack();
publishingPack();
uiUxPack();
