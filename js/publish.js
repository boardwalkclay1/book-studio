import coverDesigner from "../modules/cover-designer.js";
import { initDB } from "./db.js";

document.getElementById("publishApp").innerHTML = coverDesigner();

initDB();
