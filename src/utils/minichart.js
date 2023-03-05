import { state } from "../index";
import { unique, getEveryNth } from "./functions";
import { popUp, popUpremove } from "./ui";
var opacityUser = 1

// THIS FILE MAKES A SMALL CHART IN THE WAYPOINT POPUP

const d3 = require("d3");

const minichartWidth = 200
const minichartHeight = 200
const minichartMargin = 10

export var x_mini;
export var y_mini;

export function buildBandChart(userData) {
    
    var keys
    switch (state.device) {
        case "Muse":
            keys = ["Gamma_TP10", "Gamma_TP9", "Gamma_AF7", "Gamma_AF8"]
            break;
        case "MindLink":
            keys = ["gammaMid", "gammaLow"]
            break;
    }
    var data = []
    keys.forEach(key => {
        var arr = userData.map(e => [e.seconds, e[key]])
        var d = { label: key, data: arr }
        data.push(d)
    })

    var settings =
    {
        firstX: userData[0].firstSeconds,
        data: data,
        svgId: "minichartid",
        chartType: "log",
        yAxis:
        {
            yMax: null,
            yMin: null,
        },
        interactionType: "track",
        lineWidth: 1,
        resolution: 10,
        size:
        {
            width: minichartWidth,
            height: minichartHeight
        }

    }
    updateMiniChart(settings)

}
export function buildSimilarityChart(userData) {
    var waypoint_labels = []
    userData.map(e => {
        e.distances.map(d =>
            {
                waypoint_labels.push(d.label)
            })
    })
    waypoint_labels = unique(waypoint_labels)
    var data = []
    
    for (let i = 0; i < waypoint_labels.length; i++) {

        var name = waypoint_labels[i]
        var arr = []
        userData.map(row => 
            {
                var x = row.seconds
                var matches = row.distances.filter(e => e.label == name)

                if (matches.length == 1)
                {
                    arr.push([x, matches[0].distance])
                }
                
            })
        
        var newdata = { data: arr, label: name}
        data.push(newdata)

    }
    var settings =
    {
        data: data,
        firstX: userData[0].firstSeconds,
        svgId: "minichartid",
        chartType: "linear",
        yAxis:
        {
            yMin: 0,
            yMax: 100,
        },

        interactionType: "highlight",
        lineWidth: 3,
        resolution: 50,
        size:
        {
            width: minichartWidth,
            height: minichartHeight
        }

    }
    updateMiniChart(settings)

}

export function updateMiniChart(settings) {
    
    var seriesArray = settings.data
    var svgid = settings.svgId
    var y_axis_type = settings.chartType
    var y_min_force = settings.yAxis.yMin
    var y_max_force = settings.yAxis.yMax
    var interactionType = settings.interactionType
    var lineWidth = settings.lineWidth + "px"
    var resolution = settings.resolution
    var width = settings.size.width
    var height = settings.size.height

    var svg = d3.select("#" + svgid)
    svg.selectAll("*").remove()


    var firstdata = seriesArray[0].data
    var xarray = firstdata.map(e => e[0])
    var xmin = settings.firstX
    var xmax = d3.max(xarray)
    var ymin = 0.01
    var ymax = 0


    // Find y-min as minimum of ALL series
    seriesArray.forEach(series => {

        var yarray = series.data.map(e => e[1])
        var this_min = d3.min(yarray)
        var this_max = d3.max(yarray)
        if (this_min < ymin) ymin = this_min
        if (this_max > ymax) ymax = this_max
    })


    if (y_axis_type == "log" && ymin < 0.01) ymin = 0.01 // log graphs don't like zero
    if (y_min_force != null) ymin = y_min_force // Use user's preferred y min
    if (y_max_force != null) ymax = y_max_force // Use user's preferred y min
    

    x_mini = d3.scaleLinear()
        .domain([xmin, xmax])
        .range([0, width])

    switch (y_axis_type) {
        case "log":
            y_mini = d3.scaleLog()
                .domain([ymin, ymax])
                .range([height, 0])
            break;
        case "linear":
            y_mini = d3.scaleLinear()
                .domain([ymin, ymax])
                .range([height, 0])
            break;



    }


    seriesArray.forEach(series => {
        var data = getEveryNth(series.data, series.data.length / resolution)

        var line = d3.line()
            // Basic line function - takes a list of points and plots them x-y, x-y one at a time
            .x(function (d, i) { 
                return x_mini(d[0]); 
                
            })
            .y(function (d, i) 
            {
                return y_mini(d[1])
                
            })
            .curve(d3.curveMonotoneX) // apply smoothing to the line

        const lineColor = "black"
        svg.append("path")
            .attr("fill", "none")
            .attr("stroke", lineColor)
            .attr("stroke-width", lineWidth)
            .attr("d", function () {
                return line(data)
            })
            .on("mouseover", function (event) {
                if (interactionType == "highlight") {
                    d3.select(this).style("stroke", "red").raise()
                    console.log(series.label)
                    popUp(event, series.label)
                }

            })
            .on("mouseout", function () {
                if (interactionType == "highlight") {
                    d3.select(this).style("stroke", lineColor)
                    popUpremove()
                }

            })


        var marker = svg.append("circle")
            .attr("cx", 20)
            .attr("cy", 20)
            .attr("r", 10)
            .style("display", "none")
            .style("fill", "black")
            .attr("id", "mini-marker")

        if (interactionType == "track") {
            svg
                .append("svg:rect")
                .attr("width", width)
                .attr("height", height)
                .attr('fill', 'none')
                .attr('pointer-events', 'all')
                .on("mouseout", function () {
                    marker.style("display", "none")

                    d3.selectAll(".userpoints")
                        .style("opacity", function (d) {
                            return opacityUser
                        })
                })
                .on("mousemove", function (mouse) {
                    // Reverse-calculate which second from the dataset the user is hovering over
                    const [x, y] = d3.pointer(mouse)
                    const second = x_mini.invert(x) // invert the axis to get the seconds from the pixel value
                    if (y > (minichartHeight * 0.6)) y = (minichartHeight * 0.2)
                    let nearby = d3.selectAll(".userpoints")
                        .style("opacity", 0.02)
                        .filter(function () {
                            var this_second = d3.select(this).attr("seconds")
                            return this_second > second - 20 && this_second < second + 20
                        })
                    nearby.style("opacity", 1)
                    marker.attr("cx", x)
                    var matches = data.filter(e => e[0] > (second - 20))
                    if (matches.length > 0) {
                        var ym = matches[0][1]
                        marker.attr("cy", y_mini(ym))
                        marker.style("display", "flex")
                    }

                })
        }


    })

}