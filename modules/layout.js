export default function layout() {
  return `
    <div class="panel" id="chaptersPanel">
      <div class="panel-title">Chapters</div>
      <div id="chaptersList"></div>
      <button class="btn btn-primary" id="addChapterBtn">Add Chapter</button>
    </div>

    <div class="panel" id="editorPanel">
      <div class="panel-title">Editor</div>
      <input id="chapterTitle" class="editor-input" placeholder="Chapter title">
      <div id="editorContent" class="editor-box" contenteditable="true">
        Start writing...
      </div>
    </div>
  `;
}
