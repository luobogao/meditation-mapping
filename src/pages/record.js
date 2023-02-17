import React, { useState, useEffect } from "react";
import { clone } from "../utils/functions";
import { eegdata } from "../utils/database";
import { ZoomTransform } from "d3";
const d3 = require("d3");

const fontFamily = "Roboto, sans-serif"

const eegInterval = 500 // Milliseconds to wait before querying next eeg data (should match the android app)

// EEG data from Realtime database
var lastEEGdata = null // last data, as copied from 'database' page
var eegChartDelay = 2
var eegDataRecord = [] // All data recorded
var eegStatus = true  // Set to true when data from realtimedb seems to be live, set to false when last timestamp is old
var eegLineIds = ["tp10_gamma", "tp9_gamma", "af7_gamma", "af8_gamma"]

// Gamepad settings
var foundGamepad = false
var tagDelay = 2    // Move the tags back this many seconds (otherwise they don't appear immediately)

// Variance Chart
var varianceChartHeight = 200
var varianceChartWidth = 200
var varianceX = d3.scaleBand()
    .padding(1)
    .domain([0, 1, 2, 3])
    .range([10, varianceChartWidth - 20])

var maxVariance = 300
var varianceY = d3.scaleLog()
    .domain([1, 10000])
    .range([varianceChartHeight - 20, 5])



var minTimeClick = 1000 // Minimum time between clicks
const textSize = 22
const barChartHeight = 120
const timeseriesHeight = 300
const timeseriesWidth = 900
var buttonClickCounts = {}
var buttonTimeSeries = []
var button_count = 0
var axes_count = 0
var last_btn = 0
var last_axes = 0
var last_axes_time = 0
var btn_history = []
var last_btn_time = 0

var buttonMap = {
    "0": 0,
    "1": 1,
    "2": 2,
    "3": 3,
    "4": 4,
    "5": 5,
    "0 2 1": 6,
    "0 5 1": 7,
    "6": 8,
    "7": 9,
    "1 0 -1": 10,
    "1 1 -1": 10,
    "1 0 1": 10,
    "1 1 1": 10,
    "2 4 -1": 11,
    "2 3 1": 11,
    "2 4 1": 11,
    "2 3 -1": 11,
    "3 7 -1": 12,
    "3 7 1": 13,
    "3 6 -1": 14,
    "3 6 1": 15
}
var buttonMapOut =
{
    "INSIGHT": {
        0: "THINKING",
        1: "HEARING",
        2: "FEELING",
        3: "SEEING",
        4: "TASTE",
        5: "SMELLING",
        6: "DON’T KNOW",
        7: "ONOMATOPOEIA",
        8: "POSITIVE",
        9: "NEGATIVE",
        10: "JHANAS",
        11: "ÑANAS",
        12: "CONTRACTED",
        13: "EXPANDED",
        14: "BEGINNING PHENOMENON",
        15: "END PHENOMENON",
        16: "NEUTRAL"
    },
    "CONCENTRATION":
    {
        0: "SUKKHA",
        1: "CONTENTMENT",
        2: "PITI",
        3: "EQUANIMITY",
        4: "DISTRACTION",
        5: "TORPOR",
        6: "TRANSITION",
        7: "ABSORPTION",
        8: "POSITIVE",
        9: "NEGATIVE",
        10: "JHANAS",
        11: "NIMITTAS",
        12: "PERIPHERAL",
        13: "SPREAD",
        14: "CENTRALIZED",
        15: "360 DEGREES",
        16: "NEURAL"
    },
    "BODY":
    {
        0: "TORSO",
        1: "HANDS AND ARMS",
        2: "HEAD",
        3: "BELLY",
        4: "APNEA FULL",
        5: "APNEA EMPTY",
        6: "BREATH IN",
        7: "BREATH OUT",
        8: "WAIST",
        9: "LEGS AND FOOT",
        10: "HEATED",
        11: "COLD",
        12: "TENSE",
        13: "HEAVY",
        14: "RELAXED",
        15: "LIGHT",
        16: "COUNT"
    }
}
var buttonColors =
{
    "THINKING": "blue",
    "HEARING": "red",
    "FEELING": "orange",
    "SEEING": "green",
    "TASTE": "purple",
    "SMELLING": "yellow",
    "DON’T KNOW": "black",
    "ONOMATOPOEIA": "pink",
    "POSITIVE": "green",
    "NEGATIVE": "red",
    "JHANAS": "blue",
    "ÑANAS": "darkblue",
    "CONTRACTED": "red",
    "EXPANDED": "pu.duration(500)rple",
    "BEGINNING PHENOMENON": "green",
    "END PHENOMENON": "red",
    "NEUTRAL": "blue"
}

