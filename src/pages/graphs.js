import React, { useState, useEffect } from "react";
import { state } from "../index"
import { user } from "../utils/database"
import { cleanedData } from "./validate";
import { getEveryNth } from "../utils/functions";
import { Link } from "react-router-dom";
import NavBarCustom from "../utils/navbar";
import { buildClusterCounts } from "../utils/ui";
import Sidebar from "../utils/sidebar";
import { notice } from "../utils/ui";
import { addWaypoint } from "../utils/database";

const d3 = require("d3");

var x, y, line, start, end, line
const margin = 10
const width = window.innerWidth * 0.8
const height = window.innerHeight * 0.5
const backgroundColor = "#d9d9d9"
const navHeight = 63

const clusterColors = ["darkred", "blue", "orange", "lightgreen", "purple"]

export function updateGraphs() {

    if (state != null && state["cluster_means_similarities_avg60"] != null) {
        var svg = d3.select("#cosinesvg")
        svg.selectAll("*").remove()

        start = cleanedData[0].seconds
        end = cleanedData.slice(-1)[0].seconds



        // var data = getEveryNth(cleanedData.map(row => {
        //     return {
        //         seconds: row.seconds,
        //         y: Math.log(row["Gamma_TP10_avg60"] / row["Gamma_TP9_avg60"])
        //     }
        // }), 10)
        var minY = 90
        var clusters = state["cluster_means_similarities_avg60"]


        // Sidebar
        d3.select("#sidebar").selectAll("*").remove()
        var sidebar = d3.select("#sidebar").append("div").style("margin-top", "10px").style("margin-bottom", "10px")
        console.log("clusters:")
        console.log(clusters)
        sidebar.selectAll("div")
            .data(clusters)
            .enter()
            .append("div")
            .style("margin", "5px")
            .style("border", "1px solid black")
            .style("border-radius", "5px")
            .style("text-align", "center")
            .style("cursor", "pointer")
            .on("click", function (event, d) {
                newWaypoint(d)
            })
            .on("mouseover", function (d) {
                d3.select(this).style("background", "black").style("color", "white")
            })
            .on("mouseout", function (d) {
                d3.select(this).style("background", "none").style("color", "black")
            })
            .text(function (d, i) {
                return "Cluster " + i
            })


        // Graph
        var data = clusters.map(cluster => {
            var mean = cluster.similarityTimeseries
            return getEveryNth(mean.map(row => {
                if (row.cosine < minY) minY = row.cosine
                return {
                    seconds: row.seconds,
                    y: row.cosine
                }
            }), 60)

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


        svg.selectAll(".line")
            .data(data)
            .enter()
            .append("path")
            .attr("class", "line")
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
                var newWaypoint = { addedBy: user.uid, user: o, label: l, vector: cluster.vector, notes: n, version: "1.1" }

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
    d3.select("#main-container").style("display", "flex").style("flex-direction", "column")
    d3.select("#maindiv").style("display", "flex").style("flex-direction", "row")
        .style("height", (window.innerHeight - navHeight) + "px")

    // Sidebar
    d3.select("#sidebar").style("width", "300px")
        .style("background", "grey")
        .style("margin", "10px")
        .style("border", "2px solid black")
        .style("border-radius", "10px")
        .style("height", "fit-content")



    d3.select("#cosine").append("svg").attr("id", "cosinesvg")
        .style("margin", "10px")
        .attr("width", width + "px")
        .attr("height", height + "px")

    if (user != null) {
        d3.select("#loginElement").style("display", "flex")
        d3.select("#loginName").text(user.displayName)

    }

    var clusterDiv = d3.select("#options").append('div')
    buildClusterCounts(clusterDiv, "graphs")

}


export default function Graphs() {
    useEffect(() => {
        buildPage()
        if (cleanedData != null && state != null) {
            updateGraphs()
        }


    }, [])
    useEffect(() => {
        if (cleanedData != null) {
            updateGraphs()
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