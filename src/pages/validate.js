import React, { useState, useEffect } from "react";
import { saveCSV } from "../utils/functions";
import { Link } from "react-router-dom";
import { loadingSpinner, notice } from "../utils/ui";
import { buildBrowseFile } from "../utils/load";
import { sliderBottom } from 'd3-simple-slider';
import { state } from "../index"
import { getAllRecordings, addRecording, currentRecording, deleteRecordingFirebase, setCurrentRecording, updateRecording, waypoints, getRecordingFromStorage, deleteFromStorage } from "../utils/database";
import { datastate } from "../utils/load";
import { round, clone, formatDate, getEveryNth } from '../utils/functions';
import { bands, channels } from "../utils/muse"
import { rebuildChart } from "../utils/runmodel";
import MultiRangeSlider from "multi-range-slider-react";
import NavBarCustom from "../utils/navbar";
import { deleteRecording, addOrReplaceSession, deleteAllrecordings, getRecordingById } from "../utils/indexdb";
import { navHeight } from "../utils/ui"


const d3 = require("d3");

//deleteAllSessions(function(){})

// data
export var record = null
export var recordings = []

var firstBoot = true

// ----- RECORD documentation --------------------
/* {
    "filename": "Meditation_1665360784694",
    "user": "Steffan",
    "notes": "Insight",
    "timestamp": 1665360784694,
    "startSecond": 56,
    "addedTime": 1678511907939,
    "addedBy": "EjC2ZdEyhJQz34VzzuU4V8CRYfL2",
    "id": "UUXvTN0Ycv4qss1ierBI",
    "updatedTime": 1678512626909
  } */
// ----------------------------------------------


var workingData = null

// slider
var brushg
var brush;
var range_width;
var range_x;
var sliding = false
var sliderMargin = 10
var lastStartSecond = -1
var lastEndSecond = -1



// Style
var textColor = "white"
var chartBackground = "lightgrey"
var selectedStartSecond = 0
var selectedEndSecond = 100000
const margin = 10
var sidebarWidth = 320
const sliderHeight = 50
var width = ((window.innerWidth - sidebarWidth) / 2) - (margin * 4)

var height = (window.innerHeight - sliderHeight - 63 - 100 - (margin * 2)) / 2
var chartContainerHeight = (height * 2) + sliderHeight + (margin * 2)

// Moment Variance chart
var yV, lineV, momentVarSVG;

// Relative Chart
var x, y, line, graphSVG, dataLines, dataLinesOriginal
var graphAverageN = 30 // Rounding for the chart
var minRatio = 1.5
var relativeLines = ["Delta_TP10",

    "Delta_TP9", "Delta_AF7", "Delta_AF8", "Gamma_TP10", "Gamma_TP9", "Gamma_AF7", "Gamma_AF8",]
var colors = ["blue", "blue", "blue", "blue", "red", "red", "red", "red"]

// Ratio Charts
var xR, yR, lineR, svgR
var ratios = [["Gamma_TP10", "Gamma_TP9"], ["Gamma_AF8", "Gamma_AF7"], ["Gamma_TP10", "Gamma_AF8"], ["Gamma_TP9", "Gamma_AF7"],
["Delta_TP10", "Delta_TP9"], ["Delta_AF8", "Delta_AF7"], ["Delta_TP10", "Delta_AF8"], ["Delta_TP9", "Delta_AF7"]]
var ratioColors = ["blue", "green", "red", "purple", "blue", "green", "red", "purple"]
var yR = d3.scaleLinear()
    .domain([-5, 5])
    .range([height - (2 * margin), 0])






export var cleanedData = null

