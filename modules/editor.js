import chaptersModule from "./chapters.js";

export default function editorModule() {
  const titleInput = document.getElementById("chapterTitle");
  const contentBox = document.getElementById("editorContent");

  // Sync title
  titleInput.addEventListener("input", () => {
    const ch = window.chapters?.find(c => c.id === window.current);
    if (ch) ch.title = titleInput.value;
  });

  // Sync content
  contentBox.addEventListener("input", () => {
    const ch = window.chapters?.find(c => c.id === window.current);
    if (ch) ch.content = contentBox.innerHTML;
  });
}
