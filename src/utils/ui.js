import { updateAllCharts} from "../pages/map";
import { rebuildChart } from "./runmodel";
import { state } from "../index";
import { users } from "./database";

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

export function notice(message, id) {
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
        .style("background", "grey")
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

    return div
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


    menu.selectAll("*").remove()
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
    users.forEach(name => {

        var checked = false
        if (state.selected_users.includes(name)) checked = true

        var checkbox = addCheckbox(userDiv, name, checked, "20px")
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
                updateAllCharts(true)
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

export function buildClusterCounts(container, page) {
    container.style("margin", "5px")
    container.append("text").text("Clusters:")
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
    var c1box = addCheckbox(div, "1", cluster1, "12px", "radio")
    var c2box = addCheckbox(div, "2", cluster2, "12px", "radio")
    var c3box = addCheckbox(div, "3", cluster3, "12px", "radio")
    var c4box = addCheckbox(div, "4", cluster4, "12px", "radio")

    var settings = {autoClusters: false, updateCharts: true, source: "clusterSelector"}
    if (page == "graphs")
    {
        settings = {autoClusters: false, updateGraphs: true}
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
