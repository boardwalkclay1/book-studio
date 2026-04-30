// ======================================================
// BOOK FORMAT STATE
// ======================================================
const book = {
  title: "",
  subtitle: "",
  author: "",
  frontMatter: {
    dedication: true,
    acknowledgments: true,
    copyright: true
  },
  backMatter: {
    aboutAuthor: true,
    extras: false
  },
  layout: {
    trimSize: "6x9",
    marginPreset: "standard"
  }
};

// ======================================================
// CHAPTER STATE
// ======================================================
export let chapters = [
  {
    id: "ch1",
    title: "Chapter 1",
    content: "Start writing your story..."
  }
];

export let currentId = "ch1";

// ======================================================
// DOM REFERENCES
// ======================================================
const chaptersList = document.getElementById("chaptersList");
const addChapterBtn = document.getElementById("addChapterBtn");
const chapterTitleInput = document.getElementById("chapterTitle");
const editor = document.getElementById("editorContent");

const bookTitle = document.getElementById("bookTitle");
const bookSubtitle = document.getElementById("bookSubtitle");
const bookAuthor = document.getElementById("bookAuthor");
const hasDedication = document.getElementById("hasDedication");
const hasAcknowledgments = document.getElementById("hasAcknowledgments");
const hasCopyright = document.getElementById("hasCopyright");
const hasAboutAuthor = document.getElementById("hasAboutAuthor");
const hasExtras = document.getElementById("hasExtras");
const trimSize = document.getElementById("trimSize");
const marginPreset = document.getElementById("marginPreset");

const wordStats = document.getElementById("wordStats");
const saveIndicator = document.getElementById("saveIndicator");
const nextStepGuide = document.getElementById("nextStepGuide");

// ======================================================
// BOOK FORMAT BINDINGS
// ======================================================
bookTitle.addEventListener("input", () => (book.title = bookTitle.value));
bookSubtitle.addEventListener("input", () => (book.subtitle = bookSubtitle.value));
bookAuthor.addEventListener("input", () => (book.author = bookAuthor.value));

hasDedication.onchange = () => (book.frontMatter.dedication = hasDedication.checked);
hasAcknowledgments.onchange = () => (book.frontMatter.acknowledgments = hasAcknowledgments.checked);
hasCopyright.onchange = () => (book.frontMatter.copyright = hasCopyright.checked);

hasAboutAuthor.onchange = () => (book.backMatter.aboutAuthor = hasAboutAuthor.checked);
hasExtras.onchange = () => (book.backMatter.extras = hasExtras.checked);

trimSize.onchange = () => (book.layout.trimSize = trimSize.value);
marginPreset.onchange = () => (book.layout.marginPreset = marginPreset.value);

// ======================================================
// CHAPTER LIST
// ======================================================
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
  updateStats();
  updateNextStep();
}

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

chapterTitleInput.addEventListener("input", () => {
  const ch = chapters.find(c => c.id === currentId);
  if (!ch) return;
  ch.title = chapterTitleInput.value;
  renderChapters();
});

// ======================================================
// EDITOR SYNC + STATS
// ======================================================
editor.addEventListener("input", () => {
  const ch = chapters.find(c => c.id === currentId);
  if (!ch) return;
  ch.content = editor.innerHTML;
  updateStats();
  triggerSaveIndicator();
  updateNextStep();
});

function updateStats() {
  const text = editor.innerText || "";
  const words = text.split(/\s+/).filter(Boolean).length;
  const chars = text.replace(/\s/g, "").length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  wordStats.innerHTML = `${words} words • ${chars} characters • ~${minutes} min read`;
}

function triggerSaveIndicator() {
  saveIndicator.textContent = "Saved";
  saveIndicator.classList.add("saved");
  clearTimeout(window._saveTimer);
  window._saveTimer = setTimeout(() => {
    saveIndicator.textContent = "Saving…";
    saveIndicator.classList.remove("saved");
  }, 1200);
}

// ======================================================
// NEXT STEP GUIDE
// ======================================================
function updateNextStep() {
  const ch = chapters.find(c => c.id === currentId);
  if (!ch) return;

  const text = (ch.content || "").replace(/<[^>]+>/g, "").trim();
  const words = text.split(/\s+/).filter(Boolean).length;

  if (!book.title) {
    nextStepGuide.textContent = "Next step: Give your book a title on the left.";
    return;
  }

  if (chapters.length === 1 && words < 50) {
    nextStepGuide.textContent = "Next step: Flesh out your first chapter. Aim for at least a few paragraphs.";
    return;
  }

  if (chapters.length < 3) {
    nextStepGuide.textContent = "Next step: Add more chapters to build your structure.";
    return;
  }

  nextStepGuide.textContent = "Next step: Keep refining chapters. When ready, move to the publish/cover stage.";
}

// ======================================================
// TOOLBAR
// ======================================================
function initToolbar() {
  const toolbar = document.getElementById("editorToolbar");

  const tools = [
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

  tools.forEach(tool => {
    const btn = document.createElement("button");
    btn.className = "tool-btn";
    btn.innerHTML = tool.icon;
    btn.onclick = () => {
      if (tool.arg) {
        document.execCommand(tool.cmd, false, tool.arg);
      } else {
        document.execCommand(tool.cmd);
      }
      editor.focus();
    };
    toolbar.appendChild(btn);
  });

  document.getElementById("fontSizeSelect").onchange = e => {
    document.execCommand("fontSize", false, e.target.value);
    editor.focus();
  };

  document.getElementById("lineSpaceSelect").onchange = e => {
    editor.style.lineHeight = e.target.value;
  };

  document.getElementById("letterSpaceSelect").oninput = e => {
    editor.style.letterSpacing = e.target.value + "px";
  };

  document.getElementById("insertSceneBreak").onclick = () => {
    document.execCommand(
      "insertHTML",
      false,
      `<div style="text-align:center;margin:20px 0;color:#D4AF37;">✦ ✦ ✦</div>`
    );
  };
}

// ======================================================
// INIT
// ======================================================
renderChapters();
selectChapter("ch1");
initToolbar();
updateStats();
updateNextStep();
