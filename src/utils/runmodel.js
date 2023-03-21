import { dot, buildVector, pca, findSlope, runModel, measureDistance, cosineSimilarity, euclideanDistance, combinedDistance, getVectorKeys } from "../utils/analysis";
import { state } from "../index.js"
import { updateChartWaypoints } from "./3d_charts";
import { updateClusters } from "../pages/clusters";
import kmeans from '@jbeuckm/k-means-js'
import { phamBestK } from '@jbeuckm/k-means-js'
import { updateAllCharts } from "../pages/map";
import { waypoints } from "./database";
import { disableLogging, enableLogging } from "./functions";
import { computeRobustMean } from "./vectorMedians";
const d3 = require("d3");

const maxWaypoints = 5  // Take top N waypoints sorted by cosine distance to user's data


export function rebuildChart(autoClusters = true) {


    // Tests for data quality
    if (state.data.validated == null) {
        console.log("Plotting only waypoints, no user points yet")
        // Only plot the waypoints - user hasn't loaded data yet

        let vectors = waypoints.filter(waypoint => waypoint["relative_vector_avg60"] != null).map(waypoint => waypoint["relative_vector_avg60"])
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

            waypoint["projected_avg" + 60] = { match: waypoint.match, x: xi, y: yi, z: zi, id: entry.id, label: waypoint.label, user: waypoint.user, coordinates: [xi, yi, zi] }
            i++

        })
        updateChartWaypoints()
        return
    }
    else {
        state.zoom = 1

        rebuild(state.resolution, autoClusters)
        var enforceWaypoints = false    
        if (enforceWaypoints == true && waypoints.filter(waypoint => waypoint["relative_vector_avg" + state.resolution] != null).length == 0) {
            console.error("No waypoints with this resolution! Skipping map")
        }

        else {
            // Update the map if we're on the map page
            var page = window.location.toString().split("/").slice(-1)[0].split(".")[0]
            switch (page) {
                case "map":
                    updateAllCharts()
                    break
                case "clusters":
                    updateClusters()
                    break
            }



        }

    }

}

