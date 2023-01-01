import { miniChartSize, waypoints } from "../pages/live"
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
var defaultSettings = {lineColor: "black", highlightID: null, key: "cosine", lineSize: 3}
export function updateSimilarityChart(svgid, settings = defaultSettings) {

    
    if (waypoints[0].similarityTimeseries == null)
    {
        return
    }
    var svg = d3.select("#" + svgid)
    if (svg == null)
    {
        return
    }
    
    svg.selectAll("*").remove()
    var width = parsePx( svg.attr("width"))
    var height = parsePx( svg.attr("height"))
    
    var firstSeries = waypoints[0].similarityTimeseries.map(e => e.seconds)
    var min_x = firstSeries[0]
    var max_x = firstSeries.slice(-1)[0]

    //console.log("min: " + min_x + " max: " + max_x)
    console.log("width: " + width + ", height: " + height)
    var miniX = d3.scaleLinear()
        .domain([min_x, max_x])
        .range([0, width])

    var miniY = d3.scaleLog()
        .domain([50, 100])
        .range([height, 0])

    

    var line = d3.line()
        .x(function (d, i) {
            return miniX(d.x)
        })
        .y(function (d, i) {
            return miniY(d.y)
        })
        .curve(d3.curveMonotoneX) // apply smoothing to the line

    function interpolate(data, n)
    {
        var interpolatedData = []
        for (let i = (n / 2); i < (data.length - (n / 2)); i = i + (n / 2))
        {
            

            var arr = []
            
            for (let b = i; b < i + (n / 2); b ++)
            {
                switch (settings.key)
                {
                    case "cosine":
                        arr.push(data[b].cosineDistance)
                        break;
                    case "euclidean":
                        arr.push(data[b].euclideanDistance)
                        break;
                }
                
            }
            var avg = d3.mean(arr)
            interpolatedData.push({x: data[i].seconds, y: avg})

        }
        return interpolatedData
    }
    var data = []

    waypoints.forEach(waypoint => {
        if (waypoint.match)
        {
            var series = interpolate(waypoint.similarityTimeseries, 20)
            var entry = {points: series, waypoint: waypoint}
            data.push(entry)
        }
        

    })
    
    
    var chart = svg.selectAll(".line")
        .data(data)

    chart.exit().remove()
    chart.enter().append("path").attr("class", "line")
        .attr("fill", "none")
        .attr("stroke", function(d)
        {
            return settings.lineColor
        })
        .on("mouseover", function(event, d)
        {
            d3.select(this).attr("stroke", "red")
            var menu = addMenu(event, "menu")
            menu.append("text").text(d.waypoint.user + " - " + d.waypoint.label)
        })
        .on("mouseout", function()
        {
            d3.select(this).attr("stroke", settings.lineColor)
            menuRemove()
        })
        .style("opacity", function(d)
        {
            if (settings.highlightID != null)
            {
                if (d.waypoint.id == settings.highlightID) return 0.8
                else return 0.5
            }
            else return 0.8
            
            
        })
        .attr("stroke-width", settings.lineSize)
        .attr("d", function (d) {
            
            return line(d.points)
        })

}