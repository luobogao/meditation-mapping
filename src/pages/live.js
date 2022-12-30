import React, { useState, useEffect } from "react";
import * as firebaseui from "firebaseui"
import "firebaseui/dist/firebaseui.css"
import { addCheckbox } from "../utils/ui";
import { unique } from "../utils/functions";
import { auth, login, updateUsername } from "../utils/database"
import { onAuthStateChanged } from "firebase/auth"
import { waypoints_muse, waypoints_mindlink } from "../utils/vectors";
import { dot, getRelativeVector, pca, runModel, measureDistance } from "../utils/analysis";
import { updateChartWaypoints, updateChartUser } from "../utils/charts"
import { signInWithEmailAndPassword } from "firebase/auth";
import { getAllWaypoints } from "../utils/database"


var userDataLoaded = false
const channels = ["TP9", "TP10", "AF7", "AF8"]
const bands = ["Delta", "Theta", "Alpha", "Beta", "Gamma"]
const band_channels = []
bands.forEach(band => {
    channels.forEach(channel => {
        band_channels.push(band + "_" + channel)
    })
})

const d3 = require("d3");
const sidebarWidth = 300
const chartMargin = 10
export const chartWidth = window.innerWidth - sidebarWidth - 250
export const chartHeight = window.innerHeight
export var mode3d = true
const backgroundColor = "#d9d9d9"
export var waypoints
var users;
var fr;


export var state =
{
    "filename": "<filename>",
    "device": "Muse",
    "selected_users": [],
    "showAllWaypoints": true, // Shows all waypoints (as red) even when not matching
    "model":
    {
        "mapped": null, // Mapped x-y coordinates of each standard vector

    },
    "avg10": []

}

var email = null
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("Authenticated user:")
        console.log(user.displayName)
        d3.select("#user").text("Logged in as: " + user.email)
        d3.select("#signin").text("Sign Out")

        // No display name - prompt user to choose one
        if (user.displayName == null) {
            console.log("No user name yet")
            var container = d3.select("#firebase-auth-container")
            container.selectAll("*").remove()
            container.style("background", "grey").style("border-radius", "5px").style("height", "220px")
            var div = container.append("div").style("margin", "20px").style("display", "flex").style("flex-direction", "column")
            div.append("text").text("Please choose a Username:").style("color", "white").style("margin-bottom", "10px")
            div.append("input").attr("type", "text").attr("id", "username-input").on("change", function (d) {
                updateUsername()

            })
            div.append("text").text("Should be just your first name, or any one-word username. This will be the name other users see if you submit a meditation 'waypoint'").style("color", "white").style("margin-top", "10px")
            div.append("button").style("position", "absolute").style("bottom", "10px").style("right", "10px").text("OK")
                .on("click", function () {
                    updateUsername()
                })
        }

        // Found disaply name, good to go
        else {
            state.userName = user.displayName
            d3.select("#user").text("Logged in: " + user.displayName)
            d3.select("#firebase-auth-container").style("display", "none")
            d3.select("#signin").on("click", function () {
                console.log("Signing out...")
                auth.signOut()
                d3.select("#user").text("Not Signed In")
                d3.select("#signin").text("Sign In")
            })
            // Download all waypoints
            downloadWaypoints()
        }



    }
    // Not authenticated yet - launch login
    else {
        console.log("No user!")
        user = null
        email = null
        d3.select("#signin").on("click", function () {

        })
        login()
    }
})

function downloadWaypoints() {

    // Reset waypoints
    waypoints = []
    users = []
    getAllWaypoints().then((snapshot) => {
        console.log("----> Got waypoints!")

        snapshot.forEach((doc) => {
            var waypoint = doc.data()
            waypoint.id = doc.id
            
            if (waypoint.id != undefined && waypoint.vector != undefined && waypoint.label != undefined && waypoint.user != undefined)
            {
                waypoints.push(waypoint)
                users.push(waypoint.user)
            }
            

        })
        if (waypoints.length == 0 || users.length == 0)
        {
            alert("Could not download data from server...")
            return
        }
        users = unique(users).sort()
        state.selected_users = users

        // Build model of meditation states using the "vectors.js" file
        // This first time, include ALL the waypoints
        let vectors = waypoints.filter(e => e.exclude != true)
            .filter(e => state.selected_users.includes(e.user))
            .map(e => getRelativeVector(e.vector))

        buildModel(vectors)

        waypoints.forEach(e => {
            if (state.selected_users.includes(e.user)) {
                e.match = true
            }

        })
        updateChartWaypoints()

        // Build the checkboxes for the users
        var userDiv = d3.select('#user-selectors')
        users.forEach(name => {

            var checked = false
            if (state.selected_users.includes(name)) checked = true

            var checkbox = addCheckbox(userDiv, name, checked, "30px")
            checkbox.on("click", function () {
                const newState = this.checked

                // Add or remove a name from the "Selected Users" list
                // This action should prompt a rebuild of the model and a redrawing of the graph
                if (newState == true) {
                    state.selected_users.push(name)
                }
                else {
                    var i = state.selected_users.indexOf(name)
                    if (i != -1) {
                        state.selected_users.splice(i, 1)
                    }

                }

                rebuildChart()

            })

        })


    })



}

