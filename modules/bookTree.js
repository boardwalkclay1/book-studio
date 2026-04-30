import bookIdentity from "./bookIdentity.js";
import frontMatter from "./frontMatter.js";
import backMatter from "./backMatter.js";
import pageLayout from "./pageLayout.js";
import chapterIndex from "./chapterIndex.js";

export default function bookTree(book) {
  return `
    <div class="tree-group" data-group="identity">
      <div class="tree-header">Identity</div>
      <div class="tree-body">
        ${bookIdentity()}
      </div>
    </div>

    <div class="tree-group" data-group="frontMatter">
      <div class="tree-header">Front Matter</div>
      <div class="tree-body">
        ${frontMatter()}
      </div>
    </div>

    <div class="tree-group" data-group="parts">
      <div class="tree-header">Parts & Chapters</div>
      <div class="tree-body">
        ${chapterIndex(book.parts)}
      </div>
    </div>

    <div class="tree-group" data-group="backMatter">
      <div class="tree-header">Back Matter</div>
      <div class="tree-body">
        ${backMatter()}
      </div>
    </div>

    <div class="tree-group" data-group="layout">
      <div class="tree-header">Page Layout</div>
      <div class="tree-body">
        ${pageLayout()}
      </div>
    </div>
  `;
}
