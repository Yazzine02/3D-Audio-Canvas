---
name: reynolds-steering
description: Use when editing Babylon steering behavior logic flocking target following or obstacle avoidance in this project
---

# Reynolds Steering Skill

## Purpose
Provide a repeatable workflow for safe updates to Reynolds steering systems in this workspace

## Scope
- Use for steering behavior in Babylon.js
- Use for flocking target following obstacle avoidance wander arrive seek flee pursue and evade work
- Use for BehaviorManager updates and any runtime integration with steering vehicles
- Do not use for unrelated UI or documentation tasks unless they affect steering runtime behavior

## Read First
1. `agentic-docs/DIRECTORY.md`
2. `agentic-docs/context/project-overview.md`
3. `agentic-docs/references/file-map.md`
4. `agentic-docs/specs/requirements.md`
5. `agentic-docs/specs/agent-workflow.md`
6. `js/SteeringVehicle.js`
7. `js/BehaviorManager.js`
8. `js/BabylonApp.js`
9. `js/BabylonGUI.js`

## Implementation Rules
- Keep all steering vectors in `BABYLON.Vector3`
- Preserve integration order force -> acceleration -> velocity -> position
- Clamp with existing `maxForce` and `maxSpeed` helpers
- Keep flock methods deterministic per frame
- Avoid introducing hidden globals
- Keep existing public method names unless a task explicitly requires a rename
- Prefer minimal diffs and stable behavior over refactors
- Add short dev oriented comments only where logic is not obvious
- Keep script paths and asset names exact in runtime files

## Babylon Specific Constraints
- Retained mode only
- Create meshes once in constructors
- Sync physics to mesh position and rotation during update
- Do not introduce p5 drawing commands in steering logic
- Use Babylon vector methods such as add subtract scaleInPlace normalize length
- Do not rely on unsupported methods such as limit setMagnitude or heading

## Reynolds Workflow
1. Confirm the target behavior and which runtime files are in scope
2. Read the current steering implementation before editing
3. Decide whether the change belongs in `SteeringVehicle.js` or `BehaviorManager.js`
4. If needed wire the runtime bridge in `BabylonApp.js`
5. If the change affects controls or debug toggles verify `BabylonGUI.js`
6. Keep force blending deterministic and bounded
7. Validate the edited JS files with `node -c`

## Debug Rules
- Respect `window.renderDebug`
- Clear debug meshes when toggling debug off
- Keep debug visuals short lived and disposable
- Draw debug meshes with Babylon lines only
- Avoid leaving stale debug state after behavior changes

## Validation Checklist
- `node -c js/SteeringVehicle.js`
- `node -c js/BehaviorManager.js`
- `node -c js/BabylonApp.js`
- `node -c js/BabylonGUI.js`
- Verify mouse mode target follows cursor
- Verify head tracking mode still calibrates and maps target
