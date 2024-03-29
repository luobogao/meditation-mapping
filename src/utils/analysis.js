import { ratio, clone } from "../utils/functions";
import { state } from "../index"

const d3 = require("d3");
const math = require("mathjs");

const channels = ["TP9", "TP10", "AF7", "AF8"]
const bands = ["Delta", "Theta", "Alpha", "Beta", "Gamma"]

const band_channels = []
bands.forEach(band => {
    channels.forEach(channel => {
        band_channels.push(band + "_" + channel)
    })
})

export function dot(a, b)
// Dot product
{
    var d = 0
    for (var i = 0; i < a.length; i++) {
        var sum = a[i] * b[i]
        d = d + sum
    }
    return d

}
var means = []
var maxes = []
var principals = []
var modelType = "cosine" // How to measure variances
var standardizeType = "ratio" // raw, ratio, or normal
var distanceType = "combined"
var eucAdjust = 0.8           // How much to adjust the Euclidean measurement compared with cos. 0.8 seems good to even out the cos data, anything more is far too dramatic
const vector_columns_muse = [
    "Delta_TP9", "Theta_TP9", "Alpha_TP9", "Beta_TP9", "Gamma_TP9",
    "Delta_TP10", "Theta_TP10", "Alpha_TP10", "Beta_TP10", "Gamma_TP10",
    "Delta_AF7", "Theta_AF7", "Alpha_AF7", "Beta_AF7", "Gamma_AF7",
    "Delta_AF8", "Theta_AF8", "Alpha_AF8", "Beta_AF8", "Gamma_AF8"
]
const vector_columns_mindlink = ["delta", "theta", "alphaLow", "alphaHigh", "betaLow", "betaHigh", "gammaLow", "gammaMid"]


function round(v) {
    return parseFloat(v.toFixed(3))
}
export function measureDistance(a, b) {
    switch (distanceType) {
        case "euclidean":
            return euclideanDistance(a, b)
            break;
        case "cosine":
            return cosineSimilarity(a, b)
            break;
        case "combined":
            return combinedDistance(a, b)
            break;
    }
}
export function combinedDistance(a, b) {
    var cos = cosineSimilarity(a, b)
    var euc = euclideanDistance(a, b)

    var combined = Math.sqrt((Math.pow(cos, 2) + (Math.pow(eucAdjust * euc, 2)))) / Math.sqrt(2)
    //var combined = Math.sqrt(cos * euc)
    if (cos < 0) combined = -1 * combined
    return round(combined)

}
export function cosineSimilarity(a, b)
// Cosine Similarity - used to find how similar to high-dimensional vectors are to each other
// Different from Eucleadean distance because it cares more about direction than magnitude
// I propose that this measurement is best for measuring the "style" of a meditation vs the strength
{
    if (a != null && b != null && a.length > 0 && b.length > 0 && a.length == b.length) {
        var similarity = dot(a, b) / (Math.sqrt(dot(a, a)) * Math.sqrt(dot(b, b)))
        similarity = Math.round(similarity * 10000) / 100
        //if (similarity < 0) similarity = 0
        return round(similarity)
    }

}

export function euclideanDistance(vector1, vector2) {
    if (vector1 == null || vector2 == null || vector1.length !== vector2.length) {
        console.error("Vectors are null or wrong size")
        return 0
    }

    let distance = 0;
    for (let i = 0; i < vector1.length; i++) {
        distance += (vector1[i] - vector2[i]) ** 2;
    }

    distance = Math.sqrt(distance);

    return 100 - (150 * distance / Math.sqrt(vector1.length));
}

export function getVectorKeys(row, avg, type) {

    var data = {}

    // Depending on the type of data, we need to use different columns    
    vector_columns_muse.forEach(key => {
        data[key] = row[key + "_avg" + avg + "_" + type]
    })
    
    return data
}
export function getRootVectorMindLink(row) {
    var data = {}
    vector_columns_mindlink.forEach(key => {
        data[key] = row[key]
    })
    return data
}

