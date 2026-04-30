export default function toolbarModule() {
  const editor = document.getElementById("editorContent");
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

  // Build toolbar buttons
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

  // Font size selector
  const fontSize = document.getElementById("fontSizeSelect");
  fontSize.onchange = () => {
    document.execCommand("fontSize", false, fontSize.value);
    editor.focus();
  };

  // Line spacing
  const lineSpace = document.getElementById("lineSpaceSelect");
  lineSpace.onchange = () => {
    editor.style.lineHeight = lineSpace.value;
  };

  // Letter spacing
  const letterSpace = document.getElementById("letterSpaceSelect");
  letterSpace.oninput = () => {
    editor.style.letterSpacing = letterSpace.value + "px";
  };
}
