import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { buildTimeslider } from "../utils/timeslider";
import "firebaseui/dist/firebaseui.css"
import { addCheckbox, buildChartSelectors, buildClusterCounts, buildResolutionSelectors, buildUserSelectors } from "../utils/ui";
import { arraysEqual, unique } from "../utils/functions";
import { updateTimeseries, buildSimilarityChart, updateSimilarityChart } from "../utils/minicharts";
import { anonymous, auth, login, updateUsername, listenEEG, getAllWaypoints, downloadCSV, buildAuthContainer, firstLoad } from "../utils/database"
import { dot, getRelativeVector, pca, findSlope, runModel, measureDistance, cosineSimilarity, euclideanDistance, combinedDistance } from "../utils/analysis";
import { zoom, updateChartWaypoints, updateChartUser } from "../utils/charts"
import kmeans from '@jbeuckm/k-means-js'
import { phamBestK } from '@jbeuckm/k-means-js'
import { buildBrowseFile } from "../utils/load";
import { datastate } from "../utils/load";
import { cleanedData } from "./validate";
import { bands, channels } from "../utils/muse"


export var userDataLoaded = false

const band_channels = []
bands.forEach(band => {
    channels.forEach(channel => {
        band_channels.push(band + "_" + channel)
    })
})

// Critical variables
const minimumMatch = 70 // minimum distance for waypoints to match
const maxWaypoints = 5  // Take top N waypoints sorted by cosine distance to user's data


const d3 = require("d3");
const sidebarWidth = 300
const chartMargin = 10
export const chartWidth = window.innerWidth - sidebarWidth
export const chartHeight = window.innerHeight
export var mode3d = true
const backgroundColor = "#d9d9d9"
export var waypoints
export var users;
export var user;  // Firebase user




export const miniChartSize = 200
const miniChartMargin = 10


