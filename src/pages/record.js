import React, { useState, useEffect } from "react";
const d3 = require("d3");

const fontFamily = "Roboto, sans-serif"
var minTimeClick = 1000 // Minimum time between clicks
const textSize = 22
const barChartHeight = 300
const timeChartHeight = 200
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

var maxBarX = 10
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
    .range([50, 900])

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
        var timeDiff = millis - lastMillis
        if (timeDiff > (1000 * 60 * 30)) {
            resetGamepadRecord()
        }
    
    }
    // Add a new timeseries entry
    var newClick = { millis: millis, button: name, color: color }
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

        var lastTime = timeseries.slice(-1)[0].millis




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

        if (lastTime > (timeend - (1000 * 10))) {
            console.log("Scaling timeseries chart")
            timeend = lastTime + (1000 * 30)
            circleX = d3.scaleLinear()
                .domain([timestart, timeend])
                .range([50, 900])

            svg.selectAll(".circle")
                .transition()
                .attr("cx", function (d, i) { return circleX(d.millis) })
                .duration(500)

            svg.selectAll(".text")
                .transition()
                .attr("transform", function (d, i) {
                    return "translate(" + circleX(d.millis) + ", " + 50 + "), rotate(-45)"
                })
                .duration(500)

        }




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
window.addEventListener("gamepadconnected", function (e) {
    var gp = navigator.getGamepads()[e.gamepad.index];
    pushNotice("Found Gamepad!")
    button_count = gp.buttons.length
    axes_count = gp.axes.length

    var message = "A " + gp.id + " was successfully detected! There are a total of " + gp.buttons.length + " buttons and " + axes_count + " axes"

    console.log(message)


    setInterval(function () {

        // ===> Get a fresh GamepadList! <===
        var gp = navigator.getGamepads()[e.gamepad.index];

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

    }, 20)
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
    var date = new Date()
    timestart = date.getTime() - (1000 * 1)

    var timeend = timestart + (1000 * 31)
    circleX = d3.scaleLinear()
        .domain([timestart, timeend])
        .range([50, 900])

    d3.select("#timechartsvg").selectAll("*").remove()
    pushNotice("Resetting...")
    updateBarChart(null)
    updateTimeSeries(null)
}

function buildPage() {
    var container = d3.select("#charts")
    container.style("margin", "20px")
    buildModeSelector(container)
    container.append("svg")
        .attr("width", "1000px")
        .attr("height", barChartHeight + "px")
        .append("g")
        .attr("id", "barchartsvg")
        .attr("width", 1000 - 10)
        .attr("height", barChartHeight - 10)
        .attr("transform", "translate(10, 10)")

    container.append("svg")
        .attr("width", "1000px")
        .attr("height", timeChartHeight + "px")
        .append("g")
        .attr("id", "timechartsvg")
        .attr("width", 1000 - 10)
        .attr("height", timeChartHeight - 10)
        .attr("transform", "translate(10, 10)")

    var options = d3.select("#options").style("margin", "20px")

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
}

export default function Record() {
    useEffect(() => {
        buildPage()

    }, [])


    return (
        <div>
            <h1>
                Gamepad
            </h1>
            <div id="charts"></div>
            <div id="options"></div>
        </div>
    );
};

