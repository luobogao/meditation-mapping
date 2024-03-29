import React, { useState, useEffect } from "react";
import { state } from "../index"
import { user } from "../utils/database"
import { getEveryNth, saveCSV } from "../utils/functions";
import { Link } from "react-router-dom";
import { waypoints } from "../utils/database";
import NavBarCustom from "../utils/navbar";
import { notice, buildSimilaritySelectors, buildClusterCounts, buildVectorTypeSelectors, buildResolutionSelectors } from "../utils/ui";
import Sidebar from "../utils/sidebar";
import { addWaypoint } from "../utils/database";
import { record } from "../pages/validate"
import { euclideanDistance } from "../utils/analysis";
import { text } from "d3";

const d3 = require("d3");

var x, y, line, start, end, line
var cluster = { id: -1 } // currently selected cluster
const margin = 15
const labelMargin = 180 // margin to show the names beside each cosine line
const navHeight = 63
const yAxisWidth = 30
var sidebarWidth = 300
const width = window.innerWidth - sidebarWidth - 2 * margin - labelMargin
const availableHeight = window.innerHeight - navHeight - 4 * margin
const userHeight = availableHeight * 0.382  // golden ratio
const communityHeight = availableHeight - userHeight
const height = (window.innerHeight - navHeight) * 0.4
var textColor = "white"
const opacityDeactive = 0.2

const backgroundColor = "#d9d9d9"

var cleanedData;
const clusterColors = ["darkred", "blue", "orange", "lightgreen",
    "purple", "red", "pink", "yellow", "teal", "green", "darkorange"]

function buildClusterTable() {
    var table = d3.select("#clustertable")


    table
        .style("margin", "10px")
        .style("border-collapse", "separate")
        .style("border-spacing", "0 5px")


}
function updateClusterTable() {
    var table = d3.select("#clustertable")
    var clusters = state["cluster_means_avg" + state.resolution]
    table.selectAll("tr").remove()
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
            if (d.id == cluster.order) {
                newcolor = "darkgreen"
            }
            d3.selectAll(".clusterline").style("opacity", 0.2)
            d3.select("#clusterLine" + d.order).style("opacity", 1)
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

    // Checkmark if this cluster has already been added as a waypoint
    rows.append("td")
        .text("✓")
        .style("color", textColor)
        .style("display", function (d) { return d.alreadyAdded ? "block" : "none" })
}

