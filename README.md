# GPX Track Visualizer

## Overview
A web-based GPX track visualization app that creates cinematic 3D flyovers similar to MapDirector. Built with vanilla JavaScript (no React, no TypeScript) using MapLibre GL for 3D map rendering.

## Current State
Fully functional MVP with:
- GPX file upload (drag & drop or browse)
- Automatic metrics calculation (distance, duration, speed, heart rate, elevation)
- 2D track preview with satellite imagery and terrain
- Cinematic 3D flyover animation with direction-aware camera
- Elevation profile chart
- Playback controls (play, pause, speed adjustment)
- Video export to MP4/WebM format using FFmpeg.wasm

## Recent Changes (Oct 6, 2025)
- Initial project setup with MapLibre GL integration
- Implemented GPX parser for track data extraction
- Created metrics calculator for distance, duration, speed, heart rate, pace, elevation
- Built dark-themed UI with upload interface and metrics display
- Implemented elevation profile chart with Chart.js
- Created cinematic map animator with direction-aware camera movement
- Added video exporter with FFmpeg.wasm for MP4 export (falls back to WebM if FFmpeg fails)
- Configured workflow to serve on port 5000
- **Camera Animation Improvements:**
  - Implemented bearing smoothing with 10-point averaging for smoother direction changes
  - Added 5-point lookahead for better directional awareness
  - Increased default speed to 5x (with 10x option) for faster playback
  - Reduced pitch from 60° to 50° for better visibility
  - Adjusted zoom from 16 to 15.5 for wider view
  - Dynamic transition duration (300-800ms) based on playback speed
- **Large GPX File Handling:**
  - Intelligent track point sampling/decimation for files with >1000 points
  - Adaptive simplification thresholds (5m/10m/15m based on file size)
  - Preserves original points for accurate metrics calculation
  - Uses simplified points only for animation and visualization
  - Improved route line visibility (thicker, more opaque)
  - Green progress line clearly distinguishable from route

## Project Architecture

### File Structure
```
/
├── index.html              # Main HTML with app structure
├── css/
│   └── style.css          # Dark-themed UI styles
├── js/
│   ├── gpx-parser.js      # GPX file parsing and coordinate calculations
│   ├── metrics-calculator.js  # Track metrics computation
│   ├── elevation-chart.js     # Elevation profile chart
│   ├── map-animator.js        # 3D flyover animation logic
│   ├── video-exporter.js      # Video recording and MP4 export
│   └── app.js                 # Main application logic
└── sample-track.gpx       # Sample GPX file for testing
```

### Key Technologies
- **MapLibre GL JS** - 3D map rendering with terrain support
- **Chart.js** - Elevation profile visualization
- **FFmpeg.wasm** - Video conversion from WebM to MP4
- **Vanilla JavaScript** - No frameworks or TypeScript

### Data Flow
1. User uploads GPX file
2. GPXParser extracts track points with coordinates, elevation, heart rate, speed
3. MetricsCalculator computes total distance, duration, elevation gain, averages
4. UI displays metrics and creates elevation chart
5. MapAnimator draws route on 3D map with satellite/terrain layers
6. Animation follows route with direction-aware camera bearing
7. VideoExporter captures canvas stream and converts to MP4

## User Preferences
- Plain JavaScript only (no React, no TypeScript)
- Simple, clean implementation
- Dark-themed UI similar to MapDirector
- Focus on core functionality first

## Features

### Current Features
✅ GPX file upload with drag & drop
✅ Track metrics (distance, duration, speed, heart rate, pace, elevation)
✅ Satellite imagery with terrain visualization
✅ Cinematic 3D flyover with direction-aware camera
✅ Elevation profile chart
✅ Playback controls (play/pause, speed: 0.5x-3x)
✅ Video export to MP4 (via FFmpeg) or WebM (fallback)
✅ Real-time progress tracking during playback

### Future Enhancements
- Customizable camera angles and flight paths
- Multiple map style options
- Performance overlay metrics during playback
- Route coloring based on metrics (gradient by speed/elevation/heart rate)
- Photo waypoint markers and annotations
- Advanced export settings (resolution, frame rate, duration)
