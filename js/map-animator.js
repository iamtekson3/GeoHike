class MapAnimator {
  constructor(mapInstance) {
    this.map = mapInstance;
    this.trackPoints = [];
    this.currentIndex = 0;
    this.isPlaying = false;
    this.animationId = null;
    this.speed = 2;
    this.onProgressUpdate = null;
    this.path = [];
    this.routeLineId = "route-line";
    this.progressLineId = "progress-line";
    this.markerEl = null;
    this.bearingHistory = [];
    this.bearingHistorySize = 15;
  }

  setTrackData(trackPoints) {
    this.trackPoints = trackPoints;
    this.currentIndex = 0;
    this.path = trackPoints.map((p) => [p.lon, p.lat]);
    this.drawRoute();
    this.fitBounds();
  }

  drawRoute() {
    if (this.map.getSource("route")) {
      this.map.removeLayer(this.routeLineId);
      this.map.removeSource("route");
    }

    if (this.map.getSource("progress")) {
      this.map.removeLayer(this.progressLineId);
      this.map.removeSource("progress");
    }

    this.map.addSource("route", {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: this.path,
        },
      },
    });

    this.map.addLayer({
      id: this.routeLineId,
      type: "line",
      source: "route",
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": "#667eea",
        "line-width": 5,
        "line-opacity": 0.8,
      },
    });

    this.map.addSource("progress", {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [],
        },
      },
    });

    this.map.addLayer({
      id: this.progressLineId,
      type: "line",
      source: "progress",
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": "#10b981",
        "line-width": 6,
      },
    });

    const startEl = document.createElement("div");
    startEl.className = "marker-start";
    startEl.style.width = "12px";
    startEl.style.height = "12px";
    startEl.style.borderRadius = "50%";
    startEl.style.backgroundColor = "#10b981";
    startEl.style.border = "2px solid white";

    new maplibregl.Marker({ element: startEl })
      .setLngLat([this.trackPoints[0].lon, this.trackPoints[0].lat])
      .addTo(this.map);

    const endEl = document.createElement("div");
    endEl.className = "marker-end";
    endEl.style.width = "12px";
    endEl.style.height = "12px";
    endEl.style.borderRadius = "50%";
    endEl.style.backgroundColor = "#ef4444";
    endEl.style.border = "2px solid white";

    const lastPoint = this.trackPoints[this.trackPoints.length - 1];
    new maplibregl.Marker({ element: endEl })
      .setLngLat([lastPoint.lon, lastPoint.lat])
      .addTo(this.map);

    this.currentMarkerEl = document.createElement("div");
    this.currentMarkerEl.className = "marker-current";
    this.currentMarkerEl.style.width = "16px";
    this.currentMarkerEl.style.height = "16px";
    this.currentMarkerEl.style.borderRadius = "50%";
    this.currentMarkerEl.style.backgroundColor = "#10b981";
    this.currentMarkerEl.style.border = "3px solid white";
    this.currentMarkerEl.style.boxShadow = "0 0 10px rgba(16, 185, 129, 0.5)";
    this.currentMarkerEl.style.zIndex = "100";

    this.currentMarker = new maplibregl.Marker({
      element: this.currentMarkerEl,
    })
      .setLngLat([this.trackPoints[0].lon, this.trackPoints[0].lat])
      .addTo(this.map);
  }

  fitBounds() {
    const bounds = new maplibregl.LngLatBounds();
    this.trackPoints.forEach((point) => {
      bounds.extend([point.lon, point.lat]);
    });
    this.map.fitBounds(bounds, { padding: 100 });
  }

  play() {
    this.isPlaying = true;
    this.animate();
  }

  pause() {
    this.isPlaying = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  reset() {
    this.pause();
    this.currentIndex = 0;
    this.bearingHistory = [];
    this.updatePosition();

    if (this.currentMarker) {
      const firstPoint = this.trackPoints[0];
      this.currentMarker.setLngLat([firstPoint.lon, firstPoint.lat]);
    }
  }

  seekTo(index) {
    const wasPlaying = this.isPlaying;
    this.pause();
    this.currentIndex = Math.max(
      0,
      Math.min(index, this.trackPoints.length - 1)
    );
    this.bearingHistory = []; // Reset bearing history on seek
    this.updatePosition();
    if (wasPlaying) {
      this.play();
    }
  }

  seekToPercent(percent) {
    const index = Math.floor((percent / 100) * (this.trackPoints.length - 1));
    this.seekTo(index);
  }

  setSpeed(speed) {
    this.speed = speed;
  }

  animate() {
    if (!this.isPlaying) return;

    const step = Math.max(1, Math.floor(this.speed * 1.5));
    this.currentIndex = Math.min(
      this.currentIndex + step,
      this.trackPoints.length - 1
    );

    this.updatePosition();

    if (this.currentIndex < this.trackPoints.length - 1) {
      this.animationId = requestAnimationFrame(() => this.animate());
    } else {
      this.isPlaying = false;
      if (this.onProgressUpdate) {
        this.onProgressUpdate(100);
      }
    }
  }

  updatePosition() {
    const point = this.trackPoints[this.currentIndex];

    const progressPath = this.path.slice(0, this.currentIndex + 1);
    const progressSource = this.map.getSource("progress");
    if (progressSource) {
      progressSource.setData({
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: progressPath,
        },
      });
    }

    let bearing = 0;
    if (this.currentIndex > 0) {
      const lookAheadIndex = Math.min(
        this.currentIndex + 8,
        this.trackPoints.length - 1
      );
      const prevPoint = this.trackPoints[this.currentIndex - 1];
      const nextPoint = this.trackPoints[lookAheadIndex];

      bearing = GPXParser.calculateBearing(
        prevPoint.lat,
        prevPoint.lon,
        nextPoint.lat,
        nextPoint.lon
      );

      this.bearingHistory.push(bearing);
      if (this.bearingHistory.length > this.bearingHistorySize) {
        this.bearingHistory.shift();
      }

      if (this.currentMarker) {
        this.currentMarker.setLngLat([point.lon, point.lat]);
      }

      const avgBearing =
        this.bearingHistory.reduce((sum, b) => sum + b, 0) /
        this.bearingHistory.length;
      bearing = avgBearing;
    }

    const transitionDuration = Math.max(500, 1200 / Math.sqrt(this.speed));

    // this.map.easeTo({
    //   center: [point.lon, point.lat],
    //   bearing: bearing,
    //   pitch: 55,
    //   zoom: 14,
    //   duration: transitionDuration,
    //   easing: (t) => t * (2 - t),
    // });

    this.map.flyTo({
      center: [point.lon, point.lat],
      bearing,
      zoom: 14,
      pitch: 55,
      speed: 0.6, // smaller = slower
      curve: 1.5,
    });

    console.log(
      `Index: ${this.currentIndex}, Lat: ${point.lat}, Lon: ${
        point.lon
      }, Bearing: ${bearing.toFixed(2)}, duration: ${transitionDuration}`
    );

    if (this.onProgressUpdate) {
      const progress =
        (this.currentIndex / (this.trackPoints.length - 1)) * 100;
      this.onProgressUpdate(progress, point);
    }
  }
}
