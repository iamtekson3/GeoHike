class MetricsCalculator {
    static calculateMetrics(trackPoints) {
        if (!trackPoints || trackPoints.length === 0) {
            return null;
        }
        
        let totalDistance = 0;
        let elevationGain = 0;
        let elevationLoss = 0;
        let heartRates = [];
        let speeds = [];
        let validElevations = [];
        
        for (let i = 1; i < trackPoints.length; i++) {
            const prev = trackPoints[i - 1];
            const curr = trackPoints[i];
            
            const segmentDistance = GPXParser.calculateDistance(
                prev.lat, prev.lon, curr.lat, curr.lon
            );
            totalDistance += segmentDistance;
            
            if (prev.elevation !== null && curr.elevation !== null) {
                const elevDiff = curr.elevation - prev.elevation;
                if (elevDiff > 0) {
                    elevationGain += elevDiff;
                } else {
                    elevationLoss += Math.abs(elevDiff);
                }
            }
            
            if (curr.heartRate !== null && curr.heartRate > 0) {
                heartRates.push(curr.heartRate);
            }
            
            if (curr.speed !== null && curr.speed > 0) {
                speeds.push(curr.speed);
            }
            
            if (curr.elevation !== null && curr.elevation > -10000) {
                validElevations.push(curr.elevation);
            }
        }
        
        const startTime = trackPoints[0].time;
        const endTime = trackPoints[trackPoints.length - 1].time;
        const duration = startTime && endTime ? (endTime - startTime) / 1000 : 0;
        
        const avgHeartRate = heartRates.length > 0 
            ? heartRates.reduce((a, b) => a + b, 0) / heartRates.length 
            : null;
            
        const avgSpeed = speeds.length > 0
            ? speeds.reduce((a, b) => a + b, 0) / speeds.length
            : totalDistance > 0 && duration > 0 ? (totalDistance * 1000) / duration : null;
        
        const avgPace = avgSpeed && avgSpeed > 0 ? 1000 / (avgSpeed * 60) : null;
        
        const maxElevation = validElevations.length > 0 ? Math.max(...validElevations) : null;
        const minElevation = validElevations.length > 0 ? Math.min(...validElevations) : null;
        
        return {
            totalDistance: totalDistance,
            duration: duration,
            elevationGain: elevationGain,
            elevationLoss: elevationLoss,
            maxElevation: maxElevation,
            minElevation: minElevation,
            avgHeartRate: avgHeartRate,
            avgSpeed: avgSpeed,
            avgPace: avgPace,
            startTime: startTime,
            endTime: endTime
        };
    }
    
    static formatDistance(km) {
        return `${km.toFixed(2)} km`;
    }
    
    static formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }
    
    static formatElevation(meters) {
        return meters !== null ? `${Math.round(meters)} m` : 'N/A';
    }
    
    static formatSpeed(ms) {
        if (ms === null) return 'N/A';
        const kmh = ms * 3.6;
        return `${kmh.toFixed(2)} km/h`;
    }
    
    static formatPace(minPerKm) {
        if (minPerKm === null) return 'N/A';
        const minutes = Math.floor(minPerKm);
        const seconds = Math.floor((minPerKm - minutes) * 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')} /km`;
    }
    
    static formatHeartRate(bpm) {
        return bpm !== null ? `${Math.round(bpm)} bpm` : 'N/A';
    }
}