function receivedFile() {
    // Callback from the "browse" button
    // fr.result contains the string of the file that was uploading

    let string = fr.result
    console.log("--> Loaded file")

    d3.select("#loader").style("display", "flex")


    if (string.substring(0, 30).includes("timestampMs")) {
        state.device = "MindLink"

    }
    else {
        state.device = "Muse"

    }

    var worker = new Worker("/workers/load_worker.js")
    worker.postMessage(string);

    worker.addEventListener('message', function (event) {

        var data = JSON.parse(event.data)
        state.raw = data.raw
        state.lowRes = data.lowRes
        state.highRes = data.highRes
        state.avg10 = data.avg10
        state.averageMax = data.averageMax
        state.seconds_low = data.seconds_low
        state.seconds_high = data.seconds_high
        state.filename = data.filename
        userDataLoaded = true
        rebuildChart()
    })

}
function buildBrowseFile(div, label, id) {
    var width = "80px"
    let holder = div.append("div")
        .style("position", "relative")
        //.attr("font-family", fontFamily)
        .attr("font-size", "20px")
        .attr("id", id + "-all")
        .style("width", width)

    holder
        .append("input")
        .style("position", "relative")
        .style("text-align", "right")
        .style("opacity", 0)
        .style("z-index", 2)
        .attr("class", "browse-id")
        .style("width", width)
        .attr("type", "file")
        .on("mouseover", function (d) {
            d3.select(this).style("cursor", "pointer");
            d3.select("#" + id)
                .style("background", "grey")
                .style("border-radius", "5px")

        })

        .on("mouseout", function (d) {
            d3.select(this).style("cursor", "default");
            d3.select("#" + id)
                .style("border-radius", "5px")
                .style("background", "#f0f0f0")
        })

        .on("change", function (evt) {
            document.getElementById(id).click()
            d3.select("#chart_user").selectAll("*").remove() // Clear last chart, if any

            let file = evt.target.files[0]

            fr = new FileReader()
            fr.onload = receivedFile
            fr.readAsText(file)




        })


    let fakefile = holder.append("div")
        .style("position", "absolute")
        .style("top", "0px")
        .style("left", "0px")
        .style("z-index", 1)

    let btn = fakefile.append("button")
        .style("font-size", "18px")
        //.attr("font-family", fontFamily)
        .attr("color", "#ececf1ff")
        //.style ("height", "30px")
        .attr("id", id)
        .text(label)

}

