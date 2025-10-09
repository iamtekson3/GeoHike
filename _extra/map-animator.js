class MapAnimator {
  constructor(mapInstance) {
    this.map = mapInstance;
    this.trackPoints = [];
    this.currentIndex = 0;
    this.isPlaying = false;
    this.animationId = null;
    this.speed = 100;
    this.onProgressUpdate = null;
    this.path = [];
    this.routeLineId = "route-line";
    this.progressLineId = "progress-line";
    this.markerEl = null;
    this.bearingHistory = [];
    this.bearingHistorySize = 10;
    // animation state for segment-based interpolation
    this.segmentIndex = 0; // integer index of the current segment start
    this.segmentProgress = 0; // 0..1 progress along current segment
    this.lastFrameTime = null; // timestamp of last RAF frame
    this.baseSpeed = 5; // meters/sec for speed = 1 (tune this)
    this.distances = []; // distances of each segment in meters
    this.totalDistance = 0; // total route length in meters
  }

  // Haversine distance (meters)
  _distance(p1, p2) {
    const R = 6371000; // Earth radius meters
    const toRad = (v) => (v * Math.PI) / 180;
    const dLat = toRad(p2.lat - p1.lat);
    const dLon = toRad(p2.lon - p1.lon);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(p1.lat)) *
        Math.cos(toRad(p2.lat)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  _interpolate(p1, p2, t) {
    return {
      lat: p1.lat + (p2.lat - p1.lat) * t,
      lon: p1.lon + (p2.lon - p1.lon) * t,
    };
  }

  //   setTrackData(trackPoints) {
  //     this.trackPoints = trackPoints;
  //     this.currentIndex = 0;
  //     this.path = trackPoints.map((p) => [p.lon, p.lat]);
  //     this.drawRoute();
  //     this.fitBounds();
  //   }

  setTrackData(trackPoints) {
    this.trackPoints = trackPoints || [];
    this.currentIndex = 0;
    this.segmentIndex = 0;
    this.segmentProgress = 0;
    this.lastFrameTime = null;
    this.bearingHistory = [];

    this.path = this.trackPoints.map((p) => [p.lon, p.lat]);

    // precompute distances between consecutive track points
    this.distances = [];
    this.totalDistance = 0;
    for (let i = 0; i < Math.max(0, this.trackPoints.length - 1); i++) {
      const d = this._distance(this.trackPoints[i], this.trackPoints[i + 1]);
      this.distances.push(d);
      this.totalDistance += d;
    }

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
  }

  fitBounds() {
    const bounds = new maplibregl.LngLatBounds();
    this.trackPoints.forEach((point) => {
      bounds.extend([point.lon, point.lat]);
    });
    this.map.fitBounds(bounds, { padding: 100 });
  }

  play() {
    if (!this.trackPoints || this.trackPoints.length < 2) return;
    this.isPlaying = true;
    this.lastFrameTime = null;
    // start RAF loop
    this.animationId = requestAnimationFrame((t) => this.animate(t));
  }

  pause() {
    this.isPlaying = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.lastFrameTime = null;
  }

  reset() {
    this.pause();
    this.segmentIndex = 0;
    this.segmentProgress = 0;
    this.currentIndex = 0;
    this.bearingHistory = [];
    this.updatePosition();
  }

  setSpeed(speed) {
    this.speed = speed;
  }

  animate(timestamp) {
    if (!this.isPlaying) return;
    if (!this.trackPoints || this.trackPoints.length < 2) {
      this.isPlaying = false;
      return;
    }

    // timestamp from RAF
    if (!timestamp) timestamp = performance.now();
    if (!this.lastFrameTime) this.lastFrameTime = timestamp;
    const dt = Math.max(0, timestamp - this.lastFrameTime); // ms
    this.lastFrameTime = timestamp;

    // how many meters to move this frame
    const metersToMove = this.baseSpeed * this.speed * (dt / 1000);

    let remaining = metersToMove;

    // advance across segments as needed
    while (remaining > 0 && this.segmentIndex < this.trackPoints.length - 1) {
      const segDist =
        this.distances[this.segmentIndex] ||
        this._distance(
          this.trackPoints[this.segmentIndex],
          this.trackPoints[this.segmentIndex + 1]
        );

      // handle zero-length segment
      if (segDist <= 0) {
        this.segmentIndex++;
        this.segmentProgress = 0;
        continue;
      }

      const remainingOnSegment = segDist * (1 - this.segmentProgress);

      if (remaining < remainingOnSegment) {
        this.segmentProgress += remaining / segDist;
        remaining = 0;
      } else {
        remaining -= remainingOnSegment;
        this.segmentIndex++;
        this.segmentProgress = 0;
      }
    }

    // keep currentIndex for compatibility with other parts of your class
    this.currentIndex = Math.min(
      this.segmentIndex + Math.floor(this.segmentProgress),
      this.trackPoints.length - 1
    );

    // update camera/marker/progress
    this.updatePosition();

    // finished?
    if (this.segmentIndex >= this.trackPoints.length - 1) {
      this.isPlaying = false;
      this.lastFrameTime = null;
      if (this.onProgressUpdate) this.onProgressUpdate(100);
      return;
    }

    // schedule next frame
    this.animationId = requestAnimationFrame((t) => this.animate(t));
  }

  updatePosition() {
    if (!this.trackPoints || this.trackPoints.length === 0) return;

    const idx = Math.min(this.segmentIndex, this.trackPoints.length - 1);
    const nextIdx = Math.min(idx + 1, this.trackPoints.length - 1);

    const p1 = this.trackPoints[idx];
    const p2 = this.trackPoints[nextIdx];

    // when at the very last point, use that exact point
    const t = idx === nextIdx ? 0 : this.segmentProgress;
    const pos =
      idx === nextIdx
        ? { lat: p1.lat, lon: p1.lon }
        : this._interpolate(p1, p2, t);

    // progress path = all completed points + current interpolated coord
    const progressPath = this.path
      .slice(0, idx + 1)
      .concat([[pos.lon, pos.lat]]);
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

    // bearing: look a little ahead for stability
    let bearing = 0;
    if (idx < this.trackPoints.length - 1) {
      const lookAheadIdx = Math.min(idx + 3, this.trackPoints.length - 1);
      const lookPoint = this.trackPoints[lookAheadIdx];
      bearing = GPXParser.calculateBearing(
        pos.lat,
        pos.lon,
        lookPoint.lat,
        lookPoint.lon
      );

      this.bearingHistory.push(bearing);
      if (this.bearingHistory.length > this.bearingHistorySize) {
        this.bearingHistory.shift();
      }
      bearing =
        this.bearingHistory.reduce((s, b) => s + b, 0) /
        this.bearingHistory.length;
    }

    this.map.easeTo({
      center: [pos.lon, pos.lat],
      bearing: bearing,
      pitch: 60,
      zoom: 14,
    });

    console.log(
      `Index: ${idx}, Lat: ${pos.lat}, Lon: ${
        pos.lon
      }, Bearing: ${bearing.toFixed(2)}`
    );

    // compute progress percentage by distance
    let traveled = 0;
    for (let i = 0; i < idx; i++) traveled += this.distances[i] || 0;
    const curSegDist = this.distances[idx] || 0;
    traveled += curSegDist * t;

    const progress =
      this.totalDistance > 0
        ? (traveled / this.totalDistance) * 100
        : this.trackPoints.length > 1
        ? (idx / (this.trackPoints.length - 1)) * 100
        : 100;

    if (this.onProgressUpdate) {
      this.onProgressUpdate(progress, { lat: pos.lat, lon: pos.lon });
    }
  }

  //   animate() {
  //     if (!this.isPlaying) return;

  //     const step = Math.max(1, Math.floor(this.speed * 2));
  //     this.currentIndex = Math.min(
  //       this.currentIndex + step,
  //       this.trackPoints.length - 1
  //     );

  //     this.updatePosition();

  //     if (this.currentIndex < this.trackPoints.length - 1) {
  //       this.animationId = requestAnimationFrame(() => this.animate());
  //     } else {
  //       this.isPlaying = false;
  //       if (this.onProgressUpdate) {
  //         this.onProgressUpdate(100);
  //       }
  //     }
  //   }

  //   updatePosition() {
  //     const point = this.trackPoints[this.currentIndex];

  //     const progressPath = this.path.slice(0, this.currentIndex + 1);
  //     const progressSource = this.map.getSource("progress");
  //     if (progressSource) {
  //       progressSource.setData({
  //         type: "Feature",
  //         properties: {},
  //         geometry: {
  //           type: "LineString",
  //           coordinates: progressPath,
  //         },
  //       });
  //     }

  //     let bearing = 0;
  //     if (this.currentIndex > 0) {
  //       const lookAheadIndex = Math.min(
  //         this.currentIndex + 5,
  //         this.trackPoints.length - 1
  //       );
  //       const prevPoint = this.trackPoints[this.currentIndex - 1];
  //       const nextPoint = this.trackPoints[lookAheadIndex];

  //       bearing = GPXParser.calculateBearing(
  //         prevPoint.lat,
  //         prevPoint.lon,
  //         nextPoint.lat,
  //         nextPoint.lon
  //       );

  //       this.bearingHistory.push(bearing);
  //       if (this.bearingHistory.length > this.bearingHistorySize) {
  //         this.bearingHistory.shift();
  //       }

  //       const avgBearing =
  //         this.bearingHistory.reduce((sum, b) => sum + b, 0) /
  //         this.bearingHistory.length;
  //       bearing = avgBearing;
  //     }

  //     const transitionDuration = Math.max(300, 800 / this.speed);

  //     this.map.easeTo({
  //       center: [point.lon, point.lat],
  //       bearing: bearing,
  //       pitch: 60,
  //       zoom: 14,
  //       duration: transitionDuration,
  //     });

  //     console.log(
  //       `Index: ${this.currentIndex}, Lat: ${point.lat}, Lon: ${
  //         point.lon
  //       }, Bearing: ${bearing.toFixed(2)}, duration: ${transitionDuration}`
  //     );

  //     if (this.onProgressUpdate) {
  //       const progress =
  //         (this.currentIndex / (this.trackPoints.length - 1)) * 100;
  //       this.onProgressUpdate(progress, point);
  //     }
  //   }
}
