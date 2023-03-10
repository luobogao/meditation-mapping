import { dot, getRelativeVector, pca, findSlope, runModel, measureDistance, cosineSimilarity, euclideanDistance, combinedDistance } from "../utils/analysis";
import { state } from "../index.js"
import { updateChartWaypoints } from "./3d_charts";
import { updateGraphs } from "../pages/graphs";
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
    console.log("--- Rebuilding Models ---")
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
        alert("No Waypoints?")
        return
    }

    // Find nearby waypoints to user's data - use every 60 seconds
    state.data.forEach(entry => entry.relative_vector_avg1 = getRelativeVector(entry, 1))
    state.data.forEach(entry => entry.relative_vector_avg10 = getRelativeVector(entry, 10))
    state.data.forEach(entry => entry.relative_vector_avg60 = getRelativeVector(entry, 60))

    // Find Clusters
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
        means = means.map(mean => {return mean.map(v => Math.round(v))} )
        state["cluster_means_avg" + avg] = means

        // Measure the cosine similarity to every point in the meditation for each mean
        var cluster_i = -1
        var meanSimilarities = means.map(meanVector => {
            var seconds = 0
            var similarityTimeseries = points.map(point => {
                var score = cosineSimilarity(point, meanVector)
                seconds ++
                return {
                    seconds: seconds,
                    cosine: score
                }
            }).filter(e => e.cosine != null)
            cluster_i ++
            return {
                similarityTimeseries: similarityTimeseries,
                id: cluster_i,
                vector: meanVector
            }
        })
        state["cluster_means_similarities_avg" + avg] = meanSimilarities

        // Estimate the strongest meditation state in each cluster (NOT USED YET)
        for (let cluster in 0..clusters) {
            var clusterPoints = state.data.filter(point => point["cluster_avg" + avg] == cluster)

            clusterPoints.forEach(point => {
                state.data.map(testpoint => {

                })
            })
        }


    }
    findClusters(10)
    findClusters(60)
    enableLogging()


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
    function waypointMatches(rows, name) {
        waypoints.forEach(waypoint => {
            var matchesTimeseries = []
            for (let x in rows.length) {
                var dist = measureDistance(rows[x].relative_vector, waypoint.relative_vector)
                matchesTimeseries.push({ x: x, y: dist })
            }

            waypoint[name] = matchesTimeseries


        })
    }
    if (settings.updateCharts == true) {
        updateAllCharts()
    }
    if (settings.updateGraphs == true)
    {
        updateGraphs()
    }


}