var maxBarXdefault = 10
var maxBarX = maxBarXdefault
var barWidth = d3.scaleLinear()
    .range([0, 400])
    .domain([0, maxBarX])


var barY = d3.scaleLinear()
    .range([0, 400])
    .domain([0, 20])


var date = new Date()
var timestart = date.getTime() // Timeseries chart starts at time when user opens page
var initialDuration = 30       // How many seconds to start out with
var timeend = timestart + (1000 * initialDuration)

var circleX = d3.scaleLinear()
    .domain([timestart, timeend])
    .range([50, timeseriesWidth])

// EEG data
var eegY = d3.scaleLog()
    .domain([0.01, 100])
    .range([timeseriesHeight, 10])

var eegLine = d3.line()
    .x(function (d, i) { return circleX(d[0]); })
    .y(function (d, i) { return eegY(d[1]); })
    .defined(((d, i) => d[2]))
    .curve(d3.curveMonotoneX) // apply smoothing to the line



function pushNotice(message) {
    var div = d3.select('#charts')
        .append("div")
        .attr("id", "notice")
        .style("position", "absolute")
        .style("top", "50%")
        .style("left", "50%")
        .style("margin", "-50px 0 0 -50px")
        .text(message)
        .style("font-size", textSize + "px")

    div.transition()
        .style('opacity', 0)
        .duration(2000)
}

