import { initDB } from "./db.js";
import coverDesigner from "../modules/cover-designer.js";

document.getElementById("publishApp").innerHTML = coverDesigner();
initDB();

// Canvas
const canvas = document.getElementById("canvasArea");
canvas.style.position = "relative";
canvas.style.width = "900px";
canvas.style.height = "600px";

// Controls
const fontSelect = document.getElementById("fontSelect");
const addTextBtn = document.getElementById("addTextBtn");
const exportCoverBtn = document.getElementById("exportCoverBtn");
const frontInput = document.getElementById("frontCoverInput");
const backInput = document.getElementById("backCoverInput");

// State
let selected = null;

// -------------------------------
// UTILITIES
// -------------------------------
function makeSelectable(el) {
  el.onclick = (e) => {
    e.stopPropagation();
    selectElement(el);
  };
}

function selectElement(el) {
  if (selected) selected.style.outline = "none";
  selected = el;
  selected.style.outline = "2px solid #0b3c73";
}

canvas.onclick = () => {
  if (selected) selected.style.outline = "none";
  selected = null;
};

// -------------------------------
// DRAG LOGIC
// -------------------------------
function makeDraggable(el) {
  let offsetX = 0;
  let offsetY = 0;

  el.onmousedown = (e) => {
    if (e.target !== el) return;

    offsetX = e.clientX - el.offsetLeft;
    offsetY = e.clientY - el.offsetTop;

    document.onmousemove = (e) => {
      el.style.left = e.clientX - offsetX + "px";
      el.style.top = e.clientY - offsetY + "px";
    };

    document.onmouseup = () => {
      document.onmousemove = null;
    };
  };
}

// -------------------------------
// RESIZE LOGIC
// -------------------------------
function makeResizable(el) {
  const handle = document.createElement("div");
  handle.style.width = "12px";
  handle.style.height = "12px";
  handle.style.background = "#ff6b6b";
  handle.style.position = "absolute";
  handle.style.right = "-6px";
  handle.style.bottom = "-6px";
  handle.style.borderRadius = "50%";
  handle.style.cursor = "nwse-resize";

  el.appendChild(handle);

  handle.onmousedown = (e) => {
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = el.offsetWidth;
    const startH = el.offsetHeight;

    document.onmousemove = (e) => {
      const newW = startW + (e.clientX - startX);
      const newH = startH + (e.clientY - startY);
      el.style.width = newW + "px";
      el.style.height = newH + "px";
    };

    document.onmouseup = () => {
      document.onmousemove = null;
    };
  };
}

// -------------------------------
// ADD TEXT
// -------------------------------
addTextBtn.onclick = () => {
  const div = document.createElement("div");
  div.className = "draggable";
  div.contentEditable = true;
  div.style.fontFamily = fontSelect.value;
  div.style.fontSize = "28px";
  div.style.left = "40px";
  div.style.top = "40px";
  div.style.position = "absolute";
  div.style.padding = "4px";
  div.textContent = "New Text";

  canvas.appendChild(div);

  makeSelectable(div);
  makeDraggable(div);
};

// -------------------------------
// FONT CHANGE
// -------------------------------
fontSelect.onchange = () => {
  if (selected) {
    selected.style.fontFamily = fontSelect.value;
  }
};

// -------------------------------
// IMAGE UPLOAD HANDLER
// -------------------------------
function handleImageUpload(input, xPos) {
  const file = input.files[0];
  if (!file) return;

  const img = document.createElement("img");
  img.className = "draggable";
  img.style.position = "absolute";
  img.style.left = xPos + "px";
  img.style.top = "20px";
  img.style.width = "350px";

  const reader = new FileReader();
  reader.onload = () => {
    img.src = reader.result;
    canvas.appendChild(img);

    makeSelectable(img);
    makeDraggable(img);
    makeResizable(img);
  };

  reader.readAsDataURL(file);
}

frontInput.onchange = () => handleImageUpload(frontInput, 20);
backInput.onchange = () => handleImageUpload(backInput, 460);

// -------------------------------
// DELETE SELECTED ELEMENT
// -------------------------------
document.addEventListener("keydown", (e) => {
  if (e.key === "Delete" && selected) {
    selected.remove();
    selected = null;
  }
});

// -------------------------------
// EXPORT COVER (PNG)
// -------------------------------
exportCoverBtn.onclick = async () => {
  const exportCanvas = await html2canvas(canvas, {
    backgroundColor: "#ffffff",
    scale: 2
  });

  const link = document.createElement("a");
  link.download = "book-cover.png";
  link.href = exportCanvas.toDataURL("image/png");
  link.click();
};
