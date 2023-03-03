import React, { useState, useEffect } from "react";
import { buildBrowseFile } from "../utils/load";
import { sliderBottom } from 'd3-simple-slider';
import { datastate } from "../utils/load";
import { clone } from '../utils/functions';
const d3 = require("d3");
var x, y, line, graphSVG, dataLines, dataLinesOriginal

var margin = 10
var chartWidth = (window.innerWidth / 2) - (margin * 4)
var chartHeight = chartWidth

export function validateData(data) {

    const width = chartWidth
    const height = chartHeight
    const sliderHeight = 50
    const margin = 10



    var start = data[0].seconds
    var end = data.slice(-1)[0].seconds
    var minutes = Math.round((end - start) / 60)


    var div = d3.select("#relative")

    x = d3.scaleLinear()
        .domain([start, end])
        .range([margin, width - margin])

    y = d3.scaleLinear()
        .domain([-1.5, 1.5])
        .range([height - margin, margin])


    line = d3.line()
        .x(function (d, i) { return x(d.seconds); })
        .y(function (d, i) { return y(d.ratio) })
        .defined(((d, i) => !isNaN(d.ratio)))
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
        .attr("fill", "lightgrey");

    var lines = ["Gamma_TP10", "Gamma_TP9", "Gamma_AF7", "Gamma_AF8"]
    var colors = ["blue", "green", "red", "purple"]
    dataLinesOriginal = lines.map(key => {
        var firstValue = data[0][key]
        return data.map(e => {
            return {
                seconds: e.seconds,
                y: Math.pow(10, e[key]),
                ratio: Math.log(Math.pow(10, e[key]) / firstValue)
            }
        })
    })

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

    const slider = sliderBottom().min(0).max(10).step(1).width(width - (4 * margin));
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
        console.log(d)
        var newMax = 0
        var newMin = 0
        dataLines = dataLinesOriginal.map(l => {
            var filtered = l.filter(e => e.seconds > (d * 60))
            var firstValue = filtered[0].y

            filtered.forEach(e => e.ratio = Math.log(e.y / firstValue))
            var max = d3.max(filtered.map(e => e.ratio))
            var min = d3.min(filtered.map(e => e.ratio))
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



}
function updateValidChart(data) {
    graphSVG.selectAll(".line")
        .data(data)
        .attr("d", function (d) {

            return line(d)
        })


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
            validateData(datastate.lowRes)

        })

    // Charts
    d3.select("#relative")
        .style("margin", margin + "px")
        .style("width", chartWidth + "px")
        .style("height", chartHeight + "px")

    d3.select("#ratios")
        .style("margin", margin + "px")
        .style("width", chartWidth + "px")
        .style("height", chartHeight + "px")

}

export default function Validate() {
    useEffect(() => {
        buildPage()

    }, [])


    return (
        <div id="main-container">
            <div id="header"></div>
            <div id="bodydiv">
                <div id="relative"></div>
                <div id="ratios"></div>
            </div>
        </div>

    );
};
