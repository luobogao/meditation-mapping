
const d3 = require("d3");
var fr; // file reader
export var datastate = {}
var userDataLoaded = false

function receivedFile() {
    // Callback from the "browse" button
    // fr.result contains the string of the file that was uploading

    let string = fr.result
    console.log("--> Loaded file")
    processCSV(string)


}
export function processCSV(string) {
    d3.select("#loader").style("display", "flex")


    if (string.substring(0, 30).includes("timestampMs")) {
        datastate.device = "MindLink"

    }
    else {
        datastate.device = "Muse"

    }

    var worker = new Worker("/workers/load_worker.js")
    worker.postMessage(string);

    worker.addEventListener('message', function (event) {

        var data = JSON.parse(event.data)
        datastate.raw = data.raw
        datastate.lowRes = data.lowRes
        datastate.highRes = data.highRes
        datastate.avg10 = data.avg10
        datastate.averageMax = data.averageMax
        datastate.seconds_low = data.seconds_low
        datastate.seconds_high = data.seconds_high
        datastate.filename = data.filename
        datastate.updated = true
        console.log("----> DONE LOADING")
        
        //validateData(data.lowRes)

    })
}

export function buildBrowseFile(div, label, widthpx, color, textColor, id) {

    var width = widthpx + "px"
    let holder = div.append("div")
        .style("position", "relative")
        //.attr("font-family", fontFamily)
        .attr("font-size", "20px")
        .attr("id", id + "-all")
        .style("width", width)

    holder
        .append("input")
        .style("position", "relative")
        .style("text-align", "right")
        .style("opacity", 0)
        .style("z-index", 2)
        .attr("class", "browse-id")
        .style("width", width)
        .attr("type", "file")
        .on("mouseover", function (d) {
            d3.select(this).style("cursor", "pointer");
            d3.select("#" + id)
                .style("background", "grey")
                .style("border-radius", "5px")

        })

        .on("mouseout", function (d) {
            d3.select(this).style("cursor", "default");
            d3.select("#" + id)
                .style("border-radius", "5px")
                .style("background", "#f0f0f0")
        })

        .on("change", function (evt) {
            document.getElementById(id).click()

            d3.select("#welcome").remove()
            let file = evt.target.files[0]

            fr = new FileReader()
            fr.onload = receivedFile
            fr.readAsText(file)




        })


    let fakefile = holder.append("div")
        .style("position", "absolute")
        .style("width", width)
        .style("top", "0px")
        .style("left", "0px")
        .style("z-index", 1)

    let btn = fakefile.append("button")
        .style("font-size", "18px")
        .style("width", width)
        .attr("id", id)
        .text(label)

}
