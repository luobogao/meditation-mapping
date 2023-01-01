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
export function addCheckbox(div, name, checked, textSize) {
    var checkboxDiv = div.append("div")
        .style("font-size", "30px")
        .style("margin", "8px")

    
    var checkbox = checkboxDiv.append("input")
        .attr("type", "checkbox")
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