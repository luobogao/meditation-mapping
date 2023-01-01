import { miniChartSize, waypoints, state } from "../pages/live"
import { parsePx } from "./functions";
import { addMenu, menuRemove } from "./ui";
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

    const opacity = 0.7
    var margin = 20
    if (waypoints[0].similarityTimeseries == null) {
        return
    }
    var container = d3.select("#" + svgid)
    var width = parsePx(container.attr("width")) - margin
    var height = parsePx(container.attr("height")) - margin

    container.selectAll("*").remove()
    var svg = container.append("g")
        .attr("width", (width - 100) + "px")
        .attr("transform", "translate(" + "0" + "," + margin + ")")
    if (svg == null) {
        return
    }

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
    var globalYmin = d3.min(waypoints.map(waypoint => d3.min(waypoint.similarityTimeseries.map(e => e[key]))))
    var globalYmax = d3.max(waypoints.map(waypoint => d3.max(waypoint.similarityTimeseries.map(e => e[key]))))

    var firstSeries = waypoints[0].similarityTimeseries.map(e => e.seconds)
    var min_x = firstSeries[0]
    var max_x = firstSeries.slice(-1)[0]

    var miniX = d3.scaleLinear()
        .domain([min_x, max_x])
        .range([0, width])

        
    var minY = globalYmin - state.zoom
    if (minY > 98)
    {
        minY = 98
        state.zoom = state.zoom + 1
    } 
    
    if (minY < 10)
    {
        minY = 10
        state.zoom = state.zoom - 1
    } 
    if (minY > (globalYmax - 20))
    {
        minY = globalYmax - 20
        state.zoom = state.zoom - 1
    }

    var miniY = d3.scaleLog()
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

    function interpolate(data, n) {
        var interpolatedData = []
        for (let i = (n / 2); i < (data.length - (n / 2)); i = i + (n / 2)) {


            var arr = []

            for (let b = i; b < i + (n / 2); b++) {

                arr.push(data[b][key])

            }
            var avg = d3.mean(arr)
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


    var chart = svg.selectAll(".line")
        .data(data)

    chart.exit().remove()
    chart.enter().append("path").attr("class", "line")
        .attr("fill", "none")
        .attr("stroke", function (d) {
            return settings.lineColor
        })
        .on("mouseover", function (event, d) {
            d3.select(this)
                .attr("stroke", "red")
                .raise()
            var menu = addMenu(event, "menu")
            menu.append("text").text(d.waypoint.user + " - " + d.waypoint.label)
        })
        .on("mouseout", function () {
            d3.select(this).attr("stroke", settings.lineColor)
            menuRemove()
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

}