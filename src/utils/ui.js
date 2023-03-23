
import { rebuildChart } from "./runmodel";
import { state } from "../index";
import { users } from "./database";
import { updateClusterGraphs, updateClusters, updateCommunityGraph } from "../pages/clusters";

const d3 = require("d3");
export const navHeight = 63
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

export function notice(message, id, spinnerP = false) {
    // Blanks out background then adds a foreground div

    d3.selectAll(".notice").remove()

    d3.select("body").append("div")
        .attr("class", "notice " + id)
        .style("width", window.innerWidth + "px")
        .style("height", window.innerHeight + "px")
        .style("background", "black")
        .style("position", "absolute")
        .style("left", 0)
        .style("top", 0)
        .style("opacity", 0.5)

    var div = d3.select("body").append("div")
        .attr("class", "notice " + id)
        .style("width", "fit-content")
        .style("height", "fit-content")
        .style("background", "white")
        .style("border", "2px solid black")
        .style("border-radius", "5px")
        .style("position", "absolute")
        .style("display", "flex")
        .style("align-items", "center")
        .style("justify-content", "center")
        .style("left", 0)
        .style("top", 0)
        .style("bottom", 0)
        .style("right", 0)
        .style("margin", "auto auto auto auto")
        .append("div").style("margin", "5px")
        .style("display", "flex")
        .style("flex-direction", "column")

    div.append("text")
        .style("text-align", "center")
        .style("font-size", "30px")
        .text(message)

    if (spinnerP) {
            div.append("div").attr("id", "loadingFileSpinner")
            loadingSpinner("loadingFileSpinner")
    }


    return div
}

export function addCheckbox(div, name, checked, id, textSize, type = "checkbox") {
    var checkboxDiv = div.append("div")
        .style("font-size", "20px")
        .style("margin", "8px")
        .style("display", "flex")
        .style("align-items", "center")


    var checkbox = checkboxDiv.append("input")
        .attr("type", type)
        .attr("id", id)
        .style("width", "20px")
        .style("height", "20px")
        .style("accent-color", "lightgreen")
        .style("opacity", 0.7)
        .property("checked", checked)


    checkboxDiv.append("label")
        .style("margin-left", "5px")
        .style("font-size", textSize)
        .text(name)

    return checkbox

}

export function addMenu(event, type) {
    // when type == options, the menu doesn't disappear when mouse is moved away from waypoint
    var x = event.pageX
    var y = event.pageY
    d3.select("#menu").remove()
    var menu = d3.select("body").append("div").attr("id", "menu")

    popUpremove()
    var div = menu
        .style("display", "flex")
        .attr("type", type)
        .attr("id", "menu")
        //.style("width", "200px")
        //.style("height", "100px")
        .style("left", (x + 20) + "px")
        .style("top", (y + 10) + "px")
        .append("div").style("margin", "10px")
        .style("display", "flex")
        .style("flex-direction", "column")
        .style('max-width', "300px")
        .style('max-height', "800px")
        .style("overflow", "scroll")
    moveMenu()

    return div
}

