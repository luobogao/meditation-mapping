import React, { useState, useEffect } from "react";
import { clone } from "../utils/functions";
import { login, eegdata, addMarker, getAllMarkers, auth, buildAuthContainer } from "../utils/database";
import { ZoomTransform } from "d3";
const d3 = require("d3");

const testing = true
var tabVisibile = true

const fontFamily = "Roboto, sans-serif"

const eegInterval = 500 // Milliseconds to wait before querying next eeg data (should match the android app)
var recording = true
var d = new Date()
var lastActivity = d.getTime() // If user doesn't engage with page for a while, data is stopped

const userTimeout = 1000 * 60 * 60

// Export
var averageEEGseconds = 10 // Number of seconds to average the raw EEG export 

// Muse constants
const channelsMuse = ["tp10", "tp9", "af7", "af8"]
const bandsMuse = ["delta", "theta", "alpha", "beta", "gamma"]

// Status
var eegStatus = true  // Set to true when data from realtimedb seems to be live, set to false when last timestamp is old
var androidStatus = false
var museConnected = false
var dataGood = false
var deactiveOpacity = 0.3
const iconSize = 50

// Timers
var lastGoodData = 0
var lastAudioPlay = 0

// Theme
var theme = "light"
var backgroundLight = "lightgrey"
var backgroundDark = "#3F3F3F"

// Gamepad
var gp;
var minTimeClick = 1000 // Minimum time between clicks
var vibratingTime = 0

// EEG data from Realtime database
var lastEEGdata = null // last data, as copied from 'database' page
var lastEEGtime = 0
var eegChartDelay = 2
var eegDataRecord = [] // All data recorded
export var eegRecordStandard = [] // Data saved with a standard format that the rest of the website can use
//var eegLineIds = ["tp10_gamma_normal", "tp9_gamma_normal", "af7_gamma_normal", "af8_gamma_normal"]
var eegLineIds = ["tp10_gamma", "tp9_gamma", "af7_gamma", "af8_gamma"]


// Markers
var markers = []
var tagOffset = 0
var tagTextOffset = 20

// Gamepad settings
var gamepadInterval = null  // Holds the interval which watches for gamepad button presses
var foundGamepad = false
var tagDelay = 2    // Move the tags back this many seconds (otherwise they don't appear immediately)

// Button Bar Chart
const textSize = 22
const barChartHeight = 120

// Live Chart
var graphInterval = null

// Variance Chart
var maxVariance = 2000
var varianceBarWidth = 15
var varianceChartHeight = 80
var varianceChartMargin = 3
var varianceChartWidth = 120
var varianceX = d3.scaleBand()
    .padding(1)
    .domain([0, 1, 2, 3])
    .range([varianceChartMargin, varianceChartWidth - varianceChartMargin])
var varianceY = d3.scaleLog()
    .domain([1, 10000])
    .range([varianceChartHeight - varianceChartMargin, varianceChartMargin])

// Acceleration Chart
var accelerationChartWidth = 80
var accelerationChartHeight = 80
var accelerationY = d3.scaleLog()
    .domain([1, 1000])
    .range([varianceChartHeight - 5, 5])

// Time Series
const timeseriesMargin = 10
const timeseriesHeight = 300
const timeseriesWidth = (window.innerWidth / 2)

// Gamepad settings
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
        8: "START",
        9: "STOP",
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
    "EXPANDED": "purple",
    "BEGINNING PHENOMENON": "green",
    "END PHENOMENON": "red",
    "NEUTRAL": "blue"
}
var museModels =
    [
        { id: "MU_02", name: "Muse 2016" },
        { id: "MU_05", name: "Muse S" }

    ]

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
    .domain([0.01, 10])
    .range([timeseriesHeight, timeseriesMargin])

var eegLine = d3.line()
    .x(function (d, i) { return circleX(d[0]); })
    .y(function (d, i) { return eegY(d[1]); })
    .defined(((d, i) => d[2]))
    .curve(d3.curveMonotoneX) // apply smoothing to the line