function clickedGamepadButton(id) {
    var code = buttonMap[id]
    var mode = d3.select("#mode-select").property("value")
    var name = buttonMapOut[mode][code]
    var color = buttonColors[name]

    if (foundGamepad == false) {
        foundGamepad = true
        name = "Start"
        code = ""

    }
    else {

    }

    // Add +1 to the total count for this button name
    if (buttonClickCounts[name] != null) {
        buttonClickCounts[name] = buttonClickCounts[name] + 1
    }
    else {
        buttonClickCounts[name] = 1
    }

    // Bar Chart
    var btns = Object.entries(buttonClickCounts)
    updateBarChart(btns)

    // Time Series
    var date = new Date()
    var millis = date.getTime()

    // Check if the user has come back to page after a long time - if yes, reset any existing data
    if (buttonTimeSeries.length > 0) {
        var lastMillis = buttonTimeSeries.slice(-1)[0].millis
        var timeDiff_btn = millis - lastMillis
        var timeDiff_start = millis - timestart
        if (timeDiff_btn > (1000 * 60 * 30) || timeDiff_start > (1000 * 60 * 60 * 4)) {
            resetGamepadRecord()
        }

    }
    // Add a new timeseries entry
    var adjustedTimestamp = millis - (1000 * tagDelay) // Subtract some seconds for two reasons: 1) Adjust for user reaction, 2) the SVG cuts of last few seconds
    var newClick = { millis: adjustedTimestamp, button: name, color: color }
    buttonTimeSeries.push(newClick)

    // Update chart
    updateTimeSeries(buttonTimeSeries)


}
function updateTimeSeries(timeseries) {
    var svg = d3.select("#timechartsvg")
    if (timeseries == null || timeseries.length == 0) {
        svg.selectAll("*").remove()
    }
    else {
        var d = svg.selectAll(".circle")
            .data(timeseries)

        d.enter().append("circle")
            .attr("class", "circle")
            .attr("cx", function (d, i) { return circleX(d.millis) })
            .attr("cy", 30)
            .attr("r", "10")
            .attr("fill", function (d) { return d.color })

        d.enter().append("text")
            .attr("class", "text")
            .style("font-size", "14px")
            .text(function (d) { return d.button })
            .attr("x", 0)
            .attr("y", 0)
            .attr("transform", function (d, i) {
                return "translate(" + circleX(d.millis) + ", " + 50 + "), rotate(-45)"
            })
            .style("text-anchor", "end")
    }

}
function saveGamepadCSV(history) {
    var string = "data:text/csv;charset=utf-8,timestampGamepad,button\r\n"
    history.forEach(entry => {
        string = string + entry.millis + "," + entry.button + "\r\n"
    })

    var encodeduri = encodeURI(string)
    window.open(encodeduri)
}
function updateBarChart(btns) {
    var svg = d3.select("#barchartsvg")
    if (btns == null) {
        svg.selectAll("*").remove()
        maxBarX = maxBarXdefault
    }
    else {
        var nums = svg.selectAll(".num")
            .data(btns)

        var newMaxX = d3.max(btns.map(e => e[1]))

        var d = svg.selectAll(".bar")
            .data(btns)

        // Clicks are out of bounds - rescale chart
        if (newMaxX > (maxBarX * 0.75)) {
            maxBarX = maxBarX * 1.33
            barWidth = d3.scaleLinear()
                .range([0, 400])
                .domain([0, maxBarX])

        }


        d.attr("width", function (d, i) { return barWidth(d[1]) })

        nums.attr("x", function (d, i) { return barWidth(d[1]) + 210 })
            .text(function (d) { return d[1] })

        d.enter()
            .append("rect")
            .attr("class", "bar")
            .attr("height", "18px")
            .attr("x", 200)
            .attr("width", function (d, i) { return barWidth(d[1]) })
            .attr("y", function (d, i) { return barY(i) + 3 })

        d.enter().append("text")
            .attr("y", function (d, i) { return barY(i) + 20 })
            .attr("x", 20)
            .text(function (d) { return d[0] })

        d.enter().append("text")
            .attr("class", "num")
            .attr("y", function (d, i) { return barY(i) + 20 })
            .attr("x", function (d, i) { return barWidth(d[1]) + 210 })
            .text(function (d) { return d[1] })
    }


}
function updateVarianceGraph(data) {
    var svg = d3.select("#variance_svg")
    // Bar charts showing variance of each Muse electrode
    var variances = [data.tp9_variance, data.af7_variance, data.af8_variance, data.tp10_variance]
    if (eegStatus == false) {
        svg.selectAll("*").remove()
    }
    else {

        var d = svg.selectAll(".bar").data(variances)
        d.enter()
            .append("rect")
            .attr("class", "bar")
            //.attr("width", varianceX.bandwidth())
            .attr("width", "30px")
            .attr("x", function (d, i) { return varianceX(i) })

        d.enter()
            .append("text")
            .text(function (d, i) { return ["TP9", "AF7", "AF8", "TP10"][i] })
            .attr("x", function (d, i) { return varianceX(i) })
            .attr("y", varianceChartHeight - 20)

        d.transition()
            .style("fill", function (d) {
                if (d < 101) return "darkgreen"
                else if (d < maxVariance) return "green"
                else if (d < 1000) return "orange"
                else return "red"
            })
            .attr("y", function (d) { return varianceY(d) })
            .attr("height", function (d, i) { return varianceChartHeight - varianceY(d) - 40 })
            .duration(eegInterval)
            .ease(d3.easeLinear)


    }




}
function rescaleTimeseries() {

    // Move the graph every second
    var svg = d3.select("#timechartsvg")

    var date = new Date()
    var millis = date.getTime()

    timeend = millis - (1000 * eegChartDelay) // Offset 
    timestart = timeend - (1000 * 30)
    circleX = d3.scaleLinear()
        .domain([timestart, timeend])
        .range([50, timeseriesWidth])

    svg.selectAll(".circle")
        .transition()
        .attr("cx", function (d, i) { return circleX(d.millis) })
        .ease(d3.easeLinear)
        .duration(eegInterval)

    svg.selectAll(".eeg")
        .transition()
        .attr("cx", function (d, i) { return circleX(d.timestamp) })
        .ease(d3.easeLinear)
        .duration(eegInterval)


    svg.selectAll(".text")
        .transition()
        .attr("transform", function (d, i) {
            return "translate(" + circleX(d.millis) + ", " + 50 + "), rotate(-45)"
        })
        .ease(d3.easeLinear)
        .duration(eegInterval)

    for (let id in eegLineIds) {
        var key = eegLineIds[id]
        var data = eegDataRecord.map(row => [row.timestamp, row[key], row.valid])
        
        svg.select("#" + key)
            .transition()
            .attr("d", function (d) { return eegLine(data) })
            .ease(d3.easeLinear)
            .duration(eegInterval)

    }

}

