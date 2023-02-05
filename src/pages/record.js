import React, { useState, useEffect } from "react";
const d3 = require("d3");

var buttonHistory = {}
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
    }
}
var x = d3.scaleLinear()
    .range([0, 400])
    .domain([0, 20])
    

var y = d3.scaleLinear()
    .range([0, 400])
    .domain([0, 20])
    

function clickedGamepadButton(id) {
    var code = buttonMap[id]
    var name = buttonMapOut["INSIGHT"][code]
    console.log(name)
    if (buttonHistory[name] != null) {
        buttonHistory[name] = buttonHistory[name] + 1
    }
    else {
        buttonHistory[name] = 1
    }

    var btns = Object.entries(buttonHistory)

    var d = d3.select("#barchartsvg").selectAll(".bar")
        .data(btns)

    var nums = d3.select("#barchartsvg").selectAll(".num")
        .data(btns)

    d.attr("width", function (d, i) { return x(d[1]) })

    nums.attr("x", function (d, i) { return x(d[1]) + 210})
    .text(function(d){return d[1]})

    d.enter()
        .append("rect")
        .attr("class", "bar")
        .attr("height", "18px")
        .attr("x", 200)
        .attr("width", function (d, i) { return x(d[1]) })
        .attr("y", function (d, i) { return y(i) + 3 })

    d.enter().append("text")
    .attr("y", function (d, i) { return y(i) + 20})
    .attr("x", 20)
    .text(function(d){return d[0]})

    d.enter().append("text")
    .attr("class", "num")
    .attr("y", function (d, i) { return y(i) + 20})
    .attr("x", function (d, i) { return x(d[1]) + 210 })
    .text(function(d){return d[1]})

}
window.addEventListener("gamepadconnected", function (e) {
    var gp = navigator.getGamepads()[e.gamepad.index];

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
                if (last_btn != b || (millis - last_btn_time) > 200) {
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
                    if ((millis - last_axes_time) > 200) {
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
function buildPage() {
    d3.select("#barchart").append("svg").attr("id", "barchartsvg")
        .attr("width", "1000px")
        .attr("height", "400px")
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
            <div id="barchart"></div>
        </div>
    );
};

