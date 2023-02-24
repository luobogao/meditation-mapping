import { getFirestore, collection, getDocs, setDoc, doc, deleteDoc, updateDoc, query, where, addDoc } from 'firebase/firestore/lite';
import { getStorage, ref as storageRef, getBlob } from "firebase/storage"
import { arraysEqual } from './functions';
import { getDatabase, ref as dbref, onValue, off, get } from "firebase/database"
import { resetRecord, startRecording } from '../pages/record';
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, updateProfile, signInAnonymously } from "firebase/auth"
import * as firebaseui from "firebaseui"
import "firebaseui/dist/firebaseui.css"
import firebase from "firebase/compat/app"
import { processCSV, downloadWaypoints } from '../pages/map';


const d3 = require("d3");
export var user;
var email;
export var anonymous;
var liveUsers; // List of UIDs of users with active data in realtime
var userLiveDataRef = null // DB reference used to listen for changes in a realtime database to a specific user UID
var currentListenUID = null  // The user UID that is currently being listened to
export var firstLoad = true

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

function updateLiveUsers(snapshot) {
    var d = new Date()
    var now = d.getTime()
    var allData = snapshot.val()
    // Only interested in users with data that has been updated in last few seconds
    var newLiveUsers = Object.entries(allData).filter(user => user[1].timestamp > (now - (1000 * 2))).map(e => e[0])
    if (!arraysEqual(newLiveUsers, liveUsers) && newLiveUsers.length > 0) {
        console.log("New Live Users!")
        console.log(newLiveUsers)
        if (liveUsers == null && newLiveUsers.length == 1 && newLiveUsers[0] == user.uid) {
            clickedLiveUser(newLiveUsers[0])
        }
        liveUsers = newLiveUsers

        d3.select("#usersOnlineText").style("display", "flex")

        var d = d3.select("#liveUsersRow").selectAll("td").data(newLiveUsers)
        d.enter().append("td")

            .append("div")
            .style("background", function (d) {
                if (d == currentListenUID) return "green"
                else return "none"
            })
            .attr("class", "userLiveBtn")
            .style("margin-left", "20px")
            .style("border", "2px solid grey")
            .style("border-radius", "5px")
            .style("cursor", "pointer")
            .on("mouseover", function () {
                d3.select(this).style("border", "2px solid black")
            })
            .on("mouseout", function () {
                d3.select(this).style("border", "2px solid grey")
            })
            .on("click", function (i, d) {
                clickedLiveUser(d)
            })
            .append("div")
            .style("margin", "5px")
            .text(function (d, i) {
                if (d == user.uid) {
                    return "My Data"
                }
                else return "User " + (i + 1)
            })

        d.exit().remove()

    }
}
function getLiveUsersOnce() {
    const eegref = dbref(database, "live-muse")
    get(eegref, (snapshot) => {
        updateLiveUsers(snapshot)
    })
}
export function listenLiveUsers() {
    // Listens to ALL realtimedb connections
    const eegref = dbref(database, "live-muse")
    
    onValue(eegref, (snapshot) => {

        updateLiveUsers(snapshot)
    })
}
function clickedLiveUser(uid) {
    // Turn on listener
    if (currentListenUID != uid) {
        currentListenUID = uid
        d3.selectAll(".userLiveBtn").style("background", 'none')
        resetRecord()
        d3.select(this).style("background", "green")
        listenEEG(uid)
    }
    else {
        // Do nothing
    }
}

export function listenEEG(uid) {
    if (userLiveDataRef != null) {
        off(userLiveDataRef)
    }
    userLiveDataRef = dbref(database, "live-muse/" + uid)
    console.log("Listening for data on user: " + uid)

    onValue(userLiveDataRef, (snapshot) => {
        d3.select("#realtime-div").text("LIVE CONNECTION")
        //console.log("found data:")
        //console.log(snapshot.val())
        eegdata = snapshot.val()
        startRecording()


    })

}
export function buildAuthContainer(div) {

    var newdiv = div
        .append("div")
        .attr("id", "firebase-auth-container")
        .style("position", "absolute")
        .style("left", 0)
        .style("top", 0)
        .style("bottom", 0)
        .style("right", 0)
        .style("margin", "auto auto auto auto")
        .style("width", "400px")
        .style("height", "400px")
        .style("opacity", 0.9)
    return newdiv

}


