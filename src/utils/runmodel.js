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
export function buildModel(vectors) {
    // Builds the AI model using a collection of input vectors
    // These vectors are the raw (but averaged) values for each band/channel
    // Okay to use a mix of the "standard" vectors plus a few user vectors
    // Does not return x-y points - for that, need to call "run model" using the parameters set by this function


    pca(vectors)

    // Build x-y points for each waypoint and store them
    let points = runModel(waypoints.map(e => e.relative_vector_avg60))

    var i = 0
    waypoints.map(waypoint => {
        waypoint.coordinates = points[i]
        i++
    })


}

export function rebuildChart(settings = { autoClusters: true, updateCharts: true }) {
    
    state.zoom = 1

    // Remove waypoints from users de-selected by user
    waypoints.forEach(waypoint => {
        waypoint.match = state.selected_users.includes(waypoint.user)
    })
    waypoints.forEach(waypoint => {
        if (waypoint.hide == true) waypoint.match = false
    })

    var filtered_waypoints_user = waypoints.filter(e => e.match == true)

    // Tests for data quality
    if (state.data == null) {
        // Only plot the waypoints - user hasn't loaded data yet

        let vectors = waypoints.filter(w => w.match == true).map(e => e.relative_vector_avg60)
        buildModel(vectors)
        updateChartWaypoints()
        return
    }
    if (filtered_waypoints_user.length == 0) {
        console.error("No Waypoints?")
        
    }

    // Find nearby waypoints to user's data - use every 60 seconds
    state.data.forEach(entry => entry.relative_vector_avg1 = getRelativeVector(entry, 1))
    state.data.forEach(entry => entry.relative_vector_avg10 = getRelativeVector(entry, 10))
    state.data.forEach(entry => entry.relative_vector_avg60 = getRelativeVector(entry, 60))

    // Find Clusters 
    // -- Uses a k-means library to tag each row with a cluster number, and finds a "mean" vector for each cluster
    // -- Every row will now have a key "cluster_avg1" (or 10, 60) with the cluster number
    // -- A new key "cluster_means_avg1" (or 10, 60) is assigned to 'state' with the means for each vector
    disableLogging()
    function findClusters(avg) {
        var kmeansResult
        var points = state.data.map(e => e["relative_vector_avg" + avg]).filter(e => e != null)
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
            state.data[i]["cluster_avg" + avg] = clusterNumber
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


    }
    findClusters(1)
    findClusters(10)
    findClusters(60)
    enableLogging()

    // Find closest row to each mean cluster vector
    // -- Using the mean vectors found for each cluster, loop through each row tagged with that cluster and find the closest row to that mean (using cosine)
    // -- The purpose of this is to get a row with the original band-channel values, rather than the already relativized mean vector

    function findClosestClusterRow(avg) {
        let means = state["cluster_means_avg" + avg]
        means.forEach(mean => {

            let i = mean.id
            // Filter the rows which are in this cluster
            var clusterRows = state.data.filter(row => row["cluster_avg" + avg] == i)

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
            let similarityTimeseries = state.data.map(row => {
                var cosine = cosineSimilarity(row["relative_vector_avg" + avg], bestRow["relative_vector_avg" + avg])
                return {
                    seconds: row.seconds,
                    cosine: cosine
                }

            })
            mean.similarityTimeseries = similarityTimeseries
            mean.bestFullMatch = bestRow
            mean.keyValues = getRootVector(bestRow, 60) // This will be what is actually recorded as the cluster mean vector - the original keys, so a relative vector can be re-build from it

        })
    }
    findClosestClusterRow(60)
    findClosestClusterRow(10)
    findClosestClusterRow(1)





    var userVectors = state.data.map(e => e.relative_vector_avg10).filter(e => e != null)
    var distanceIds = {}
    userVectors.forEach(uservector => {

        filtered_waypoints_user.forEach(waypoint => {

            var id = waypoint.id
            var distance = measureDistance(uservector, waypoint.relative_vector_avg60)


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
    if (state.limitMatches) {

        filtered_waypoint_ids =
            distances
                //.filter(e => e[1] > minimumMatch)
                .slice(0, maxWaypoints)
                .map(e => e[0])
    }
    else {
        // Use ALL waypoints
        filtered_waypoint_ids = filtered_waypoints_user.map(e => e.id)
    }

    if (filtered_waypoint_ids.length == 0) {
        alert("zero waypoints selected!")
        return
    }
    // Update ALL waypoints with match=true if their ids match
    waypoints.forEach(waypoint => {

        if (filtered_waypoint_ids.includes(waypoint.id)) {
            waypoint.match = true

        }
        else waypoint.match = false
    })
    var filtered_waypoints = waypoints.filter(e => e.match == true)

    // Re-build the PCA using only the top-N waypoints
    //let vectors = waypoints.filter(w => w.match == true).map(e => getRelativeVector(e.vector))

    // Rebuild PCA using the USER's data (seems to give much better results that top N vectors)

    buildModel(userVectors)

    // Find similarity to each waypoint for each row
    function addWaypointDistances(rows) {
        rows.forEach(row => {
            var relativeVector = getRelativeVector(row.vector)
            row.relative_vector = relativeVector
            var distances = []
            filtered_waypoints.forEach(waypoint => {

                var distance = measureDistance(relativeVector, waypoint.relative_vector)


                var label = waypoint.label + " (" + waypoint.user + ")"

                distances.push({ label: label, distance: distance, waypoint: waypoint })

            })
            distances.sort(function (a, b) {
                return b.distance - a.distance
            })

            row.distances = distances

        })


    }

    // Make an array of similarities in each waypoint
    waypoints.forEach(waypoint =>
        {
            let avg = waypoint.averaging
            var timeseriesSimilarity = state.data.map(row => 
                {
                    let rowVector = row["relative_vector_avg" + avg]
                    let cosine = cosineSimilarity(rowVector, waypoint["relative_vector_avg" + avg] )
                    return {
                        seconds: row.seconds,
                        cosine: cosine
                    }
                }
                )
            waypoint.timeseriesSimilarity = timeseriesSimilarity.filter(e => e.cosine != undefined)

        })
    
    if (settings.updateCharts == true) {
        updateAllCharts()
    }
    if (settings.updateGraphs == true) {
        updateClusterGraphs()
    }


}