// Monitor EEG data
setInterval(function () { rescaleTimeseries() }, 100)

// Record EEG
setInterval(function () {

    if (eegdata != null) {
        var date = new Date()
        var millis = date.getTime()
        var timeDiff = millis - eegdata.timestamp

        if (lastEEGdata == null) {
            console.log("First eeg data: diff = " + timeDiff)
            lastEEGdata = clone(eegdata)
         

        }

        
        if (timeDiff > (1000 * 60)) {
            if (eegStatus == true) {
                console.error("--> EEG data is old (" + (timeDiff / 1000 / 60) + " minutes)")
                eegStatus = false
            }
        }
        else if (eegdata.muse_connected == false) {
            if (eegStatus == true) {
                console.error("-> Muse is disconnected")
                eegStatus = false
                lastEEGdata = clone(eegdata)
                
            }



        }
        else {

            if (lastEEGdata == null) {
                console.log("First eeg data")
                lastEEGdata = clone(eegdata)
                if (timeDiff > (1000 * 60)) {
                    eegStatus = false
                    console.log("EEG data is old")
                }
                else {
                    eegStatus = true
                }


            }
            else {



                // Data hasn't changed
                if (eegdata.timestamp == lastEEGdata.timestamp) {
                    if (eegStatus == true) {
                        console.log("Last timestamp was the same")


                        if (timeDiff > (1000 * 2.1)) {

                            eegStatus = false // flag so that console isn't flooded with messages
                            if (timeDiff > (1000 * 120)) {
                                console.log("----> Data is old (" + Math.round(timeDiff / 1000 / 60) + " minutes)")

                            }
                            else if (timeDiff > (1000 * 60 * 60 * 24)) {
                                console.log("----> Data is old (" + Math.round(timeDiff / 1000 / 60 / 60 / 24) + " days)")
                            }


                            else {
                                console.log("----> MUSE LOST - Data is old (" + Math.round(timeDiff / 1000) + " seconds)")

                            }

                        }
                    }

                }
                // Everything is good - record new datapoint
                else {
                    lastEEGdata = clone(eegdata)
                    
                    eegStatus = true
                    

                }

            }


        }

        if (eegStatus == true) {
            d3.select("#eegicon").style("opacity", 1)
            d3.select("#eegicon_text").text("Found: Muse").style("opacity", 1)
            if (lastEEGdata.tp10_variance > maxVariance ||
                lastEEGdata.tp9_variance > maxVariance ||
                lastEEGdata.af7_variance > maxVariance ||
                lastEEGdata.af8_variance > maxVariance
            ) {
                console.error("Variance too high!")
            }

        }
        else {
            d3.select("#eegicon").style("opacity", 0.2)
            d3.select("#eegicon_text").text("Waiting for Muse...").style("opacity", 0.5)
        }


        eegDataRecord.push(lastEEGdata)
        updateVarianceGraph(lastEEGdata)





    }
    else {

        if (eegStatus == true) {
            console.log("No live EEG data")
            eegStatus = false
            d3.select("#eegicon").style("opacity", 0.2)
            d3.select("#eegicon_text").text("Waiting for Muse...").style("opacity", 0.5)
        }

    }


}, eegInterval)

