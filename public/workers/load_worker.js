
// Workers need to import their own libraries
importScripts("/workers/d3.min.js")
importScripts("/workers/moment.min.js")



const channels = ["TP9", "TP10", "AF7", "AF8"]
const bands = ["Delta", "Theta", "Alpha", "Beta", "Gamma"]
const bands_mindlink = ["delta", "theta", "alphaLow", "alphaHigh", "betaLow", "betaHigh", "gammaLow", "gammaMid"]
const band_channels = []
bands.forEach(band => {
    channels.forEach(channel => {
        band_channels.push(band + "_" + channel)
    })
})

// Get the vectors from each device - warning: duplicate of functions found in react files, both need to be updated if one is updated
const vector_columns_muse = [
    "Delta_TP9", "Theta_TP9", "Alpha_TP9", "Beta_TP9", "Gamma_TP9",
    "Delta_TP10", "Theta_TP10", "Alpha_TP10", "Beta_TP10", "Gamma_TP10",
    "Delta_AF7", "Theta_AF7", "Alpha_AF7", "Beta_AF7", "Gamma_AF7",
    "Delta_AF8", "Theta_AF8", "Alpha_AF8", "Beta_AF8", "Gamma_AF8"
]
const vector_columns_mindlink = ["delta", "theta", "alphaLow", "alphaHigh", "betaLow", "betaHigh", "gammaLow", "gammaMid"]
function getRootVector(row) {

    var data = {}
    vector_columns_muse.forEach(key => {
        data[key] = row[key]
    })

    return data
}
function getRootVectorMindLink(row) {
    var data = {}
    vector_columns_mindlink.forEach(key => {
        data[key] = row[key]
    })
    return data
}

// Duplicated ulility functions
function clone(obj) {
    return JSON.parse(JSON.stringify(obj))
}
function round(v) {
    return Math.round(v * 10000) / 10000
}
function parseTime(str) {

    if (str.length == 13 || typeof str === "number") {
        return parseInt(str)
    }
    else {
        let format = "YYYY-MM-DD HH:mm:ss.SSS"
        let date = moment(str, format)
        let millis = date.valueOf()
        return millis
    }

}

// Listen for the main app to send a full string of a loaded file
self.addEventListener("message", function (e) {
    var filestring = e.data
    let data = d3.csvParse(filestring)
    let headers = data.slice(-1)[0]
    let rows = data.slice(0, data.length - 1)
    console.log("--> Loaded " + rows.length + " rows...")

    let keys = Object.keys(rows[0])
    if (keys.includes("timestampMs")) {
        processDataMindLink(rows, "data1")
    }
    else {
        processDataMuse(rows)

    }


}, false);




