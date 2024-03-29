import React, { useState, useEffect } from "react";
import { buildTimeslider } from "../utils/timeslider";
import "firebaseui/dist/firebaseui.css"
import { addCheckbox, buildChartSelectors, buildClusterCounts, buildResolutionSelectors, buildUserSelectors } from "../utils/ui";
import { state, userDataLoaded } from "../index"
import { rebuildChart } from "../utils/runmodel";
import { firstLoad, waypoints, user } from "../utils/database";
import { zoom, updateChartWaypoints, addUserPoints } from "../utils/3d_charts"
import { buildBrowseFile } from "../utils/load";
import { bands, channels } from "../utils/muse"
import NavBarCustom from "../utils/navbar";
import { navHeight } from "../utils/ui"



const band_channels = []
bands.forEach(band => {
    channels.forEach(channel => {
        band_channels.push(band + "_" + channel)
    })
})

// Critical variables
const minimumMatch = 70 // minimum distance for waypoints to match
const chartMargin = 10
const d3 = require("d3");
const sidebarWidth = 300

export const chartWidth = window.innerWidth - sidebarWidth
export const chartHeight = window.innerHeight - navHeight - 2
export var mode3d = true
const backgroundColor = "#d9d9d9"
 
export const miniChartSize = 200

export function updateAllCharts() {
    if (waypoints != null && state.data.validated != null) {
        buildTimeslider()
        updateChartWaypoints()
        addUserPoints()
    }

}

function buildPage() {
    d3.select("#main-container").style("display", "flex")
        .style("flex-direction", "column")
        .style("font-family", "Cabin")


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

    buildRightSidebar()
    buildBottomBar()

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
            alert("This feature is not yet implemented. Please upload a Muse file.")
        })


    div1.append("text").text("Logged in as: ").attr("id", "welcome-auth").style("display", "none").style("color", "white").style("opacity", 0.6)



}
function buildRightSidebar() {
    var sidebar = d3.select("#sidebar-right")

    // User selections
    sidebar.append("div").style("margin", "10px")
        .attr("id", "user-selectors")

    var otherSelectors = sidebar.append("div").style("margin", "10px").style("margin-top", "50px")
        .style("display", "flex")
        .style("flex-direction", "column")
        .attr("class", "user-selectors")


    var clustersContainer = otherSelectors.append("div")
    buildClusterCounts(clustersContainer, "map")

    var resolutionContainer = otherSelectors.append("div")

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
    var limitWaypoints_box = addCheckbox(otherSelectors, "Limit to " + " N " + " Waypoints", state.limitMatches, "20px")
    limitWaypoints_box.on("click", function () {
        const active = this.checked
        if (active == true) {
            state.limitMatches = true
        }
        else {
            state.limitMatches = false
        }
        updateAllCharts()
    })
}
function buildBottomBar() {
    var bar = d3.select("#bottom-bar")
    bar.style("position", "absolute")
        //.style("height", "50px")
        .attr("class", "user-selectors")
        .style("display", "flex")
        .style("bottom", 0 + "px")
        .style("left", "100px")
        .style("justify-content", "center")
        .style("flex-direction", "column")
    //.style("background", "grey")

    var width = (window.innerWidth - sidebarWidth) * 0.75

    // Bottom-bar Gamma
    bar.append("svg")
        .style("margin", "5px")
        .attr("id", "bottom-timeseries").attr("width", width + "px").attr("height", "80px")

    // Slider
    bar.append("svg")
        .style("margin", "5px")
        .attr("id", "timeslider").attr("width", width + "px").attr("height", "40px")
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

        setTimeout(function () {
            console.log("MAP is re-rendering, rebuilding chart")
            if (state.data.validated != null)
            {
                updateAllCharts()
            }
            else 
            {
                rebuildChart()
            }
            
        }, 100)


    }, [])
  

    return (


        <main id="main-container">
            <link href="https://fonts.googleapis.com/css?family=Cabin" rel="stylesheet"></link>

            <NavBarCustom />

            <div id="body">
                <svg id="chartsvg"></svg>
                <div id="popup"></div>
                <div id="menu"></div>
                <div id="sidebar-right" className="sidebar"></div>
                <div id="bottom-bar">

                </div>
                <div id="top-bar"></div>
                <div id="welcome"></div>

            </div>

        </main>
    );
}