// Open the IndexedDB database with name "myDatabase" and version 1
const dbName = "meditation-database";
const dbVersion = 1;
const request = window.indexedDB.open(dbName, dbVersion);

// If the database doesn't exist, create it and add a table called 'sessions'
request.onupgradeneeded = function (event) {
    const db = event.target.result;
    if (!db.objectStoreNames.contains('sessions')) {
        db.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true });
        console.log("CREATING NEW DATABASE")
    }
};


// Function to add an item to the 'sessions' table
export function addSession(session) {
    const request = window.indexedDB.open(dbName, dbVersion);
    request.onsuccess = function (event) {
        const db = event.target.result;
        const tx = db.transaction('sessions', 'readwrite');
        const store = tx.objectStore('sessions');
        store.add(session);
        console.log("------> ADDED SESSION TO DB")
    }
}
function getSessionById(id, callback) {
    const request = window.indexedDB.open(dbName, dbVersion);
    request.onsuccess = function(event) {
      const db = event.target.result;
      const tx = db.transaction('sessions', 'readonly');
      const store = tx.objectStore('sessions');
      const getRequest = store.get(id);
      getRequest.onsuccess = function(event) {
        const session = event.target.result;
        callback(session);
      }
    }
  }
  // Function to retrieve the last session object added to the 'sessions' table
export function getLastSession(callback) {
    const request = window.indexedDB.open(dbName, dbVersion);
    request.onsuccess = function(event) {
      const db = event.target.result;
      const tx = db.transaction('sessions', 'readonly');
      const store = tx.objectStore('sessions');
      const countRequest = store.count();
      countRequest.onsuccess = function(event) {
        const count = event.target.result;
        const getRequest = store.openCursor(null, 'prev');
        let i = 0;
        getRequest.onsuccess = function(event) {
          const cursor = event.target.result;
          if (cursor) {
            if (i == count - 1) {
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
  export function deleteAllSessions(callback) {
    const request = window.indexedDB.open(dbName, dbVersion);
    request.onsuccess = function(event) {
      const db = event.target.result;
      const tx = db.transaction('sessions', 'readwrite');
      const store = tx.objectStore('sessions');
      const clearRequest = store.clear();
      clearRequest.onsuccess = function(event) {
        callback();
      }
    }
  }
  // Function to add a session object to the 'sessions' table, overwriting any existing record with the same key
export function addOrReplaceSession(session, callback) {
    const request = window.indexedDB.open(dbName, dbVersion);
    request.onsuccess = function(event) {
      const db = event.target.result;
      const tx = db.transaction('sessions', 'readwrite');
      const store = tx.objectStore('sessions');
      console.log("DB: Adding new session")
      const getRequest = store.get(session.id);
      getRequest.onsuccess = function(event) {
        if (event.target.result) {
            console.log("----> UPDATED existing session")
          store.put(session);
        } else {
            console.log("----> ADDED NEW session")
          store.add(session);
        }
        callback();
      }
    }
  }