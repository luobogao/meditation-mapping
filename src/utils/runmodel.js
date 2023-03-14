import { dot, getRelativeVector, pca, findSlope, runModel, measureDistance, cosineSimilarity, euclideanDistance, combinedDistance, getRootVector } from "../utils/analysis";
import { state } from "../index.js"
import { updateChartWaypoints } from "./3d_charts";
import { updateClusterGraphs } from "../pages/clusters";
import kmeans from '@jbeuckm/k-means-js'
import { phamBestK } from '@jbeuckm/k-means-js'
import { updateAllCharts } from "../pages/map";
import { waypoints } from "./database";
import { disableLogging, enableLogging } from "./functions";

const maxWaypoints = 5  // Take top N waypoints sorted by cosine distance to user's data
export function buildModel(vectors, avg) {
    // Builds the AI model using a collection of input vectors
    // These vectors are the raw (but averaged) values for each band/channel
    // Okay to use a mix of the "standard" vectors plus a few user vectors
    // Does not return x-y points - for that, need to call "run model" using the parameters set by this function


    pca(vectors, avg)



}
export function rebuildChart(settings = { autoClusters: true, updateCharts: true }) {
    
    if (waypoints == null || waypoints.length == 0) {
        console.error("No waypoints!")
        return
    }

    // Tests for data quality
    if (state.data.relative == null) {
        console.log("Plotting only waypoints, no user points yet")
        // Only plot the waypoints - user hasn't loaded data yet

        let vectors = waypoints.map(e => e.relative_vector_avg60)
        pca(vectors, 60)
        var mapped = runModel(vectors, 60)
        var i = 0
        mapped.forEach(entry => {
    
            var xi = entry[0]
            var yi = entry[1]
            var zi = entry[2]
            var waypoint = waypoints[i]
            waypoint.match = true
    
            var label = waypoint.user + " " + waypoint.label
    
            waypoint["projected_avg" + 60] = { match: waypoint.match, x: xi, y: yi, z: zi, fullentry: waypoint, id: entry.id, label: label, coordinates: [xi, yi, zi]}
            i ++
    
        })
        updateChartWaypoints()
        return
    }
    else {
        state.zoom = 1
        rebuild(60, settings)
        if (settings.updateCharts == true) {
            updateAllCharts()
        }
        if (settings.updateGraphs == true) {

        }
        updateClusterGraphs()

    }

}