export function rebuildChart() {
    waypoints = waypoints.filter(waypoint => waypoint.remove != true)
    console.log("total waypoints: " + waypoints.length)

    // Remove waypoints from users de-selected by user
    waypoints.forEach(waypoint => {
        waypoint.match = state.selected_users.includes(waypoint.user)
    })
    var filtered_waypoints_user = waypoints.filter(e => e.match == true)

    if (userDataLoaded == false) {
        let vectors = waypoints.filter(w => w.match == true).map(e => getRelativeVector(e.vector))
        buildModel(vectors)
        updateChartWaypoints()
        return
    }

    // Critical variables
    const minimumMatch = 80 // minimum distance for waypoints to match
    const maxWaypoints = 3  // Take top N waypoints sorted by cosine distance to user's data

    if (filtered_waypoints_user.length == 0) {
        alert("No Wayopints?")
        return
    }

    if (state.avg10.length < 8) {
        alert("Averaged data is too short: " + state.avg10.length)
        return
    }

    var variances = band_channels.map(key => d3.variance(state.avg10.map(e => e[key])))
    if (!variances.every(e => e != 0)) {
        alert("Bad data! Electrodes not attached right")
        return

    }

    // Find nearby waypoints to user's data
    var userVectors = state.avg10.map(e => getRelativeVector(e.vector))
    var distanceIds = {}
    userVectors.forEach(uservector => {

        filtered_waypoints_user.forEach(waypoint => {
            var waypoint_vector = getRelativeVector(waypoint.vector)
            var id = waypoint.id
            var distance = measureDistance(uservector, waypoint_vector)


            if (id in distanceIds) {
                // This is the best match so far
                if (distanceIds[id] < distance) {
                    distanceIds[id] = distance
                    waypoint.cosineSimilarity = distance
                }

            }
            else {
                distanceIds[id] = distance
            }

        })
    })

    // Sort the waypoint matches by distance
    var distances = Object.entries(distanceIds)
    distances.sort(function (a, b) {
        return b[1] - a[1]
    })

    // Take top N waypoints by distance
    var filtered_waypoint_ids = distances.slice(0, maxWaypoints).map(e => e[0]) //.filter(e => e[1] > minimumMatch).map(e => e[0])
    if (filtered_waypoint_ids.length == 0) {
        alert("zero waypoints selected!")
        return
    }
    // Update ALL waypoints with match=true if their ids match
    waypoints.forEach(waypoint => {
        waypoint.relative_vector = getRelativeVector(waypoint.vector) // compute the relative vector for each waypoint
        if (filtered_waypoint_ids.includes(waypoint.id)) {
            waypoint.match = true

        }
        else waypoint.match = false
    })
    var filtered_waypoints = waypoints.filter(e => e.match == true)

    // Re-build the PCA using only the top-N waypoints
    let vectors = waypoints.filter(w => w.match == true).map(e => getRelativeVector(e.vector))
    buildModel(vectors)

    function addWaypointDistances(rows) {
        rows.forEach(row => {
            var relativeVector = getRelativeVector(row.vector)
            row.relative_vector = relativeVector
            var distances = []
            filtered_waypoints.forEach(waypoint => {

                var distance = measureDistance(relativeVector, waypoint.relative_vector)


                var label = waypoint.label + " (" + waypoint.user + ")"

                distances.push({ label: label, distance: distance, waypoint: waypoint })

            })
            distances.sort(function (a, b) {
                return b.distance - a.distance
            })

            row.distances = distances

        })


    }
    addWaypointDistances(state.lowRes)
    addWaypointDistances(state.highRes)
    addWaypointDistances(state.avg10)
    addWaypointDistances(state.averageMax)

    // Charts

    var type = "map"
    if (type == "map") {
        updateChartWaypoints()
        updateChartUser(state.highRes)
        //buildBandChart(state.highRes)
        //buildSimilarityChart(state.modelRows)




    }
    else {
        //buildCardChart(state.highRes)
        //buildBandChart(state.highRes)
        //buildSimilarityChart(state.modelRows)
    }



}

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
        .style("font-family", "Cabin")

    d3.selectAll(".subtitle")
        .style("text-align", "center")
        .style("font-style", "italic")
        .style("opacity", 0.7)


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
        .style("left", "20px")

    d3.select("#signin").style("width", "150px")


    d3.selectAll("#popup, #menu")
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


    // Browse button
    var browse_btn = d3.select("#browse-div")
    browse_btn
        .style("margin-top", "20px")
        .style("display", "flex")
        .style("justify-content", "center")

    buildBrowseFile(browse_btn, "UPLOAD", "t1")
    buildRightSidebar()


}
function buildRightSidebar() {
    var sidebar = d3.select("#sidebar-right")

    // User selections
    sidebar.append("div").style("margin", "10px")
        .attr("id", "user-selectors")

    var otherSelectors = sidebar.append("div").style("margin", "10px").style("margin-top", "50px")
        .attr("id", "other-selectors")
        

    var showAll_box = addCheckbox(otherSelectors, "Show All Waypoints", state.showAllWaypoints, "20px")
    showAll_box.on("click", function () {
        const active = this.checked
        if (active == true) {
            console.log("box: true")
            state.showAllWaypoints = true
            rebuildChart()
        }
        else {
            console.log("box: false")
            state.showAllWaypoints = false
            rebuildChart()
        }
    })
    
}

export default function Live() {
    useEffect(() => {
        buildPage()

    }, [])


    return (


        <main id="main-container">
            <link href="https://fonts.googleapis.com/css?family=Cabin" rel="stylesheet"></link>
       
            <div id="sidebar-left" className="sidebar">

                <div style={{ margin: 10 }}>
                    <h3>The</h3>
                    <h1 style={{ marginLeft: "20px", marginTop: "-10px", marginBottom: "-10px" }}>Mapping Meditation</h1>
                    <h3 style={{ textAlign: "right" }}>Project</h3>
                    <div className="subtitle">100% Free and Open-Source</div>
                    <div className="subtitle">Dedicated to All Sentient Beings</div>
                    <div id="auth-container">
                        <div id="user"></div>
                        <button id="signin">Sign In</button>
                    </div>
                </div>
                <div id="browse-div"></div>
            </div>
            <div id="firebase-auth-container"></div>
            <svg id="chartsvg"></svg>
            <div id="popup"></div>
            <div id="menu"></div>
            <div id="sidebar-right" className="sidebar"></div>
        </main>
    );
}