import React, { useState, useEffect } from "react";
import { state } from "../index"
import { user } from "../utils/database"
import { getEveryNth, saveCSV } from "../utils/functions";
import { Link } from "react-router-dom";
import { waypoints } from "../utils/database";
import NavBarCustom from "../utils/navbar";
import { notice, buildSimilaritySelectors, buildClusterCounts, buildResolutionSelectors } from "../utils/ui";
import Sidebar from "../utils/sidebar";
import { addWaypoint } from "../utils/database";
import { record } from "../pages/validate"

const d3 = require("d3");

var x, y, line, start, end, line
var cluster = { id: -1 } // currently selected cluster
const margin = 10
const navHeight = 63
const width = window.innerWidth * 0.8
const height = (window.innerHeight - navHeight) * 0.4
var textColor = "white"
var sidebarWidth = 300
const backgroundColor = "#d9d9d9"

var cleanedData;
const clusterColors = ["darkred", "blue", "orange", "lightgreen", "purple", "red", "pink", "yellow", "teal"]

function buildClusterTable() {
    var table = d3.select("#clustertable")


    table
        .style("margin", "10px")
        .style("border-collapse", "separate")
        .style("border-spacing", "0 5px")


}
function updateClusterTable() {
    var table = d3.select("#clustertable")
    var clusters = state["cluster_means_avg60"]
    var d = table.selectAll("tr")
        .data(clusters)

    var clusterN = clusters.length
    d3.selectAll(".clusters-checkbox").property("checked", false)
    d3.select("#cluster" + clusterN).property("checked", true)

    d.exit().remove()
    var rows = d
        .enter()
        .append("tr")
        .attr("class", "clusterrow")
        .style("cursor", "pointer")
        .on("click", function (event, selectedCluster) {
            cluster = selectedCluster
            console.log(d)
            d3.selectAll(".clusterrow").style("background", "none")
            d3.select(this).style("background", "green")
            setTimeout(function () { newWaypoint(selectedCluster) }, 80)


        })
        .on("mouseover", function (event, d) {
            var newcolor = "black"
            if (d.id == cluster.id) {
                newcolor = "darkgreen"
            }
            d3.selectAll(".clusterline").style("opacity", 0.2)
            d3.select("#clusterLine" + d.id).style("opacity", 1)
            d3.select(this).style("background", newcolor).style("color", "white")
        })
        .on("mouseout", function (i, d) {
            var newcolor = "none"
            if (d.id == cluster.id) newcolor = "green"
            d3.selectAll(".clusterline").style("opacity", 1)
            d3.select(this).style("background", newcolor).style("color", "black")
        })

    rows
        .append("td")
        .style("border-top-left-radius", "5px")
        .style("border-bottom-left-radius", "5px")
        .style("border", "1px solid " + textColor)
        .append("div")
        .style("color", textColor)
        .style("margin-left", "10px")
        .style("margin-right", "10px")
        .text(function (d, i) { return "Cluster " + (i + 1) })

    rows.append("td")
        .style("border-top-right-radius", "5px")
        .style("border-bottom-right-radius", "5px")
        .style("border", "1px solid " + textColor)
        .append("div")
        .style("margin-left", "10px")
        .style("margin-right", "10px")
        .text("⬤")
        .style("color", function (d, i) { return clusterColors[i] })
}

