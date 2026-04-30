export default function chapterGoalsModule() {
  const modal = document.getElementById("chapterGoalsModal");
  const openBtn = document.getElementById("openGoalsBtn");
  const saveBtn = document.getElementById("saveGoalsBtn");

  let goals = {};

  openBtn.onclick = () => {
    modal.style.display = "flex";
  };

  saveBtn.onclick = () => {
    const id = window.currentId;
    goals[id] = {
      target: document.getElementById("goalWordCount").value,
      tone: document.getElementById("goalTone").value,
      purpose: document.getElementById("goalPurpose").value
    };
    modal.style.display = "none";
  };
}
