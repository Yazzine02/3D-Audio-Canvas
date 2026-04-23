# Project Overview

## Goal
Interactive Babylon.js reactive AI playground with Reynolds steering behaviors
Supports mouse control and head tracking control for target navigation

## Runtime Stack
- Babylon.js scene rendering and mesh lifecycle
- p5.js draw loop for head tracking overlay
- ml5 FaceMesh for gaze and head signal extraction

## Main Runtime Flow
1. `index.html` loads scripts and start screen
2. `js/EyeTracking.js` chooses control mode and runs calibration when needed
3. `window.onCalibrationDone` starts Babylon runtime
4. `js/BabylonApp.js` creates scene and updates steering each frame
5. `js/BabylonGUI.js` exposes runtime controls for behaviors and tuning

## Steering Core
- `js/SteeringVehicle.js`: movement integration and behavior primitives
- `js/BehaviorManager.js`: weighted behavior activation and flock orchestration

## Important Globals Used Across Files
- `window.controlMode`
- `window.renderDebug`
- `window.physicJump`
- `window.moveTargetToMapPos`
- `window.createVehicleMesh`
- `window.onCalibrationDone`

## Documentation Maintenance
- When a new runtime file is created update `agentic-docs/references/file-map.md`
- When a new global is introduced add it here and to the file that sets or reads it
- When a new agent skill or tool guide is created add it to `agentic-docs/DIRECTORY.md`
- When script paths or asset names change update `index.html` and the file map together
- When behavior flow changes update `agentic-docs/specs/agent-workflow.md` so future agents follow the new checks