function setupEEGgraph() {
    var svg = d3.select("#timechartsvg")

    svg.selectAll(".eegline").data(eegLineIds)
        .enter().append('path').attr("id", function (d) { return d })
        .attr("class", "eegline")
        .attr("fill", "none")
        .attr("stroke", "black")
        .attr("stroke-width", 5)

}

window.addEventListener("gamepadconnected", function (e) {
    var gp = navigator.getGamepads()[e.gamepad.index];

    button_count = gp.buttons.length
    axes_count = gp.axes.length

    var message = "A " + gp.id + " was successfully detected! There are a total of " + gp.buttons.length + " buttons and " + axes_count + " axes"
    d3.select("#gamepadicon").style("opacity", 1)

    d3.select("#gamepadtext").text("Found: " + gp.id).style("opacity", 1)
        .transition()
        .style("opacity", 0)
        .duration(3000)

    d3.select("#gamepadModeSelector").style("display", "flex")


    setInterval(function () {

        // ===> Get a fresh GamepadList! <===
        var gp = navigator.getGamepads()[e.gamepad.index];
        if (gp != null) {
            for (var b = 0; b < button_count; b++) {
                var button = gp.buttons[b]
                var isPressed = button.pressed;
                if (isPressed) {

                    var date = new Date()

                    var millis = date.getTime()
                    if (last_btn != b || (millis - last_btn_time) > minTimeClick) {
                        last_btn_time = millis
                        last_btn = b
                        btn_history.push({ timestamp: millis, btn: b, value: button.value })
                        console.log("button: " + b)
                        clickedGamepadButton(b)

                    }
                }

            }
            for (var a = 0; a < axes_count; a++) {
                var axis = gp.axes[a]
                var pad = 0
                switch (a) {
                    case 0:
                        pad = 1;
                        break;

                    case 1:
                        pad = 1;
                        break;

                    case 3:
                        pad = 2;
                        break;

                    case 4:
                        pad = 2;
                        break;

                    case 6:
                        pad = 3;
                        break;

                    case 7:
                        pad = 3;
                        break;

                }

                if (Math.abs(axis) > 0.3) {



                    var dir = 0
                    if (axis > 0) dir = 1
                    else dir = -1

                    if (pad == 0 && (a == 2 || a == 5) && dir == -1) {

                    }
                    else {
                        var date = new Date()

                        var id = pad + " " + a + " " + dir

                        var millis = date.getTime()
                        if ((millis - last_axes_time) > minTimeClick) {
                            console.log("pad: " + pad + " " + a + " " + dir)
                            last_axes_time = millis
                            last_axes = id
                            clickedGamepadButton(id)
                        }

                    }

                }

            }


        }

    }, 20)
});

