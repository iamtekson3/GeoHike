class ElevationChart {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.chart = null;
        this.currentIndex = 0;
    }
    
    createChart(trackPoints) {
        const distances = [];
        const elevations = [];
        let totalDistance = 0;
        
        trackPoints.forEach((point, index) => {
            if (index > 0) {
                const prev = trackPoints[index - 1];
                totalDistance += GPXParser.calculateDistance(
                    prev.lat, prev.lon, point.lat, point.lon
                );
            }
            distances.push(totalDistance);
            elevations.push(point.elevation !== null && point.elevation > -10000 ? point.elevation : null);
        });
        
        if (this.chart) {
            this.chart.destroy();
        }
        
        this.chart = new Chart(this.ctx, {
            type: 'line',
            data: {
                labels: distances,
                datasets: [{
                    label: 'Elevation',
                    data: elevations,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    spanGaps: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: true,
                        callbacks: {
                            title: function(context) {
                                return `Distance: ${context[0].label} km`;
                            },
                            label: function(context) {
                                return `Elevation: ${context.parsed.y} m`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#a1a1aa',
                            callback: function(value, index) {
                                return value.toFixed(1) + ' km';
                            }
                        }
                    },
                    y: {
                        display: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#a1a1aa',
                            callback: function(value) {
                                return value + ' m';
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    }
    
    updatePosition(index) {
        this.currentIndex = index;
    }
}
