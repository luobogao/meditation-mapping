
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
            row.vector = getRootVector(row)
            standardRows.push(row)
        }
    }
    
    var lowResolution = 60   // average over 60 seconds
    var highResolution = 10  // average over 10 seconds

    // Long duration meditations should using longer rounding
    if (total_hours > 0.8) {

    }

    // Perform two different rounding operations with different average N
    let raw = averageRows(clone(standardRows), 1)
    let averageHighRes = averageRows(clone(standardRows), highResolution)
    let averageLowRes = averageRows(clone(standardRows), lowResolution)
    let average10 = averageRows(clone(standardRows), standardRows.length / 10)
    let averageMax = averageRows(clone(standardRows), standardRows.length / 100)


    if (averageLowRes.length < 3) {
        console.error("Meditation session was too short: " + averageLowRes.length + " minutes")
    }

    returnObj.raw = clone(standardRows)
    returnObj.lowRes = averageLowRes
    returnObj.highRes = averageHighRes
    returnObj.avg10 = average10
    returnObj.averageMax = averageMax
    returnObj.raw = raw

    console.log(averageLowRes.slice(-10)[0])

    // Find the first and last timestamp for timeseries chart x-axis
    const first_seconds = standardRows[0].seconds
    const last_seconds = standardRows.slice(-1)[0].seconds
    returnObj.seconds_low = first_seconds
    returnObj.seconds_high = last_seconds

    // Data is ready for plotting
    averageLowRes.forEach(entry => {
        //console.log(getRootVector(entry)) show all vectors
    })

    postMessage(JSON.stringify(returnObj))


}

function averageRows(rows, roundN) {


    console.log("----> Rounding with " + roundN + " in " + rows.length + " rows")
    var firstSeconds = rows[0].seconds
    var lastSeconds = rows.slice(-1)[0].seconds
    var totalSeconds = lastSeconds - firstSeconds
    var secondsPerN = totalSeconds / roundN
    roundN = Math.round(roundN)

    // Less than ten second rounding or less than ten points - just return raw array, with the basics added
    if (roundN < 10 || secondsPerN < 10) {

        
        rows.forEach(row => 
            {
                row.vector = getRootVector(row)
                row.percent = (row.seconds - firstSeconds) / totalSeconds
            }
            )
        return rows
    }
    else {
        const roundN_half = Math.round(roundN / 2)
        let newRows = []

        for (let i = roundN_half + 1; i < rows.length - roundN_half; i = i + roundN) {
            if (i < rows.length) {
                let row = rows[i]
                let newRow = {}
                newRow.firstSeconds = firstSeconds
                newRow.seconds = row.seconds
                newRow.minutes = row.minutes

                newRow.percent = (row.seconds - firstSeconds) / totalSeconds

                // Average each band + channel
                bands.forEach(band => {
                    channels.forEach(channel => {
                        let avgArray = []
                        const key = band + "_" + channel // "Gamma_TP10"

                        for (let a = i - roundN_half; a < i + roundN_half; a++) {
                            var row = rows[a]

                            let val = row[key]
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
                            newRow[key + "_min"] = min
                            newRow[key + "_max"] = max

                        }
                        else {

                            newRow[key] = NaN
                        }

                    })
                })

                newRow.vector = getRootVector(newRow) // Compute the averaged vector

                newRows.push(newRow)

            }
        }
        return newRows
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