function rebuild(avg, autoClusters) {
    // Calculate vector for each moment of user data
    
    console.log("building user vectors")
    state.data.validated.forEach(entry => entry["relative_vector_avg" + avg] = buildVector(entry, avg, state.vectorType))
    
    var userPoints = state.data.validated.filter(entry => entry["relative_vector_avg" + avg] != null)
    //console.log("userPoints:")
    //console.log(userPoints)

    if (userPoints.length == 0) {
        console.error("No user points found with avg: " + avg + " and type: " + state.vectorType)
        return
    }
    
    // Reset the projections for each waypoint
    waypoints.forEach(waypoint => {
        waypoint["projected_avg" + avg] = null
    })

    // Filter out any waypoints that don't have a vector for this resolution    
    let waypointsAvg = waypoints.filter(waypoint => waypoint["relative_vector_avg" + avg] != null && waypoint.type == state.vectorType)
    
    // If no waypoints have a vector for this resolution, use the 60-second resolution
    var skipWaypoints = false
    if (waypointsAvg.length == 0) {
        console.error("No waypoints found with avg: " + avg + " and type: " + state.vectorType)
        //waypoints.forEach(waypoint => waypoint["relative_vector_avg" + avg] = waypoint["relative_vector_avg60"])
        //waypointsAvg = waypoints
        skipWaypoints = true

    }


    // Find Clusters 
    // -- Uses a k-means library to tag each row with a cluster number, and finds a "mean" vector for each cluster
    // -- Every row will now have a key "cluster_avg1" (or 10, 60) with the cluster number
    // -- A new key "cluster_means_avg1" (or 10, 60) is assigned to 'state' with the means for each vector
    disableLogging()

    var kmeansResult
    var points = userPoints.map(e => e["relative_vector_avg" + avg])
    if (points.length == 0) console.error("Only null vectors found in data!")


    var clusters = state.clusters
    if (autoClusters == true) {
        // Find best number of clusters
        var maxKToTest = 10;
        var result = phamBestK.findBestK(points, maxKToTest);
        //console.log("Best cluster count: " + result.K)
        clusters = result.K

    }
    enableLogging()

    // Automatically update the checkboxes for "clusters" to the auto-generated number
    d3.selectAll(".clusters-checkbox").property("checked", false)
    d3.select("#cluster" + clusters).property("checked", true)


    // Find Clusters
    var kmeansResult = kmeans.cluster(points, clusters)

    // Assign cluster numbers to every data point
    
    for (let i in kmeansResult.assignments) {
        var clusterNumber = kmeansResult.assignments[i]
        userPoints[i]["cluster_avg" + avg] = clusterNumber
    }
    
    // Find mean vectors for each cluster using a robust method which excludes outliers
    var means = []
    for (let i = 0; i < clusters; i++) {

        var clusterRows = userPoints.filter(row => row["cluster_avg" + avg] == i)
        if (clusterRows.length == 0)
        {
            console.error("No rows found for cluster " + i)
            
        }
        else 
        {
            //console.log("found rows")
            //console.log(clusterRows[0])
        }
        var vectors = clusterRows.map(row => row["relative_vector_avg" + avg])        
        var mean = computeRobustMean(vectors)                
        var entry = {
            vector: mean,
            id: i
        }
        // check if 'mean' has null values
        if (!mean.some(isNaN)) 
        {
            means.push(entry)
        }
        else
        {
            console.error("mean has null values!")
            console.log(mean)
        }
        
    }
    if (means.length == 0)
    {
        console.error("No means found")
        return
    }

    // Order the clusters by when they first appear in the data
    const fullClusterOrder = userPoints.map(row => row["cluster_avg" + avg])
    const clusterOrder = Array.from(new Set(fullClusterOrder)).filter((num, index, array) => {
        return array.indexOf(num) === index;
    });
    
    clusterOrder.forEach((cluster, index) => {
        
        means[cluster].order = index
    })
    means.sort((a, b) => (a.order > b.order) ? 1 : -1)

    // Check if this cluster has already been added as a waypoint
    if (skipWaypoints == false) {
        means.forEach(cluster => {
            var bestWaypointMatch = waypointsAvg.map(waypoint => {
                var dist = euclideanDistance(waypoint["relative_vector_avg" + state.resolution], cluster.vector)
                return { dist: dist, waypoint: waypoint }
            }).sort((a, b) => b.dist - a.dist)[0]
            

            if (bestWaypointMatch.dist > 50) {
                cluster.alreadyAdded = true
            }
            else {
                cluster.alreadyAdded = false
            }
        })

    }




    state["cluster_means_avg" + avg] = means


    // Find closest row to each mean cluster vector
    // -- Using the mean vectors found for each cluster, loop through each row tagged with that cluster and find the closest row to that mean (using cosine)
    // -- The purpose of this is to get a row with the original band-channel values, rather than the already relativized mean vector
    means.forEach(mean => {

        let i = mean.id
        // Filter the rows which are in this cluster
        var clusterRows = userPoints.filter(row => row["cluster_avg" + avg] == i)

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
        if (bestRow == null)
        {
            console.error("No best row found for cluster " + i)
            bestRow = {}
            bestRow["relative_vector_avg" + avg] = mean.vector
        }

        // Take the best match and make a timeseries of matches with every other point in this recording
        let similarityTimeseries = userPoints.map(row => {
            var cosine = cosineSimilarity(row["relative_vector_avg" + avg], bestRow["relative_vector_avg" + avg])
            var euclidean = euclideanDistance(row["relative_vector_avg" + avg], bestRow["relative_vector_avg" + avg])
            var combined = (cosine + euclidean) / 2
            return {
                seconds: row.seconds,
                cosine: cosine,
                euclidean: euclidean,
                combined: combined
            }

        })
        mean.similarityTimeseries = similarityTimeseries
        mean.bestFullMatch = bestRow
        mean.powersAbsolute = getVectorKeys(bestRow, avg, "absolute")
        mean.powersRelative = getVectorKeys(bestRow, avg, "relative")
        mean.powersChange = getVectorKeys(bestRow, avg, "change")
        mean.startSecond = bestRow.startSecond
        mean.changeSeconds = bestRow.changeSeconds

    })

    if (skipWaypoints == false) {
        // Find the best matches from existing waypoints, using these new means    
        var distanceIds = {}
        means.forEach(mean => {

            waypointsAvg.forEach(waypoint => {

                var id = waypoint.id

                var distance = measureDistance(mean.vector, waypoint["relative_vector_avg" + avg])


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
            filtered_waypoint_ids = waypointsAvg.map(e => e.id)
        }

        // Update ALL waypoints with match=true if their ids match
        waypointsAvg.forEach(waypoint => {

            if (filtered_waypoint_ids.includes(waypoint.id)) {
                waypoint.match = true

            }
            else waypoint.match = false
        })

        // Re-build the PCA using only the top-N waypoints
        var topNwaypoint = waypointsAvg.filter(waypoint => waypoint.match == true && waypoint["relative_vector_avg" + avg]).map(waypoint => waypoint["relative_vector_avg" + avg])
        if (topNwaypoint.length == 0) {
            console.error("No waypoints found for PCA! - Using ALL waypoints")
            waypoints.forEach(waypoint => {
                waypoint.match = true
            })
            topNwaypoint = waypointsAvg.map(waypoint => waypoint["relative_vector_avg" + avg])
        }

        pca(topNwaypoint, avg)

        // Build x-y points for each waypoint and store them
        let waypointCoordinates = runModel(waypointsAvg.map(e => e["relative_vector_avg" + avg]), avg)
        var i = 0
        waypointCoordinates.forEach(entry => {

            var xi = entry[0]
            var yi = entry[1]
            var zi = entry[2]
            var waypoint = waypointsAvg[i]

            waypoint["projected_avg" + avg] = { match: waypoint.match, x: xi, y: yi, z: zi, user: waypoint.user, id: entry.id, label: waypoint.label, coordinates: [xi, yi, zi] }
            i++

        })




        // Make an array of similarities in each waypoint
        waypointsAvg.forEach(waypoint => {
            let avg = waypoint.averaging
            let waypointVector = waypoint["relative_vector_avg" + avg]
            var timeseriesSimilarity;
            if (waypointVector == null) {
                console.error("Waypoint does not have vector with this avg: " + avg)
            }
            else {
                var timeseriesSimilarity = userPoints.map(row => {
                    let rowVector = row["relative_vector_avg" + avg]

                    let cosine = cosineSimilarity(rowVector, waypointVector)
                    let euclidean = euclideanDistance(rowVector, waypointVector)
                    var combined = (cosine + euclidean) / 2
                    return {
                        seconds: row.seconds,
                        cosine: cosine,
                        euclidean: euclidean,
                        combined: combined
                    }
                }
                )
                waypoint["timeseriesSimilarity_avg" + state.resolution] = timeseriesSimilarity.filter(e => e.cosine != undefined)

            }



        })
    }
    else
    {
        pca(userPoints.map(e => e["relative_vector_avg" + avg]), avg)
    }

    // Run PCA on user points
    var vectors = userPoints.map(e => e["relative_vector_avg" + avg]).filter(e => e != null)
    var mapped = runModel(vectors, avg)
    var index = 0
    var size = mapped.length
    mapped.forEach(entry => {

        var percent = index / size
        var moment = userPoints[index]
        var xi = entry[0]
        var yi = entry[1]
        var zi = entry[2]

        index++

        moment["projected_avg" + avg] = { x: xi, y: yi, z: zi, percent: percent, cluster: moment["cluster_avg" + avg] }

    })
    state.data.mapped = userPoints





}