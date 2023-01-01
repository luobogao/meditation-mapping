import { state, updateAllCharts } from "../pages/live";

const d3 = require("d3");
export function popUp(event, html) {
    var x = event.pageX
    var y = event.pageY
    if (y > (window.innerHeight - 400)) y = y - 400
    var popup = d3.select("#popup")
    popup.selectAll("*").remove()

    if (html != null) {
        popup
            .style("display", "flex")
            //.style("width", "200px")
            //.style("height", "100px")
            .style("left", (x + 10) + "px")
            .style("top", (y + 10) + "px")
            .style("max-width", "300px")
            .style("max-height", "300px")

            .append("div").style("margin", "10px")
            .style("overflow", "scroll")
            .html(html)
    }
    else return popup

}
export function addCheckbox(div, name, checked, textSize, type = "checkbox") {
    var checkboxDiv = div.append("div")
        .style("font-size", "30px")
        .style("margin", "8px")
        .style("display", "flex")
        .style("align-items", "center")


    var checkbox = checkboxDiv.append("input")
        .attr("type", type)
        .style("width", "20px")
        .style("height", "20px")
        .style("accent-color", "lightgreen")
        .style("opacity", 0.7)
        .property("checked", checked)


    checkboxDiv.append("label")
        .style("font-size", textSize)
        .text(name)

    return checkbox

}

export function addMenu(event, type) {
    // when type == options, the menu doesn't disappear when mouse is moved away from waypoint
    var x = event.pageX
    var y = event.pageY
    var menu = d3.select("#menu")

    if (y > (window.innerHeight - 400)) y = y - 400
    menu.selectAll("*").remove()
    popUpremove()
    var div = menu
        .style("display", "flex")
        .attr("type", type)
        //.style("width", "200px")
        //.style("height", "100px")
        .style("left", (x + 10) + "px")
        .style("top", (y + 10) + "px")
        .append("div").style("margin", "10px")
        .style("display", "flex")
        .style("flex-direction", "column")
        .style('max-width', "300px")
        .style('max-height', "800px")
        .style("overflow", "scroll")

    return div
}
export function popUpremove() {
    d3.select("#popup")
        .transition()
        .style("display", "none")
        .duration(100)
        .selectAll("*").remove()
}
export function menuRemove() {
    d3.select("#menu")
        .transition()
        .style("display", "none")
        .duration(100)
        .selectAll("*").remove()
}

export function buildChartSelectors(div) {
    var chart1, chart2, chart3, chart4, chart5 = false
    switch (state.chartType) {
        case "pca":
            chart1 = true
            break;
        case "cosine":
            chart2 = true
            break;
        case "euclidean":
            chart3 = true
            break
        case "cosine*euclidean":
            chart4 = true
            break;
        case "bands":
            chart5 = true
            break;

    }
    var chart1box = addCheckbox(div, "3-D", chart1, "12px", "radio")
    var chart2box = addCheckbox(div, "Cosine", chart2, "12px", "radio")
    var chart3box = addCheckbox(div, "Euclidean", chart3, "12px", "radio")
    var chart4box = addCheckbox(div, "Cosine*Euclidean", chart4, "12px", "radio")
    var chart5box = addCheckbox(div, "Gamma", chart5, "12px", "radio")

    var els = [
        { chart: chart1box, key: "pca" },
        { chart: chart2box, key: "cosine" },
        { chart: chart3box, key: "euclidean" },
        { chart: chart4box, key: "cosine*euclidean" },
        { chart: chart5box, key: "bands" },
    ]
    els.forEach(el => {

        el.chart
            .attr("class", "chart-checkbox")
            .on("click", function () {
                d3.selectAll(".chart-checkbox").property("checked", false)
                d3.select(this).property("checked", true)
                state.chartType = el.key
                updateAllCharts()
            })
    })

}
export function buildResolutionSelectors(div) {
    var res1, res10, res60 = false
    switch (state.resolution) {
        case 1:
            res1 = true
            break;
        case 10:
            res10 = true
            break;
        case 60:
            res60 = true
            break

    }
    var res1box = addCheckbox(div, "1 Sec", res1, "12px", "radio")
    var res10box = addCheckbox(div, "10 Sec", res10, "12px", "radio")
    var res60box = addCheckbox(div, "60 Sec", res60, "12px", "radio")

    res1box
        .attr("class", "resolution-checkbox")
        .on("click", function () {
            d3.selectAll(".resolution-checkbox").property("checked", false)
            d3.select(this).property("checked", true)
            state.resolution = 1
            updateAllCharts()
        })
    res10box
        .attr("class", "resolution-checkbox")
        .on("click", function () {
            d3.selectAll(".resolution-checkbox").property("checked", false)
            d3.select(this).property("checked", true)
            state.resolution = 10
            updateAllCharts()
        })
    res60box
        .attr("class", "resolution-checkbox")
        .on("click", function () {
            d3.selectAll(".resolution-checkbox").property("checked", false)
            d3.select(this).property("checked", true)
            state.resolution = 60

            updateAllCharts()
        })

}