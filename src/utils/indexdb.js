// Open the IndexedDB database with name "myDatabase" and version 1
const dbName = "meditation-database";
const dbVersion = 2;
const request = window.indexedDB.open(dbName, dbVersion);

// If the database doesn't exist, create it and add a table called 'recordings'
request.onupgradeneeded = function (event) {
  const db = event.target.result;
  if (!db.objectStoreNames.contains('recordings')) {
    db.createObjectStore('recordings', { keyPath: 'id', autoIncrement: true });
    console.log("CREATING NEW DATABASE")
  }
};


// Function to add an item to the 'recordings' table
export function addSession(session) {
  const request = window.indexedDB.open(dbName, dbVersion);
  request.onsuccess = function (event) {
    const db = event.target.result;
    const tx = db.transaction('recordings', 'readwrite');
    const store = tx.objectStore('recordings');
    store.add(session);
    console.log("------> ADDED SESSION TO DB")
  }
}
export function getRecordingById(id, callback) {
  const request = window.indexedDB.open(dbName, dbVersion);
  request.onsuccess = function (event) {
    const db = event.target.result;
    const tx = db.transaction('recordings', 'readonly');
    const store = tx.objectStore('recordings');
    const getRequest = store.get(id);
    getRequest.onsuccess = function (event) {
      const session = event.target.result;
      callback(session);
    }
  }
}
export function deleteRecording(id, callback) {
  const request = window.indexedDB.open(dbName, dbVersion);
  request.onsuccess = function (event) {
    const db = event.target.result;
    const tx = db.transaction('recordings', 'readwrite');
    const store = tx.objectStore('recordings');
    const getRequest = store.delete(id);
    getRequest.onsuccess = function (event) {
      const session = event.target.result;
      callback(session);
    }
  }
}
// Function to retrieve the last session object added to the 'recordings' table
export function getLastSession(callback) {
  const request = window.indexedDB.open(dbName, dbVersion);
  request.onsuccess = function (event) {
    const db = event.target.result;
    const tx = db.transaction('recordings', 'readonly');
    const store = tx.objectStore('recordings');
    const countRequest = store.count();
    countRequest.onsuccess = function (event) {
      const count = event.target.result;
      const getRequest = store.openCursor(null, 'prev');
      let i = 0;
      getRequest.onsuccess = function (event) {
        const cursor = event.target.result;
        if (cursor) {
          if (i == 0) {
            const session = cursor.value;
            callback(session);
          } else {
            i++;
            cursor.continue();
          }
        }
      }
    }
  }
}
export function getAllRecordings() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName);
    let entries = [];

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction("recordings", 'readonly');
      const objectStore = transaction.objectStore("recordings");

      objectStore.openCursor().onsuccess = (event) => {
        const cursor = event.target.result;

        if (cursor) {
          entries.push(cursor.value);
          cursor.continue();
        } else {
          resolve(entries);
        }
      };
    };
  });
}
export function deleteAllrecordings() {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(dbName, dbVersion);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      const tx = db.transaction('recordings', 'readwrite');
      const store = tx.objectStore('recordings');
      const clearRequest = store.clear();

      clearRequest.onerror = () => {
        reject(clearRequest.error);
      };

      clearRequest.onsuccess = () => {
        resolve();
      };
    };
  });
}
// Function to add a session object to the 'recordings' table, overwriting any existing record with the same key
export function addOrReplaceSession(session, callback) {
  const request = window.indexedDB.open(dbName, dbVersion);
  request.onsuccess = function (event) {
    const db = event.target.result;
    const tx = db.transaction('recordings', 'readwrite');
    const store = tx.objectStore('recordings');
    
    const getRequest = store.get(session.id);
    getRequest.onsuccess = function (event) {
      if (event.target.result) {
        //console.log("----> UPDATED existing session")
        store.put(session);
      } else {
        console.log("----> ADDED NEW recording to IndexDB")
        store.add(session);
      }
      callback();
    }
  }
}