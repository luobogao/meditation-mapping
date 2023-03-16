function computeMedian(values) {
    const sorted = values.sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
      return (sorted[middle - 1] + sorted[middle]) / 2;
    } else {
      return sorted[middle];
    }
  }
  
  function computeMedianVector(vectors) {
    // transpose the array of vectors to group coordinates by dimension
    const transposed = vectors[0].map((_, i) => vectors.map(v => v[i]));
    
    // sort each coordinate array and select the middle value
    const median = transposed.map(coords => computeMedian(coords));
  
    return median;
  }
  
  function computeEuclideanDistance(a, b) {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }
    
    const sumOfSquares = a.reduce((acc, cur, i) => {
      const diff = cur - b[i];
      return acc + (diff * diff);
    }, 0);
    
    return Math.sqrt(sumOfSquares);
  }
  
  function computeDistances(vectors, median) {
    return vectors.map(v => computeEuclideanDistance(v, median));
  }
  
  function computeMedianAbsoluteDeviation(distances) {
    const median = computeMedian(distances);
    const deviations = distances.map(d => Math.abs(d - median));
    return computeMedian(deviations);
  }
  
  function computeWeightedMean(vectors, distances) {
    const medianAbsoluteDeviation = computeMedianAbsoluteDeviation(distances);
    
    const weights = distances.map(d => {
      const weight = medianAbsoluteDeviation / Math.max(d, 1e-10); // avoid division by zero
      return weight;
    });
    
    const sumOfWeights = weights.reduce((acc, cur) => acc + cur, 0);
    
    const weightedSum = vectors.reduce((acc, cur, i) => {
      const weight = weights[i];
      const weighted = cur.map(coord => coord * weight);
      return weighted.map((w, i) => w + acc[i]);
    }, new Array(vectors[0].length).fill(0));
    
    const weightedMean = weightedSum.map(sum => sum / sumOfWeights);
    
    return weightedMean;
  }
  
  export function computeRobustMean(vectors) {
    const median = computeMedianVector(vectors);
    const distances = computeDistances(vectors, median);
    const weightedMean = computeWeightedMean(vectors, distances);
    return weightedMean;
  }


  