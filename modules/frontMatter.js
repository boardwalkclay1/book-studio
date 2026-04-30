export default function frontMatterModule() {
  return `
    <div class="subpanel">
      <h3 class="sub-title">Front Matter</h3>

      <label><input type="checkbox" id="fmCopyright" checked> Copyright Page</label>
      <label><input type="checkbox" id="fmDedication" checked> Dedication</label>
      <label><input type="checkbox" id="fmAcknowledgments" checked> Acknowledgments</label>
      <label><input type="checkbox" id="fmForeword"> Foreword</label>
      <label><input type="checkbox" id="fmPreface"> Preface</label>
    </div>
  `;
}
