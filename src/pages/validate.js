import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { notice } from "../utils/ui";
import { buildBrowseFile } from "../utils/load";
import { sliderBottom } from 'd3-simple-slider';
import { state } from "../index"
import { addRecording, currentRecording, deleteRecordingFirebase, setCurrentRecording, updateRecording } from "../utils/database";
import { datastate } from "../utils/load";
import { clone, formatDate, getEveryNth } from '../utils/functions';
import { bands, channels } from "../utils/muse"
import { rebuildChart } from "../utils/runmodel";
import MultiRangeSlider from "multi-range-slider-react";
import NavBarCustom from "../utils/navbar";
import { getLastSession, deleteRecording, addOrReplaceSession, deleteAllrecordings, getAllRecordings, getRecordingById } from "../utils/indexdb";
import { navHeight } from "../utils/ui"
import { updateGraphs } from "./clusters";
const d3 = require("d3");

//deleteAllSessions(function(){})

// data
export var record = null

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
var rawData = null

// Style
var textColor = "white"
var chartBackground = "lightgrey"
var selectedStartSecond = 0
const margin = 10
var sidebarWidth = 300
var width = ((window.innerWidth - sidebarWidth) / 2) - (margin * 4)
var height = (width / 2)

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




const sliderHeight = 50

export var cleanedData = null

export function showLoadingValidate() {
    notice("Loading...", "loading")
}
export function validate(recording) {

    record = recording

    console.log("RECORD:")
    console.timeLog(record)

    selectedStartSecond = recording.metadata.startSecond
    rawData = record.data
    workingData = getEveryNth(rawData.filter(e => e.avg60 == true), 10) // Remove the first few rows

    d3.selectAll(".loading").remove()
    buildValidationChart()
    buildRatioCharts()
    updateRecordingTable()
    updateRelative(selectedStartSecond)
    d3.select("#acceptBtn").style("display", "flex")

}
getLastSession(function (lastSession) {
    state.data = lastSession.data

    setCurrentRecording(lastSession.metadata)
    //selectedStartSecond = lastSession.recording.startSecond
    setTimeout(function () {
        validate(lastSession)
        updateGraphs()
    }, 2000)

})
function loadRecording(entry) {

    state.data = entry.data

    setCurrentRecording(entry.metadata)
    validate(entry)

}

function buildValidationChart(data) {
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

    const slider = sliderBottom().min(20).default(selectedStartSecond).max(300).ticks(10).step(1).width(width - (4 * margin));
    // Slider SVG
    var svg = div.append("svg")
        .attr("width", width + "px")
        .attr("height", sliderHeight + "px")
        .style("margin", margin + "px")
        .append('g')
        .attr("transform", "translate(" + margin + "," + margin + ")")

    // https://www.npmjs.com/package/d3-simple-slider
    svg.call(slider)
    slider.on("end", function (d) { prepareForNext() })
    slider.on("onchange", function (second) {

        updateRelative(second)
    })


    prepareForNext(false) // Default to zero in case user just wants to move immediately to map


}