function processDataMuse(rows) {
    console.log("Loading data: Muse")
    // Cleans up and pre-processes the data from a Muse CSV
    // Removes blank rows, adds timestamps, removes rows where user is moving too much, then averages this data


    if (rows.length > 100000) {
        alert("File is too large!")
        return
    }
    // This object will hold all the resulting data, then be stringified and passed back to app
    var returnObj = {}


    // Remove rows with blank data
    rows = rows.filter(row => row.Delta_TP9 || row.Theta_AF8 || row.Beta_AF7 || row.Gamma_TP10) // remove blank rows

    // This file only had blank rows
    if (rows.length == 0) {
        alert("No data!")
    }

    console.log("--> Loading " + rows.length + " rows")

    // First timestamp - used to define the start time of this meditation
    let first_timestamp = parseTime(rows[0].TimeStamp)

    // Trim the first few seconds and last few seconds - those definitely have movement
    rows = rows.slice(10, rows.length - 10)

    // First timestamp can't be parsed - use current time as starting point and increment by 1 sec per row
    if (typeof first_timestamp != "number" || isNaN(first_timestamp) || first_timestamp < 1000000) {
        console.log("Bad timestamps")
        var date = new Date()
        first_timestamp = date.getMilliseconds()
        var i = 0
        rows.forEach(row => {
            row.TimeStamp = first_timestamp + (i * 1000)
            i++
        })
    }

    // Build a full human-readable timestamp for this file - used when saving images
    let f = "ddd DD-MMM-YYYY hh:mm A"
    let d = moment(first_timestamp).format(f)
    returnObj.filename = d

    // Clean Data
    for (let r = 0; r < rows.length; r++) {
        let row = rows[r]

        // Convert all EEG values from log10 to raw values
        band_channels.forEach(ch => {
            let logValue = row[ch]
            let rawValue = Math.pow(10, logValue)

            row[ch] = round(parseFloat(rawValue))
        })

        row.acc_x = row["Accelerometer_X"]
        row.acc_y = row["Accelerometer_Y"]
        row.acc_z = row["Accelerometer_Z"]


        let timestamp = parseTime(row.TimeStamp)
        row.timestamp = timestamp

        row.seconds = Math.round((timestamp - first_timestamp) / 1000) // seconds since beginning of meditation
        row.secondsFull = Math.round(timestamp / 1000) // Seconds since origin
        row.minutes = Math.round(row.seconds / 60) // minutes since beginning of meditation

    }
    // Calculate motion - set "moving = true" if motion is too high
    var motion_variance_max = 0.01
    for (let i = 0; i < rows.length - 10; i++) {

        var motion = ["acc_x", "acc_y", "acc_z"]
        motion.forEach(col => {
            let avgArray = []
            for (let a = i; a < i + 10; a++) {

                let val = rows[a][col]
                if (!isNaN(val)) {
                    avgArray.push(val)
                }

            }
            var variance = d3.variance(avgArray)
            rows[i][col + "_variance"] = variance

            // Variance from motion is too high - flag this row for removal in next step
            if (variance > motion_variance_max) {

                rows[i].moving = true
            }

        })


    }
    // remove rows with too much motion
    rows = rows.filter(e => e.moving != true)

    // Remove last 10 seconds and first 10 seconds - user is probably moving during this time
    rows = rows.slice(10, rows.length - 10)

    let last_timestamp = parseTime(rows.slice(-1)[0].TimeStamp)
    let total_seconds = Math.round((last_timestamp - first_timestamp) / 1000)
    let total_hours = total_seconds / 60 / 60

    // Rows standardized to one per second
    var standardRows = []
    for (var s = 0; s < total_seconds; s++) {
        let row = rows.filter(r => r.seconds == s)[0]

        if (row) {
            row.seconds = s
            row.minutes = s / 60
            row.percent = s / total_seconds
            standardRows.push(row)
        }
    }

    // Perform two different rounding operations with different average N
    averageRows(standardRows, 1)
    averageRows(standardRows, 10)
    averageRows(standardRows, 60)

    returnObj.data = standardRows
    returnObj.startTime = first_timestamp

    postMessage(JSON.stringify(returnObj))


}

function averageRows(rows, roundN) {


    console.log("----> Rounding with " + roundN + " in " + rows.length + " rows")

    roundN = Math.round(roundN)

    const roundN_half = Math.round(roundN / 2)
    var start = roundN_half + 1
    var end = rows.length - roundN_half

    if (roundN == 1) {
        start = 0
        end = rows.length
    }

    for (let i = roundN_half + 1; i < rows.length - roundN_half; i++) {
        if (i < rows.length) {
            let newRow = rows[i]

            newRow["avg" + roundN] = true  // used to filter later based on avgN

            var bandVarianceArr = []
            // Average each band + channel
            bands.forEach(band => {
                channels.forEach(channel => {
                    let avgArray = []
                    const key1 = band + "_" + channel
                    const key = band + "_" + channel + "_avg" + roundN // eg: gamma_tp10_avg10

                    if (roundN > 1) {
                        // Average the last 'roundN' rows for each value
                        for (let a = i - roundN_half; a < i + roundN_half; a++) {
                            var row = rows[a]

                            let val = row[key1]
                            if (!isNaN(val)) {
                                avgArray.push(val)
                            }

                        }
                        // If there are not enough valid values for an average, return NaN
                        if (avgArray.length > roundN_half) {
                            let avg = round(d3.quantile(avgArray, 0.5))
                            let max = round(d3.quantile(avgArray, 0.95))
                            let min = round(d3.quantile(avgArray, 0.05))
                            newRow[key] = avg
                            bandVarianceArr.push(avg)
                            newRow[key + "_min"] = min
                            newRow[key + "_max"] = max

                        }
                        else {

                            newRow[key] = NaN
                        }

                    }
                    // Averaging is 1 - just use the row's current value
                    else {
                        newRow[key] = newRow[key1]
                    }


                })
            })
            // "Moment Variance" is the variance of the averaged bands - used to find a good place to start relative
            newRow["momentVariance"] = d3.variance(bandVarianceArr)

            // Calculate variance from each channel
            channels.forEach(channel => {
                var key = "RAW_" + channel

                var keyNew = channel + "_variance_avg" + roundN
                var avgArray = []
                for (let a = i - roundN_half; a < i + roundN_half; a++) {
                    var row = rows[a]

                    let val = row[key]
                    if (!isNaN(val)) {
                        avgArray.push(val)
                    }

                }
                if (avgArray.length > roundN_half) {
                    let variance = d3.variance(avgArray)
                    newRow[keyNew] = variance
                }
            })
            newRow["vector_avg" + roundN] = getRootVector(newRow) // Compute the averaged vector


        }
    }


}

