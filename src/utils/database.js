import { getFirestore, collection, getDocs } from 'firebase/firestore/lite';
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth"
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
            signInSuccessWithAuthResult: function(authResult, redirectUrl)
            {
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



export async function getData(db) {
    const coll = collection(db, 'testcollection');
    const snapshot = await getDocs(coll);
    const data = snapshot.docs.map(doc => doc.data());
    console.log(data)
}
