let map = null;
let animator = null;
let elevationChart = null;
let videoExporter = null;
let trackData = null;
let metrics = null;

const uploadContainer = document.getElementById("upload-container");
const mainContainer = document.getElementById("main-container");
const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const browseBtn = document.getElementById("browseBtn");
const playBtn = document.getElementById("playBtn");
const pauseBtn = document.getElementById("pauseBtn");
const exportBtn = document.getElementById("exportBtn");
const speedSelect = document.getElementById("speedSelect");
const progressFill = document.getElementById("progressFill");
const progressBar = document.querySelector(".progress-bar");
const restartBtn = document.getElementById("restartBtn");
const progressDot = document.getElementById("progressDot");

let wasPlayingBeforeDrag = false;
let isDragging = false;

function initMap() {
  map = new maplibregl.Map({
    container: "map",
    zoom: 2,
    center: [0, 20],
    pitch: 0,
    bearing: 0,
    style: {
      version: 8,
      sources: {
        satellite: {
          type: "raster",
          tiles: [
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          ],
          tileSize: 256,
          attribution: "Esri, Maxar, Earthstar Geographics",
        },
        terrainSource: {
          type: "raster-dem",
          tiles: [
            "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
          ],
          encoding: "terrarium",
          tileSize: 256,
          maxzoom: 15,
          attribution: "AWS Terrain Tiles",
        },
      },
      layers: [
        {
          id: "satellite",
          type: "raster",
          source: "satellite",
        },
      ],
      terrain: {
        source: "terrainSource",
        exaggeration: 1.5,
      },
    },
  });

  map.on("load", () => {
    console.log("Map loaded successfully");
  });

  map.addControl(new maplibregl.NavigationControl(), "top-right");
  map.addControl(new maplibregl.FullscreenControl(), "top-right");

  animator = new MapAnimator(map);
  animator.onProgressUpdate = (progress, point) => {
    progressFill.style.width = `${progress}%`;
    progressDot.style.left = `${progress}%`;

    if (point) {
      let totalDistance = 0;
      for (let i = 0; i <= trackData.points.indexOf(point); i++) {
        if (i > 0) {
          const prev = trackData.points[i - 1];
          const curr = trackData.points[i];
          totalDistance += GPXParser.calculateDistance(
            prev.lat,
            prev.lon,
            curr.lat,
            curr.lon
          );
        }
      }
      document.getElementById(
        "overlayDistance"
      ).textContent = `${totalDistance.toFixed(2)} km`;

      const elevation =
        point.elevation !== null && point.elevation > -10000
          ? Math.round(point.elevation)
          : "N/A";
      document.getElementById("overlayElevation").textContent =
        elevation + (elevation !== "N/A" ? " m" : "");
    }
  };
}

function handleFileSelect(file) {
  if (!file || !file.name.endsWith(".gpx")) {
    alert("Please select a valid GPX file");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      trackData = GPXParser.parseFile(e.target.result);

      trackData.originalPoints = trackData.points;

      metrics = MetricsCalculator.calculateMetrics(trackData.originalPoints);

      const originalCount = trackData.originalPoints.length;
      let simplifiedPoints = trackData.originalPoints;

      if (originalCount > 5000) {
        simplifiedPoints = GPXParser.simplifyTrack(
          trackData.originalPoints,
          0.015
        );
      } else if (originalCount > 2000) {
        simplifiedPoints = GPXParser.simplifyTrack(
          trackData.originalPoints,
          0.01
        );
      } else if (originalCount > 1000) {
        simplifiedPoints = GPXParser.simplifyTrack(
          trackData.originalPoints,
          0.005
        );
      }

      trackData.points = simplifiedPoints;

      displayTrackData();

      uploadContainer.classList.add("hidden");
      mainContainer.classList.remove("hidden");

      initMap();

      setTimeout(() => {
        animator.setTrackData(trackData.points);
        elevationChart = new ElevationChart("elevationChart");
        elevationChart.createChart(trackData.originalPoints);
      }, 500);
    } catch (error) {
      console.error("Error parsing GPX file:", error);
      alert("Error parsing GPX file. Please check the file format.");
    }
  };
  reader.readAsText(file);
}

function displayTrackData() {
  document.getElementById("trackName").textContent = trackData.name;

  document.getElementById("metricDistance").textContent =
    MetricsCalculator.formatDistance(metrics.totalDistance);

  document.getElementById("metricDuration").textContent =
    MetricsCalculator.formatDuration(metrics.duration);

  document.getElementById("metricElevation").textContent =
    MetricsCalculator.formatElevation(metrics.elevationGain);

  document.getElementById("metricSpeed").textContent =
    MetricsCalculator.formatSpeed(metrics.avgSpeed);

  document.getElementById("metricHeartRate").textContent =
    MetricsCalculator.formatHeartRate(metrics.avgHeartRate);

  document.getElementById("metricPace").textContent =
    MetricsCalculator.formatPace(metrics.avgPace);
}

dropZone.addEventListener("click", () => {
  fileInput.click();
});

browseBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  fileInput.click();
});

fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  handleFileSelect(file);
});

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  const file = e.dataTransfer.files[0];
  handleFileSelect(file);
});

playBtn.addEventListener("click", () => {
  playBtn.classList.add("hidden");
  pauseBtn.classList.remove("hidden");
  animator.play();
});

pauseBtn.addEventListener("click", () => {
  pauseBtn.classList.add("hidden");
  playBtn.classList.remove("hidden");
  animator.pause();
});

speedSelect.addEventListener("change", (e) => {
  animator.setSpeed(parseFloat(e.target.value));
});

progressBar.addEventListener("mousedown", (e) => {
  isDragging = true;
  wasPlayingBeforeDrag = animator.isPlaying;
  if (wasPlayingBeforeDrag) {
    animator.pause();
    pauseBtn.classList.add("hidden");
    playBtn.classList.remove("hidden");
  }
  seekToPosition(e);
});

document.addEventListener("mousemove", (e) => {
  if (isDragging) {
    seekToPosition(e);
  }
});

document.addEventListener("mouseup", () => {
  isDragging = false;
});

progressBar.addEventListener("click", (e) => {
  if (!isDragging) {
    seekToPosition(e);
  }
});

function seekToPosition(e) {
  const rect = progressBar.getBoundingClientRect();
  const percent = Math.max(
    0,
    Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)
  );
  animator.seekToPercent(percent);
}

restartBtn.addEventListener("click", () => {
  animator.reset();
  pauseBtn.classList.add("hidden");
  playBtn.classList.remove("hidden");
});

exportBtn.addEventListener("click", async () => {
  if (!videoExporter) {
    videoExporter = new VideoExporter();
  }

  if (!videoExporter.isRecording) {
    const canvas = map.getCanvas();
    const success = await videoExporter.startRecording(canvas);

    if (success) {
      exportBtn.textContent = "⏺ Recording...";
      exportBtn.style.background = "#ef4444";

      animator.reset();
      setTimeout(() => {
        animator.play();
      }, 500);

      setTimeout(() => {
        videoExporter.stopRecording();
        exportBtn.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-15"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Export Video
                `;
        exportBtn.style.background = "#667eea";
      }, (trackData.points.length / (2 * animator.speed)) * 100 + 1000);
    }
  }
});
