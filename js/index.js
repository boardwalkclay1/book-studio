import layout from "../modules/layout.js";
import chaptersModule from "../modules/chapters.js";
import editorModule from "../modules/editor.js";
import { initDB } from "./db.js";

const app = document.getElementById("app");

// Build layout
app.innerHTML = layout();

// Load modules
chaptersModule();
editorModule();

// Init IndexedDB
initDB();
