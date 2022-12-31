import { miniChartSize, waypoints } from "../pages/live"
const d3 = require("d3");
var similarityLine, miniX, miniY, similaritySVG

export function buildSimilarityChart() {

    similaritySVG = d3.select("#similarityChart")


    similaritySVG.append("svg:rect")
        .attr("width", miniChartSize)
        .attr("height", miniChartSize)
        .attr('fill', 'none')
        .attr('pointer-events', 'all')
        .on("mousemove", function (mouse) {
            console.log("moving")
        })
}
export function updateSimilarityChart(svgid, width, height) {

    var svg = d3.select("#" + svgid)
    
    var firstSeries = waypoints[0].similarityTimeseries.map(e => e.seconds)
    var min_x = firstSeries[0]
    var max_x = firstSeries.slice(-1)[0]

    //console.log("min: " + min_x + " max: " + max_x)
    console.log("width: " + width + ", height: " + height)
    var miniX = d3.scaleLinear()
        .domain([min_x, max_x])
        .range([0, width])

    var miniY = d3.scaleLog()
        .domain([80, 100])
        .range([height, 0])

    

    var line = d3.line()
        .x(function (d, i) {
            return miniX(d.seconds)
        })
        .y(function (d, i) {
            return miniY(d.cosineDistance)
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
                arr.push(data[b].cosineDistance)
            }
            var avg = d3.mean(arr)
            interpolatedData.push({seconds: data[i].seconds, cosineDistance: avg})

        }
        return interpolatedData
    }
    var data = []

    waypoints.forEach(waypoint => {
        if (waypoint.match)
        {
            var series = waypoint.similarityTimeseries
        data.push(interpolate(series, 20))
        }
        

    })
    console.log(data)
    
    var chart = svg.selectAll(".line")
        .data(data)

    chart.exit().remove()
    chart.enter().append("path").attr("class", "line")
        .attr("fill", "none")
        .attr("stroke", "black")
        .attr("stroke-width", 3)
        .attr("d", function (d) {

            console.log(line(d))
            return line(d)
        })

}