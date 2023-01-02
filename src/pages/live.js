import React, { useState, useEffect } from "react";
import * as firebaseui from "firebaseui"
import { buildTimeslider } from "../utils/timeslider";
import "firebaseui/dist/firebaseui.css"
import { addCheckbox, buildChartSelectors, buildResolutionSelectors, buildUserSelectors } from "../utils/ui";
import { unique } from "../utils/functions";
import { buildSimilarityChart, updateSimilarityChart } from "../utils/minicharts";
import { auth, login, updateUsername, getAllWaypoints, downloadCSV } from "../utils/database"
import { onAuthStateChanged, signInAnonymously } from "firebase/auth"
import { waypoints_muse, waypoints_mindlink } from "../utils/vectors";
import { dot, getRelativeVector, pca, runModel, measureDistance, cosineSimilarity, euclideanDistance, combinedDistance } from "../utils/analysis";
import { zoom, updateChartWaypoints, updateChartUser } from "../utils/charts"
import { signInWithEmailAndPassword } from "firebase/auth";



export var userDataLoaded = false
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
export var users;
export var user;  // Firebase user
export var anonymous = true
var firstLoad = true
var fr;
export const miniChartSize = 200
const miniChartMargin = 10


export var state =
{
    "filename": "<filename>",
    "device": "Muse",
    "selected_users": [],
    "resolution": 10,
    "zoom": 1, // increasing this value will change the y-min of distance graphs
    "showAllWaypoints": false, // Shows all waypoints (as red) even when not matching
    "chartType": "pca", // PCA, Cosine, or Euclidean
    "limitMatches": true,
    "model":
    {
        "mapped": null, // Mapped x-y coordinates of each standard vector

    },
    "avg10": []

}

var email = null
onAuthStateChanged(auth, (fbuser) => {

    if (fbuser && fbuser.email == null)
    {
        anonymous = true
    }
    if (fbuser && fbuser.email != null) {
        user = fbuser
        anonymous = false
        console.log("Authenticated user:")
        console.log(user.displayName)
        d3.select("#user").text("Logged in as: " + user.email)
        d3.select("#signin").text("Sign Out")

        // No display name - prompt user to choose one
        if (user.displayName == null) {
            d3.select("#welcome").remove()
            console.log("No user name yet")
            var container = buildAuthContainer()
            
            container.selectAll("*").remove()
            container.style("background", "grey").style("border-radius", "5px").style("height", "220px")
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

        // Found disaply name, good to go
        else {
            state.userName = user.displayName
            d3.select("#user").text("Logged in: " + user.displayName)
            d3.select("#firebase-auth-container").remove()
            d3.select("#signin").on("click", function () {
                console.log("Signing out...")
                auth.signOut()
                d3.select("#user").text("")
                d3.select("#signin").text("Login")
            })
            // Download all waypoints
            var text = d3.select("#welcome-auth")
            if (text != null) {
                text.style("display", "flex").text("Logged in as: " + user.displayName)
            }
            if (firstLoad) downloadWaypoints()
        }



    }
    // Not authenticated yet - launch login
    else {
        console.log("Not logged in")
        user = null
        email = null
        d3.select("#signin").text("Login").on("click", function () {
            login()
        })

        signInAnonymously(auth).then(() => {
            console.log("---> Logged in anonymously")
            var text = d3.select("#welcome-auth")
            if (text != null) {
                text.style("display", "flex").text("Logged in Anonymously")
            }
            if (firstLoad) downloadWaypoints()
            
        })

    }
})

function downloadWaypoints() {

    var showWelcome = false
    if (firstLoad == true && anonymous)
    {
        showWelcome = true
    }
    firstLoad = false
    // Reset waypoints
    waypoints = []
    users = []
    getAllWaypoints().then((snapshot) => {
        console.log("----> Got waypoints: ")
        console.log(snapshot)

        snapshot.forEach((doc) => {
            var waypoint = doc.data()
            waypoint.id = doc.id

            if (waypoint.id != undefined && waypoint.vector != undefined && waypoint.label != undefined && waypoint.user != undefined) {
                waypoints.push(waypoint)
                users.push(waypoint.user)
            }


        })
        if (waypoints.length == 0 || users.length == 0) {
            alert("Could not download data from server...")
            return
        }
        users = unique(users).sort()
        state.selected_users = users

        // Build model of meditation states using the "vectors.js" file
        // This first time, include ALL the waypoints

        function buildModel_waypoint() {
            let vectors = waypoints.filter(e => e.exclude != true)
                .filter(e => state.selected_users.includes(e.user))
                .map(e => getRelativeVector(e.vector))
            buildModel(vectors)
        }
        function buildModel_user() {
            let vectors = state.averageMax.map(e => getRelativeVector(e.vector))
            buildModel(vectors)
        }
        if (userDataLoaded) {
            //buildModel_user()
            buildModel_waypoint()
        }
        else {
            buildModel_waypoint()
        }




        waypoints.forEach(e => {
            if (state.selected_users.includes(e.user)) {
                e.match = true
            }

        })

        buildSimilarityChart()
        updateChartWaypoints()
        buildUserSelectors()
        
        // Show the welcom screen only after data is loaded
        if (showWelcome )
        {
            buildWelcome()
            
        }


    })



}

function receivedFile() {
    // Callback from the "browse" button
    // fr.result contains the string of the file that was uploading

    let string = fr.result
    console.log("--> Loaded file")
    processCSV(string)


}
export function processCSV(string) {
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
function buildBrowseFile(div, label, widthpx, color, textColor, id) {

    var width = widthpx + "px"
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

            d3.select("#welcome").remove()
            let file = evt.target.files[0]

            fr = new FileReader()
            fr.onload = receivedFile
            fr.readAsText(file)




        })


    let fakefile = holder.append("div")
        .style("position", "absolute")
        .style("width", width)
        .style("top", "0px")
        .style("left", "0px")
        .style("z-index", 1)

    let btn = fakefile.append("button")
        .style("font-size", "18px")
        .style("width", width)
        .attr("id", id)
        .text(label)

}