function rebuild(avg, settings) {

    let waypoints = waypoints.filter(waypoint => waypoint["relative_vector_avg" + avg] != null)
    if (waypoints.length == 0) {
        console.error("No waypoints found with avg: " + avg)
        return
    }


    // Find nearby waypoints to user's data - use every 60 seconds
    state.data.relative.forEach(entry => entry["relative_vector_avg" + avg] = getRelativeVector(entry, avg))


    // Find Clusters 
    // -- Uses a k-means library to tag each row with a cluster number, and finds a "mean" vector for each cluster
    // -- Every row will now have a key "cluster_avg1" (or 10, 60) with the cluster number
    // -- A new key "cluster_means_avg1" (or 10, 60) is assigned to 'state' with the means for each vector
    disableLogging()

    var kmeansResult
    var points = state.data.relative.map(e => e["relative_vector_avg" + avg]).filter(e => e != null)
    if (points.length == 0) console.error("Only null vectors found in data!")


    var clusters = state.clusters
    if (settings.autoClusters == true) {
        // Find best number of clusters
        var maxKToTest = 10;
        var result = phamBestK.findBestK(points, maxKToTest);
        //console.log("Best cluster count: " + result.K)
        clusters = result.K

    }

    // Find Clusters
    var kmeansResult = kmeans.cluster(points, clusters)

    // Assign cluster numbers to every data point
    for (let i in kmeansResult.assignments) {
        var clusterNumber = kmeansResult.assignments[i]
        state.data.relative[i]["cluster_avg" + avg] = clusterNumber
    }

    // Cluster means
    var means = kmeansResult.means
    var cluster_i = -1
    means = means.map(mean => {
        cluster_i++
        return {
            vector: mean.map(v => Math.round(v)),
            id: cluster_i
        }
    })
    state["cluster_means_avg" + avg] = means

    enableLogging()

    // Find closest row to each mean cluster vector
    // -- Using the mean vectors found for each cluster, loop through each row tagged with that cluster and find the closest row to that mean (using cosine)
    // -- The purpose of this is to get a row with the original band-channel values, rather than the already relativized mean vector
    means.forEach(mean => {

        let i = mean.id
        // Filter the rows which are in this cluster
        var clusterRows = state.data.relative.filter(row => row["cluster_avg" + avg] == i)

        // Find the best match among the rows
        var bestSimilarity = 0
        var bestRow = null
        clusterRows.forEach(row => {
            var testVector = row["relative_vector_avg" + avg]

            var similarityToMean = cosineSimilarity(testVector, mean.vector)

            if (similarityToMean > bestSimilarity) {

                bestSimilarity = similarityToMean
                bestRow = row

            }

        }
        )

        // Take the best match and make a timeseries of matches with every other point in this recording
        let similarityTimeseries = state.data.map(row => {
            var cosine = cosineSimilarity(row["relative_vector_avg" + avg], bestRow["relative_vector_avg" + avg])
            return {
                seconds: row.seconds,
                cosine: cosine
            }

        })
        mean.similarityTimeseries = similarityTimeseries
        mean.bestFullMatch = bestRow
        mean.keyValues = getRootVector(bestRow, avg) // This will be what is actually recorded as the cluster mean vector - the original keys, so a relative vector can be re-build from it

    })

    var userVectors = state.data.map(e => e["relative_vector_avg" + avg]).filter(e => e != null)
    var distanceIds = {}
    userVectors.forEach(uservector => {

        waypoints.forEach(waypoint => {

            var id = waypoint.id
            var distance = measureDistance(uservector, waypoint["relative_vector_avg" + avg])


            if (id in distanceIds) {
                // This is the best match so far
                if (distanceIds[id] < distance) {
                    distanceIds[id] = distance
                    waypoint.cosineSimilarity = distance
                }

            }
            else {
                distanceIds[id] = distance
            }

        })
    })

    // Sort the waypoint matches by distance
    var distances = Object.entries(distanceIds)
    distances.sort(function (a, b) {
        return b[1] - a[1]
    })

    // Select waypoint IDs to use
    var filtered_waypoint_ids
    if (state.limitMatches == true) {

        filtered_waypoint_ids =
            distances
                //.filter(e => e[1] > minimumMatch)
                .slice(0, maxWaypoints)
                .map(e => e[0])
    }
    else {
        // Use ALL waypoints
        filtered_waypoint_ids = waypoints.map(e => e.id)
    }

    // Update ALL waypoints with match=true if their ids match
    waypoints.forEach(waypoint => {

        if (filtered_waypoint_ids.includes(waypoint.id)) {
            waypoint.match = true

        }
        else waypoint.match = false
    })

    // Re-build the PCA using only the top-N waypoints
    var topNwaypoint = waypoints.filter(waypoint => waypoint.match == true).map(waypoint => waypoint["relative_vector_avg" + avg])
    buildModel(topNwaypoint, avg)

    // Build x-y points for each waypoint and store them
    let waypointCoordinates = runModel(waypoints.map(e => e["relative_vector_avg" + avg]))
    var i = 0
    waypointCoordinates.forEach(entry => {

        var xi = entry[0]
        var yi = entry[1]
        var zi = entry[2]
        var waypoint = topNwaypoint[i]

        var label = waypoint.user + " " + waypoint.label

        waypoint["projected_avg" + avg] = { match: waypoint.match, x: xi, y: yi, z: zi, fullentry: entry, id: entry.id, label: label }
        i ++

    })




    // Make an array of similarities in each waypoint
    waypoints.forEach(waypoint => {
        let avg = waypoint.averaging
        let waypointVector = waypoint["relative_vector_avg" + avg]
        var timeseriesSimilarity;
        if (waypointVector == null) {
            console.error("Waypoint does not have vector with this avg: " + avg)
        }
        else {
            var timeseriesSimilarity = state.data.map(row => {
                let rowVector = row["relative_vector_avg" + avg]

                let cosine = cosineSimilarity(rowVector, waypointVector)
                let euclidean = euclideanDistance(rowVector, waypointVector)
                var combined = (cosine + euclidean) / 2
                return {
                    seconds: row.seconds,
                    cosine: cosine,
                    euclidean: combined
                }
            }
            )
            waypoint.timeseriesSimilarity = timeseriesSimilarity.filter(e => e.cosine != undefined)

        }



    })

    // Run PCA on user points
    var vectors = state.data.relative.map(e => e["relative_vector_avg" + avg]).filter(e => e != null)
    var mapped = runModel(vectors, avg)
    var index = 0
    mapped.forEach(entry => {


        var moment = state.data.relative[index]
        var xi = entry[0]
        var yi = entry[1]
        var zi = entry[2]

        index++

        moment["projected_avg" + avg] = { x: xi, y: yi, z: zi, moment: moment, cluster: moment.cluster_avg10 }

    })





}