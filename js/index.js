// Simple in-memory chapter state
let chapters = [
  { id: "ch1", title: "Chapter 1", content: "Start writing your story..." }
];
let currentId = "ch1";

const chaptersList = document.getElementById("chaptersList");
const addChapterBtn = document.getElementById("addChapterBtn");
const chapterTitleInput = document.getElementById("chapterTitle");
const editor = document.getElementById("editorContent");

// Render chapters
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

function selectChapter(id) {
  currentId = id;
  const ch = chapters.find(c => c.id === id);
  if (!ch) return;
  chapterTitleInput.value = ch.title;
  editor.innerHTML = ch.content;
  renderChapters();
}

// Add chapter
addChapterBtn.onclick = () => {
  const id = "ch" + (chapters.length + 1);
  const ch = { id, title: "New Chapter " + chapters.length, content: "" };
  chapters.push(ch);
  selectChapter(id);
};

// Sync title
chapterTitleInput.addEventListener("input", () => {
  const ch = chapters.find(c => c.id === currentId);
  if (ch) ch.title = chapterTitleInput.value;
  renderChapters();
});

// Sync content
editor.addEventListener("input", () => {
  const ch = chapters.find(c => c.id === currentId);
  if (ch) ch.content = editor.innerHTML;
});

// HEAVY EDITING TOOLBAR
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

  const fontSize = document.getElementById("fontSizeSelect");
  const lineSpace = document.getElementById("lineSpaceSelect");
  const letterSpace = document.getElementById("letterSpaceSelect");

  fontSize.onchange = () => {
    document.execCommand("fontSize", false, fontSize.value);
    editor.focus();
  };

  lineSpace.onchange = () => {
    editor.style.lineHeight = lineSpace.value;
  };

  letterSpace.oninput = () => {
    editor.style.letterSpacing = letterSpace.value + "px";
  };
}

// Init
renderChapters();
selectChapter("ch1");
initToolbar();
