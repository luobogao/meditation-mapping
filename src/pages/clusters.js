import React, { useState, useEffect } from "react";
import { state } from "../index"
import { user } from "../utils/database"
import { cleanedData } from "./validate";
import { getEveryNth } from "../utils/functions";
import { Link } from "react-router-dom";
import { waypoints } from "../utils/database";
import NavBarCustom from "../utils/navbar";
import { buildClusterCounts, buildResolutionSelectors } from "../utils/ui";
import Sidebar from "../utils/sidebar";
import { notice } from "../utils/ui";
import { addWaypoint } from "../utils/database";
import { record } from "../pages/validate"

const d3 = require("d3");

var x, y, line, start, end, line
var cluster = { id: -1 } // currently selected cluster
const margin = 10
const width = window.innerWidth * 0.8
const height = window.innerHeight * 0.8
var textColor = "white"
var sidebarWidth = 300
const backgroundColor = "#d9d9d9"
const navHeight = 63

const clusterColors = ["darkred", "blue", "orange", "lightgreen", "purple"]

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

    var test = false
    if (test == true && state != null && state["cluster_means_avg60"] != null) {
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
    var svg = d3.select("#cosinesvg")

    start = cleanedData[0].seconds
    end = cleanedData.slice(-1)[0].seconds

    console.log(waypoints)
    

    x = d3.scaleLinear()
        .domain([start, end])
        .range([margin, width - margin])

    y = d3.scaleLinear()
        .domain([-70, 105])
        .range([height - margin, margin])

    line = d3.line()
        .x(function (d, i) { return x(d.seconds); })
        .y(function (d, i) { return y(d.cosine) })
        .defined(((d, i) => !isNaN(d.cosine)))
        .curve(d3.curveMonotoneX) // apply smoothing to the line


    svg.selectAll(".clusterline")
        .data(waypoints)
        .enter()
        .append("path")
        .attr("id", function (d, i) { return "clusterLine" + i })
        .attr("class", "clusterline")
        .attr("fill", "none")
        .on('mouseover', function(event, d)
        {
            console.log(d.user)
        })
        .attr("stroke", function (d, i) { return clusterColors[i] })
        .attr("stroke-width", 3)
        .attr("d", function (d) { return line(d.timeseriesSimilarity) })
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
                var newWaypoint = { addedBy: user.uid, user: o, label: l, vector: cluster.keyValues, notes: n, averaging: state.resolution, version: "1.1", recordID: record.metadata.id, sourceFilename: record.metadata.filename }

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



    d3.select("#cosine").append("svg").attr("id", "cosinesvg")
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
            //updateClusterGraphs()
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