// Update chart - called each time graph needs to be changed
function updateValidChart(data) {
    graphSVG.selectAll(".line")
        .data(data)
        .attr("d", function (d, i) {
            // Build the line - smooth it by taking every N rows

            return line(d)
        })


}
function updateRelative(newSecond) {
    // Takes the second that user has selected for the chart to "start" from
    var newMax = minRatio
    var newMin = -1 * minRatio
    selectedStartSecond = newSecond

    d3.select("#varLine")
        .attr("x1", x(selectedStartSecond))
        .attr("x2", x(selectedStartSecond))

    dataLines = dataLinesOriginal.map(l => {
        var filtered = l.filter(e => e.seconds > selectedStartSecond && e.y10 != null)
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
function buildRatioCharts() {
    // Graph SVG
    var div = d3.select("#ratios")
    div.selectAll("*").remove()
    svgR = div.append("svg")
        .attr("id", "ratioSVG")
        .attr("width", (width - (2 * margin)) + "px")
        .style("margin", margin + "px")
        .attr("height", (height - (2 * margin)) + "px")

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
    topDiv.append("div").append("table").attr("id", "recordingTable")

    updateRecordingTable()

    div
        .append("div").style("margin", "10px")
        .append("button").text("Delete All")
        .on("click", function () {
            deleteAllrecordings().then(() => {
                console.log("DELETED ALL RECORDS")
                updateRecordingTable()
            })
        })


}
function updateRecordingTable() {
    var table = d3.select("#recordingTable")
        .style("margin", "10px")
        .style("border-collapse", "separate")
        .style("border-spacing", "0 5px")

    getAllRecordings().then(entries => {

        var d = table.selectAll('tr').data(entries)

        d.style("background", function (d) {
            if (d.id == record.id) return "green"
            else return "none"
        })

        d.exit().remove()
        var row = d.enter()
            .append("tr")
            .attr("id", function (d) { return "row" + d.id })
            .attr("class", "recordrow")
            .style("cursor", "pointer")
            .on("click", function (event, d) {
                d3.selectAll(".recordrow").style("background", "none")
                d3.select("#row" + d.id).style("background", "green")
                setTimeout(function () { loadRecording(d) }, 80)


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
                return recording.metadata.user
            })
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
                row.remove()
                deleteRecording(d.id, function () {
                    console.log("------> Deleted!")
                    deleteRecordingFirebase(d.metadata).then(() => {
                        console.log("-----------> Deleted from Firebase!")
                    })
                })


            })





    }).catch(error => {

    })

}
function updateRatioGraphs() {
    var svg = d3.select("#ratioSVG")

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
        .style("flex-direction", "row")

    d3.select("#relative").style("border", "1px solid black")
    d3.select("#ratios").style("border", "1px solid black")


    // Charts
    d3.select("#relative")
        .style("margin", margin + "px")
        .style("width", width + "px")
        .style("height", (height * 2) + "px")

    d3.select("#ratios")
        .style("margin", margin + "px")
        .style("width", width + "px")
        .style("height", (height * 2) + "px")






}

function prepareForNext(update = true) {

    // Create a new dataset from the raw dataset which starts at the selected time, and definitely has values for the avg60 values
    var filteredData = clone(rawData.filter(row => row.seconds >= selectedStartSecond && row.avg60 == true))
    var firstRow = filteredData[0]

    record.metadata.startSecond = selectedStartSecond

    console.log("Updating: " + record.metadata.id)
    updateRecording(record.metadata).then(() => {
        //console.log("UPDATED FIREBASE")
        addOrReplaceSession(record, function () {

            updateRecordingTable()
        })

    })
        .catch((error) => {
            console.error("Doc does not exist yet!")
            addRecording(record.metadata)
                .then((doc) => {
                    console.log("----> Added recording: " + doc.id)
                    record.metadata.id = doc.id
                    addOrReplaceSession(record, function () {

                        updateRecordingTable()
                    })
                })
        })




    // Convert all band powers to percentages of the first value
    filteredData.forEach(row => {
        channels.forEach(channel => {
            bands.forEach(band => {
                var avgs = [1, 10, 60]
                avgs.forEach(avg => {
                    var key = band + "_" + channel + "_avg" + avg

                    if (row[key] != null) {
                        var newVal = Math.round(1000 * row[key] / firstRow[key]) / 1000
                        row[key] = newVal
                    }

                })

            })
        })
    })



    cleanedData = filteredData
    state.data = cleanedData


    rebuildChart({ autoClusters: true, updateCharts: false })

}

function handleStorage(event) {
    console.log("----> STORAGE EVENT")
    if (event.key == "waypoints-updated") {
        console.error("WAYPOINTS UPDATED")
    }
}
window.addEventListener("storage", handleStorage)
export default function Validate() {


    const [minValue, set_minValue] = useState(25);
    const [maxValue, set_maxValue] = useState(75);
    const handleInput = (e) => {
        set_minValue(e.minValue);
        set_maxValue(e.maxValue);
        console.log(e)
    };

    useEffect(() => {
        buildPage()


    }, [])
    useEffect(() => {
        setTimeout(function () {
            if (workingData != null) {

                buildValidationChart()
                buildRatioCharts()

            }
        }, 100)

    })


    return (
        <div id="main-container">

            <NavBarCustom />
            <div id="subcontainer">
                <div id="rightsidebar"> </div>
                <div id="bodydiv">
                    <div id="relative">
                        <MultiRangeSlider
                            min={0}
                            max={100}
                            step={1}
                            minValue={minValue}
                            maxValue={maxValue}
                            onInput={(e) => {
                                handleInput(e);
                            }}
                        />
                    </div>
                    <div id="ratios"></div>
                </div>

            </div>
        </div>

    );
};
