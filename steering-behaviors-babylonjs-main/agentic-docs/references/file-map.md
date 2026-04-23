# File Map Reference

## Entry And Boot
- `index.html` script loading order and start screen
- `style.css` overlays and UI layers

## App Runtime
- `js/BabylonApp.js` scene setup update loop and runtime bridges
- `js/BabylonGUI.js` GUI panel sliders and toggles
- `js/BabylonEnv.js` optional environment helpers if used

## Tracking Runtime
- `js/EyeTracking.js` model load calibration and gaze mapping

## Steering Runtime
- `js/SteeringVehicle.js` Reynolds vehicle implementation
- `js/BehaviorManager.js` behavior weights and flock behavior

## Assets
- `assets/aedes.glb` vehicle mesh asset loaded by Babylon scene loader

## Agent Files
- `AGENTS.md` top level routing for coding agents
- `.github/agents/reynolds.agent.md` specialized Reynolds agent definition
- `.agents/skills/reynolds-steering/SKILL.md` steering workflow skill
- `.agents/tools/babylon-runtime-tools.md` tool execution rules
- `agentic-docs/specs/requirements.md` strict workspace agent requirements
- `agentic-docs/context/project-idea.md` high level game concept and training intent

## Update Rule For New Files
- If a new runtime file is added list it here immediately
- If a new agent skill or tool guide is added list it here immediately
- If an existing file changes responsibility update the section it belongs to rather than creating duplicate references
- If a file is deleted remove it here so agents do not follow stale paths
