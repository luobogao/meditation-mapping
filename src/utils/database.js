import { getFirestore, collection, getDocs, setDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore/lite';
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, updateProfile } from "firebase/auth"
import * as firebaseui from "firebaseui"
import "firebaseui/dist/firebaseui.css"
import firebase from "firebase/compat/app"
import { ZoomTransform } from 'd3';
const d3 = require("d3");

const firebaseConfig = {

    apiKey: "AIzaSyABdGdf_fn2dLH_qUumFqx5I6Xdqv30elk",
    authDomain: "mapping-meditation.firebaseapp.com",
    projectId: "mapping-meditation",
    storageBucket: "mapping-meditation.appspot.com",
    messagingSenderId: "584243021105",
    appId: "1:584243021105:web:bb972d7fe085041b45dc10",
    measurementId: "G-TDBK5SCNZK"
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
    var entry = {user: waypoint.user, label: waypoint.label, vector: waypoint.vector, notes: waypoint.notes}
    var promise = setDoc(doc(db, "waypoints", id), entry)
    return promise
}
export function deleteWaypoint(waypoint)
{
    console.log("Deleting: " + waypoint.id)
    var promise = deleteDoc(doc(db, "waypoints", waypoint.id))
    return promise
}

export function getAllWaypoints()
{
    var promise = getDocs(collection(db, "waypoints"))
    return promise
}
export function updateWaypointNotes(waypoint, notes)
{
    var promise = updateDoc(doc(db, "waypoints", waypoint.id), {notes: notes})
    return promise
}

export function updateWaypoint(waypoint)
{
    var promise = updateDoc(doc(db, "waypoints", waypoint.id), waypoint)
    return promise
}




export async function getData(db) {
    const coll = collection(db, 'testcollection');
    const snapshot = await getDocs(coll);
    const data = snapshot.docs.map(doc => doc.data());
    console.log(data)
}
