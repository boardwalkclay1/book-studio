export default function bookTree(book) {
  return `
    <div class="tree-section">
      <div class="tree-title">Identity</div>
      <div class="tree-item" data-id="titlePage">Title Page</div>
      <div class="tree-item" data-id="copyright">Copyright</div>
      <div class="tree-item" data-id="dedication">Dedication</div>
      <div class="tree-item" data-id="acknowledgments">Acknowledgments</div>
      <div class="tree-item" data-id="foreword">Foreword</div>
      <div class="tree-item" data-id="preface">Preface</div>
    </div>

    <div class="tree-section">
      <div class="tree-title">Parts & Chapters</div>

      ${book.parts
        .map(
          part => `
        <div class="tree-part" data-id="${part.id}">
          <div class="tree-part-label">${part.label}</div>

          ${part.chapters
            .map(
              ch => `
            <div class="tree-item chapter" data-id="${ch.id}">
              ${ch.label}
            </div>
          `
            )
            .join("")}

          <div class="tree-add-chapter" data-part="${part.id}">
            + Add Chapter
          </div>
        </div>
      `
        )
        .join("")}

      <div class="tree-add-part">+ Add Part</div>
    </div>

    <div class="tree-section">
      <div class="tree-title">Back Matter</div>
      <div class="tree-item" data-id="aboutAuthor">About the Author</div>
      <div class="tree-item" data-id="extras">Extras / Notes</div>
      <div class="tree-item" data-id="bibliography">Bibliography</div>
    </div>

    <div class="tree-section">
      <div class="tree-title">Page Layout</div>
      <div class="tree-item" data-id="layout">Layout Settings</div>
    </div>
  `;
}