export function updateClusterGraphs() {


    console.log("updating clusters")
    if (state != null && state["cluster_means_avg60"] != null) {
        cleanedData = state.data.relative
        var svg = d3.select("#cosinesvg")
        svg.selectAll("*").remove()
        var clusters = state["cluster_means_avg" + state.resolution]
        start = cleanedData[0].seconds
        end = cleanedData.slice(-1)[0].seconds

        updateClusterTable()



        var minY = 90

        var getNth = state.resolution / 2
        if (getNth < 1) getNth = 1


        // Build graph data - for each cluster, return a list of time-series matches 
        var data = clusters.map(cluster => {
            var mean = cluster.similarityTimeseries
            return getEveryNth(mean.map(row => {
                if (row.cosine < minY) minY = row.cosine
                return {
                    seconds: row.seconds,
                    y: row.cosine
                }
            }), getNth)

        })

        svg.on("click", function () {
            var newRows = []
            for (let i = 0; i < data[0].length; i++) {
                var r = {}
                r.a = data[0][i].y
                r.b = data[1][i].y
                r.c = data[2][i].y
                newRows.push(r)

            }
            saveCSV(newRows)
        })

        x = d3.scaleLinear()
            .domain([start, end])
            .range([margin, width - margin])

        y = d3.scaleLinear()
            .domain([minY, 105])
            .range([height - margin, margin])

        line = d3.line()
            .x(function (d, i) { return x(d.seconds); })
            .y(function (d, i) { return y(d.y) })
            .defined(((d, i) => !isNaN(d.y)))
            .curve(d3.curveMonotoneX) // apply smoothing to the line


        svg.selectAll(".clusterline")
            .data(data)
            .enter()
            .append("path")
            .attr("id", function (d, i) { return "clusterLine" + i })
            .attr("class", "clusterline")
            .attr("fill", "none")
            .attr("stroke", function (d, i) { return clusterColors[i] })
            .attr("stroke-width", 3)
            .attr("d", function (d) { return line(d) })

        // Marker showing mouse location
        var marker = svg.append("circle")
            .attr("id", "graphsMarker")
            .style("display", "none")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("r", 10)
            .attr("fill", "blue")

        // Moouseover the graph - this requires a separate rect to watch for mouse events
        svg.append("svg:rect")
            .attr("width", width + "px")
            .attr("height", height + "px")
            .attr('fill', 'none')
            .attr('pointer-events', 'all')
            .on("mousemove", function (mouse) {
                var xf = mouse.layerX
                var seconds = x.invert(xf)

                var rowsAfter = data.filter(r => r.seconds >= seconds)
                if (rowsAfter.length > 0) {
                    var row = rowsAfter[0]

                    marker
                        .style("display", "flex")
                        .attr("cx", x(row.seconds))
                        .attr("cy", y(row.y))

                }
                else {
                    marker.style("display", "none")
                }



            })

    }
    updateMatchesGraph()

}
export function updateMatchesGraph() {
    var svg = d3.select("#communitysvg")
    if (svg.node() != null) {
        svg.selectAll('*').remove()

        start = cleanedData[0].seconds
        end = cleanedData.slice(-1)[0].seconds

        var labelMargin = 120 // margin to show the names beside each cosine line
        x = d3.scaleLinear()
            .domain([start, end])
            .range([margin, width - margin - labelMargin])


        var matchType = state.similarityType

        var minY = 40
        if (matchType == "euclidean")
        {
            minY = -30
        }
        y = d3.scaleLinear()
            .domain([minY, 100])
            .range([height - margin, margin])



        line = d3.line()
            .x(function (d, i) { return x(d.seconds); })
            .y(function (d, i) { return y(d[matchType]) })
            .defined(((d, i) => !isNaN(d[matchType])))
            .curve(d3.curveMonotoneX) // apply smoothing to the line


        // Add indexes to the wapoints so that a click event can get that index
        var i = 0
        waypoints.forEach(w => {
            w.id = i
            i++
        })
        svg.selectAll(".matchesLine")
            .data(waypoints)
            .enter()
            .append("path")
            .attr("id", function (d, i) { return "matchesLine" + i })
            .attr("class", "matchesLine")
            .attr("fill", "none")
            .on("click", function (event, waypoint) {

                d3.select(this).remove()
                d3.select("#text-legend-" + waypoint.id).remove()
            })
            .on('mouseover', function (event, d) {
                console.log(d)
            })
            .attr("stroke", function (d, i) { return clusterColors[i] })
            .attr("stroke-width", 3)
            .attr("d", function (d) {
                var getNth = d.averaging / 2  // Every waypoint has it's own 'averaging' value (1,10,60)
                if (getNth < 1) getNth = 1

                return line(getEveryNth(d["timeseriesSimilarity"], getNth))
            })

        var legend = []
        var i = -1
        waypoints.forEach(waypoint => {
            var lastEntry = waypoint["timeseriesSimilarity"].slice(-1)[0]
            i++

            svg.append("text")
                .attr("id", "text-legend-" + i)
                .text(waypoint.user)
                .style("fill", function () { return clusterColors[i] })
                .attr("x", x(lastEntry.seconds) + 10)
                .attr("y", y(lastEntry[matchType]))
            legend.push({ y: y(lastEntry[matchType]), id: i })
        })
        addLegend(svg, legend)
    }
}
function addLegend(svg, legends) {
    // Sorts legends in an SVG
    // "legends" is a list with 'id' and 'y'
    const labelMinMargin = 20
    function compare(a, b) {
        if (a.y < b.y) {
            return 1;
        }
        if (a.y > b.y) {
            return -1;
        }
        return 0;
    }
    let sorted_legend = legends.sort(compare)

    let N_2 = Math.floor(sorted_legend.length / 2)
    for (let n = 0; n <= N_2; n++) {

        sorted_legend[n].direction = 1
        sorted_legend[sorted_legend.length - n - 1].direction = -1
    }


    let move = 1
    let iterations = 0
    while (move > 0) {
        move = 0
        iterations++
        if (iterations > 100) {
            move = 0
        }
        else {
            for (let i = 0; i < sorted_legend.length; i++) {
                let entry = sorted_legend[i]
                let t = svg.select("#text-legend-" + entry.id)
                let y1 = t.attr("y")

                for (let i2 = 0; i2 < sorted_legend.length; i2++) {
                    if (i2 != i) {
                        let comparison_entry = sorted_legend[i2]
                        let t2 = svg.select("#text-legend-" + comparison_entry.id)
                        let y2 = t2.attr("y")

                        let diff = Math.abs(y2 - y1)
                        if (diff < labelMinMargin) {
                            var direction = 1
                            if (y1 < y2) direction = -1
                            move = 1
                            let newY = parseInt(y1) + (1 * direction)
                            y1 = newY
                            t.attr("y", newY)
                        }
                    }
                }

            }

        }
    }
}
function newWaypoint(cluster) {

    var menu = notice("Save Moment")

    menu.append("div").text("User:").style("margin-top", "20px")
    var owner = menu.append("input").attr("type", "text").style("width", "220px").attr("value", user.displayName)


    menu.append("div").text("Label:").style("margin-top", "20px")
    var label = menu.append("input").attr("type", "text").style("width", "220px")

    menu.append("div").text("Notes:").style("margin-top", "20px")
    var notes = menu.append("textarea").attr("rows", 10).attr("cols", 30)

    menu.append("div").style("margin-top", "30px")
        .append("button").text("Submit")
        .on("click", function () {
            var o = owner.node().value
            var l = label.node().value
            var n = notes.node().value

            if (l.length > 1) {

                // Note: an ID will be automatically generated by firebase
                var newWaypoint = { addedBy: user.uid, user: o, label: l, vector: cluster.keyValues, notes: n, averaging: state.resolution, version: "1.1", recordID: record.id, sourceFilename: record.filename }

                addWaypoint(newWaypoint)
                    .then((doc) => {
                        console.log("Added waypoint: " + doc.id)
                        d3.selectAll(".notice").remove()

                    })
                    .catch((error) => {
                        console.error("Failed to add waypoint:")
                        console.log(error)
                        d3.selectAll(".notice").remove()
                    })
            }
            else {
                alert("Please include a label (notes are optional)")
            }


        })
}


