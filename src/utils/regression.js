
export function findPolynomial(points) {
    let bestDegree, bestError = Infinity;
    for (let degree = 1; degree <= 3; degree++) {
        const coeffs = findPolynomialCoefficients(points, degree);
        const error = calculatePolynomialError(points, coeffs);
        if (error < bestError) {
            bestDegree = degree;
            bestError = error;
        }
    }
    return findPolynomialCoefficients(points, bestDegree);
}

function findPolynomialCoefficients(points, degree) {
    const n = points.length;
    const matrix = Array.from({ length: degree + 1 }, () => new Array(degree + 2).fill(0));
    for (let i = 0; i < n; i++) {
      const { x, y } = points[i];
      for (let j = 0; j <= degree; j++) {
        for (let k = 0; k <= degree; k++) {
          matrix[j][k] += Math.pow(x, j + k);
        }
        matrix[j][degree + 1] += y * Math.pow(x, j);
      }
    }
    return gaussJordanElimination(matrix);
  }
function calculatePolynomialError(points, coeffs) {
    let error = 0;
    for (let i = 0; i < points.length; i++) {
        const { x, y } = points[i];
        let estimate = 0;
        for (let j = 0; j < coeffs.length; j++) {
            estimate += coeffs[j] * Math.pow(x, j);
        }
        error += Math.pow(y - estimate, 2);
    }
    return error;
}

function gaussJordanElimination(matrix) {
    const n = matrix.length;
    for (let i = 0; i < n; i++) {
        // Find pivot row
        let pivot = i;
        for (let j = i; j < n; j++) {
            if (Math.abs(matrix[j][i]) > Math.abs(matrix[pivot][i])) {
                pivot = j;
            }
        }
        // Swap rows if necessary
        if (pivot !== i) {
            const temp = matrix[i];
            matrix[i] = matrix[pivot];
            matrix[pivot] = temp;
        }
        // Eliminate column i
        for (let j = i + 1; j < n; j++) {
            const factor = matrix[j][i] / matrix[i][i];
            for (let k = i; k <= n; k++) {
                matrix[j][k] -= factor * matrix[i][k];
            }
        }
    }
    // Back-substitute
    const coeffs = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
        let sum = 0;
        for (let j = i + 1; j < n; j++) {
            sum += matrix[i][j] * coeffs[j];
        }
        coeffs[i] = (matrix[i][n] - sum) / matrix[i][i];
    }
    return coeffs;
}

export function findSlope(points) {
    // Returns the slope of the line of best fit from a list of points
    // Assumes that x is the index
    const n = points.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let x = 0; x < n; x++) {
        var y = points[x];
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumX2 += x * x;
    }
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
}

