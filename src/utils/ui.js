const d3 = require("d3");
export function popUp(event, html) {
    var x = event.pageX
    var y = event.pageY
    var popup = d3.select("#popup")

    if (html != null) {
        popup
            .style("display", "flex")
            //.style("width", "200px")
            //.style("height", "100px")
            .style("left", (x + 10) + "px")
            .style("top", (y + 10) + "px")
            .append("div").style("margin", "10px")
            .html(html)
    }
    else return popup

}
export function addMenu(event, title) {
    var x = event.pageX
    var y = event.pageY
    var menu = d3.select("#menu")
    menu.selectAll("*").remove()
    popUpremove()
    var div = menu
        .style("display", "flex")
        //.style("width", "200px")
        //.style("height", "100px")
        .style("left", (x + 10) + "px")
        .style("top", (y + 10) + "px")
        .append("div").style("margin", "10px")
        
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