function buildPage() {
    d3.select("#main-container").style("display", "flex").style("flex-direction", "column").style("background", "grey")

    d3.select("#maindiv").style("display", "flex").style("flex-direction", "row")
        .style("height", (window.innerHeight - navHeight) + "px")


    // User's clusters SVG
    d3.select("#cosine").append("svg").attr("id", "cosinesvg")
        .style("margin", "10px")
        .attr("width", width + "px")
        .attr("height", height + "px")

    // Community graph SVG
    d3.select("#cosine").append("svg").attr("id", "communitysvg")
        .style("margin", "10px")
        .attr("width", width + "px")
        .attr("height", height + "px")


    // Sidebar
    var sidebar = d3.select("#sidebar")
        .style("width", sidebarWidth + "px")
        .style("height", (window.innerHeight - navHeight) + "px")
        .style("background", "#666666")
        .style("display", "flex")
        .style("flex-direction", "column")
        .style("justify-content", "space-between")

    var sidebarTopDiv = sidebar.append("div")

    var clusterDiv = sidebarTopDiv.append("div")
    buildClusterCounts(clusterDiv, "graphs")
    var resolutionDiv = sidebarTopDiv.append("div")
    buildResolutionSelectors(resolutionDiv)

    var mlDiv = sidebarTopDiv.append("div")
    buildSimilaritySelectors(sidebarTopDiv)


    sidebarTopDiv.append("div").style("margin", "10px").append("table").attr("id", "clustertable")
    buildClusterTable()




    if (user != null) {
        d3.select("#loginElement").style("display", "flex")
        d3.select("#loginName").text(user.displayName)

    }


}


export default function Clusters() {
    useEffect(() => {
        buildPage()
        if (cleanedData != null && state != null) {
            updateClusterGraphs()
            updateMatchesGraph()
        }


    }, [])
    useEffect(() => {
        if (cleanedData != null) {
            updateClusterGraphs()
            updateMatchesGraph()
        }
    })

    return (

        <div id="main-container">
            <NavBarCustom />
            <div id="maindiv">
                <div id="sidebar"></div>
                <div id="bodydiv">
                    <div id="cosine"></div>
                    <div id="options"></div>
                </div>

            </div>


        </div>

    );
};