export function showLoadingValidate() {
    notice("Loading...", "loading", true)
}
export function validateAfterLoad(loadedData, newRecording) {
    if (newRecording != null) {
        console.log("-> Adding new recording to recordings")
        console.log(newRecording)
        recordings.push(newRecording)

    }
    console.log("Looking for recording filename: " + loadedData.filename + " in recordings")
    record = recordings.filter(r => r.filename == loadedData.filename)[0]
    record.delete = false
    if (record == null) {
        console.error("Recording not found in recordings!")
    }
    updateRecordingTable()
    state.data.averaged = loadedData.data
    workingData = null
    validate()
}
export function validate() {

    if (state.data.averaged != null) {
        selectedStartSecond = record.startSecond
        selectedEndSecond = record.endSecond

        if (workingData == null) {
            workingData = getEveryNth(state.data.averaged.filter(e => e.avg60 == true), 10) // Remove the first few rows
        }


        d3.selectAll(".loading").remove()
        buildValidationChart()
        buildRatioCharts()

        updateRelative(selectedStartSecond, selectedEndSecond)
        updateRecordingTable(recordings)
        d3.select("#acceptBtn").style("display", "flex")

        brush.move(brushg, [selectedStartSecond, selectedEndSecond].map(range_x));

        // Hide any loading bars in the history table
        d3.select("#loading" + record.id).style("display", "none")
        setTimeout(function () { prepareForNext(false) }, 200)

        buildVarianceChart()

    }



}
export function bootLast() {
    // Downloads all recordings (should be for this user!), select the last viewed, and plot
    console.log("-> Downloading recordings from Firebase")
    loadingSpinner("loadingRecordings")
    getAllRecordings().then((snapshot) => {
        d3.select("#loadingRecordings").style("display", "none")
        recordings = []
        if (snapshot.length == 0) {
            console.error("No recordings in Firebase!")

        }
        else {
            snapshot.forEach((doc) => {
                var recording = doc.data()
                recording.id = doc.id
                recordings.push(recording)
            })
            if (recordings.length == 0) {
                console.error("User has no recordings yet!")
            }
            else {
                // Sort recordings by view time
                recordings = recordings.sort((a, b) => b.updatedTime - a.updatedTime)
                console.log("-----> Found " + recordings.length + " recordings")
                // Get last viewed and load it
                var sortedByView = recordings.filter(a => a.delete != true).sort((a, b) => b.updatedTime - a.updatedTime)
                if (sortedByView.length > 0) {
                    var lastrecord = sortedByView[0]
                    record = lastrecord
                    loadRecordData(lastrecord)
                    updateRecordingTable()
                }
                else console.error("---> User's recordings can't be sorted?")

            }

        }


    })
}
function loadRecordData(selectedRecord) {
    d3.select("#loading" + selectedRecord.id).style("display", "flex")
    record = selectedRecord
    console.log("Loading record: " + record.filename)
    selectedStartSecond = selectedRecord.startSecond
    selectedStartSecond = selectedRecord.endSecond
    if (selectedRecord.averaged != null) {
        state.data.averaged = selectedRecord.averaged
        workingData = null
        validate()
    }
    else {
        getRecordingById(record.filename, function (savedData) {
            if (savedData == null) {
                console.error("--> Can't find record in IndexDB, checking on Firebase storage")
                getRecordingFromStorage(record.filename)
            }
            else {
                state.data.averaged = savedData.data
                record.averaged = savedData.data
                workingData = null
                validate()
            }


        })
    }

}
function buildValidationChart() {
    // Purpose: use the slider to select a different starting minute, all values are recalculated to be a % of the first value
    // Does not change original data - once user decides on a starting minute, the values from that minute will be stored as a starting vector


    var start = workingData[0].seconds
    var end = workingData.slice(-1)[0].seconds

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

    // Moment Variance SVG
    buildMomentVarianceChart(div)



    // Graph SVG
    graphSVG = div.append("svg")
        .attr("id", "validate_svg")
        .attr("width", (width - (2 * margin)) + "px")
        .style("margin", margin + "px")
        .attr("height", (height - (2 * margin)) + "px")

    graphSVG.append("rect")
        .attr("width", (width - (2 * margin)) + "px")
        .attr("height", (height - (2 * margin)) + "px")
        .attr("fill", chartBackground);



    // Limit svg.the data to this averaged-amount
    var d = clone(workingData)
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
        .range([height - (2 * margin), 0])

    dataLines = clone(dataLinesOriginal)
    graphSVG.selectAll(".line")
        .data(dataLines)
        .enter()
        .append("path")
        .attr("class", "line")
        .on("click", function (d) { console.log(d) })
        .attr("fill", "none")
        .attr("stroke", function (d, i) { return colors[i] })
        .attr("stroke-width", 3)

    updateValidChart(dataLines)

    var sliderdiv = div.append("div").style("width", "400px")
    setupTimeRange(sliderdiv, workingData)





}
function updateValidChart(data) {
    graphSVG.selectAll(".line")
        .data(data)
        .attr("d", function (d, i) {
            // Build the line - smooth it by taking every N rows

            return line(d)
        })


}
function updateRelative(newStartSecond, newEndSecond) {
    // Takes the second that user has selected for the chart to "start" from
    var newMax = minRatio
    var newMin = -1 * minRatio
    selectedStartSecond = newStartSecond
    selectedEndSecond = newEndSecond

    // Move the vertical line showing where it starts
    d3.select("#varLine")
        .attr("x1", x(selectedStartSecond))
        .attr("x2", x(selectedStartSecond))

    // Filter data to new range
    dataLines = dataLinesOriginal.map(l => {
        var filtered = l.filter(e => e.seconds > selectedStartSecond && e.y10 != null && e.seconds < selectedEndSecond)
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
        .range([height - (2 * margin), 0])



    updateValidChart(dataLines)
    updateRatioGraphs()
}
function buildMomentVarianceChart(div) {

    yV = d3.scaleLog()
        .domain([0.01, 100])
        .range([height - margin, margin])

    lineV = d3.line()
        .x(function (d, i) { return x(d.seconds); })
        .y(function (d, i) { return yV(d.momentVariance) })
        .defined(((d, i) => !isNaN(d.momentVariance)))
        .curve(d3.curveMonotoneX) // apply smoothing to the line

    momentVarSVG = div.append("svg")
        .attr("id", "momentvar_svg")
        .attr("width", (width - (2 * margin)) + "px")
        .style("margin", margin + "px")
        .attr("height", (height - (2 * margin)) + "px")

    momentVarSVG.append("rect")
        .attr("width", (width - (2 * margin)) + "px")
        .attr("height", (height - (2 * margin)) + "px")
        .attr("fill", chartBackground);

    momentVarSVG.selectAll(".line").data([workingData])
        .enter()
        .append("path")
        .attr("class", "line")
        .attr("fill", "none")
        .attr("stroke", "black")
        .attr("stroke-width", 3)
        .attr("d", function (d) { return lineV(d) })
    momentVarSVG.append("line")
        .attr("id", "varLine")
        .attr("x1", x(0))
        .attr("x2", x(0))
        .attr("y1", yV(0.01) - 10)
        .attr("y2", yV(100))
        .attr("stroke", "black")
        .attr("stroke-width", 2)



}
function buildVarianceChart() {

    var yVar = d3.scaleLinear()
        .domain([-1000, 3000])
        .range([height - margin, margin])

    var lineVar = d3.line()
        .x(function (d, i) { return x(d.seconds); })
        .y(function (d, i) { return yVar(d.variance) })
        .defined(((d, i) => !isNaN(d.variance)))
        .curve(d3.curveMonotoneX) // apply smoothing to the line

    var svg = d3.select("#variance_svg")
    svg.selectAll("*").remove()

    var data = channels.map(channel => {
        return state.data.averaged.map(d => {
            return { seconds: d.seconds, variance: d[channel + "_variance_avg" + 10] }
        })
    })

    svg.append("rect")
        .attr("width", (width - (2 * margin)) + "px")
        .attr("height", (height - (2 * margin)) + "px")
        .attr("fill", chartBackground);


    svg.selectAll(".line").data(data)
        .enter()
        .append("path")
        .attr("class", "line")
        .attr("fill", "none")
        .attr("stroke", "black")
        .attr("stroke-width", 2)
        .style("opacity", 0.5)
        .attr("d", function (d) { return lineVar(d) })


}

function buildRatioCharts() {
    // Graph SVG

    svgR = d3.select("#ratio_graph")

    svgR.append("rect")
        .attr("fill", chartBackground)
        .attr("width", (width - (2 * margin)) + "px")
        .attr("height", (height - (2 * margin)) + "px")

    lineR = d3.line()
        .x(function (d, i) { return x(d.seconds); })
        .y(function (d, i) { return yR(d.ratio) })
        .defined(((d, i) => !isNaN(d.ratio)))
        .curve(d3.curveMonotoneX) // apply smoothing to the line
    updateRatioGraphs()




}
function buildSidebar() {
    var div = d3.select("#rightsidebar")
        .style("width", sidebarWidth + "px")
        .style("height", (window.innerHeight - navHeight) + "px")
        .style("background", "#666666")
        .style("display", "flex")
        .style("flex-direction", "column")
        .style("justify-content", "space-between")

    var topDiv = div.append("div")
    // Browse

    var btndiv = topDiv.append("div")
        .style("display", "flex")
        .style("margin", margin + "px")
    buildBrowseFile(btndiv, "UPLOAD", 80, "grey", "black", "t1")

    // Saved Recordings
    var recordingsDiv = topDiv.append("div")
    recordingsDiv.append("div").style("display", "none").attr("id", "loadingRecordings")
    recordingsDiv.append("table").attr("id", "recordingTable")

    div
        .append("div").style("margin", "10px")
        .append("button").text("Delete All")
        .on("click", function () {
            deleteAllrecordings().then(() => {
                console.log("DELETED ALL RECORDS")
                recordings.forEach(r => {
                    if (r.delete == false) {
                        r.delete = true
                        updateRecording(r)
                    }


                }
                )
                updateRecordingTable()


            })
        })
    div
        .append("div").style("margin", "10px")
        .append("button").text("Delete All (PERMANENT)")
        .on("click", function () {
            deleteAllrecordings().then(() => {
                console.log("DELETED ALL RECORDS")
                recordings.forEach(r => {

                    deleteRecordingFirebase(r, true)
                    deleteFromStorage(r.filename)

                }
                )
                recordings = []
                updateRecordingTable()


            })
        })


}
export function updateRecordingTable() {

    //var nonDeletedEntries = recordings.filter(e => e.delete != true)

    var table = d3.select("#recordingTable")
        .style("margin", "10px")
        .style("border-collapse", "separate")
        .style("border-spacing", "0 5px")

    var d = table.selectAll('tr').data(recordings)

    d.style("background", function (d) {
        if (d.id == record.id) return "green"
        else return "none"
    })

    d.exit().remove()
    // Update style of existing rows
    d.style("opacity", function (d) {
        if (d.delete == true) return 0.5
        else return 1
    })
        .style("display", function (d) {
            if (d.delete == true) return "none"
            else return "table-row"
        })
    var row = d.enter()
        .append("tr")
        .style("font-size", "16px")
        .style("max-height", "20px")
        .style("overflow", "hidden")
        .attr("id", function (d) { return "row" + d.id })
        .attr("class", "recordrow")
        .style("cursor", "pointer")
        .style("display", function (d) {
            if (d.delete == true) return "none"
            else return "table-row"
        })
        .style("opacity", function (d) {
            if (d.delete == true) return 0.5
            else return 1
        })
        .style("background", function (d) {
            if (d.filename == record.filename) {
                return "green"
            }
            else return "none"
        })
        .on("click", function (event, d) {

            d3.selectAll(".recordrow").style("background", "none")
            d3.select("#row" + d.id)
                .style("background", "green")
                .style("opacity", 1)
            setTimeout(function () { loadRecordData(d) }, 80)



        })
        .on("mouseover", function (i, d) {
            var newcolor = "black"
            if (d.id == record.id) {
                newcolor = "darkgreen"
            }

            d3.select(this).style("background", newcolor).style("color", "white")
        })
        .on("mouseout", function (i, d) {
            var newcolor = "none"
            if (d.id == record.id) newcolor = "green"
            d3.select(this).style("background", newcolor).style("color", "black")
        })

    // Date
    row
        .append("td")
        .style("border-top-left-radius", "5px")
        .style("border-bottom-left-radius", "5px")
        .style("border", "1px solid " + textColor)
        .append("div")
        .style("margin-left", "5px")
        .style("margin-right", "5px")
        .style("color", textColor)

        .text(function (recording) {
            return formatDate(recording.timestamp)
        })

        // User
    row
        .append("td")
        .style("border-left-style", "none")
        .style("margin", "5px")
        .style("border", "1px solid " + textColor)
        .append("div")
        .style("margin-left", "5px")
        .style("margin-right", "5px")
        .style("color", textColor)
        .text(function (recording) {
            return recording.user
        })

    // Label
    row
        .append("td")
        .style("border-left-style", "none")
        .style("margin", "5px")
        .style("border", "1px solid " + textColor)
        .append("div")
        .style("margin-left", "5px")
        .style("margin-right", "5px")
        .style("color", textColor)
        .text(function (recording) {
            if (recording.label.length < 16)
            {
                return recording.label
            }
            else
            {
                return recording.label.substring(0, 14) + "..."
            }
                        
        })

    // Delete Button
    row.append("td")
        .style("border-top-right-radius", "5px")
        .style("border-bottom-right-radius", "5px")
        .style("border", "1px solid " + textColor)
        .style("margin", "5px")
        .append("div")
        .style("margin-left", "5px")
        .style("margin-right", "5px")
        .text("✖")
        .style("opacity", 0.7)
        .style("color", "red")
        .on("click", function (event, d) {
            event.stopPropagation()
            console.log("removing: " + d.id)
            var row = d3.select("#row" + d.id)
            row.style("display", "none")
            row.style("opacity", 0.5)
            deleteRecording(d.filename, function () {
                console.log("------> Deleted!")
                deleteRecordingFirebase(d, false).then(() => {
                    console.log("-----------> Deleted from Firebase (not permanent)")
                })
            })


        })
    row.append("td")
        .append("div")
        .attr("id", function (d) { return "loading" + d.id })
        .text("...")
        .style("display", "none")


}
function updateRatioGraphs() {

    var svg = d3.select("#ratio_graph")

    // Create a new dataset where each band value (like Gamma_TP10) has been converted into a % of the first value, then take ratios

    var filteredRaw = workingData.filter(e => e.seconds >= selectedStartSecond)
    var firstEntry = filteredRaw[0]
    var ratioData = ratios.map(ratio => {
        return filteredRaw.map(entry => {

            var relativeVal1 = entry[ratio[0] + "_avg60"] / firstEntry[ratio[0] + "_avg60"]
            var relativeVal2 = entry[ratio[1] + "_avg60"] / firstEntry[ratio[1] + "_avg60"]
            var ratioValue = Math.log(relativeVal1 / relativeVal2)
            return {
                seconds: entry.seconds,
                ratio: ratioValue

            }
        })
    })

    var d = svg.selectAll(".line")
        .data(ratioData)

    d.enter()
        .append("path")
        .attr("class", "line")
        .attr("fill", "none")
        .attr("stroke", function (d, i) { return ratioColors[i] })
        .attr("stroke-width", 3)
        .attr("d", function (d) { return lineR(d) })
    d
        .attr("d", function (d) {

            return lineR(d)
        })
}
function buildPage() {
    d3.select("#nav").style("margin", "5px")
    d3.select("body").style("background", "grey")

    d3.select("#main-container").style("display", "flex")
        .style("flex-direction", "column")

    d3.select("#subcontainer").style("display", "flex")
        .style("flex-direction", "row")



    buildSidebar()

    d3.select("#bodydiv")
        .style("display", "flex")
        .style("flex-direction", "column")

    d3.select("#charts")
        .style("display", "flex")
        .style("flex-direction", "row")

    d3.select("#relative").style("border", "1px solid black")
    d3.select("#ratios").style("border", "1px solid black")


    // Charts
    d3.select("#relative")
        .style("margin", margin + "px")
        .style("width", width + "px")
        .style("height", chartContainerHeight + "px")

    var ratios = d3.select("#ratios")
        .style("margin", margin + "px")
        .style("width", width + "px")
        .style("height", chartContainerHeight + "px")

    ratios.append("svg").attr("id", "ratio_graph")
        .attr("width", (width - (2 * margin)) + "px")
        .style("margin", margin + "px")
        .attr("height", height + "px")

    ratios.append("svg").attr("id", "variance_svg")
        .attr("width", (width - (2 * margin)) + "px")
        .style("margin", margin + "px")
        .attr("height", height + "px")



    // Options
    buildOptions()






}
function buildOptions() {
    var div = d3.select("#options")

    div
        .style("display", "flex")
        .style("flex-direction", "row")
        .style("margin", margin + "px")

    div.append("button")
        .text("Save CSV")
        .style("margin", "5px")
        .on("click", function () {
            var avgS = prompt("Average?")
            var avg = parseInt(avgS)
            var parts = getEveryNth(state.data.validated_short, avg / 2)
            console.log("parts:")
            console.log(parts)

            var simpleParts = []
            parts.forEach(part => {
                var simplePart = {}
                simplePart.seconds = part.seconds
                channels.forEach(channel => {
                    bands.forEach(band => {

                        var key = band + "_" + channel + "_avg" + avg + "_relative"
                        simplePart[key] = part[key]

                    })

                })
                
                simpleParts.push(simplePart)
            })
            saveCSV(simpleParts, record.filename )



        })


}
function prepareForNext(update = true) {
    console.log("---- COMPILING RELATIVE DATA ----")


    // Create a new dataset from the raw dataset which starts at the selected time, and definitely has values for the avg60 values
    var filteredData = clone(state.data.averaged.filter(row => row.seconds >= selectedStartSecond && row.avg60 == true && row.seconds <= selectedEndSecond))
    var firstRow = filteredData[0]

    record.startSecond = selectedStartSecond
    record.endSecond = selectedEndSecond
    updateRecording(record)

    // Convert all band powers to percentages of the first value
    var validated = []
    for (let i = 1; i < filteredData.length; i++) {
        var fullrow = filteredData[i]
        var row = (({ seconds, timestamp }) => ({ seconds, timestamp }))(fullrow)
        var avgs = [10, 60]
 
        channels.forEach(channel => {
            bands.forEach(band => {
                
                avgs.forEach(avg => {
                    var key = band + "_" + channel + "_avg" + avg
                    var change_x = avg
                    if (fullrow[key] != null) {

                        var absolute = fullrow[key]
                        var relative = Math.round(1000 * fullrow[key] / firstRow[key]) / 1000
                        var change = null
                        if (i - avg > 0) {
                            change = Math.round(1000 * (fullrow[key] - filteredData[i - avg][key])) / 1000
                        }
                        row[key + "_absolute"] = absolute
                        row[key + "_relative"] = relative
                        row[key + "_change"] = change
                        row["changeSeconds"] = change_x
                        row["startSecond"] = record.startSecond
                    }

                })

            })
        })

        validated.push(row)
    }
    state.data.validated_short = clone(validated)
    state.data.validated = clone(validated)

    rebuildChart()


}
function brushed() {

    var range = d3.brushSelection(this)
        .map(range_x.invert);

    var low = round(range[0])
    var high = round(range[1])
    state["timestamp_low"] = low
    state["timestamp_high"] = high

    record.startSecond = low
    record.endSecond = high
    updateRelative(low, high)

}

function brushend() {
    // Called when user stops moving the timeslider
    if (record.startSecond != lastStartSecond || record.endSecond != lastEndSecond) {
        lastStartSecond = record.startSecond
        lastEndSecond = record.endSecond
        prepareForNext(false)
    }
}

function setupTimeRange(div, data) {
    range_width = width
    var min = data[0].seconds
    var max = data[data.length - 1].seconds
    let margin = 10
    state["timestamp_low"] = min
    state["timestamp_high"] = max

    div.selectAll("*").remove()
    var svg = div.append("svg")
        .style("opacity", 0.7)
        .style("height", "25px")
        .style("margin-left", margin + "px")
        .style("width", (width - (2 * margin)) + "px")


    range_x = d3.scaleLinear()
        .domain([min, max])
        .range([margin, range_width - (2 * margin)]);

    brush = d3.brushX()
        .handleSize(20)
        .extent([[0, 0], [range_width - (2 * margin) - 10, 20]])
        .on("brush", brushed)
        .on("end", brushend)

    brushg = svg.append("g")
        .attr("class", "brush")
        .call(brush)


    let rangeSVG = svg.append("g")
        .attr("id", "range-svg-id")
        .attr("transform", "translate(" + margin + ",0)")

    rangeSVG
        .call(d3.axisBottom()
            .tickFormat(function (d) {
                if (d == 0) return ""
                else return parseInt(d / 60)
            })

            .scale(range_x)
            .ticks(5));


    //brush.move(brushg, [selectedStartSecond, selectedEndSecond].map(range_x));

    svg.selectAll(".selection")
        .style("stroke", "none")
    svg.selectAll(".handle")
        .style("fill", "black")
        .style("opacity", 0.3)
        .on("mouseover", function (d) {
            d3.select(this).style("cursor", "ew-resize");
        })

        .on("mouseout", function (d) {
            d3.select(this).style("cursor", "default");
        })

}

export default function Validate() {

    useEffect(() => {
        buildPage()
        console.log("calling validate")
        setTimeout(function () {
            if (record != null && workingData != null) {
                validate()

            }
        }, 100)

    })


    return (
        <div id="main-container">

            <NavBarCustom />
            <div id="subcontainer">
                <div id="rightsidebar"> </div>
                <div id="bodydiv">
                    <div id="charts">
                        <div id="relative"></div>
                        <div id="ratios"></div></div>
                    <div id="options"></div>

                </div>

            </div>
        </div>

    );
}
