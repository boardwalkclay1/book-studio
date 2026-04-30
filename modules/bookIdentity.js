export default function bookIdentityModule() {
  return `
    <div class="subpanel">
      <h3 class="sub-title">Identity</h3>

      <label class="field-label">Book Title</label>
      <input id="bookTitle" class="field-input">

      <label class="field-label">Subtitle</label>
      <input id="bookSubtitle" class="field-input">

      <label class="field-label">Author</label>
      <input id="bookAuthor" class="field-input">

      <label class="field-label">Genre</label>
      <input id="bookGenre" class="field-input">

      <label class="field-label">Target Audience</label>
      <input id="bookAudience" class="field-input">
    </div>
  `;
}
