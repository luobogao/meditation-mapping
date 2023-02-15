import { getFirestore, collection, getDocs, setDoc, doc, deleteDoc, updateDoc, query, where, addDoc } from 'firebase/firestore/lite';
import { getStorage, ref as storageRef, getBlob } from "firebase/storage"
import { getDatabase, ref as dbref, onValue } from "firebase/database"
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, updateProfile } from "firebase/auth"
import * as firebaseui from "firebaseui"
import "firebaseui/dist/firebaseui.css"
import firebase from "firebase/compat/app"

import { processCSV, buildAuthContainer, anonymous } from '../pages/live';

const d3 = require("d3");

export var eegdata = null
const firebaseConfig = {

    apiKey: process.env.REACT_APP_API_KEY,
    authDomain: process.env.REACT_APP_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_PROJECT_ID,
    storageBucket: process.env.REACT_APP_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_APP_ID,
    measurementId: process.env.REACT_APP_MEASUREMENT_ID,
    databaseURL: process.env.REACT_APP_DATABASE_ID
};




// Initialize Firebase

const app = initializeApp(firebaseConfig);
const database = getDatabase(app)

//const analytics = getAnalytics(app);
console.log("app initialized")

export const storage = getStorage()

export const db = getFirestore(app)

export const auth = getAuth(app)

export function listenEEG(uid) {
    const eegref = dbref(database, "live-muse/" + uid)
    console.log("Listening for data on user: " + uid)
    onValue(eegref, (snapshot) => {
        d3.select("#realtime-div").text("LIVE CONNECTION")
        //console.log("found data:")
        //console.log(snapshot.val())
        eegdata = snapshot.val()
        
    })
}

export function login() {
    buildAuthContainer()

    const ui = firebaseui.auth.AuthUI.getInstance() || new firebaseui.auth.AuthUI(auth)
    ui.start("#firebase-auth-container", {
        callbacks: {
            signInSuccessWithAuthResult: function (authResult, redirectUrl) {
                console.log("---> Successful sign in")
                return false
            }
        },
        signInOptions: [
            {
                provider: firebase.auth.EmailAuthProvider.PROVIDER_ID,
                requireDisplayName: false
            }
        ],
        privacyPolicyUrl: "<privacy url>"
    }, [])


}
export function updateUsername() {
    var newUsername = d3.select("#username-input").node().value
    var dialog = d3.select("#firebase-auth-container")
    if (newUsername.length > 2) {
        console.log("changed: " + newUsername)

        updateProfile(auth.currentUser, { displayName: newUsername }).then(() => {
            console.log("Profile updated!")
            d3.select("#user").text("Logged in: " + newUsername)
            dialog.selectAll('*').remove()
            dialog.style("display", "none")
            registerUser()
        })
            .catch((error) => {
                console.error("Error updating!")
                d3.select("#user").text("FAILED TO UPDATE")
                dialog.append("text").text("FAILED TO UPDATE")

            })
    }

}
export function downloadCSV(path) {
    var pathReference = storageRef(storage, "Self-Inquiry - BEST.csv")
    getBlob(pathReference).then((blob) => {
        blob.text().then((string) => {
            console.log("---> Downloaded CSV")
            processCSV(string)

        })
    })
}
function registerUser() {
    var user = auth.currentUser
    addDoc(collection(db, "users"), { id: user.uid, userName: user.displayName, userID: user.uid })
}

export function addWaypoint(waypoint) {

    if (!anonymous) {
        var date = new Date()
        var millis = date.getTime()
        var userid = auth.currentUser.uid

        if (waypoint.notes == undefined) waypoint.notes = null
        var entry = {
            user: waypoint.user, addedBy: userid, label: waypoint.label, vector: waypoint.vector,
            notes: waypoint.notes, delete: false, addedTime: millis, resolution: waypoint.resolution
        }

        var promise = addDoc(collection(db, "waypoints"), entry)
        return promise
    }

}
export function deleteWaypoint(waypoint) {
    // Warning: does NOT delete the firebase entry, it just sets "delete = true"
    if (!anonymous) {
        console.log("Deleting: " + waypoint.id)
        //var promise = deleteDoc(doc(db, "waypoints", waypoint.id))
        var promise = updateDoc(doc(db, "waypoints", waypoint.id), { delete: true })
        return promise
    }

}

export function getAllWaypoints() {
    var q = query(collection(db, "waypoints"), where("delete", "!=", true))
    var promise = getDocs(q)
    return promise
}

export function updateWaypoint(waypoint) {
    if (!anonymous) {
        var date = new Date()
        var millis = date.getTime()
        waypoint.updatedTime = millis
        var promise = updateDoc(doc(db, "waypoints", waypoint.id), {notes: waypoint.notes, label: waypoint.label, updateTime: millis, updatedBy: auth.currentUser.uid})
        return promise
    }

}