// Detect when user tabs away
var tabVisibile = true
document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
        console.log("HIDDEN")
        tabVisibile = false
    }
    else {
        console.log("RETURNED")
        tabVisibile = true
    }
});
function buildModeSelector(div) {
    let select = div.append("select")
        .style("display", "flex")
        .style("font-size", textSize + "px")
        .attr("id", "mode-select")
        .attr("font-family", fontFamily)
        .style("border-radius", "5px")
        .style("background", "#f0f0f0")
        .style("padding", "0px")

    var data = [
        { label: "Insight", key: "INSIGHT" },
        { label: "Concentration", key: "CONCENTRATION" },
        { label: "Body", key: "BODY" }]


    select.selectAll("opt")
        .data(data)
        .enter()
        .append("option")
        .text(function (d) { return d.label })
        .attr("value", function (d) { return d.key })
        .each(function (d, i) {

        })

    select.on("change", function (d) {
        var opt = d3.select(this).property("value")



    })

}
function resetGamepadRecord() {
    buttonTimeSeries = []
    buttonClickCounts = {}

    d3.select("#timechartsvg").selectAll("*").remove()
    pushNotice("Resetting...")
    updateBarChart(null)
    updateTimeSeries(null)
    
}
function buildIndicators(div) {
    var table = div.append('table')
    var gamepadRow = table.append("tr")
    var museRow = table.append("tr")

    gamepadRow
        .append("td")
        .append("img")
        .attr('width', 80)
        .attr("id", "gamepadicon")
        .style('opacity', 0.2)
        .attr('height', 80)
        .attr("alt", "")
        .attr("src", "gamepad_icon.svg")

    gamepadRow.append('td')
        .style("min-width", "400px")
        .append("div")
        .attr("id", "gamepadtext")
        .text("Waiting for gamepad...")
        .style("opacity", 0.5)

    var selectorDiv = gamepadRow.append("td")
        .append("div")
        .attr("id", "gamepadModeSelector")
        .style("display", "none")

    buildModeSelector(selectorDiv)

    museRow.append("td").append("img")
        .attr('width', 80)
        .attr("id", "eegicon")
        .style('opacity', 0.2)
        .attr('height', 80)
        .attr("alt", "")
        .attr("src", "eeg_icon.svg")

    museRow.append('td')
        .append("div")
        .attr("id", "eegicon_text")
        .text("Waiting for Muse...")
        .style("opacity", 0.5)
}

function buildPage() {
    var header = d3.select("#header").style("margin", "30px")
        .style("display", "flex")
        .style("justify-content", "space-between")
    var container = d3.select("#charts")
    container.style("margin", "20px")

    header.append("h1").text("Live Recording")
    var options = header.append("div").style("margin", "30px")

    var indicators = container.append("div")
    buildIndicators(indicators)

    // BAR CHART
    container.append("svg")
        .attr("width", "1000px")
        .attr("height", barChartHeight + "px")
        .append("g")
        .attr("id", "barchartsvg")
        .attr("width", 1000 - 10)
        .attr("height", barChartHeight - 10)
        .attr("transform", "translate(10, 10)")

    // Variance chart
    container.append("svg")
        .attr("width", varianceChartWidth + "px")
        .attr("height", varianceChartHeight + "px")
        .append("g")
        .attr("id", "variance_svg")
        .attr("width", varianceChartWidth - 2)
        .attr("height", varianceChartHeight - 2)
        .attr("transform", "translate(2, 2)")

    // TIMESERIES
    container.append("svg")
        .attr("width", timeseriesWidth + 20)
        .attr("height", timeseriesHeight + "px")
        .append("g")
        .attr("id", "timechartsvg")
        .attr("width", timeseriesWidth)
        .attr("height", timeseriesHeight - 10)
        .attr("transform", "translate(10, 10)")

    options.append("button")
        .text("Save CSV")
        .style("font-size", textSize + "px")
        .on("click", function () {
            saveGamepadCSV(buttonTimeSeries)
        })

    options.append("button")
        .style("margin-left", "30px")
        .text("Reset")
        .style("font-size", textSize + "px")
        .on("click", function () {
            resetGamepadRecord()
        })
    setupEEGgraph()
}

export default function Record() {
    useEffect(() => {
        buildPage()

    }, [])


    return (
        <div>
            <div id="header"></div>
            <div id="charts"></div>
            <div id="options"></div>
        </div>
    );
};