// Mind Link
function processDataMindLink(rows) {
    console.log("----- MINDLINK ------")
    let first_timestamp = parseInt(rows[0].timestampMs)
    let f = "YYYY-MM-DD HH:mm "
    let d = moment(first_timestamp).format(f)

    var returnObj = {}
    returnObj.filename = d
    returnObj.date = d


    // Clean Data
    for (let r = 0; r < rows.length; r++) {
        let row = rows[r]

        // "2022-09-22 17:00:02"
        let timestamp = row.timestampMs
        row.valid = true
        if (row.poorSignal > 1) row.valid = false
        if (row.timestampMs == "timestampMs") row.valid = false
        row.seconds = Math.round((timestamp - first_timestamp) / 1000)
        row.secondsFull = Math.round(timestamp / 1000)
        row.minutes = Math.round(row.seconds / 60)

        row.tag = row.tagEvent

    }
    console.log("--> Removing " + rows.filter(row => row.valid == false).length + " invalid rows")

    rows = rows.filter(row => row.valid == true)


    let last_timestamp = rows.slice(-1)[0].timestampMs
    let total_seconds = Math.round((last_timestamp - first_timestamp) / 1000)
    let standardRows = []
    for (var s = 0; s < total_seconds; s++) {
        let row = rows.filter(r => r.seconds == s)[0]
        if (row) standardRows.push(row)
    }

    let avgLow = averageRowsMindLink(clone(standardRows), 60)
    let avgHigh = averageRowsMindLink(clone(standardRows), 10)
    let avgMax = averageRowsMindLink(clone(standardRows), standardRows.length / 100)
    let avg10 = averageRowsMindLink(clone(standardRows), standardRows.length / 10)

    returnObj.raw = clone(standardRows)
    returnObj.lowRes = avgLow
    returnObj.highRes = avgHigh
    returnObj.avg10 = avg10
    returnObj.averageMax = avgMax
    postMessage(JSON.stringify(returnObj))

}
function averageRowsMindLink(rows, roundN) {


    roundN = Math.floor(roundN)


    let roundN2 = Math.round(roundN / 2)
    if (roundN2 <= 5) {
        rows.map(row => row.vector = getRootVectorMindLink(row))
        return rows
    }
    let newRows = []

    if (roundN2 < 1) { roundN2 = 1; roundN = 2 }
    var firstSeconds = rows[0].seconds

    for (let i = roundN2 + 1; i < rows.length - roundN2 - 5; i = i + roundN) {

        let newRow = {}
        let seconds = rows[i].seconds
        let minutes = rows[i].minutes
        newRow.firstSeconds = firstSeconds  // Used by charts to measure the visual offset
        newRow.seconds = seconds
        newRow.minutes = minutes
        newRow.tag = rows[i].tag

        let rawSeconds = rows[i].secondsFull
        let roundedSeconds = Math.round(rawSeconds / roundN2) * roundN2
        newRow.secondsFull = roundedSeconds

        bands_mindlink.forEach(band => {
            let avgArray = []
            for (let a = i - roundN2; a < i + roundN2; a++) {

                let val = parseInt(rows[a][band])


                if (rows[a].valid) {

                    if (val > 0 && val < 20000) avgArray.push(val)
                }

            }

            if (avgArray.length > 0) {


                let avg = round(d3.quantile(avgArray, 0.5))
                let max = round(d3.quantile(avgArray, 0.95))
                let min = round(d3.quantile(avgArray, 0.05))
                newRow[band] = avg
                newRow[band + "_min"] = min
                newRow[band + "_max"] = max

            }
            else {
                //console.log ("fail")
                newRow[band] = NaN
            }
        })
        newRow.vector = getRootVectorMindLink(newRow) // Compute the averaged vector
        newRows.push(newRow)
    }
    return newRows

}
