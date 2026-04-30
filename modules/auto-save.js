export default function autoSaveModule(chaptersRef) {
  const saveIndicator = document.getElementById("saveIndicator");

  function save() {
    localStorage.setItem("boardwalkBook", JSON.stringify(chaptersRef));
    saveIndicator.innerHTML = "Saved";
    saveIndicator.classList.add("saved");

    setTimeout(() => {
      saveIndicator.classList.remove("saved");
      saveIndicator.innerHTML = "Saving…";
    }, 1200);
  }

  setInterval(save, 2000);
}
