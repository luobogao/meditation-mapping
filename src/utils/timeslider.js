import { parsePx } from "./functions"
import { state } from "../index";
import { sliderBottom } from 'd3-simple-slider';
import { userOpacity, userSize } from "./3d_charts";
const d3 = require("d3");

export function buildTimeslider() {
    var svg = d3.select("#timeslider")
        
    if (svg.node() != null && state.data.validated != null) {
        
        svg.selectAll("*").remove()


        var width = parsePx(svg.attr("width"))
        var data = state.data.validated
        var minSeconds = data[0].seconds
        var maxSeconds = data.slice(-1)[0].seconds
        var totalSeconds = maxSeconds - minSeconds
        var margin = 30

        const slider = sliderBottom().min(0).max(totalSeconds)
            .tickFormat(function (d, i) {
                if (totalSeconds < (15 * 60)) {
                    return d
                }
                else {
                    return parseInt(d / 60)
                }

            })
            .step(10)
            .width(width - (2 * margin))
            .on("drag", second => {

                var percent = second / totalSeconds

                let userPoints = d3.selectAll(".userpoints")

                // Reset points
                if (percent < 0.01 || second < 5)
                {
                    userPoints.style("opacity", userOpacity)
                    userPoints.attr("r", userSize + "px")
                    return
                }

                userPoints
                    .style("opacity", function (d, i) {

                        var decay = 2
                        switch (state.resolution) {
                            case 1:
                                decay = 5;
                                break;
                            case 10:
                                decay = 4;
                                break;
                            case 60:
                                decay = 3;
                                break;
                        }

                        var diff = Math.abs(d.percent - percent)

                        var inverse = 100 - Math.pow(diff * 100, decay)
                        if (inverse < 0) inverse = 0
                        return inverse / 100
                    })
                    .attr("r", function (d) {

                        var decay = 2
                        switch (state.resolution) {
                            case 1:
                                decay = 5;
                                break;
                            case 10:
                                decay = 4;
                                break;
                            case 60:
                                decay = 3;
                                break;
                        }
                        decay = 5
                        var diff = Math.abs(d.percent - percent)
                        var inverse = 100 - Math.pow(diff * 100, decay)
                        if (inverse < 0) inverse = 0
                        return (userSize * (inverse / 100)) + "px"
                    })


            })

        const g = svg.append("g").attr("transform", "translate(" + margin + ",5)").call(slider)

    }


}

