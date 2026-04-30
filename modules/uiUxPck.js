export default function uiUxPack() {
  const app = document.getElementById("app");
  const chaptersList = document.getElementById("chaptersList");
  const editor = document.getElementById("editorContent");

  // Fade-in app
  app.style.opacity = 0;
  app.style.transition = "opacity 0.6s ease-out";
  requestAnimationFrame(() => {
    app.style.opacity = 1;
  });

  // Cinematic chapter click effect
  chaptersList.addEventListener("click", e => {
    if (!e.target.classList.contains("chapter-item")) return;
    editor.classList.add("editor-flash");
    setTimeout(() => editor.classList.remove("editor-flash"), 250);
  });

  // Gold particle hover on editor
  editor.addEventListener("mousemove", e => {
    if (Math.random() > 0.08) return;
    const dot = document.createElement("div");
    dot.className = "gold-particle";
    const rect = editor.getBoundingClientRect();
    dot.style.left = e.clientX - rect.left + "px";
    dot.style.top = e.clientY - rect.top + "px";
    editor.appendChild(dot);
    setTimeout(() => dot.remove(), 600);
  });

  // Optional: typewriter sound (if you add an audio element with id="typeSound")
  const typeSound = document.getElementById("typeSound");
  if (typeSound) {
    let last = 0;
    editor.addEventListener("input", () => {
      const now = Date.now();
      if (now - last > 80) {
        typeSound.currentTime = 0;
        typeSound.play().catch(() => {});
        last = now;
      }
    });
  }
}
