export default function backMatterModule() {
  return `
    <div class="subpanel">
      <h3 class="sub-title">Back Matter</h3>

      <label><input type="checkbox" id="bmAboutAuthor" checked> About the Author</label>
      <label><input type="checkbox" id="bmExtras"> Extras / Notes</label>
      <label><input type="checkbox" id="bmBibliography"> Bibliography</label>
    </div>
  `;
}
