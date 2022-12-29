import React, { useState, useEffect } from "react";
import * as firebaseui from "firebaseui"
import "firebaseui/dist/firebaseui.css"
import firebase from "firebase/compat/app"
import { unique } from "../utils/functions";
import { getData, auth, login, updateUsername } from "../utils/database"
import { onAuthStateChanged } from "firebase/auth"
import { waypoints_muse, waypoints_mindlink } from "../utils/vectors";
import { dot, getRelativeVector, pca, runModel, measureDistance } from "../utils/analysis";
import { updateChartWaypoints, updateChartUser } from "../utils/charts"
import { signInWithEmailAndPassword } from "firebase/auth";
import { getAllWaypoints } from "../utils/database"


const channels = ["TP9", "TP10", "AF7", "AF8"]
const bands = ["Delta", "Theta", "Alpha", "Beta", "Gamma"]
const band_channels = []
bands.forEach(band => {
    channels.forEach(channel => {
        band_channels.push(band + "_" + channel)
    })
})

const d3 = require("d3");

var defaultSelectedUsers = ["Steffan", "Kaio", "Nii", "Soshant", "Stephen", "Don"]
const sidebarWidth = 300
const chartMargin = 10
export const chartWidth = window.innerWidth - sidebarWidth - 250
export const chartHeight = window.innerHeight
export var mode3d = true
const backgroundColor = "#d9d9d9"
var waypoints, users;
var fr;


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

var email = null
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("Authenticated user:")
        console.log(user.displayName)
        d3.select("#user").text("Logged in as: " + user.email)
        d3.select("#signin").text("Sign Out")

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
        else {
            d3.select("#user").text("Logged in: " + user.displayName)
            d3.select("#firebase-auth-container").style("display", "none")
            d3.select("#signin").on("click", function () {
                console.log("Signing out...")
                auth.signOut()
                d3.select("#user").text("Not Signed In")
                d3.select("#signin").text("Sign In")
            })
            downloadWaypoints()
        }



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

function downloadWaypoints() {

    waypoints = []
    users = []
    getAllWaypoints().then((snapshot) => {
        console.log("----> Got waypoints!")

        snapshot.forEach((doc) => {
            var waypoint = doc.data()
            waypoint.id = doc.id
            waypoints.push(waypoint)
            users.push(waypoint.user)
            
        })
        users = unique(users)
        console.log(users)


        
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

function rebuildChart() {
    var waypoints_include = waypoints
    
    if (waypoints_include.length == 0) return
    // Critical variables
    const minimumMatch = 80

    //d3.select("#loader").style("display", "none")
    //d3.select("#browse-div").style("display", "flex")


    var filtered_waypoints_match = waypoints_include

    // If user data has been uploaded, use it to find waypoints that don't have a good match, and remove them
    if (state.avg10.length > 0) {
        // re-build the Model using a few points from the user's data
        // Including user data like this helps to orient the chart 

        var variances = band_channels.map(key => d3.variance(state.avg10.map(e => e[key])))
        if (!variances.every(e => e != 0)) {
            alert("Bad data! Electrodes not attached right")
            return

        }

        var userVectors = state.avg10.map(e => getRelativeVector(e.vector))


        // Filter the waypoints by minimum distance from any of these test user vectors
        var distanceIds = {}
        userVectors.forEach(uservector => {

            waypoints.forEach(waypoint => {
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
        var maxd = Object.entries(distanceIds)
        maxd.sort(function (a, b) {
            return b[1] - a[1]
        })
        //console.log("Best Match:")
        var bestMatch = maxd[0]
        //console.log(bestMatch)
        var bestFullMatch = waypoints.filter(e => e.id == bestMatch[0])[0]
        var filtered_waypoint_ids = maxd.filter(e => e[1] > minimumMatch).map(e => e[0])


        // Remove waypoints that have been selected for removal by the "removeN" standard
        filtered_waypoints_match = waypoints_include.filter(e => filtered_waypoint_ids.includes(e.id))
    }
    console.log("waypoint with distance:")
    console.log(filtered_waypoints_match)

    // Remove waypoints that have been de-selected by the user
    var filtered_waypoints = filtered_waypoints_match.filter(e => state.model.selected_users.includes(e.user))

    if (filtered_waypoints.length == 0) {
        alert("zero waypoints selected!")
        return
    }

    // Tag each waypoint (included filtered waypoints) as 'true' or 'false' match so that graph can remove filtered ones dynamically
    var ids = filtered_waypoints.map(e => e.id)
    waypoints.map(waypoint => {
        if (ids.includes(waypoint.id)) {
            waypoint.match = true
        }
        else waypoint.match = false
    })

    // Add distance to each user's rows
    state.modelRows = state.avg10 // Use a highly averaged dataset to check for matches
    state.modelRows.forEach(userRow => {
        var userVector = getRelativeVector(userRow.vector)
        var distances = []
        filtered_waypoints.forEach(waypoint => {

            var waypointVector = getRelativeVector(waypoint.vector)

            var distance = measureDistance(userVector, waypointVector)


            var label = waypoint.label + " (" + waypoint.user + ")"

            distances.push({ label: label, distance: distance, waypoint: waypoint })

        })
        distances.sort(function (a, b) {
            return b.distance - a.distance
        })

        userRow.distances = distances

    })


    // Charts

    var type = "map"
    if (type == "map") {
        updateChartWaypoints(waypoints)

        // Update user data if loaded
        if (state.avg10.length > 5) {

            updateChartUser(state.lowRes, waypoints)
            //buildBandChart(state.highRes)
            //buildSimilarityChart(state.modelRows)

        }


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

    buildBrowseFile(d3.select("#browse-div"), "UPLOAD", "t1")





}


export default function Live() {
    useEffect(() => {
        buildPage()

    }, [])


    return (


        <main id="main-container">
            <link href="https://fonts.googleapis.com/css?family=Cabin" rel="stylesheet"></link>

            <div id="sidebar-left" className="sidebar">
                <div id="browse-div"></div>
                <div style={{ margin: 10 }}>
                    <h3>The</h3>
                    <h2 style={{ marginTop: "-10px", marginBottom: "-10px" }}>Mapping Meditation</h2>
                    <h3 style={{ textAlign: "right" }}>Project</h3>

                    <div id="auth-container">
                        <div id="user"></div>
                        <button id="signin">Sign In</button>
                    </div>
                </div>




            </div>
            <div id="firebase-auth-container"></div>
            <svg id="chartsvg"></svg>
            <div id="popup"></div>
            <div id="menu"></div>
            <div id="sidebar-right" className="sidebar"></div>
        </main>
    );
}