export function buildVector(entry, avg, type) {

    
    var vector

    switch (standardizeType) {
        case "raw":
            vector = vectorRaw(entry, avg, type) // don't standardize at all - use raw values for each band+channel
            break;
        case "ratio":
            vector = vectorRatio(entry, avg, type) // standardize by dividing each band by tp10/tp9 and af7/af8, etc
            break;
        case "normal":
            vector = vectorNormalRatio(entry, avg, type) // Normalize by taking the % of total channel power for each band, then divide just like ratio type
            break;

    }
    
    if (vector == null || vector.some(e => e == null)) {
        
        return null
        
    }
    else return vector

}
export function vectorRaw(row, avg, type) {

    var vector = []
    
    
    channels.forEach(channel => {
        bands.forEach(band => {
            var key = band + "_" + channel + "_avg" + avg + "_" + type
            var value = Math.log(row[key])
            vector.push(value)
        })
    })
    
    if (vector.some(e => isNaN(e))) {
        return null
    }
    else return vector

}

function vectorNormalRatio(row, avg) {
    // Just like 'ratio' type, but first normalizes the channels data - this helps to avoid drifting channel powers
    var normal = {}
    channels.forEach(channel => {
        var totalPower = d3.sum(bands.map(band => row[band + "_" + channel + "_avg" + avg]))
        bands.forEach(band => {
            var key = band + "_" + channel + "_avg" + avg
            var normalValue = row[key] / totalPower
            normal[key] = normalValue
        })

    })

    var ratio = vectorRatio(normal)
    return ratio
}
export function vectorRatio(row, avg,type) {
    var vector = []

    function ratioMuse() {

        var ratios = state.modelRatios
        var bands = state.modelBands
        
        bands.forEach(band => {
            ratios.forEach(ratio_keys => {
                var key = band + "_" + ratio_keys[0] + "_avg" + avg + "_" + type
                var key2 = band + "_" + ratio_keys[1] + "_avg" + avg + "_" + type
                var value = Math.log(row[key] / row[key2])

                vector.push(value)
            })
        })




    }

    function ratioMindLink() {
        var numers = ["delta", "theta", "alphaLow", "alphaHigh", "betaLow", "betaHigh",]
        var denoms = ["gammaLow", "gammaMid"]

        numers.forEach(numer => {
            denoms.forEach(denom => {
                if (numer != denom) {
                    var r = ratio(row[numer], row[denom])
                    vector.push(r)
                }

            })
        })
    }


    switch (state.device) {
        case "Muse":
            ratioMuse();
            break;
        case "MindLink":
            ratioMindLink()
            break;
    }
    if (vector.some(e => isNaN(e))) {
        return null
    }
    else return vector

}

export function covariance(x, y, matrix) {
    // Covariance of the two columns x and y in a matrix
    // Similar to standard variance measurement, except two values are used 
    // Required for PCA analysis
    var sum = 0
    for (var i = 0; i < matrix.length; i++) {
        let row = matrix[i]
        let v = row[x] * row[y]
        sum += v
    }
    var c = sum / (matrix.length - 1)
    return c
}
export function cosineV(x, y, matrix) {
    var sum = 0
    for (var i = 0; i < matrix.length; i++) {
        let row = matrix[i]
        let v = row[x] * row[y]
        sum += v
    }

    return sum
}

export function subtract_means(matrix)
// Note: Mean subtraction is a standard part of PCA analysis, but not necessary when the vectors are already standardized ratios

