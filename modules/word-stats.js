export default function wordStatsModule() {
  const editor = document.getElementById("editorContent");
  const stats = document.getElementById("wordStats");

  function update() {
    const text = editor.innerText.trim();
    const words = text.split(/\s+/).filter(Boolean).length;
    const chars = text.replace(/\s/g, "").length;
    const minutes = Math.ceil(words / 200);

    stats.innerHTML = `
      <span>${words} words</span>
      <span>${chars} characters</span>
      <span>${minutes} min read</span>
    `;
  }

  editor.addEventListener("input", update);
  update();
}
