export default function chapterIndexModule() {
  return `
    <div class="subpanel">
      <div class="subpanel-header">
        <h3 class="sub-title">Chapters</h3>
        <button id="addChapterBtn" class="btn btn-gold">+ Add</button>
      </div>
      <div id="chaptersList" class="chapters-list"></div>
    </div>
  `;
}
