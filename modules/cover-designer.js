export default function coverDesigner() {
  return `
    <div class="panel">
      <div class="panel-title">Cover Builder</div>

      <label>Front Cover Image</label>
      <input type="file" id="frontCoverInput" accept="image/*">

      <label>Back Cover Image</label>
      <input type="file" id="backCoverInput" accept="image/*">

      <label>Font</label>
      <select id="fontSelect" class="font-select">
        <option value="Georgia">Georgia</option>
        <option value="Times New Roman">Times New Roman</option>
        <option value="Garamond">Garamond</option>
        <option value="Merriweather">Merriweather</option>
        <option value="Montserrat">Montserrat</option>
        <option value="Playfair Display">Playfair Display</option>
        <option value="Roboto">Roboto</option>
        <option value="Lora">Lora</option>
        <option value="Poppins">Poppins</option>
      </select>

      <button id="addTextBtn" class="btn btn-primary" style="margin-top:12px;">
        Add Text
      </button>

      <button id="exportCoverBtn" class="btn btn-primary" style="margin-top:12px;">
        Export Cover
      </button>
    </div>

    <div id="canvasArea"></div>
  `;
}
