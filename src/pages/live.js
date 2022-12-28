import React, { useState, useEffect } from "react";
import * as firebaseui from "firebaseui"
import "firebaseui/dist/firebaseui.css"
import firebase from "firebase/compat/app"
import { getData, auth, login } from "../utils/database"
import { onAuthStateChanged } from "firebase/auth"
import { waypoints_muse } from "../utils/vectors";
import { dot, getRelativeVector, pca, runModel } from "../utils/analysis";
import { updateChartWaypoints, updateChartUser } from "../utils/charts"
import { signInWithEmailAndPassword } from "firebase/auth";


const d3 = require("d3");

var defaultSelectedUsers = ["Steffan", "Kaio", "Nii", "Students"]
const sidebarWidth = 300
const chartMargin = 10
export const chartWidth = window.innerWidth - sidebarWidth - 250
export const chartHeight = window.innerHeight
export var mode3d = true
const backgroundColor = "#d9d9d9"
var waypoints;


export var state =
{
    "filename": "<filename>",
    "device": "Muse",

    "model":
    {
        "mapped": null, // Mapped x-y coordinates of each standard vector
        "selected_users": defaultSelectedUsers,
    },
    "avg10": []

}

var user, email = null
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("Auth user: " + user.email)
        d3.select("#user").text("Logged in as: " + user.email)
        d3.select("#signin").text("Sign Out")
        d3.select("#firebase-auth-container").style("display", "none")
        user = user.uid

        d3.select("#signin").on("click", function () {
            console.log("Signing out...")
            auth.signOut()
            d3.select("#user").text("Not Signed In")
            d3.select("#signin").text("Sign In")
        })

    }
    else {
        console.log("No user!")
        user = null
        email = null
        d3.select("#signin").on("click", function () {

        })
        login()
    }
})



function buildPage() {
    console.log(dot([1, 1, 1], [2, 3, 10]))
    //getData(db)
    setup()


}

function buildModel(vectors) {
    // Builds the AI model using a collection of input vectors
    // These vectors are the raw (but averaged) values for each band/channel
    // Okay to use a mix of the "standard" vectors plus a few user vectors
    // Does not return x-y points - for that, need to call "run model" using the parameters set by this function

    console.log("Building model with " + vectors.length + " vectors")
    pca(vectors)

    // Build x-y points for each waypoint and store them
    let points = runModel(waypoints.map(e => getRelativeVector(e.vector)))
    var i = 0
    waypoints.map(waypoint => {
        waypoint.coordinates = points[i]
        i++
    })


}


function setup() {
    d3.select("#main-container").style("display", "flex")
        .style("flex-direction", "row")

    d3.selectAll(".sidebar").style("width", sidebarWidth + "px")
        .style("background", "grey")

    d3.select("#firebase-auth-container").style("position", "absolute")

        .style("left", 0)
        .style("top", 0)
        .style("bottom", 0)
        .style("right", 0)
        .style("margin", "auto auto auto auto")
        .style("width", "400px")
        .style("height", "400px")
        .style("opacity", 0.9)


    // Auth data
    d3.select("#auth-container")
        .style("width", (sidebarWidth - 20) + "px")
        .style("position", "absolute")
        .style("bottom", "10px")
        .style("left", "10px")

    d3.select("#popup")
        .style("border-radius", "5px")
        .style("opacity", 0.95)
        .style("position", "absolute")
        .style("background", "#404040")
        .style("z-index", 10)
        .style("color", "white")
        .style("margin-right", "20px")


    // SVG
    d3.select("#chartsvg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .style("background-color", backgroundColor)
        .append("g")
        .attr("id", "chart")
        .attr("width", chartWidth - (2 * chartMargin))
        .attr("height", chartHeight - (2 * chartMargin))
        .attr("transform", "translate(" + chartMargin + "," + chartMargin + ")")

    waypoints = waypoints_muse

    // Build model of meditation states using the "vectors.js" file
    // This first time, include ALL the waypoints
    let vectors = waypoints.filter(e => e.exclude != true)
        .filter(e => state.model.selected_users.includes(e.user))
        .map(e => getRelativeVector(e.vector))

    buildModel(vectors)

    waypoints.forEach(e => {
        if (state.model.selected_users.includes(e.user)) {
            e.match = true
        }

    })

    updateChartWaypoints(waypoints)


}


export default function Live() {
    useEffect(() => {
        buildPage()

    }, [])


    return (

        <main id="main-container">
            <div id="sidebar-left" className="sidebar">
                <h2>The Mapping Meditation Project</h2>

                <div id="auth-container">
                    <div id="user"></div>
                    <button id="signin">Sign In</button>
                </div>

            </div>
            <div id="firebase-auth-container"></div>
            <svg id="chartsvg"></svg>
            <div id="popup"></div>
            <div id="sidebar-right" className="sidebar"></div>
        </main>
    );
}