export function updateClusterGraphs() {

    if (state != null && state["cluster_means_avg" + state.resolution] != null) {

        var svg = d3.select("#cosinesvg")
        svg.selectAll("*").remove()
        var clusters = state["cluster_means_avg" + state.resolution]

        // Waypoints - used to determine if a cluster has already been added
        var waypointsAvg = waypoints.filter(w => w["timeseriesSimilarity_avg" + state.resolution] != null)

        var minY = 90

        var getNth = state.resolution / 2
        if (getNth < 1) getNth = 1

        var matchType = state.similarityType
        // Build graph data - for each cluster, return a list of time-series matches 
        var data = clusters.map(cluster => {



            // Get every nth element from the time-series to make it look smoother
            var mean = cluster.similarityTimeseries
            return getEveryNth(mean.map(row => {
                if (row.cosine < minY) minY = row.cosine
                return {
                    seconds: row.seconds,
                    y: row[matchType]
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


        y = d3.scaleLinear()
            .domain([minY, 105])
            .range([userHeight - margin, margin])

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

        // Find the median of each time-series, make a new key "yVar" showing variance from median
        for (let i = 0; i < data[0].length; i++) {
            var medianAvgArr = []
            for (let j = 0; j < data.length; j++) {
                medianAvgArr.push(data[j][i].y)
            }
            var median = d3.median(medianAvgArr)
            data.forEach(cluster => {
                cluster[i].median = median
                cluster[i].yVar = cluster[i].y - median
                cluster[i].y = cluster[i].yVar
            })
        }



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


}
export function updateCommunityGraph() {
    var svgParent = d3.select("#communitysvg")
    svgParent.selectAll("*").remove()

    var thisWidth = width - (2 * margin) - yAxisWidth
    var svg = svgParent.append("g")
        .attr("width", thisWidth + "px")
        .attr("height", (communityHeight - (2 * margin)) + "px")
        .attr("transform", "translate(" + (margin + yAxisWidth) + "," + margin + ")")

    if (svg.node() != null) {
        svg.selectAll('*').remove()

        var waypointsAvg = waypoints.filter(w => w["timeseriesSimilarity_avg" + state.resolution] != null)
            .filter(w => w.user != record.user)

        if (waypointsAvg.length > 0) {
            var matchType = state.similarityType
            var matchTypeKey = state.similarityType



            line = d3.line()
                .x(function (d, i) { return x(d.seconds); })
                .y(function (d, i) { return y(d[matchTypeKey]) })
                .defined(((d, i) => !isNaN(d[matchTypeKey])))
                .curve(d3.curveMonotoneX) // apply smoothing to the line


            // Add indexes to the wapoints so that a click event can get that index
            var i = 0


            waypointsAvg.forEach(w => {
                w.clickid = i
                w.topmatch = false
                i++
            })

            // Build graph data - for each cluster, return a list of time-series matches
            var getNth = state.resolution / 2
            var data = waypointsAvg.map(waypoint => {
                return getEveryNth(waypoint["timeseriesSimilarity_avg" + state.resolution], getNth)
            })


            // Build the three kinds of metrics to graph: absolute, median-variance, and relative-to-start
            for (let i = 0; i < data[0].length; i++) {
                var medianAvgArr = []
                for (let j = 0; j < data.length; j++) {
                    medianAvgArr.push(data[j][i][matchType])
                }
                var median = d3.median(medianAvgArr)
                data.forEach(cluster => {
                    cluster[i].median = median
                    cluster[i][matchTypeKey + "_var"] = cluster[i][matchType] - median
                    cluster[i][matchTypeKey] = cluster[i][matchType]


                })
            }

            var graphType = "absolute"

            var minY = 0
            var maxY = 0

            if (graphType == "median") {
                // Find min/max of all time-series
                data.forEach(line => {
                    line.forEach(row => {
                        if (row[matchTypeKey] < minY) {
                            minY = row[matchTypeKey]
                        }
                        if (row[matchTypeKey] > maxY) {
                            maxY = row[matchTypeKey]
                        }
                    })
                })

            }
            else if (graphType == "absolute") {
                minY = 70
                maxY = 105
            }



            // Find the top 4 waypoint matches
            var topMatches = []
            for (let i = 0; i < data.length; i++) {
                topMatches.push({ i: i, max: d3.max(data[i].map(d => d[matchTypeKey])) })
            }
            var colori = 0

            var sortedTopMatches = topMatches.sort((a, b) => b.max - a.max).map(e => e.i).slice(0, 5)
            //var allPositiveMatches = topMatches.filter(e => e.max > 20).map(e => e.i)
            sortedTopMatches.forEach(i => {
                var waypoint = waypointsAvg[i]
                waypoint.color = clusterColors[colori + state.clusters + 1] // don't mix colors with cluster colors
                waypoint.topmatch = true
                colori++
            })


            y = d3.scalePow()
                .exponent(1)
                .domain([-80, maxY])
                .range([communityHeight - (2 * margin), (2 * margin)])

            // Add Y-axis - this requires a separe 'g' so that the text-alignment doesn't affect legend text
            var yAxis = d3.axisLeft(y)
                .tickFormat(function (d) {
                    return (d * 1)
                })


            var yaxisSVG = svg.append("g")
                .style("color", textColor)
                .style("font-size", "16px")
            yaxisSVG.call(yAxis)
            yaxisSVG.selectAll(".domain").remove();
            yaxisSVG.selectAll(".tick line").remove();




            svg.selectAll(".matchesLine")
                .data(waypointsAvg)
                .enter()
                .append("path")
                .attr("id", function (d, i) { return "matchesLine" + i })
                .attr("class", "matchesLine")
                .attr("fill", "none")
                .on("click", function (event, waypoint) {

                    d3.select(this).attr("stroke", "lightgrey").style("opacity", opacityDeactive)
                    d3.select("#text-legend-" + waypoint.clickid).remove()
                })
                .on('mouseover', function (event, d) {

                })
                .attr("stroke", function (waypoint, i) {
                    if (waypoint.topmatch == true) {
                        return waypointsAvg[i].color
                    }
                    else return "lightgray"

                })
                .style("opacity", function (d, i) {
                    if (waypointsAvg[i].topmatch == true) {
                        return 1
                    }
                    else return opacityDeactive

                })
                .attr("stroke-width", 3)
                .attr("d", function (waypoint) {
                    var data = getEveryNth(waypoint["timeseriesSimilarity_avg" + state.resolution], getNth)
                    return line(data)
                })

            // Add a legend
            var legend = []
            var i = -1
            data.forEach(series => {
                var lastEntry = series.slice(-1)[0]
                i++

                var waypoint = waypointsAvg[i]
                if (waypoint.topmatch == true) {
                    svg.append("text")
                        .attr("class", "legend")
                        .attr("id", "text-legend-" + waypoint.clickid)
                        .text(waypoint.user + " - " + waypoint.label)
                        .style("fill", function () { return waypoint.color })
                        .attr("x", x(lastEntry.seconds) + 10)
                        .attr("y", y(lastEntry[matchTypeKey]))
                    legend.push({ y: y(lastEntry[matchTypeKey]), id: i })
                }

            })
            addLegend(svg, legend)


        }
    }


}
function addLegend(svg, legends) {
    // Sorts legends in an SVG
    // "legends" is a list with 'id' and 'y'
    const labelMinMargin = 15
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
                            console.log(direction)
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

    console.log("cluster:")
    console.log(cluster)
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
                var newWaypoint = {
                    addedBy: user.uid, user: o,
                    label: l,
                    powersAbsolute: cluster.powersAbsolute,
                    powersRelative: cluster.powersRelative,
                    powersChange: cluster.powersChange,
                    notes: n, averaging: state.resolution,
                    version: "1.1", type: state.vectorType,
                    recordID: record.id, sourceFilename: record.filename
                }

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
        .style("margin", margin + "px")
        .attr("width", width + "px")
        .attr("height", userHeight + "px")

    // Community graph SVG
    d3.select("#cosine").append("svg").attr("id", "communitysvg")
        .style("margin", margin + "px")
        .attr("width", width + "px")
        .attr("height", communityHeight + "px")


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

    // add a div using buildVectorTypeSelector
    var vectorTypeDiv = sidebarTopDiv.append("div")
    buildVectorTypeSelectors(vectorTypeDiv)


    sidebarTopDiv.append("div").style("margin", "10px").append("table").attr("id", "clustertable")
    buildClusterTable()




    if (user != null) {
        d3.select("#loginElement").style("display", "flex")
        d3.select("#loginName").text(user.displayName)

    }


}
export function updateClusters() {
    if (state.data.validated == null) {
        console.error("No data to show clusters")
        return
    }
    cleanedData = state.data.validated

    start = cleanedData[0].seconds
    end = cleanedData.slice(-1)[0].seconds

    x = d3.scaleLinear()
        .domain([start, end])
        .range([margin * 2, width - (margin * 2) - labelMargin])


    updateClusterGraphs()
    updateCommunityGraph()
    updateClusterTable()
}

export default function Clusters() {

    useEffect(() => {
        console.log("----> Clustering")
        buildPage()
        if (state.data.validated != null) {

            updateClusters()
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