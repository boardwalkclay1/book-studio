export default function editingPowerPack() {
  const editor = document.getElementById("editorContent");
  const panel = document.getElementById("editingPowerPanel");

  function analyze() {
    const text = editor.innerText || "";
    const sentences = text.split(/[.!?]+/).filter(Boolean);
    const words = text.split(/\s+/).filter(Boolean);

    // Passive voice heuristic: "was|were|is|are" + verb-ish
    const passiveMatches = (text.match(/\b(was|were|is|are|been|be)\s+\w+ed\b/gi) || []).length;

    // Long sentences
    const longSentences = sentences.filter(s => s.split(/\s+/).length > 25).length;

    // Readability (very rough Flesch-like)
    const syllables = (text.match(/[aeiouy]+/gi) || []).length || 1;
    const wordsCount = words.length || 1;
    const sentenceCount = sentences.length || 1;
    const flesch = 206.835 - 1.015 * (wordsCount / sentenceCount) - 84.6 * (syllables / wordsCount);

    panel.innerHTML = `
      <div><strong>Sentences:</strong> ${sentenceCount}</div>
      <div><strong>Long sentences (&gt;25 words):</strong> ${longSentences}</div>
      <div><strong>Passive voice hints:</strong> ${passiveMatches}</div>
      <div><strong>Readability score (rough):</strong> ${Math.round(flesch)}</div>
      <div class="ep-tip">
        Use this panel as a guide, not a rulebook. If something reads well, it’s allowed.
      </div>
    `;
  }

  editor.addEventListener("input", () => {
    clearTimeout(window._epTimer);
    window._epTimer = setTimeout(analyze, 600);
  });

  analyze();
}