export function login() {

    buildAuthContainer(d3.select("#main-container"))
    const ui = firebaseui.auth.AuthUI.getInstance() || new firebaseui.auth.AuthUI(auth)
    ui.start("#firebase-auth-container", {
        callbacks: {
            signInSuccessWithAuthResult: function (authResult, redirectUrl) {
                console.log("---> Successful sign in")
                d3.select("#firebase-auth-container").remove()
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
export function addMarker(eegdata, markerName) {
    var date = new Date()
    var millis = date.getTime()
    var userid = auth.currentUser.uid
    var entry = { user: userid, marker: markerName, addedTime: millis, vector: eegdata }
    var promise = addDoc(collection(db, "markers"), entry)
    return promise

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
export function getAllMarkers() {
    var q = query(collection(db, "markers"))
    var promise = getDocs(q)
    return promise
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
        var promise = updateDoc(doc(db, "waypoints", waypoint.id), { notes: waypoint.notes, label: waypoint.label, updateTime: millis, updatedBy: auth.currentUser.uid })
        return promise
    }

}

onAuthStateChanged(auth, (fbuser) => {
    // Called anything the authentication state changes: login, log out, anonymous login
    listenLiveUsers()
    if (fbuser && fbuser.email == null) {
        anonymous = true
    }
    if (fbuser && fbuser.email != null) {
        user = fbuser
        anonymous = false
        console.log("Authenticated user:")
        console.log(user.displayName)
        d3.select("#user").text("Logged in as: " + user.email)


        // Automatically start listening for realtime db updates for this user (data from Muse probably)



        d3.selectAll(".signin")
            .text("Sign Out")
            .on("click", function () {
                console.log("Signing out...")
                auth.signOut()
                d3.select("#user").text("")
                d3.selectAll(".signin").text("Sign In")
                    .on("click", function () {

                        login()
                    })
            })

        // No display name - prompt user to choose one
        if (user.displayName == null) {
            d3.select("#welcome").remove()
            console.log("No user name yet")
            var container = buildAuthContainer(d3.select("#main-container"))

            container.selectAll("*").remove()
            container.style("background", "grey").style("border-radius", "5px").style("height", "220px")
                .style("width", "400px")

            var div = container.append("div").style("margin", "20px").style("display", "flex").style("flex-direction", "column")
            div.append("text").text("Please choose a Username:").style("color", "white").style("margin-bottom", "10px")
            div.append("input").attr("type", "text").attr("id", "username-input").on("change", function (d) {


            })
            div.append("text").text("Should be just your first name, or any one-word username. This will be the name other users see if you submit a meditation 'waypoint'").style("color", "white").style("margin-top", "10px")
            div.append("button").style("position", "absolute").style("bottom", "10px").style("right", "10px").text("OK")
                .on("click", function () {
                    d3.select("#firebase-auth-container").remove()
                    updateUsername()

                })
        }

        // Found display name, good to go
        else {

            d3.select("#user").text("Logged in: " + user.displayName)
            d3.select("#firebase-auth-container").remove()

            // Download all waypoints
            var text = d3.select("#welcome-auth")
            if (text != null) {
                text.style("display", "flex").text("Logged in as: " + user.displayName)
            }
            if (firstLoad) {
                firstLoad = false
                downloadWaypoints()
            }
        }



    }
    // Not authenticated yet - launch login
    else {
        console.log("Not logged in")
        user = null
        email = null
        d3.select("#signin").text("Sign In").on("click", function () {

            login()
        })

        signInAnonymously(auth).then(() => {
            console.log("---> Logged in anonymously")
            d3.selectAll(".signin").text("Sign In")
            d3.select("#firebase-auth-container").remove()
            var text = d3.select("#welcome-auth")
            if (text != null) {
                text.style("display", "flex").text("Logged in Anonymously")
            }
            if (firstLoad) downloadWaypoints()

        })

    }
})

