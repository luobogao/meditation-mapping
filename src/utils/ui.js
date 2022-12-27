const d3 = require("d3");
export function popUp(event, html) {
    var x = event.pageX
    var y = event.pageY
    var popup = d3.select("#popup")
    popup
        .style("display", "flex")
        //.style("width", "200px")
        //.style("height", "100px")
        .style("left", (x + 10) + "px")
        .style("top", (y + 10) + "px")
        .append("div").style("margin", "10px")
        .html(html)
}
export function popUpremove()
{
    d3.select("#popup")
                .transition()
                .style("display", "none")
                .duration(100)
                .selectAll("*").remove()
}