export function rebuildChart() {
    waypoints = waypoints.filter(waypoint => waypoint.remove != true)
    console.log("total waypoints: " + waypoints.length)
    state.zoom = 1

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
    const maxWaypoints = 5  // Take top N waypoints sorted by cosine distance to user's data

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

    // Find nearby waypoints to user's data - use every 60 seconds
    var userVectors = state.lowRes.map(e => getRelativeVector(e.vector))
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

    var bestWaypointMatch = distances[0][0]

    // Take top N waypoints by distance
    var filtered_waypoint_ids = filtered_waypoints_user.map(e => e.id)
    if (state.limitMatches) {

        // Filter by top N
        //filtered_waypoint_ids = distances.slice(0, maxWaypoints).map(e => e[0]) 

        // Filter by min Cosine
        filtered_waypoint_ids =
            distances
                .filter(e => e[1] > minimumMatch)
                .slice(0, maxWaypoints)
                .map(e => e[0])
    }

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

    // Add distances to each waypoint
    waypoints.forEach(waypoint => {
        const waypointVector = getRelativeVector(waypoint.vector)

        const distances = state.averageMax.map(row =>
        ({
            seconds: row.seconds,
            cosineDistance: cosineSimilarity(getRelativeVector(row.vector), waypointVector),
            euclideanDistance: euclideanDistance(getRelativeVector(row.vector), waypointVector),
            combinedDistance: combinedDistance(getRelativeVector(row.vector), waypointVector)
        }))
        waypoint.similarityTimeseries = distances
    })


    updateAllCharts()

}
export function updateAllCharts(reset = false) {

    if (reset == true) {
        d3.select("#chartsvg").call(zoom.transform, d3.zoomIdentity)
    }
    buildTimeslider()
    var data = state.highRes
    switch (state.resolution) {
        case 1:
            data = state.raw
            break;
        case 10:
            data = state.highRes
            break;
        case 60:
            data = state.lowRes
            break;
    }
    if (state.chartType == "pca") {
        updateChartWaypoints()
        updateChartUser(data)
        //updateSimilarityChart("miniSimilarityChart")
        //updateSimilarityChart("miniEuclideanChart", { lineColor: "black", highlightID: null, key: "euclidean", lineSize: 10 })
    }
    else if (state.chartType == "euclidean") {
        updateSimilarityChart("chart", { lineColor: "black", highlightID: null, key: "euclidean", lineSize: 10 })
    }
    else if (state.chartType == "cosine") {
        updateSimilarityChart("chart", { lineColor: "black", highlightID: null, key: "cosine", lineSize: 10 })
    }
    else if (state.chartType == "cosine*euclidean") {
        updateSimilarityChart("chart", { lineColor: "black", highlightID: null, key: "cosine*euclidean", lineSize: 10 })
    }

    d3.selectAll(".user-selectors").style("display", "flex") // Show the other options now that waypoints are loaded


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
export function buildAuthContainer() {

    var div = d3.select("#main-container")
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
    return div

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


    buildBrowseFile(browse_btn, "UPLOAD", 80, "grey", "black", "t1")
    buildRightSidebar()
    buildBottomBar()
    buildTopBar()
    

}
function buildWelcome() {
    firstLoad = false
    var welcome = d3.select("#welcome")
        .style("width", "400px")
        .style("height", "200px")
        .style("position", "fixed")
        .style("top", "50%")
        .style("left", "50%")
        .style("background", "black")
        .style("margin-top", "-100px")
        .style("margin-left", "-200px")
        .style("opacity", 0)
        .style("border-radius", "10px")

    welcome.transition()
        .style("opacity", 0.9)
        .duration(1000)
        .delay(1000)

    var div1 = welcome.append("div").style("margin", "10px")
        .style("display", "flex")
        .style("flex-direction", "column")
    div1.append("text").text("Welcome!").style("color", "white").style("font-size", "40px")

    var div = div1.append("div").style("align-items", "center").style("display", "flex")
        .style("flex-direction", "column").style("margin-top", "10px")


    function addBtn(string) {
        var btn = div.append("text").text(string)
            .style("color", "black")
            .style("font-size", "20px")
            .style("border", "1px solid white")
            .style("background", "#FCFCFC")
            .style("border-radius", "5px")
            .style("text-align", "center")
            .style("width", "220px")
            .style("margin", "10px")
            .style("cursor", "pointer")
            .on("mouseover", function () {
                d3.select(this).style("background", "grey").style("color", "black")
            })
            .on('mouseout', function () {
                d3.select(this).style("background", "#FCFCFC").style("color", "black")
            })

        return btn
    }
    buildBrowseFile(div, "Upload Muse File", 220, "black", "white", "t3")
    div.append("text").text("OR").style("font-size", "20px").style("opacity", 0.8).style("color", "white").style("font-align", "center").style("margin-top", "10px")
    addBtn("Use Random Example")
        .on("click", function () {
            d3.select("#welcome").remove()
            downloadCSV("Self-Inquiry - BEST.csv")
        })


    div1.append("text").text("Logged in as: ").attr("id", "welcome-auth").style("display", "none").style("color", "white").style("opacity", 0.6)



}
function buildRightSidebar() {
    var sidebar = d3.select("#sidebar-right")

    // User selections
    sidebar.append("div").style("margin", "10px")
        .attr("id", "user-selectors")

    var otherSelectors = sidebar.append("div").style("margin", "10px").style("margin-top", "50px")
        .style("display", "none")
        .style("flex-direction", "column")
        .attr("class", "user-selectors")


    var resolutionContainer = otherSelectors.append("div").style("display", "flex").style("flex-direction", "row")
    buildResolutionSelectors(resolutionContainer)

    // Show Hidden Waypoints
    var showAll_box = addCheckbox(otherSelectors, "Show Hidden Waypoints", state.showAllWaypoints, "20px")
    showAll_box.on("click", function () {
        const active = this.checked
        if (active == true) {
            state.showAllWaypoints = true
        }
        else {
            state.showAllWaypoints = false
        }
        rebuildChart()
    })

    // Checkbox: Limit to N waypoints
    var limitWaypoints_box = addCheckbox(otherSelectors, "Limit to 5 Waypoints", state.limitMatches, "20px")
    limitWaypoints_box.on("click", function () {
        const active = this.checked
        if (active == true) {
            state.limitMatches = true
        }
        else {
            state.limitMatches = false
        }
        rebuildChart()
    })





}
function buildBottomBar() {
    var bar = d3.select("#bottom-bar")
    bar.style("position", "absolute")
        .style("height", "50px")
        .attr("class", "user-selectors")
        .style("display", "none")
        .style("bottom", 0 + "px")
        .style("left", sidebarWidth + "px")
        .style("right", sidebarWidth + "px")
        .style("justify-content", "center")
    //.style("background", "grey")

    var width = window.innerWidth - sidebarWidth - sidebarWidth

    bar.append("svg")
        .style("margin", "5px")
        .attr("id", "timeslider").attr("width", width + "px").attr("heigth", "20px")
}

function buildTopBar() {
    var bar = d3.select("#top-bar")
    bar.style("position", "absolute")
        .attr("class", "user-selectors")
        .style("display", "none")
        .style("top", 0 + "px")
        .style("left", sidebarWidth + "px")
        .style("right", sidebarWidth + "px")
        .style("justify-content", "center")
    //.style("background", "rgba(0, 0, 0, 0.1)")



    var charttypeContainer = bar.append("div").style("display", "flex").style("flex-direction", "row")
    buildChartSelectors(charttypeContainer)

}

function buildMiniCharts(div) {

    // Similarity chart
    function addChart(id) {
        div.append("svg")
            .attr("width", (chartWidth + (2 * chartMargin)) + "px")
            .attr("height", (chartHeight + (2 * chartMargin)) + "px")
            .append("svg")
            .attr("width", chartWidth + "px")
            .attr("height", chartHeight + "px")
            .attr("transform", "translate(" + chartMargin + "," + chartMargin + ")")
            .attr("id", id)

    }
    addChart("miniSimilarityChart")
    addChart("miniEuclideanChart")



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
            <svg id="chartsvg"></svg>
            <div id="popup"></div>
            <div id="menu"></div>
            <div id="sidebar-right" className="sidebar"></div>
            <div id="bottom-bar"></div>
            <div id="top-bar"></div>
            <div id="welcome"></div>
        </main>
    );
}