var recordingStatus = 0
export function startRecording() {


    if (recordingStatus == 0) {
        recordingStatus = 1
    }
    else if (recordingStatus == 1) {
        recordingStatus = 2
        console.log("STARTING RECORDING")
    }
    else {
        recordEEG()
    }

}

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
function startGraphInterval() {
    graphInterval = setInterval(function () {
        var lastRecord = eegDataRecord.slice(-1)[0]
        if (lastRecord != null) {
            var lastTime = lastRecord.timestamp
            var d = new Date()
            var now = d.getTime()
            var timeDiff = (now - lastTime) / 1000
            if (timeDiff > 2) {

                lostApp()
            }
            else {
                foundApp()

            }
        }
        rescaleTimeseries()
    }, 100)
}
function clickedGamepadButton(id) {

    if (graphInterval == null) {
        startGraphInterval()
    }
    if (museConnected == true && dataGood == false) {
        console.error("Can't log - Bad Data")
    }
    else {
        var date = new Date()
        var millis = date.getTime()
        lastActivity = millis

        var mode = d3.select("#mode-select").property("value")
        var code = buttonMap[id]
        var name = buttonMapOut[mode][code]
        var color = buttonColors[name]

        if (name == "START") 
        {
            resetRecord()
        }

        btn_history.push({ timestamp: millis, id: id, value: id, tag: name, color: color })


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

        // Check if the user has come back to page after a long time - if yes, reset any existing data
        if (buttonTimeSeries.length > 0) {
            var lastMillis = buttonTimeSeries.slice(-1)[0].timestamp
            var timeDiff_btn = millis - lastMillis
            var timeDiff_start = millis - timestart
            if (timeDiff_btn > (1000 * 60 * 30) || timeDiff_start > (1000 * 60 * 60 * 4)) {
                resetRecord()
            }

        }
        // Add a new timeseries entry
        var adjustedTimestamp = millis - (1000 * tagDelay) // Subtract some seconds for two reasons: 1) Adjust for user reaction, 2) the SVG cuts of last few seconds
        var newClick = { timestamp: adjustedTimestamp, button: name, color: color }
        buttonTimeSeries.push(newClick)

        // Update chart
        updateTimeSeries(buttonTimeSeries)

        var marker = { vector: eegdata, marker: name, user: auth.currentUser.uid }
        markers.push(marker)
        if (museConnected == true) {

            if (dataGood == true) {
                var p = addMarker(eegdata, name)
                p.then((doc) => {
                    console.log("Logged marker")

                }
                )
            }

        }

    }


}
function updateMuseStatus() {
    if (androidStatus == false) {
        d3.select("#muse_status_svg").style("opacity", deactiveOpacity)
    }
    else {

        d3.select("#muse_status_svg").style("opacity", 1)
        d3.select("#muse_status_android")
            .attr("fill", function () {

                if (androidStatus == true) {

                    return "green"
                }
                else return "none"
            })
        d3.select("#muse_status_muse")
            .attr("fill", function () {

                if (androidStatus == true && museConnected == true) {

                    return "green"
                }
                else return "none"
            })
        d3.select("#muse_status_data")
            .attr("fill", function () {

                if (androidStatus == true && museConnected == true && dataGood == true) {

                    return "green"
                }
                else return "none"
            })
    }

}
function updateTimeSeries(timeseries) {
    var svg = d3.select("#timechartsvg")
    if (timeseries == null || timeseries.length == 0) {
        svg.selectAll(".tag").remove()
    }
    else {
        var d = svg.selectAll(".circle")
            .data(timeseries)


        d.enter().append("circle")
            .attr("class", "circle tag")
            .attr("cx", function (d, i) { return circleX(d.timestamp) })
            .attr("cy", tagOffset)
            .attr("r", "10")
            .attr("fill", function (d) { return d.color })

        d.enter().append("text")
            .attr("class", "text tag")
            .style("font-size", "14px")
            .text(function (d) { return d.button })
            .attr("x", 0)
            .attr("y", 0)
            .attr("transform", function (d, i) {
                return "translate(" + circleX(d.timestamp) + ", " + (tagOffset + tagTextOffset) + "), rotate(-45)"
            })
            .style("text-anchor", "end")
    }

}
function saveCSV() {

    var stringOut = ""
    // EEG + Tags
    if (eegDataRecord.length > 30) {
        console.log("Saving EEG + Tags")
        stringOut = "data:text/csv;charset=utf-8,timestamp,af7_alpha,af7_beta,af7_delta,af7_gamma,af7_theta,af8_alpha,af8_beta,af8_delta,af8_gamma,af8_theta,tp10_alpha,tp10_beta,tp10_delta,tp10_gamma,tp10_theta,tp9_alpha,tp9_beta,tp9_delta,tp9_gamma,tp9_theta,af7_variance,af8_variance,tp9_variance,tp10_variance,tag\r\n"

        var keys = [
            "timestamp",
            "af7_alpha",
            "af7_beta",
            "af7_delta",
            "af7_gamma",
            "af7_theta",

            "af8_alpha",
            "af8_beta",
            "af8_delta",
            "af8_gamma",
            "af8_theta",

            "tp10_alpha",
            "tp10_beta",
            "tp10_delta",
            "tp10_gamma",
            "tp10_theta",

            "tp9_alpha",
            "tp9_beta",
            "tp9_delta",
            "tp9_gamma",
            "tp9_theta",

            "af7_variance",
            "af8_variance",
            "tp9_variance",
            "tp10_variance",

            "tag"

        ]
        var badDataTags = [

            "af7_variance",
            "af8_variance",
            "tp9_variance",
            "tp10_variance",

            "tag"]

        var buttonTimestampsUsed = []
        var step = Math.round(averageEEGseconds / 2)
        for (let i = 0; i < eegDataRecord.length - step - 1; i += step) {
            var entry = eegDataRecord[i]
            var averageEntry = {}
            var timestamp = entry.timestamp
            averageEntry.timestamp = timestamp

            // Iterate over this average-N sized sublist and average all entries

            let bands = bandsMuse.concat(["variance"])
            channelsMuse.forEach(channel => {
                bands.forEach(band => {
                    let key = channel + "_" + band
                    let valueArr = []
                    for (let s = 0; s < step; s += 1) {
                        var entry2 = eegDataRecord[i + s]
                        if (entry2.valid == true) {

                            let value = entry2[key]

                            valueArr.push(value)
                        }

                    }
                    if (valueArr.length > (step * 0.8)) {
                        var avg = d3.mean(valueArr)
                        if (band == "variance") {
                            avg = d3.max(valueArr)
                        }
                        averageEntry[key] = avg
                    }
                    else {
                        // There is bad data in the last N points, skipping
                        entry.valid = false
                    }

                })
            })

            // Find any matching buttons
            var btn_matches = btn_history.filter(btn => btn.timestamp >= timestamp && btn.timestamp < timestamp + (1000 * step))
            var tag = ""
            if (btn_matches.length >= 1) {
                var button = btn_matches[0]
                if (!buttonTimestampsUsed.includes(button.timestamp)) {
                    tag = button.tag
                    console.log("found btn: " + tag)
                    buttonTimestampsUsed.push(button.timestamp)

                }

            }
            entry.tag = tag
            averageEntry.tag = tag

            var csvString = ""
            if (entry.valid == false) {
                csvString = timestamp + ",,,,,,,,,,,,,,,,,,,,,"
                badDataTags.forEach(key => {
                    csvString = csvString + entry[key] + ","
                })
            }
            else {
                keys.forEach(key => {
                    csvString = csvString + averageEntry[key] + ","
                })

            }

            csvString += "\r\n"
            stringOut += csvString
        }
    }
    else if (buttonTimeSeries.length > 0) {
        console.log("Saving Tags only")
        stringOut = "data:text/csv;charset=utf-8,timestamp,button,color\r\n"
        buttonTimeSeries.forEach(row => {
            stringOut += row.timestamp + "," + row.button + "," + row.color + "\r\n"
        })
    }
    else {
        window.alert("No Data!")
    }
    if (stringOut.length > 10) {
        var encodeduri = encodeURI(stringOut)
        window.open(encodeduri)
    }


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
            .attr("class", "text")
            .attr("y", function (d, i) { return barY(i) + 20 })
            .attr("x", 20)
            .text(function (d) { return d[0] })

        d.enter().append("text")
            .attr("class", "text num")
            .attr("y", function (d, i) { return barY(i) + 20 })
            .attr("x", function (d, i) { return barWidth(d[1]) + 210 })
            .text(function (d) { return d[1] })
    }


}
function modifyEEG(entry) {
    // Takes a json directly from firebase post, then adds some data like ratios

    var normal = {}
    normal["TimeStamp"] = entry.timestamp
    normal.acceleration = entry.total_acceleration
    if (entry != null && entry.valid == true) {

        channelsMuse.forEach(channel => {
            var totalPower = d3.sum(bandsMuse.map(band => Math.pow(10, entry[channel + "_" + band])))
            bandsMuse.forEach(band => {
                var key = channel + "_" + band

                var normalValue = Math.pow(10, entry[key]) / totalPower
                entry[key + "_normal"] = normalValue

                var dividedByDelta = Math.pow(10, entry[key] / Math.pow(10, entry[channel + "_delta"]))
                entry[key + "_delta"] = dividedByDelta


                var bandStandard = band.charAt(0).toUpperCase() + band.slice(1)
                var channelStandard = channel.toUpperCase()
                var keyStandard = channelStandard + "_" + bandStandard
                normal[keyStandard] = parseFloat(entry[key].toFixed(4))

            })

        })
    }

    eegRecordStandard.push(normal)
    return entry

}
function updateVarianceGraph(data) {

    var svg = d3.select("#variance_svg")


    // Bar charts showing variance of each Muse electrode
    var variances = [data.tp9_variance, data.af7_variance, data.af8_variance, data.tp10_variance]

    if (variances.some((value) => isNaN(value)) || museConnected == false) {
        svg.style("display", "none")

    }
    else {

        svg.style("display", "flex")

        variances = variances.map(v => {
            if (v > 10000) return 1000
            else if (v < 10) return 10
            else return v
        })

        var d = svg.selectAll(".bar").data(variances)

        d.enter()
            .append("rect")
            .attr("class", "bar")
            .attr("width", varianceBarWidth + "px")
            .attr("y", function (d) { return varianceY(d) })
            .attr("x", function (d, i) { return varianceX(i) })

        d.enter()
            .append("text")
            .style("font-size", "12px")
            .text(function (d, i) { return ["TP9", "AF7", "AF8", "TP10"][i] })
            .attr("x", function (d, i) { return varianceX(i) - 5 })
            .attr("y", varianceChartHeight - 5)

        d.transition()
            .style("fill", function (d) {
                if (d < 101) return "darkgreen"
                else if (d < maxVariance) return "green"
                else if (d < 1000) return "orange"
                else return "red"
            })
            .attr("y", function (d, i) {

                return varianceY(d)

            })
            .attr("height", function (d, i) {
                var height = varianceChartHeight - varianceY(d) - varianceChartMargin - 15
                return height
            })
            .duration(eegInterval)
            .ease(d3.easeLinear)


    }

}
function updateAccelerationGraph(data) {
    var svg = d3.select("#acceleration_svg")
    svg.style("display", "flex")
    var d = svg.selectAll(".bar").data([data])
    
    d.enter()
        .append("rect")
        .attr("class", "bar")
        .attr("width", "20px")
        .attr("y", function (d) { return accelerationY(10) - 15})
        .attr("fill", "red")
        .attr("x", "20px")

    d.enter().append("text").text("MOTION")
    .style("font-size", "12px")
    .attr("x", "7px")
    .attr("y", accelerationChartHeight - 5)

    d.transition()
        .attr("y", function (d, i) {
            var acc = d.total_acceleration
            if (acc < 10 ) acc = 10
            var h = accelerationY(acc) - 15
            
            return h
        })
        .attr("height", function (d, i) {
            var acc = d.total_acceleration
            if (acc < 10 ) acc = 10
            
            return accelerationY(1) - accelerationY(acc)
            
        })
        .attr("fill", function(d)
        {
            var acc = d.total_acceleration
            if (acc < 10) acc = 10
            if (acc < 30) return "green"
            else if (acc < 100) return "orange"
            else return "red"
        })
        .duration(eegInterval)
        .ease(d3.easeLinear)

}
function rescaleTimeseries() {

    // Move the graph every second
    var svg = d3.select("#timechartsvg")

    var date = new Date()
    var millis = date.getTime()

    // Choose new range to view - scroll the time
    timeend = millis - (1000 * eegChartDelay) // Offset 
    timestart = timeend - (1000 * 30)
    
    // TODO: use zero for interval if this is first data
    var thisInterval = eegInterval
    
    // Make an new axis with the new time range
    circleX = d3.scaleLinear()
        .domain([timestart, timeend])
        .range([50, timeseriesWidth])

    svg.selectAll(".circle")
        .transition()
        .attr("cx", function (d, i) { return circleX(d.timestamp) })
        .ease(d3.easeLinear)
        .duration(thisInterval)

    svg.selectAll(".eeg")
        .transition()
        .attr("cx", function (d, i) { return circleX(d.timestamp) })
        .ease(d3.easeLinear)
        .duration(thisInterval)


    svg.selectAll(".text")
        .transition()
        .attr("transform", function (d, i) {
            return "translate(" + circleX(d.timestamp) + ", " + (tagOffset + tagTextOffset) + "), rotate(-45)"
        })
        .ease(d3.easeLinear)
        .duration(thisInterval)

    for (let id in eegLineIds) {
        var key = eegLineIds[id]
        var data = eegDataRecord.filter(row => row.timestamp > (millis - (1000 * 60 * 10))).map(row => [row.timestamp, row[key], row.valid])

        svg.select("#" + key)
            .transition()
            .attr("d", function (d) { return eegLine(data) })
            .ease(d3.easeLinear)
            .duration(thisInterval)

    }

}
function stopListeners() {

    if (recording != false) {

        clearInterval(gamepadInterval)
        recording = false
        console.log("USER TIMEOUT")

        var res = window.confirm("Restart?")
        if (res == true) {
            watchGamepad()
            resetRecord()
            var d = new Date()
            lastActivity = d.getTime()
        }

    }


}
function lostApp() {
    if (androidStatus == true) {
        console.error("Lost connection to Android App")
        androidStatus = false
        eegStatus = false // flag so that console isn't flooded with messages
        androidStatus = false
        museConnected = false
        // Called when lost connection to android app
        d3.select("#muse_status_android").style("fill", "none")
        d3.select("#muse_status_muse").style("fill", "none")
        d3.select("#muse_status_data").style("fill", "none")

        d3.select("#eegicon").style("opacity", deactiveOpacity)
        d3.select("#variance_svg").style("display", "none")
        d3.select("#eegicon_text").text("Waiting for Muse...").style("opacity", deactiveOpacity).style("color", "black")
    }

}
function foundApp() {
    if (androidStatus == false) {
        androidStatus = true
        d3.select("#muse_status_android").style("fill", "green")
        d3.select("#muse_status_muse").style("fill", "none")
        d3.select("#muse_status_data").style("fill", "none")
        d3.select("#muse_status_svg").style("display", "flex")
        d3.select("#variance_svg").style("display", "flex")
        d3.select("#eegicon").style("opacity", 1)
    }

}
function recordEEG() {

    if (eegdata != null) {
        if (graphInterval == null) {
            startGraphInterval()
        }
        var date = new Date()
        var millis = date.getTime()
        var timeDiff = millis - eegdata.timestamp

        // Stop the EEG listening if there hasn't been any updates in a while
        if ((millis - lastActivity) > (1000 * userTimeout)) {
            stopListeners()
        }


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

        else {

            if (lastEEGdata == null) {
                console.log("First eeg data")
                lastEEGdata = clone(eegdata)
                lastEEGdata.android_connected = true
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
                    console.log("Last timestamp was the same")

                    if (eegStatus == true) {



                        if (timeDiff > (1000 * 2.1)) {


                            lostApp()
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

                    foundApp()

                    if (lastEEGdata.muse_connected == true) {

                        museConnected = true
                    }
                    else museConnected = false

                }

            }


        }
        lastEEGdata.valid = true
        if (androidStatus == true) {


            if (museConnected == true) {

                lastActivity = millis
                d3.select("#muse_status_muse").style("fill", "green")

                // Check variance

                if (lastEEGdata.tp10_variance > maxVariance ||
                    lastEEGdata.tp9_variance > maxVariance ||
                    lastEEGdata.af7_variance > maxVariance ||
                    lastEEGdata.af8_variance > maxVariance
                ) {
                    d3.select("#eegicon_text").text("BAD DATA").style("opacity", 1).style("color", "red")
                    d3.select("#muse_status_data").style("fill", "red")
                    dataGood = false
                    if (testing == false) {
                        lastEEGdata.valid = false
                    }


                    vibrateGamepad()
                    if ((millis - lastGoodData) > (1000 * 6)) {
                        d3.select("#eegicon_text").text("PLEASE ADJUST HEADBAND").style("opacity", 1).style("color", "red")
                        playWarning()
                    }
                }
                else {
                    d3.select("#eegicon_text").text("MUSE DATA GOOD").style("opacity", 1).style("color", "black")
                    d3.select("#muse_status_data").style("fill", "green")
                    d3.select("#eegicon_text").text("MUSE STREAMING").style("opacity", 1).style("color", "black")
                    lastGoodData = millis
                    dataGood = true
                }

            }
            else {

                d3.select("#muse_status_muse").style("fill", "none")
                d3.select("#muse_status_data").style("fill", "none")
                d3.select("#eegicon_text").text("SCANNING FOR MUSE").style("opacity", 1).style("color", "black")


            }

        }
        else {
            lostApp()
        }

        lastEEGdata = modifyEEG(lastEEGdata)
        eegDataRecord.push(lastEEGdata)
        updateVarianceGraph(lastEEGdata)
        updateAccelerationGraph(lastEEGdata)


    }
    // Bad data
    else {

        if (eegStatus == true) {
            console.log("No live EEG data")
            eegStatus = false
            lastEEGdata = {}
            lastEEGdata.muse_connected = false
            lastEEGdata.android_connected = false
            lastEEGdata.valid = false
            d3.select("#eegicon").style("opacity", deactiveOpacity)
            d3.select("#eegicon_text").text("Waiting for Muse...").style("opacity", 0.5)
        }

    }
    updateMuseStatus()




}
function setupEEGgraph() {
    var svg = d3.select("#timechartsvg")

    svg.selectAll(".eegline").data(eegLineIds)
        .enter().append('path').attr("id", function (d) { return d })
        .attr("class", "eegline")
        .attr("fill", "none")
        .attr("stroke", function (d, i) {
            if (i == 0) return "red"
            else if (i == 1) return "blue"
            else if (i == 2) return "green"
            else return "black"
        })
        .attr("stroke-width", 5)

}
function playWarning() {
    var d = new Date()
    var millis = d.getTime()
    var timeSince = millis - lastAudioPlay
    if (timeSince > (1000 * 10)) {
        //var audio = new Audio('https://media.geeksforgeeks.org/wp-content/uploads/20190531135120/beep.mp3');
        //audio.play();
        //lastAudioPlay = millis
    }

}
function vibrateGamepad() {
    // Not yet implemented in browsers
}
function watchGamepad() {
    clearInterval(gamepadInterval)
    gamepadInterval = setInterval(function () {

        // ===> Get a fresh GamepadList! <===

        var date = new Date()
        var millis = date.getTime()

        // Stop the EEG listening if there hasn't been any updates in a while
        if ((millis - lastActivity) > userTimeout) {

            stopListeners()
        }

        gp = navigator.getGamepads()[0];
        if (gp != null) {
            for (var b = 0; b < button_count; b++) {
                var button = gp.buttons[b]
                var isPressed = button.pressed;
                if (isPressed) {


                    if (last_btn != b || (millis - last_btn_time) > minTimeClick) {
                        last_btn_time = millis
                        last_btn = b

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

                            last_axes_time = millis
                            last_axes = id
                            clickedGamepadButton(id)
                        }

                    }

                }

            }


        }

    }, 20)
}
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
function buildMuseStatus(museRow) {
    museRow.append("td").append("img")
        .attr('width', iconSize)
        .attr("id", "eegicon")
        .style('opacity', deactiveOpacity)
        .attr('height', iconSize)
        .attr("alt", "")
        .attr("src", "eeg_icon.svg")

    museRow.append('td')
        .append("div")
        .attr("id", "eegicon_text")
        .attr("class", "text")
        .text("Waiting for Muse...")
        .style("opacity", deactiveOpacity)

    museRow.append('td')
        .append('svg')
        .attr("id", "muse_status_svg")
        .style("opacity", deactiveOpacity)
        .style("display", "none")

    var svg = d3.select("#muse_status_svg")
        .attr("width", '300px')
        .attr("height", '60px')

    // Android App
    svg.append("circle")
        .attr("cx", "70")
        .attr("cy", "40")
        .attr("r", "10")
        .attr("fill", "none")
        .attr("stroke", "black")
        .attr("id", "muse_status_android")

    svg.append("text").text("App")
        .attr("class", "text")
        .attr("x", "52px")
        .attr("y", "15px")

    // Muse Connected
    svg.append("circle")
        .attr("cx", "150")
        .attr("cy", "40")
        .attr("stroke", "black")
        .attr("r", "10")
        .attr("fill", "none")
        .attr("id", "muse_status_muse")

    svg.append("text").text("Muse")
        .attr("class", "text")
        .attr("x", "125px")
        .attr("y", "15px")


    // Data Good
    svg.append("circle")
        .attr("cx", "230")
        .attr("cy", "40")
        .attr("stroke", "black")
        .attr("r", "10")
        .attr("fill", "none")
        .attr("id", "muse_status_data")

    svg.append("text").text("Data")
        .attr("class", "text")
        .attr("x", "210px")
        .attr("y", "15px")

    museRow.append('td')
        .attr("width", varianceChartWidth)
        .append('svg')
        .attr("id", "variance_svg")
        .attr("height", varianceChartHeight)
        .attr("width", varianceChartWidth)
        .style("display", "none")
        .style("opacity", 1)

    museRow.append('td')
        .append('svg')
        .attr("id", "acceleration_svg")
        .attr("width", accelerationChartWidth)
        .attr("height", accelerationChartHeight)
        .style("display", "flex")
        .style("opacity", 1)

}
function buildLiveUsersRow(div) {
    div.style("display", "flex")
        .style("align-items", "center")
        .style("min-height", "60px")
    div.append("text").text("Users Online Now:").style("display", "none").attr("id", "usersOnlineText")
    var table = div.append("table").append("tr").attr("id", "liveUsersRow")
}
export function resetRecord() {
    buttonTimeSeries = []
    buttonClickCounts = {}
    eegDataRecord = []


    pushNotice("Resetting...")
    updateBarChart(null)
    updateTimeSeries(null)

}
function buildIndicators(div) {
    var table = div.append('table')
    var gamepadRow = table.append("tr")
    var museRow = table.append("tr")
    var liveUsersRow = div.append("div")

    
    gamepadRow
        .append("td")
        .append("img")
        .attr('width', iconSize)
        .attr("id", "gamepadicon")
        .style('opacity', deactiveOpacity)
        .attr('height', iconSize)
        .attr("alt", "")
        .attr("src", "gamepad_icon.svg")

    gamepadRow.append('td')
        .style("min-width", "300px")
        .append("div")
        .attr("id", "gamepadtext")
        .attr("class", "text")
        .text("Waiting for gamepad...")
        .style("opacity", deactiveOpacity)

    var selectorDiv = gamepadRow.append("td")
        .append("div")
        .attr("id", "gamepadModeSelector")
        .style("display", "none")

    buildModeSelector(selectorDiv)


    buildMuseStatus(museRow)
    buildLiveUsersRow(liveUsersRow)
}

