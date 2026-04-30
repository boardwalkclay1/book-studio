export default function storytellingPack() {
  const editor = document.getElementById("editorContent");
  const charsBox = document.getElementById("storyCharacters");
  const timelineBox = document.getElementById("storyTimeline");
  const arcBox = document.getElementById("storyArc");
  const checklistBox = document.getElementById("sceneChecklist");

  function extractCharacters() {
    const text = editor.innerText || "";
    const names = (text.match(/\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)?\b/g) || [])
      .filter(n => !["I", "The", "A", "And", "But"].includes(n))
      .slice(0, 20);
    const unique = [...new Set(names)];
    charsBox.innerHTML = unique.length
      ? unique.map(n => `<div class="tag">${n}</div>`).join("")
      : `<div class="hint">Names will appear here as you write.</div>`;
  }

  function renderTimeline() {
    timelineBox.innerHTML = `
      <div class="timeline-item">Opening: Establish normal world</div>
      <div class="timeline-item">Inciting Incident: Disrupt the normal</div>
      <div class="timeline-item">Midpoint: No going back</div>
      <div class="timeline-item">Climax: Highest tension</div>
      <div class="timeline-item">Resolution: New normal</div>
    `;
  }

  function renderArc() {
    arcBox.innerHTML = `
      <div class="arc-step">1. Setup — Who is your main character?</div>
      <div class="arc-step">2. Desire — What do they want?</div>
      <div class="arc-step">3. Obstacle — What stands in their way?</div>
      <div class="arc-step">4. Choice — What must they decide?</div>
      <div class="arc-step">5. Change — How are they different at the end?</div>
    `;
  }

  function renderChecklist() {
    checklistBox.innerHTML = `
      <label><input type="checkbox"> Does this scene move the story forward?</label>
      <label><input type="checkbox"> Does someone want something in this scene?</label>
      <label><input type="checkbox"> Is there conflict or tension?</label>
      <label><input type="checkbox"> Does the scene end in a different place than it began?</label>
      <label><input type="checkbox"> Is at least one detail vivid and specific?</label>
    `;
  }

  editor.addEventListener("input", () => {
    clearTimeout(window._spTimer);
    window._spTimer = setTimeout(extractCharacters, 700);
  });

  extractCharacters();
  renderTimeline();
  renderArc();
  renderChecklist();
}
