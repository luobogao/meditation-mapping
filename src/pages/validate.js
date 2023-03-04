import React, { useState, useEffect } from "react";
import { notice } from "../utils/ui";
import { Link } from "react-router-dom";
import { buildBrowseFile } from "../utils/load";
import { sliderBottom } from 'd3-simple-slider';
import { datastate } from "../utils/load";
import { clone, getEveryNth } from '../utils/functions';
import { bands, channels } from "../utils/muse"
const d3 = require("d3");

// data
var rawData;

// Style
var chartBackground = "lightgrey"
var selectedStartSecond = 0
const margin = 10
var width = (window.innerWidth / 2) - (margin * 4)
var height = width

// Relative Chart
var x, y, line, graphSVG, dataLines, dataLinesOriginal
var graphAverageN = 30 // Rounding for the chart
var minRatio = 1.5
var relativeLines = ["Delta_TP10", "Delta_TP9", "Delta_AF7", "Delta_AF8", "Gamma_TP10", "Gamma_TP9", "Gamma_AF7", "Gamma_AF8",]
var colors = ["blue", "blue", "blue", "blue", "red", "red", "red", "red"]

// Ratio Charts
var xR, yR, lineR, svgR
var ratios = [["Gamma_TP10", "Gamma_TP9"], ["Gamma_AF8", "Gamma_AF7"],  ["Gamma_TP10", "Gamma_AF8"],  ["Gamma_TP9", "Gamma_AF7"],
["Delta_TP10", "Delta_TP9"], ["Delta_AF8", "Delta_AF7"],  ["Delta_TP10", "Delta_AF8"],  ["Delta_TP9", "Delta_AF7"]]
var ratioColors = ["blue", "green", "red", "purple","blue", "green", "red", "purple"]
var yR = d3.scaleLinear()
        .domain([-5, 5])
        .range([height - margin, margin])




const sliderHeight = 50

export var cleanedData = null

export function showLoadingValidate() {
    notice("Loading...")
}
export function validate(data) {
    rawData = data.filter(e => e.avg60 == true) // Remove the first few rows
    buildValidationChart()
    buildRatioCharts()
    d3.select("#acceptBtn").style("display", "flex")

}

function buildValidationChart(data) {
    // Purpose: use the slider to select a different starting minute, all values are recalculated to be a % of the first value
    // Does not change original data - once user decides on a starting minute, the values from that minute will be stored as a starting vector

    d3.selectAll(".notice").remove() // Remove loading notice
    var start = rawData[0].seconds
    var end = rawData.slice(-1)[0].seconds

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

    

    // Limit svg.the data to this averaged-amount
    var d = clone(rawData)
    d = d.filter(e => e["avg10"] == true)


    var minY = -1 * minRatio
    var maxY = minRatio
    dataLinesOriginal = relativeLines.map(key => {
        var keyavg = key + "_avg10"
        var firstValue = d[0][keyavg]

        return d.map(e => {

            let y1 = e[key + "_avg1"]
            let ratio1 = Math.log(y1 / firstValue)

            let y10 = e[key + "_avg10"]
            let ratio10 = Math.log(y10 / firstValue)

            let y60 = e[key + "_avg60"]
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

    const slider = sliderBottom().min(20).default(20).max(300).ticks(10).step(1).width(width - (4 * margin));
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
            var filtered = l.filter(e => e.seconds > d && e.y10 != null)
            var firstValue = filtered[0].y60
            
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
        updateRatioGraphs()
    })



    // Update chart - called each time graph needs to be changed
    function updateValidChart(data) {
        graphSVG.selectAll(".line")
            .data(data)
            .attr("d", function (d, i) {
                // Build the line - smooth it by taking every N rows

                return line(getEveryNth(d, graphAverageN).filter(e => e.ratio60 != null))
            })


    }


}
function buildRatioCharts() {
    // Graph SVG
    var div = d3.select("#ratios")
    div.selectAll("*").remove()
    
    svgR = div.append("svg")
        .attr("id", "ratioSVG")
        .attr("width", (width - (2 * margin)) + "px")
        .style("margin", margin + "px")
        .attr("height", (height - sliderHeight - (4 * margin)) + "px")

    svgR.append("rect")
        .attr("fill", chartBackground)
        .attr("width", (width - (2 * margin)) + "px")
        .attr("height", (height - sliderHeight - (4 * margin)) + "px")

    lineR = d3.line()
        .x(function (d, i) { return x(d.seconds); })
        .y(function (d, i) { return yR(d.ratio) })
        .defined(((d, i) => !isNaN(d.ratio)))
        .curve(d3.curveMonotoneX) // apply smoothing to the line
    updateRatioGraphs()




}
function updateRatioGraphs() {
    var svg = d3.select("#ratioSVG")

    var firstEntry = rawData[selectedStartSecond]
    
    var ratioData = ratios.map(ratio => {
        return getEveryNth(rawData.map(entry => {
            

            var relativeVal1 = entry[ratio[0] + "_avg60"] / firstEntry[ratio[0] + "_avg60"]
            var relativeVal2 = entry[ratio[1] + "_avg60"] / firstEntry[ratio[1] + "_avg60"]
            var ratioValue = Math.log(relativeVal1 / relativeVal2)
            return {
                seconds: entry.seconds,
                ratio: ratioValue

            }
        }), 30)
    })
    console.log("ratiodata:")
    console.log(ratioData[0])
    var d = svg.selectAll(".line")
        .data(ratioData)

    d.enter()
        .append("path")
        .attr("class", "line")
        .attr("fill", "none")
        .attr("stroke", function (d, i) { return ratioColors[i] })
        .attr("stroke-width", 3)
        .attr("d", function(d){return lineR(d)})
    d
    .attr("d", function(d)
    {
        console.log(d)
        return lineR(d)
    })
}

function buildPage() {
    d3.select("#nav").style("margin", "5px")
    d3.select("body").style("background", "grey")

    d3.select("#main-container").style("display", "flex")
        .style("flex-direction", "column")

    d3.select("#bodydiv")
        .style("display", "flex")
        .style("flex-direction", "row")

    d3.select("#relative").style("border", "1px solid black")
    d3.select("#ratios").style("border", "1px solid black")

    // Headers
    var btndiv = d3.select("#header").append("div")
        .style("display", "flex")
        .style("margin", margin + "px")
    buildBrowseFile(btndiv, "UPLOAD", 80, "grey", "black", "t1")


    // ACCEPT button
    btndiv.append("button")
        .style("font-size", "18px")
        .attr("id", "acceptBtn")
        .style("display", "none")
        .style("margin-left", "10px")
        .text("ACCEPT")
        .on("click", function () {
            var filteredData = clone(rawData.filter(row => row.seconds >= selectedStartSecond))
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
                                var newVal = row[key] / firstRow[key]
                                row[key] = newVal
                            }

                        })

                    })
                })
            })
            cleanedData = filteredData
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
            <div id="nav">
                <Link to="/map">Map</Link>
            </div>

            <div id="header"></div>
            <div id="bodydiv">
                <div id="relative"></div>
                <div id="ratios"></div>
            </div>
        </div>

    );
};
