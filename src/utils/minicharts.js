import { miniChartSize, waypoints, state } from "../pages/live"
import { parsePx } from "./functions";
import { addMenu, menuRemove } from "./ui";
import { zoom } from "./charts";
const d3 = require("d3");
var similarityLine, miniX, miniY, similaritySVG


export function buildSimilarityChart() {

    similaritySVG = d3.select("#similarityChart")
        .style("border", "1px solid grey")
        .style("border-radius", "5px")


    similaritySVG.append("svg:rect")
        .attr("width", miniChartSize)
        .attr("height", miniChartSize)
        .attr('fill', 'none')
        .attr('pointer-events', 'all')
        .on("mousemove", function (mouse) {
            console.log("moving")
        })
}
var defaultSettings = { lineColor: "black", highlightID: null, key: "cosine", lineSize: 3 }
export function updateSimilarityChart(svgid, settings = defaultSettings) {

    console.log("updating mini")
    const opacity = 0.7
    var marginY = 80
    var marginXleft = 100
    var marginXright = 150
    if (waypoints[0].similarityTimeseries == null) {
        return
    }
    var container = d3.select("#" + svgid)
    var width = parsePx(container.attr("width")) - marginXleft - marginXright
    var height = parsePx(container.attr("height")) - (2 * marginY)

    container.selectAll("*").remove()
    var svg = container.append("g")
        .attr("width", (width - 100) + "px")
        .attr("transform", "translate(" + marginXleft + "," + marginY + ")")


    var key = ""
    switch (settings.key) {
        case "cosine":
            key = "cosineDistance"
            break;
        case "euclidean":
            key = "euclideanDistance"
            break;
        case "cosine*euclidean":
            key = "combinedDistance"
            break;
    }

    var globalYmax = 0, globalYmin = 100
    function interpolate(data, n) {
        var interpolatedData = []
        for (let i = (n / 2); i < (data.length - (n / 2)); i = i + (n / 2)) {


            var arr = []

            for (let b = i; b < i + (n / 2); b++) {

                arr.push(data[b][key])

            }
            var avg = d3.mean(arr)
            if (globalYmax < avg) globalYmax = avg
            if (globalYmin > avg) globalYmin = avg
            interpolatedData.push({ x: data[i].seconds, y: avg })

        }
        return interpolatedData
    }
    var data = []

    waypoints.forEach(waypoint => {
        if (waypoint.match) {
            var series = interpolate(waypoint.similarityTimeseries, 20)
            var entry = { points: series, waypoint: waypoint }
            data.push(entry)
        }


    })

    var firstSeries = waypoints[0].similarityTimeseries.map(e => e.seconds)
    var min_x = firstSeries[0]
    var max_x = firstSeries.slice(-1)[0]

    var miniX = d3.scaleLinear()
        .domain([min_x, max_x])
        .range([0, width])


    var minY = globalYmin - state.zoom


    var miniY = d3.scaleLinear()
        .domain([minY, 100])
        .range([height, 0])



    var line = d3.line()
        .x(function (d, i) {
            return miniX(d.x)
        })
        .y(function (d, i) {
            return miniY(d.y)
        })
        .curve(d3.curveMonotoneX) // apply smoothing to the line



    var chart = svg.selectAll(".line")
        .data(data)

    chart.exit().remove()
    var series = chart.enter()

    series.append("path").attr("class", "line")
        .attr("fill", "none")
        .attr("class", "line")
        .attr("stroke", function (d) {
            return settings.lineColor
        })
        .on("mouseover", function (event, d) {
            var thisLine = d3.select(this)

            svg.selectAll(".legend")
                .transition()
                .style("fill", "black").style("opacity", 0.1)
                .duration(80)
            var text = svg.select("." + d.waypoint.id)
            text
                .transition()
                .style("fill", "red").style("opacity", 1)
                .duration(100)
            text.raise()
            svg.selectAll(".line")
                .transition()
                .style("opacity", 0.1)
                .duration(100)
            thisLine
                .transition()
                .attr("stroke", "red")
                .style("opacity", 1)
                .duration(100)
            thisLine.raise()
            
        })
        .on("mouseout", function () {
            d3.select(this).attr("stroke", settings.lineColor)
            svg.selectAll(".legend")
                .transition()
                .style("fill", "black").style("opacity", 1)
                .duration(100)
            svg.selectAll(".line")
                .transition()
                .style("opacity", 1)
                .attr("stroke", function (d) {
                    return settings.lineColor
                })
                .duration(100)
            
        })
        .style("opacity", function (d) {
            if (settings.highlightID != null) {
                if (d.waypoint.id == settings.highlightID) return opacity
                else return 0.5
            }
            else return opacity


        })
        .attr("stroke-width", settings.lineSize)
        .attr("d", function (d) {

            return line(d.points)
        })

    var interpolated_max_x = data[0].points.slice(-1)[0].x
    series.append("text")
        .text(function (d) { return d.waypoint.user + " - " + d.waypoint.label })
        .attr("class", function (d) { return d.waypoint.id + " " + " legend" })
        .attr("x", miniX(interpolated_max_x) + 10)
        .attr("y", function (d) {
            return miniY(d.points.slice(-1)[0].y)
        })

    var axis = d3.axisLeft()
        .tickFormat(function (d) { return d + "%" })
        .scale(miniY)

    svg.append("g").call(axis)
    svg.selectAll(".domain").remove()
    svg.selectAll(".tick").selectAll("text").style("font-size", "20px").style("opacity", 0.5)
    svg.selectAll(".tick").selectAll("line").remove()

}