import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { buildBrowseFile } from "../utils/load";
import { sliderBottom } from 'd3-simple-slider';
import { datastate } from "../utils/load";
import { clone, getEveryNth } from '../utils/functions';
import { bands, channels } from "../utils/muse"
const d3 = require("d3");

var chartBackground = "lightgrey"

var selectedStartSecond = 0

// Relative Chart
var x, y, line, graphSVG, dataLines, dataLinesOriginal
var graphAverageN = 10 // Rounding for the chart
var minRatio = 1.5

// Ratio Charts
var xR, yR, lineR, svgR

const margin = 10
var width = (window.innerWidth / 2) - (margin * 4)
var height = width
const sliderHeight = 50

export var cleanedData = null




export function validateData(data) {
    // Purpose: use the slider to select a different starting minute, all values are recalculated to be a % of the first value
    // Does not change original data - once user decides on a starting minute, the values from that minute will be stored as a starting vector

    var start = data[0].seconds
    var end = data.slice(-1)[0].seconds
    var minutes = Math.round((end - start) / 60)


    var div = d3.select("#relative")

    div.selectAll("*").remove()

    x = d3.scaleLinear()
        .domain([start, end])
        .range([margin, width - margin])


    line = d3.line()
        .x(function (d, i) { return x(d.seconds); })
        .y(function (d, i) { return y(d.ratio60) })
        .defined(((d, i) => !isNaN(d.ratio60)))
        .curve(d3.curveMonotoneX) // apply smoothing to the line


    // Graph SVG
    graphSVG = div.append("svg")
        .attr("id", "validate_svg")
        .attr("width", (width - (2 * margin)) + "px")
        .style("margin", margin + "px")
        .attr("height", (height - sliderHeight - (4 * margin)) + "px")

    graphSVG.append("rect")
        .attr("width", (width - (2 * margin)) + "px")
        .attr("height", (height - sliderHeight - (4 * margin)) + "px")
        .attr("fill", chartBackground);

    var lines = ["Gamma_TP10", "Gamma_TP9", "Gamma_AF7", "Gamma_AF8"]
    
    var colors = ["blue", "green", "red", "purple"]

    // Limit the data to this averaged-amount
    var d = clone(data)
    d = d.filter(e => e["avg1"] == true)
    

    var minY = -1 * minRatio
    var maxY = minRatio
    dataLinesOriginal = lines.map(key => {
        var keyavg = key + "_avg1"
        var firstValue = Math.pow(10, d[11][keyavg])
        
        return d.map(e => {

            let y1 = Math.pow(10, e[key + "_avg1"])
            let ratio1 = Math.log(y1 / firstValue)

            let y10 = Math.pow(10, e[key + "_avg10"])
            let ratio10 = Math.log(y10 / firstValue)

            let y60 = Math.pow(10, e[key + "_avg60"])
            let ratio60 = Math.log(y60 / firstValue)


            if (ratio10 > maxY) maxY = ratio10
            if (ratio10 < minY) minY = ratio10
            return {
                seconds: e.seconds,
                y1: y1,
                ratio1: ratio1,
                y10: y10,
                ratio10: ratio10,
                y60: y60,
                ratio60: ratio60,

            }
        })
    })
    // Balance the Y min and max
    if (maxY > 0 && minY < 0) {
        if (Math.abs(minY) > maxY) maxY = Math.abs(minY)
        else minY = -1 * maxY
    }
    y = d3.scaleLinear()
        .domain([minY, maxY])
        .range([height - margin, margin])



    dataLines = clone(dataLinesOriginal)
    graphSVG.selectAll(".line")
        .data(dataLines)
        .enter()
        .append("path")
        .attr("class", "line")
        .attr("fill", "none")
        .attr("stroke", function (d, i) { return colors[i] })
        .attr("stroke-width", 3)

    updateValidChart(dataLines)

    const slider = sliderBottom().min(10).default(10).max(300).ticks(10).step(1).width(width - (4 * margin));
    // Slider SVG
    var svg = div.append("svg")
        .attr("width", width + "px")
        .attr("height", sliderHeight + "px")
        .style("margin", margin + "px")
        .append('g')
        .attr("transform", "translate(" + margin + "," + margin + ")")

    // https://www.npmjs.com/package/d3-simple-slider
    svg.call(slider)
    slider.on("onchange", function (d) {

        var newMax = minRatio
        var newMin = -1 * minRatio
        selectedStartSecond = d
        dataLines = dataLinesOriginal.map(l => {
            var filtered = l.filter(e => e.seconds > d)
            var firstValue = filtered[0].y10

            filtered.forEach(e => e.ratio1 = Math.log(e.y1 / firstValue))
            filtered.forEach(e => e.ratio10 = Math.log(e.y10 / firstValue))
            filtered.forEach(e => e.ratio60 = Math.log(e.y60 / firstValue))

            var max = d3.max(filtered.map(e => e.ratio10))
            var min = d3.min(filtered.map(e => e.ratio10))
            if (max > newMax) newMax = max
            if (min < newMin) newMin = min

            return filtered
        }
        )
        if (newMax > 0 && newMin < 0) {
            if (Math.abs(newMin) > newMax) newMax = Math.abs(newMin)
            else newMin = -1 * newMax
        }


        y = d3.scaleLinear()
            .domain([newMin, newMax])
            .range([height - margin, margin])



        updateValidChart(dataLines)
    })

    // ACCEPT button
    div.append("button").text("ACCEPT")
        .on("click", function () {
            var filteredData = clone(data.filter(row => row.seconds >= selectedStartSecond))
            var firstRow = filteredData[0]
            console.log("First Row Selected:")
            console.group(firstRow)
            filteredData.forEach(row => {
                channels.forEach(channel => {
                    bands.forEach(band => {
                        var avgs = [1, 10, 60]
                        avgs.forEach(avg => {
                            var key = band + "_" + channel + "_avg" + avg
                            
                            if (row[key] != null) {
                                var newVal = Math.pow(10, row[key]) / Math.pow(10, firstRow[key])
                                row[key] = newVal
                            }

                        })

                    })
                })
            })
            cleanedData = filteredData
        })

    // Update chart - called each time graph needs to be changed
    function updateValidChart(data) {
        graphSVG.selectAll(".line")
            .data(data)
            .attr("d", function (d, i) {
                // Build the line - smooth it by taking every N rows

                return line(getEveryNth(d, graphAverageN))
            })


    }
    setupRatioGraphs(data)



}
function setupRatioGraphs(data) {
    // Graph SVG
    var div = d3.select("#ratios")
    svgR = div.append("svg")
        .attr("id", "validate_svg")
        .attr("width", (width - (2 * margin)) + "px")
        .style("margin", margin + "px")
        .attr("height", (height - sliderHeight - (4 * margin)) + "px")

    svgR.append("rect")
        .attr("fill", chartBackground)
        .attr("width", (width - (2 * margin)) + "px")
        .attr("height", (height - sliderHeight - (4 * margin)) + "px")

    lineR = d3.line()
        .x(function (d, i) { return x(d.seconds); })
        .y(function (d, i) { return y(d.ratio) })
        .defined(((d, i) => !isNaN(d.ratio)))
        .curve(d3.curveMonotoneX) // apply smoothing to the line

}

function buildPage() {
    d3.select("body").style("background", "grey")

    d3.select("#main-container").style("display", "flex")
        .style("flex-direction", "column")

    d3.select("#bodydiv")
        .style("display", "flex")
        .style("flex-direction", "row")

    d3.select("#relative").style("border", "1px solid black")
    d3.select("#ratios").style("border", "1px solid black")

    // Headers
    var btndiv = d3.select("#header").append("div").style("margin", margin + "px")
    buildBrowseFile(btndiv, "UPLOAD", 80, "grey", "black", "t1")
    btndiv.append("button")
        .style("font-size", "18px")
        .text("LOAD")
        .on("click", function (d) {
            validateData(datastate.data)

        })

    // Charts
    d3.select("#relative")
        .style("margin", margin + "px")
        .style("width", width + "px")
        .style("height", height + "px")

    d3.select("#ratios")
        .style("margin", margin + "px")
        .style("width", width + "px")
        .style("height", height + "px")



}

export default function Validate() {
    useEffect(() => {
        buildPage()

    }, [])


    return (
        <div id="main-container">
            <Link to="/map">Map</Link>
            <div id="header"></div>
            <div id="bodydiv">
                <div id="relative"></div>
                <div id="ratios"></div>
            </div>
        </div>

    );
};