export function moveMenu() {
    // Checks if menu is still entirely within window
    // Timeout necessary to give DOM chance to display
    setTimeout(function () {
        var bounds = d3.select("#menu").node().getBoundingClientRect()
        var minY = bounds.y + bounds.height

        if (minY > (window.innerHeight - 30)) {
            console.log("overflow!")
            d3.select("#menu").style("top", (window.innerHeight - bounds.height - 30) + "px")
        }

    }, 10)


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
export function buildUserSelectors() {
    // Build the checkboxes for the users
    var userDiv = d3.select('#user-selectors')
    userDiv.selectAll("*").remove()
    var useri = 0
    users.forEach(name => {

        var checked = false
        if (state.selected_users.includes(name)) checked = true

        var checkbox = addCheckbox(userDiv, name, "user" + useri, checked, "20px")
        checkbox.on("click", function () {
            const newState = this.checked

            // Add or remove a name from the "Selected Users" list
            // This action should prompt a rebuild of the model and a redrawing of the graph
            if (newState == true) {
                state.selected_users.push(name)
            }
            else {
                var i = state.selected_users.indexOf(name)
                if (i != -1) {
                    state.selected_users.splice(i, 1)
                }

            }

            rebuildChart()

        })
        useri++

    })
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
    var chart1box = addCheckbox(div, "3-D", chart1, "a", "20px", "radio")
    var chart2box = addCheckbox(div, "Cosine", chart2, "b", "20px", "radio")
    var chart3box = addCheckbox(div, "Euclidean", chart3, "c", "20px", "radio")

    var els = [
        { chart: chart1box, key: "pca" },
        { chart: chart2box, key: "cosine" },
        { chart: chart3box, key: "euclidean" }

    ]
    els.forEach(el => {

        el.chart
            .attr("class", "chart-checkbox")
            .on("click", function () {
                d3.selectAll(".chart-checkbox").property("checked", false)
                d3.select(this).property("checked", true)
                state.chartType = el.key
                console.error("TODO: add a callback")
            })
    })

}
export function buildResolutionSelectors(container) {

    container.style("margin", "5px")
    container.append("text").text("Resolution:")
        .style("font-size", "20px")
    var div = container.append("div").style("display", "flex").style("flex-direction", "row")

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
    var res1box = addCheckbox(div, "1", res1, "res1", "20px", "radio")
    var res10box = addCheckbox(div, "10", res10, "res10", "20px", "radio")
    var res60box = addCheckbox(div, "60", res60, "res60", "20px", "radio")

    res1box
        .attr("class", "resolution-checkbox")
        .on("click", function () {
            d3.selectAll(".resolution-checkbox").property("checked", false)
            d3.select(this).property("checked", true)
            state.resolution = 1
            rebuildChart(false)

        })
    res10box
        .attr("class", "resolution-checkbox")
        .on("click", function () {
            d3.selectAll(".resolution-checkbox").property("checked", false)
            d3.select(this).property("checked", true)
            state.resolution = 10
            rebuildChart(false)

        })
    res60box
        .attr("class", "resolution-checkbox")
        .on("click", function () {
            d3.selectAll(".resolution-checkbox").property("checked", false)
            d3.select(this).property("checked", true)
            state.resolution = 60
            rebuildChart(false)

        })

}

export function buildClusterCounts(container, page) {
    container.style("margin", "5px")
    container.append("text").text("Clusters:")
        .style("font-size", "20px")
    var div = container.append("div").style("display", "flex").style("flex-direction", "row")
    var cluster1, cluster2, cluster3, cluster4 = false
    switch (state.clusters) {
        case 1:
            cluster1 = true
            break;
        case 2:
            cluster2 = true
            break;
        case 3:
            cluster3 = true
            break
        case 4:
            cluster4 = true
            break

    }
    var c1box = addCheckbox(div, "1", cluster1, "cluster1", "20px", "radio")
    var c2box = addCheckbox(div, "2", cluster2, "cluster2", "20px", "radio")
    var c3box = addCheckbox(div, "3", cluster3, "cluster3", "20px", "radio")
    var c4box = addCheckbox(div, "4", cluster4, "cluster4", "20px", "radio")
    .append("table").attr("id", "recordingTable")
    var settings = false
    if (page == "graphs") {
        settings = { autoClusters: false, updateGraphs: true }
    }

    c1box
        .attr("class", "clusters-checkbox")
        .on("click", function () {
            d3.selectAll(".clusters-checkbox").property("checked", false)
            d3.select(this).property("checked", true)
            state.clusters = 1
            rebuildChart(settings)
        })
    c2box
        .attr("class", "clusters-checkbox")
        .on("click", function () {
            d3.selectAll(".clusters-checkbox").property("checked", false)
            d3.select(this).property("checked", true)
            state.clusters = 2
            rebuildChart(settings)

        })
    c3box
        .attr("class", "clusters-checkbox")
        .on("click", function () {
            d3.selectAll(".clusters-checkbox").property("checked", false)
            d3.select(this).property("checked", true)
            state.clusters = 3
            rebuildChart(settings)


        })
    c4box
        .attr("class", "clusters-checkbox")
        .on("click", function () {
            d3.selectAll(".clusters-checkbox").property("checked", false)
            d3.select(this).property("checked", true)
            state.clusters = 4
            rebuildChart(settings)


        })

}
export function buildSimilaritySelectors(container) {
    container.style("margin", "5px")
    container.append("text").text("Similarity Method:")
    var div = container.append("div").style("display", "flex").style("flex-direction", "row")

    var d1 = false
    var d2 = false
    switch (state.similarityType) {
        case "cosine":
            d1 = true
            break;
        case "euclidean":
            d2 = true
            break;
    }
    var cosine = addCheckbox(div, "Cosine", d1, "cosineType", "12px", "radio")
    var euclidean = addCheckbox(div, "Euclidean", d2, "euclideanType", "12px", "radio")

    cosine
        .attr("class", "similaritySelector")
        .on("click", function () {
            d3.selectAll(".similaritySelector").property("checked", false)
            d3.select(this).property("checked", true)
            state.similarityType = "cosine"
            updateClusters()
        })
    euclidean
        .attr("class", "similaritySelector")
        .on("click", function () {
            d3.selectAll(".similaritySelector").property("checked", false)
            d3.select(this).property("checked", true)
            state.similarityType = "combined"
            updateClusters()
        })



}

// Build two radio selectors which toggle between a state value "vectorType" with the values "relative" and "change"

export function buildVectorTypeSelectors(container) {
    container.style("margin", "5px")
    container.append("text").text("Vector Type:")
    var div = container.append("div").style("display", "flex").style("flex-direction", "row")

    var d1 = false
    var d2 = false
    switch (state.vectorType) {
        case "relative":
            d1 = true
            break;
        case "change":
            d2 = true
            break;
    }
    var relative = addCheckbox(div, "Relative", d1, "relativeType", "12px", "radio")
    var change = addCheckbox(div, "Change", d2, "changeType", "12px", "radio")

    relative
        .attr("class", "vectorTypeSelector")
        .on("click", function () {
            d3.selectAll(".vectorTypeSelector").property("checked", false)
            d3.select(this).property("checked", true)
            state.vectorType = "relative"
            rebuildChart(true)
        })
    change
        .attr("class", "vectorTypeSelector")
        .on("click", function () {
            d3.selectAll(".vectorTypeSelector").property("checked", false)
            d3.select(this).property("checked", true)
            state.vectorType = "change"
            rebuildChart(true)
        })

}



export function loadingSpinner(spinnerContainerId) {
    // Create an SVG container
    var spinnerContainer = d3.select("#" + spinnerContainerId)
    spinnerContainer.style("display", "flex")    
    .style("justify-content", "center")
    spinnerContainer.selectAll("*").remove()
    const svg = spinnerContainer.append("svg")
        .attr("width", 50)
        .attr("height", 50);

    // Append a circle to the SVG container
    const circle = svg.append("circle")
        .attr("cx", 25)
        .attr("cy", 25)
        .attr("r", 20)
        .attr("stroke", "black")
        .attr("stroke-width", 3)
        .attr("stroke-dasharray", "35,5")
        .attr("fill", "none");

    // Animate the circle
    function animateSpinner() {
        circle.transition()
            .duration(2000)
            .ease(d3.easeLinear)
            .attrTween("transform", () => {
                return d3.interpolateString("rotate(0, 25, 25)", "rotate(360, 25, 25)");
            })
            .on("end", animateSpinner);
    }

    animateSpinner();
}
