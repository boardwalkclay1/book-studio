export default function pageLayoutModule() {
  return `
    <div class="subpanel">
      <h3 class="sub-title">Page Layout</h3>

      <label class="field-label">Trim Size</label>
      <select id="trimSize" class="field-input">
        <option value="5x8">5 x 8 in</option>
        <option value="5.5x8.5">5.5 x 8.5 in</option>
        <option value="6x9" selected>6 x 9 in</option>
        <option value="8.5x11">8.5 x 11 in</option>
      </select>

      <label class="field-label">Margins</label>
      <select id="marginPreset" class="field-input">
        <option value="standard" selected>Standard</option>
        <option value="wide">Wide</option>
        <option value="compact">Compact</option>
      </select>

      <label class="field-label">Page Numbers</label>
      <select id="pageNumbers" class="field-input">
        <option value="footer-center">Footer Center</option>
        <option value="footer-outside">Footer Outside</option>
        <option value="none">None</option>
      </select>
    </div>
  `;
}
