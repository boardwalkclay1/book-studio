export default function nextStepGuideModule() {
  const guide = document.getElementById("nextStepGuide");

  function update() {
    const chapters = window.chapters;
    const current = chapters.find(c => c.id === window.currentId);

    if (chapters.length === 1 && current.content.length < 20) {
      guide.innerHTML = "Start writing your first chapter. Add a hook or opening scene.";
      return;
    }

    if (current.content.length < 100) {
      guide.innerHTML = "Expand this chapter. Add detail, emotion, or dialogue.";
      return;
    }

    if (chapters.length < 5) {
      guide.innerHTML = "Add more chapters to build your story structure.";
      return;
    }

    guide.innerHTML = "Great progress. When ready, move to Publish to design your cover.";
  }

  setInterval(update, 1500);
  update();
}