// Subtracts the mean of each column from each value
// required for PCA analysis, this standardizes rows prior to variance
{

    var mean_subtracted_matrix = []
    for (var r = 0; r < matrix.length; r++) {
        var row = matrix[r]
        var new_row = []
        for (var c = 0; c < row.length; c++) {
            var new_value = row[c] - means[c]
            new_row.push(new_value)
        }
        mean_subtracted_matrix.push(new_row)
    }
    return mean_subtracted_matrix




}
export function unit_scaling(matrix) {
    var unit_scaled_matrix = []
    for (var r = 0; r < matrix.length; r++) {
        var row = matrix[r]
        var new_row = []
        for (var c = 0; c < row.length; c++) {
            var new_value = row[c] / maxes[c]
            new_row.push(new_value)
        }
        unit_scaled_matrix.push(new_row)
    }
    return unit_scaled_matrix
}
export function covarianceMeans(matrix) {
    // Prepares a covariance matrix using mean-subtraction and standard covariance formula

    // Subtract mean from each value in original matrix
    var mean_subtracted_matrix = subtract_means(matrix)
    var covariance_matrix = []

    for (var a = 0; a < matrix[0].length; a++) {
        var new_row = []
        for (var b = 0; b < matrix[0].length; b++) {
            var c = covariance(a, b, mean_subtracted_matrix)
            new_row.push(c)
        }
        covariance_matrix.push(new_row)
    }
    return covariance_matrix
}

export function covarianceCosine(matrix) {
    var unit_scaled_matrix = unit_scaling(matrix)


    //var unit_scaled_matrix = subtract_means(matrix)
    var cosineSimilarity_matrix = []
    for (var a = 0; a < matrix[0].length; a++) {
        var new_row = []
        for (var b = 0; b < matrix[0].length; b++) {
            var c = cosineV(a, b, unit_scaled_matrix)

            new_row.push(c)
        }
        cosineSimilarity_matrix.push(new_row)
    }
    return cosineSimilarity_matrix

}

export function covarianceMatrix(matrix) {
    switch (modelType) {
        case "covariance":
            return covarianceMeans(matrix)
        case "cosine":
            return covarianceCosine(matrix)
    }


}

export function pca(data, avg)
// Pricipal Component Analysis
// Takes a matrix and finds a single 2-d vector which can generate a 2-d map of this data
{

    if (data.length == 0) {
        console.error("calling PCA with no data!")
        return
    }
    

    // Starting matrix
    var matrix = clone(data)

    // Find means and maxes (of each column)
    // Used by various models to make the covariance matrix
    means = [] // reset 
    maxes = [] // rest

    for (var i = 0; i < matrix[0].length; i++) {
        let column = matrix.map(e => e[i])
        var max = d3.max(column.map(e => Math.abs(e)))

        maxes.push(max)
        means.push(d3.mean(column))

    }

    var covariance_matrix = covarianceMatrix(matrix)

    // Eigenvectors
    var e = math.eigs(covariance_matrix)
    var eigen_values = e.values
    var eigen_vectors = e.vectors


    // View the eigen values - largest indicate best match
    var total_values = d3.sum(eigen_values)
    const dimensions = 3
    var top = d3.sum(eigen_values.slice(-1 * dimensions))
    var percent_match = Math.round(100 * top / total_values)
    
    //console.log("--> Top " + dimensions + " vector match " + percent_match + "% of variance")
    state.model.percentMatch = percent_match

    // Take only the two largest vectors (this involves taking the last two COLUMNS of EACH vector)
    var take_N = eigen_vectors.map(e => [e[e.length - 1], e[e.length - 2], e[e.length - 3]])
    var principals = math.transpose(take_N)
    state.models["principals_avg" + avg] = principals

}

export function prepareDataset(rows) {
    switch (modelType) {
        case "covariance":
            return math.transpose(subtract_means(rows))

        case "cosine":
            return math.transpose(unit_scaling(rows))
    }

}

export function runModel(rows, avg)
// Takes rows of vectors calculated from the Muse data, and the principals (output from PCA export function)
// Returns a list of x-y points, the location on 2-d space for each of those vectors

{
    var d = prepareDataset(rows)
    var mappedCoordinates = math.transpose(math.multiply(state.models["principals_avg" + avg], d))
    return mappedCoordinates
}



