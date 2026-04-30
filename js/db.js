export function initDB() {
  const request = indexedDB.open("bookStudioDB", 1);

  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains("projects")) {
      db.createObjectStore("projects", { keyPath: "id" });
    }
  };

  request.onsuccess = () => {
    console.log("IndexedDB ready");
  };

  request.onerror = () => {
    console.error("DB error");
  };
}
