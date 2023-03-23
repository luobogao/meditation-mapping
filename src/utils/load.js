
import { validate, showLoadingValidate, updateRecordingTable, validateAfterLoad } from "../pages/validate";
import { uploadCSV, updateRecording, addRecording, user, setCurrentRecording } from "./database";
import { recordings } from "../pages/validate";
import { addOrReplaceSession } from "./indexdb";
import { notice } from "./ui";
const d3 = require("d3");
var fr; // file reader
export var datastate = {}
var userDataLoaded = false
var fileFullString = null

function receivedFile() {
    // Callback from the "browse" button
    // fr.result contains the string of the file that was uploading

    let string = fr.result
    console.log("--> Loaded file")
    fileFullString = string // Store this string so we can upload it as a file to storage later (first we need the timestamp of first row)
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

    // Send the file (as a string) to the worker
    worker.postMessage(string);

    // The worker has finished processing the CSV file and has returend a JSON
    worker.addEventListener('message', function (event) {

        var dataJSON = JSON.parse(event.data) // Parse the stringified-json back into an object
        datastate.data = dataJSON.data

        console.log("----> DONE LOADING")
        uploadNewCSV(dataJSON)


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
            showLoadingValidate()
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
function uploadNewCSV(dataJSON) {

    var firstRowTimestamp = dataJSON.startTime
    var lastRowTimestamp = dataJSON.data.slice(-1)[0].seconds


    var filename = "Meditation_" + firstRowTimestamp
    if (recordings.map(recording => recording.filename).includes(filename)) {
        console.log("------------------> File was already uploaded!")
        dataJSON.id = filename
        dataJSON.filename = filename
        var recording = recordings.filter(r => r.filename == filename)[0]
        recording.delete = false // un-delete it if necessary

        addOrReplaceSession(dataJSON, function () {
            console.log("-----------> Added to IndexDB")
        })

        validateAfterLoad(dataJSON, null)

        return
    }
    else {
        var metadata = { "user": "TestUser" } // This isn't working yet!
        uploadCSV(fileFullString, filename, metadata)


        var menu = notice("New Recording", "recording")

        // User
        menu.append("div").text("User:").style("margin-top", "20px")
        var owner = menu.append("input").attr("type", "text").style("width", "220px").attr("value", user.displayName)

        // Label
        menu.append("div").text("Label:").style("margin-top", "20px")
        var label = menu.append("input").attr("type", "text").style("width", "220px")

        // Notes
        menu.append("div").text("Notes:").style("margin-top", "20px")
        var notes = menu.append("textarea").attr("rows", 10).attr("cols", 30)

        menu.append("div").style("margin-top", "30px")
            .append("button").text("Submit")
            .on("click", function () {
                var o = owner.node().value
                var l = label.node().value
                var n = notes.node().value

                d3.selectAll(".notice").remove()
                var date = new Date()
                var millis = date.getTime()

                // Note: an ID will be automatically generated by firebase
                var newRecord = { filename: filename, user: o, label: l, notes: n, timestamp: firstRowTimestamp, startSecond: 15, endSecond: lastRowTimestamp - 15, updatedTime: millis }


                addRecording(newRecord)
                    .then((doc) => {
                        console.log("----> Added recording to Firebase: " + doc.id)

                        dataJSON.recordid = doc.id
                        dataJSON.id = filename
                        dataJSON.filename = filename
                        newRecord.id = doc.id
                        newRecord.filename = filename
                        addOrReplaceSession(dataJSON, function () {
                            console.log("-----------> Added to IndexDB")
                        })

                        validateAfterLoad(dataJSON, newRecord)
                        d3.selectAll(".notice").remove()

                    })
                    .catch((error) => {
                        console.error("Failed to add recording: " + filename)
                        console.log(error)

                    })



            })
    }

}