function buildPage() {

    d3.select("#root").style("height", window.innerHeight + "px")
    var header = d3.select("#header")
        .style("height", "50px")
        .style("display", "flex")
        .style("justify-content", "space-between")

    var container = d3.select("#charts")

    container.style("margin", "20px")

    header.append("h1")
        .style("margin", "10px")
        .attr("class", "text")
        .text("Live Recording")
    var options = header.append("div").style("margin", "20px")
    header.append("div")
        .style("display", "flex")
        .style("align-items", "center")
        .style('font-size', "35px")
        .style("margin-right", "10px")
        .style("min-width", "30px")
        .style("cursor", "pointer")
        .style("margin", "20px")
        .attr("id", "theme_toggle").text("☼")
        .on("click", function () {
            if (theme == "light") {
                theme = "dark"
                d3.select(this).text("🌙")
                    .style('font-size', "20px")
                d3.selectAll("div").style("background", backgroundDark)
                d3.selectAll(".text").style("color", "#dcdccc")
            }
            else {
                theme = "light"

                d3.select(this).text("☼")
                    .style('font-size', "35px")
                d3.selectAll("div").style("background", backgroundLight)
                d3.selectAll(".text").style("color", "black")

            }

        })



    var indicators = container.append("div")


    buildIndicators(indicators)
    var charts = container.append("div").attr("id", "allcharts")
    .style("display", "flex")

    // BAR CHART
    charts.append("svg")
    .style("border", "1px solid black")
        .attr("id", "barchartsvg")
        .attr("width", varianceChartWidth + "px")
        .attr("height", varianceChartHeight + "px")


    // TIMESERIES
    charts.append("svg")
    .style("border", "1px solid black")
        .attr("width", timeseriesWidth)
        .attr("height", timeseriesHeight)
        .append("g")
        .attr("id", "timechartsvg")
        .attr("width", timeseriesWidth - (2 * timeseriesMargin))
        .attr("height", timeseriesHeight - (2 * timeseriesMargin))
        .attr("transform", "translate(" + timeseriesMargin + ", " + timeseriesMargin + ")")


    options.append("button")
        .text("Save CSV")
        .style("font-size", textSize + "px")
        .on("click", function () {
            saveCSV()
        })


    options.append("button")
        .style("margin-left", "30px")
        .text("Reset")
        .style("font-size", textSize + "px")
        .on("click", function () {
            resetRecord()
        })

    options.append("button")
        .text("Sign In")
        .style("margin-left", "100px")
        .attr("class", "signin")
        .style("font-size", textSize + "px")
        .on("click", function () {

            login()
        })


    buildAuthContainer(d3.select("#main-container"))

    setupEEGgraph()
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

        if (gamepadInterval == null) {
            watchGamepad()
        }

    });

    // Set theme
    d3.selectAll("div").style("background", backgroundLight)

    // Download existing markers
    getAllMarkers().then((snapshot) => {

        snapshot.forEach((doc) => {
            var marker = doc.data()
            markers.push(marker)
        })
    })

    // Detect when user tabs away
    document.addEventListener("visibilitychange", function () {

        if (document.hidden) {
            console.log("HIDDEN")
            tabVisibile = false

            clearInterval(gamepadInterval)
        }
        else {
            console.log("RETURNED")
            tabVisibile = true

            watchGamepad()

        }
    });





}

export default function Record() {
    useEffect(() => {
        buildPage()

    }, [])


    return (
        <div id="main-container">
            <div id="header"></div>
            <div id="charts"></div>
            <div id="options"></div>
        </div>

    );
};

