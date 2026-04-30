let chapters = [
  { id: "ch1", title: "Chapter 1", content: "Start writing..." }
];

let current = "ch1";

export default function chaptersModule() {
  const list = document.getElementById("chaptersList");
  const addBtn = document.getElementById("addChapterBtn");

  function render() {
    list.innerHTML = "";
    chapters.forEach(ch => {
      const div = document.createElement("div");
      div.className = "chapter-item" + (ch.id === current ? " active" : "");
      div.textContent = ch.title;
      div.onclick = () => {
        current = ch.id;
        document.getElementById("chapterTitle").value = ch.title;
        document.getElementById("editorContent").innerHTML = ch.content;
        render();
      };
      list.appendChild(div);
    });
  }

  addBtn.onclick = () => {
    const id = "ch" + (chapters.length + 1);
    chapters.push({ id, title: "New Chapter", content: "" });
    current = id;
    render();
  };

  render();
}
