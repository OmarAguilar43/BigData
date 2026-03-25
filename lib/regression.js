export function computeLinearRegression(points) {
    if(!points || points.length === 0) return { m: 0, b: 0, r2: 0, mse: 0 };
    let n = points.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    
    points.forEach(pt => {
        sumX += pt.x;
        sumY += pt.y;
        sumXY += pt.x * pt.y;
        sumXX += pt.x * pt.x;
    });
    
    let denominator = (n * sumXX) - (sumX * sumX);
    let m = 0, b = 0;
    if (denominator !== 0) {
        m = ((n * sumXY) - (sumX * sumY)) / denominator;
        b = (sumY - m * sumX) / n;
    } else {
        b = sumY / n;
    }

    let meanY = sumY / n;
    let ssTot = 0;
    let ssRes = 0;
    points.forEach(pt => {
        let predicted = m * pt.x + b;
        ssTot += Math.pow(pt.y - meanY, 2);
        ssRes += Math.pow(pt.y - predicted, 2);
    });
    
    let r2 = ssTot === 0 ? 1 : 1 - (ssRes / ssTot);
    let mse = ssRes / n;

    return { m, b, r2, mse };
}

export function processFirebaseHistory(logObj) {
    let data = [];
    if(!logObj) return data;
    for(let ts in logObj) {
        data.push({ x: parseInt(ts), y: logObj[ts] });
    }
    // Sort chronologically
    data.sort((a, b) => a.x - b.x);
    return data;
}

export function generatePredictionLine(data, futurePointsCount = 5) {
    if(data.length < 2) return { data: [], metrics: { r2: 0, mse: 0 } };
    
    // Normalize X for calculation to avoid huge numbers
    let minX = data[0].x;
    let normData = data.map(pt => ({ x: pt.x - minX, y: pt.y }));
    
    let { m, b, r2, mse } = computeLinearRegression(normData);
    
    // Create the trend line that covers historical data
    let trendData = data.map(pt => ({
        x: pt.x,
        y: m * (pt.x - minX) + b
    }));
    
    // Predict future points
    let totalInterval = data[data.length-1].x - data[0].x;
    let avgInterval = totalInterval / (data.length - 1) || 300; // default 5 min
    let lastX = data[data.length-1].x;
    
    for(let i=1; i<=futurePointsCount; i++) {
        let futureX = lastX + (avgInterval * i);
        let futureNormX = futureX - minX;
        trendData.push({
            x: futureX,
            y: m * futureNormX + b
        });
    }
    
    return { data: trendData, metrics: { r2, mse } };
}
