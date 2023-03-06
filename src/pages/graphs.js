import React, { useState, useEffect } from "react";
import { state } from "../index"
import {user} from "../utils/database"
import { cleanedData } from "./validate";
import { getEveryNth } from "../utils/functions";
import { Link } from "react-router-dom";
import NavBarCustom from "../utils/navbar";
import { buildClusterCounts } from "../utils/ui";

const d3 = require("d3");

var x, y, line, start, end, line
const margin = 10
const width = window.innerWidth * 0.8
const height = window.innerHeight * 0.8
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
        var data = state["cluster_means_similarities_avg60"].map(mean => {
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


function buildPage() {
    d3.select("#cosine").append("svg").attr("id", "cosinesvg")
        .style("margin", "10px")
        .attr("width", width + "px")
        .attr("height", height + "px")

        if (user != null)
        {
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
            
            <NavBarCustom/>
            
            <div id="bodydiv">
                <div id="cosine"></div>
                <div id="options"></div>
            </div>
        </div>

    );
};