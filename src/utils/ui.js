
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


function buildRadioGroup(container, title, options, groupName, fontSize, type, callback) {
    container.style("margin", "5px");
    container.append("text").text(title)
        .style("font-size", fontSize);

    var div = container.append("div")
        .style("display", "flex")
        .style("flex-direction", "row");

    options.forEach(function (option) {
        var isChecked = state[groupName] === option.value;
        var radioButton = addCheckbox(div, option.label, isChecked, option.id, fontSize, type);

        radioButton
            .attr("class", groupName + "-radio")
            .on("click", function () {
                d3.selectAll("." + groupName + "-radio").property("checked", false);
                d3.select(this).property("checked", true);
                state[groupName] = option.value;
                callback(option.value);
            });
    });
}
export function buildClusterCounts(container, page) {
    const clusterOptions = [
        { label: "1", value: 1, id: "cluster1" },
        { label: "2", value: 2, id: "cluster2" },
        { label: "3", value: 3, id: "cluster3" },
        { label: "4", value: 4, id: "cluster4" },
    ];

    const settings = (page === "graphs") ? { autoClusters: false, updateGraphs: true } : false;

    buildRadioGroup(container, "Clusters:", clusterOptions, "clusters", "12px", "radio", function (value) {
        rebuildChart(settings);
    });
}

export function buildSimilaritySelectors(container) {
    const similarityOptions = [
        { label: "Cosine", value: "cosine", id: "cosineType" },
        { label: "Euclidean", value: "euclidean", id: "euclideanType" },
    ];

    buildRadioGroup(container, "Similarity Method:", similarityOptions, "similarityType", "12px", "radio", function (value) {
        updateClusters();
    });
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

export function buildChartSelectors(container) {
    const chartOptions = [
        { label: "3-D", value: "pca", id: "a" },
        { label: "Cosine", value: "cosine", id: "b" },
        { label: "Euclidean", value: "euclidean", id: "c" },
    ];

    buildRadioGroup(container, "Chart Type:", chartOptions, "chartType", "12px", "radio", function (value) {
        console.error("TODO: add a callback");
    });
}

export function buildResolutionSelectors(container) {
    const resolutionOptions = [
        { label: "1", value: 1, id: "res1" },
        { label: "10", value: 10, id: "res10" },
        { label: "60", value: 60, id: "res60" },
    ];

    buildRadioGroup(container, "Resolution:", resolutionOptions, "resolution", "12px", "radio", function (value) {
        rebuildChart(false);
    });
}

export function buildVectorTypeSelectors(container) {
    const vectorTypeOptions = [
        { label: "Relative", value: "relative", id: "relativeType" },
        { label: "Change", value: "change", id: "changeType" },
    ];

    buildRadioGroup(container, "Vector Type:", vectorTypeOptions, "vectorType", "12px", "radio", function (value) {
        rebuildChart(true);
    });
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
