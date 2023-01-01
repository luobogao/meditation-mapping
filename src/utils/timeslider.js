import { parsePx } from "./functions"
import { state } from "../pages/live";
import { sliderBottom } from 'd3-simple-slider';
const d3 = require("d3");

export function buildTimeslider() {
    var svg = d3.select("#timeslider")
    svg.selectAll("*").remove()


    var width = parsePx(svg.attr("width"))
    var data = state.raw
    var minSeconds = data[0].seconds
    var maxSeconds = data.slice(-1)[0].seconds
    var totalSeconds = maxSeconds - minSeconds

    const slider = sliderBottom().min(0).max(totalSeconds).step(10).width(width)
        .on("drag", val => {

            d3.selectAll(".userpoints")
                .style("opacity", function (d) {
                    var percent = val / totalSeconds
                    var diff = Math.abs(d.moment.percent - percent)
                    var inverse = 100 - Math.pow(diff * 100, 2)
                    if (inverse < 0) inverse = 0
                    return inverse / 100
                })

        })

    const g = svg.call(slider)


}