export var state =
{
    "filename": "<filename>",
    "device": "Muse",
    "selected_users": [],
    "resolution": 10,
    "clusters": 1,
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



export function downloadWaypoints() {


    var showWelcome = false
    if (firstLoad == true && anonymous) {
        showWelcome = true
    }

    // Reset waypoints
    waypoints = []
    users = []
    getAllWaypoints().then((snapshot) => {

        snapshot.forEach((doc) => {
            var waypoint = doc.data()
            waypoint.id = doc.id

            if (waypoint.id != undefined && waypoint.vector != undefined && waypoint.label != undefined && waypoint.user != undefined) {

                // Migration method - adds a "_avg60" to the end of each vector
                var newVector = {}
                bands.forEach(band => {
                    channels.forEach(channel => {
                        var key = band + "_" + channel
                        newVector[key + "_avg60"] = waypoint.vector[key]
                    })
                })
                waypoint.relative_vector_avg60 = getRelativeVector(newVector, 60)

                waypoints.push(waypoint)
                users.push(waypoint.user)
            }


        })
        console.log(waypoints)

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
                .map(e => e.relative_vector_avg60)
            buildModel(vectors)
        }

        if (userDataLoaded) {

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

        //buildSimilarityChart()
        updateChartWaypoints()
        buildUserSelectors()

        // Show the welcom screen only after data is loaded
        if (showWelcome) {
            buildWelcome()

        }


    })



}

export function rebuildChart(autoClusters = true) {
    waypoints = waypoints.filter(waypoint => waypoint.remove != true)

    state.zoom = 1

    // Remove waypoints from users de-selected by user
    waypoints.forEach(waypoint => {
        waypoint.match = state.selected_users.includes(waypoint.user)
    })
    waypoints.forEach(waypoint => {
        if (waypoint.hide == true) waypoint.match = false
    })

    var filtered_waypoints_user = waypoints.filter(e => e.match == true)

    // Tests for data quality
    if (userDataLoaded == false) {
        // Only plot the waypoints - user hasn't loaded data yet

        let vectors = waypoints.filter(w => w.match == true).map(e => e.relative_vector_avg60)
        buildModel(vectors)
        updateChartWaypoints()
        return
    }
    if (filtered_waypoints_user.length == 0) {
        alert("No Waypoints?")
        return
    }

    // Find nearby waypoints to user's data - use every 60 seconds
    state.data.forEach(entry => entry.relative_vector_avg1 = getRelativeVector(entry, 1))
    state.data.forEach(entry => entry.relative_vector_avg10 = getRelativeVector(entry, 10))
    state.data.forEach(entry => entry.relative_vector_avg60 = getRelativeVector(entry, 60))

    // Find Clusters
    function findClusters(avg) {
        var kmeansResult
        var points = state.data.map(e => e["relative_vector_avg" + avg]).filter(e => e != null)
        if (points.length == 0) console.error("Only null vectors found in data!")


        var clusters = state.clusters
        if (autoClusters == true) {
            // Find best number of clusters
            var maxKToTest = 10;
            var result = phamBestK.findBestK(points, maxKToTest);
            console.log("Best clusters: " + result.K)
            clusters = result.K

        }

        // Find Clusters
        var kmeansResult = kmeans.cluster(points, clusters)

        // Assign cluster numbers to every data point
        for (let i in kmeansResult.assignments) {
            var clusterNumber = kmeansResult.assignments[i]
            state.data[i]["cluster_avg" + avg] = clusterNumber
        }
        state["cluster_means_avg" + avg] = kmeansResult.means

    }
    findClusters(10)
    findClusters(60)


    var userVectors = state.data.map(e => e.relative_vector_avg10).filter(e => e != null)
    var distanceIds = {}
    userVectors.forEach(uservector => {

        filtered_waypoints_user.forEach(waypoint => {

            var id = waypoint.id
            var distance = measureDistance(uservector, waypoint.relative_vector_avg60)


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

    // Select waypoint IDs to use
    var filtered_waypoint_ids
    if (state.limitMatches) {

        filtered_waypoint_ids =
            distances
                //.filter(e => e[1] > minimumMatch)
                .slice(0, maxWaypoints)
                .map(e => e[0])
    }
    else {
        // Use ALL waypoints
        filtered_waypoint_ids = filtered_waypoints_user.map(e => e.id)
    }

    if (filtered_waypoint_ids.length == 0) {
        alert("zero waypoints selected!")
        return
    }
    // Update ALL waypoints with match=true if their ids match
    waypoints.forEach(waypoint => {

        if (filtered_waypoint_ids.includes(waypoint.id)) {
            waypoint.match = true

        }
        else waypoint.match = false
    })
    var filtered_waypoints = waypoints.filter(e => e.match == true)

    // Re-build the PCA using only the top-N waypoints
    //let vectors = waypoints.filter(w => w.match == true).map(e => getRelativeVector(e.vector))

    // Rebuild PCA using the USER's data (seems to give much better results that top N vectors)

    buildModel(userVectors)

    // Find similarity to each waypoint for each row
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

    // Make an array of similarities in each waypoint
    function waypointMatches(rows, name) {
        waypoints.forEach(waypoint => {
            var matchesTimeseries = []
            for (let x in rows.length) {
                var dist = measureDistance(rows[x].relative_vector, waypoint.relative_vector)
                matchesTimeseries.push({ x: x, y: dist })
            }

            waypoint[name] = matchesTimeseries


        })
    }

    updateAllCharts()

}
export function updateAllCharts(reset = false) {

    if (reset == true) {
        d3.select("#chartsvg").call(zoom.transform, d3.zoomIdentity)
    }
    //updateTimeseries("bottom-timeseries", state.highRes)
    buildTimeslider()
    var data = state.data
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
        updateChartUser(state.data)
        //updateSimilarityChart("miniSimilarityChart")
        //updateSimilarityChart("miniEuclideanChart", { lineColor: "black", highlightID: null, key: "euclidean", lineSize: 10 })
    }
    else if (state.chartType == "euclidean") {
        updateSimilarityChart("chart", { lineColor: "black", highlightID: null, key: "euclidean", lineSize: 10, type: "absolute", points: 10 })
    }
    else if (state.chartType == "cosine") {
        updateSimilarityChart("chart", { lineColor: "black", highlightID: null, key: "cosine", lineSize: 10, type: "absolute", points: 10 })
    }
    else if (state.chartType == "cosine*euclidean") {
        updateSimilarityChart("chart", { lineColor: "black", highlightID: null, key: "cosine*euclidean", lineSize: 10, type: "absolute", points: 10 })
    }

    d3.selectAll(".user-selectors").style("display", "flex") // Show the other options now that waypoints are loaded


}

function buildPage() {

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
    let points = runModel(waypoints.map(e => e.relative_vector_avg60))

    var i = 0
    waypoints.map(waypoint => {
        waypoint.coordinates = points[i]
        i++
    })


}

function setup() {
    d3.select("#main-container").style("display", "flex")
        .style("flex-direction", "column")
        .style("font-family", "Cabin")

    d3.select("#nav")
        .style("background", backgroundColor)
        .style("border-bottom", "1px solid grey")

    d3.select("#navdiv")
        .style("margin", "5px")
        .style("background", backgroundColor)
        .style("display", "flex")
        .style("justify-content", "space-between")

    d3.select("#body").style("display", "flex")
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

    d3.select("#signin").attr("class", "signin").style("width", "150px")


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
    browse_btn.append("button").text("LOAD")
        .on("click", function () {

            state.data = datastate.data
            userDataLoaded = true
            rebuildChart()
        })
    buildRightSidebar()
    buildBottomBar()
    buildTopBar()

    buildRealtime()



}
function buildRealtime() {

    var div = d3.select("#realtime-container")
        .style("display", "none")
        .style("position", "absolute")
        .style("left", "20px")
        .style("bottom", "20px")
        .style("width", "300px")
        .style("height", "100px")
        .style("opacity", 0.9)
    d3.select("#realtime-div")
        .text("Waiting...")

    d3.select("#realtime-record")
        .style("width", "150px")
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

    otherSelectors.append("text").text("Clusters:")
    var clustersContainer = otherSelectors.append("div").style("display", "flex").style("flex-direction", "row")
    buildClusterCounts(clustersContainer)

    otherSelectors.append("text").text("Resolution:")
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
    var limitWaypoints_box = addCheckbox(otherSelectors, "Limit to " + maxWaypoints + " Waypoints", state.limitMatches, "20px")
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
        //.style("height", "50px")
        .attr("class", "user-selectors")
        .style("display", "none")
        .style("bottom", 0 + "px")
        .style("left", (sidebarWidth + 100) + "px")
        .style("right", (sidebarWidth + 100) + "px")
        .style("justify-content", "center")
        .style("flex-direction", "column")
    //.style("background", "grey")

    var width = window.innerWidth - sidebarWidth - sidebarWidth - 300

    // Bottom-bar Gamma
    bar.append("svg")
        .style("margin", "5px")
        .attr("id", "bottom-timeseries").attr("width", width + "px").attr("height", "200px")

    // Slider
    bar.append("svg")
        .style("margin", "5px")
        .attr("id", "timeslider").attr("width", width + "px").attr("height", "20px")
}

function buildTopBar() {
    var bar = d3.select("#top-bar")
    bar.style("position", "absolute")
        .attr("class", "user-selectors")
        .style("display", "none")
        .style("top", 50 + "px")
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
    useEffect(() => {
        if (cleanedData != null) {
            console.log("LOADING FROM VALIDATE")
            console.log(cleanedData)
            state.data = cleanedData
            userDataLoaded = true
            rebuildChart()
        }

    })

    return (


        <main id="main-container">
            <link href="https://fonts.googleapis.com/css?family=Cabin" rel="stylesheet"></link>

            <div id="nav">
                <div id="navdiv">
                    <Link to="/validate">LOAD</Link>
                    <button id="signin"></button>
                </div>

            </div>
            <div id="body">
                <svg id="chartsvg"></svg>
                <div id="popup"></div>
                <div id="menu"></div>
                <div id="sidebar-right" className="sidebar"></div>
                <div id="bottom-bar"></div>
                <div id="top-bar"></div>
                <div id="welcome"></div>
            </div>

        </main>
    );
}