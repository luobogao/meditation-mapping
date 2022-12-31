import { getFirestore, collection, getDocs, setDoc, doc, deleteDoc, updateDoc, query, where, addDoc} from 'firebase/firestore/lite';
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, updateProfile } from "firebase/auth"
import * as firebaseui from "firebaseui"
import "firebaseui/dist/firebaseui.css"
import firebase from "firebase/compat/app"
import { ZoomTransform } from 'd3';

const d3 = require("d3");

console.log(process.env)
const firebaseConfig = {

    apiKey: process.env.REACT_APP_API_KEY,
    authDomain: process.env.REACT_APP_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_PROJECT_ID,
    storageBucket: process.env.REACT_APP_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_APP_ID,
    measurementId: process.env.REACT_APP_MEASUREMENT_ID
};




// Initialize Firebase

const app = initializeApp(firebaseConfig);

//const analytics = getAnalytics(app);
console.log("app initialized")

export const db = getFirestore(app)

export const auth = getAuth(app)

export function login() {

    d3.select("#firebase-auth-container").style("display", "flex")
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
                requireDisplayName: true
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
        })
            .catch((error) => {
                console.error("Error updating!")
                d3.select("#user").text("FAILED TO UPDATE")
                dialog.append("text").text("FAILED TO UPDATE")

            })
    }

}
export function addWaypoint(waypoint)
{
    var id = waypoint.user + " - " + waypoint.label
    var date = new Date()
    var millis = date.getMilliseconds()
    var entry = {user: waypoint.user, label: waypoint.label, vector: waypoint.vector, notes: waypoint.notes, delete: false, addedTime: millis}
    
    var promise = addDoc(collection(db, "waypoints"), entry)
    return promise
}
export function deleteWaypoint(waypoint)
{
    // Warning: does NOT delete the firebase entry, it just sets "delete = true"
    console.log("Deleting: " + waypoint.id)
    //var promise = deleteDoc(doc(db, "waypoints", waypoint.id))
    var promise = updateDoc(doc(db, "waypoints", waypoint.id), {delete: true})
    return promise
}

export function getAllWaypoints()
{
    var q = query(collection(db, "waypoints"), where("delete", "!=", "Kaio"))
    var promise = getDocs(q)
    return promise
}
export function updateWaypointNotes(waypoint, notes)
{
    var promise = updateDoc(doc(db, "waypoints", waypoint.id), {notes: notes})
    return promise
}

export function updateWaypoint(waypoint)
{
    var date = new Date()
    var millis = date.getMilliseconds
    waypoint.updatedTime = millis
    var promise = updateDoc(doc(db, "waypoints", waypoint.id), waypoint)
    return promise
}




export async function getData(db) {
    const coll = collection(db, 'testcollection');
    const snapshot = await getDocs(coll);
    const data = snapshot.docs.map(doc => doc.data());
    console.log(data)
}
