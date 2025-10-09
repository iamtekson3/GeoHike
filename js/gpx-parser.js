class GPXParser {
    static parseFile(gpxContent) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(gpxContent, 'text/xml');
        
        const trackName = xmlDoc.querySelector('trk name')?.textContent || 'Unknown Track';
        const trackPoints = [];
        const trkpts = xmlDoc.querySelectorAll('trkpt');
        
        trkpts.forEach((trkpt, index) => {
            const lat = parseFloat(trkpt.getAttribute('lat'));
            const lon = parseFloat(trkpt.getAttribute('lon'));
            const eleElement = trkpt.querySelector('ele');
            const timeElement = trkpt.querySelector('time');
            const hrElement = trkpt.querySelector('ns3\\:hr, hr');
            const speedElement = trkpt.querySelector('ns3\\:speed, speed');
            
            let elevation = eleElement ? parseFloat(eleElement.textContent) : null;
            if (elevation === -20000) {
                elevation = null;
            }
            
            const point = {
                lat,
                lon,
                elevation,
                time: timeElement ? new Date(timeElement.textContent) : null,
                heartRate: hrElement ? parseInt(hrElement.textContent) : null,
                speed: speedElement ? parseFloat(speedElement.textContent) : null,
                index
            };
            
            trackPoints.push(point);
        });
        
        return {
            name: trackName,
            points: trackPoints
        };
    }
    
    static calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    
    static toRad(degrees) {
        return degrees * (Math.PI / 180);
    }
    
    static calculateBearing(lat1, lon1, lat2, lon2) {
        const dLon = this.toRad(lon2 - lon1);
        const y = Math.sin(dLon) * Math.cos(this.toRad(lat2));
        const x = Math.cos(this.toRad(lat1)) * Math.sin(this.toRad(lat2)) -
                  Math.sin(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.cos(dLon);
        const bearing = Math.atan2(y, x);
        return (bearing * 180 / Math.PI + 360) % 360;
    }
    
    static simplifyTrack(points, minDistanceKm = 0.01) {
        if (points.length <= 2) return points;
        
        const simplified = [points[0]];
        
        for (let i = 1; i < points.length; i++) {
            const lastPoint = simplified[simplified.length - 1];
            const currentPoint = points[i];
            
            const distance = this.calculateDistance(
                lastPoint.lat, lastPoint.lon,
                currentPoint.lat, currentPoint.lon
            );
            
            if (distance >= minDistanceKm || i === points.length - 1) {
                simplified.push(currentPoint);
            }
        }
        
        console.log(`Track simplified: ${points.length} -> ${simplified.length} points`);
        return simplified;
    }
}
