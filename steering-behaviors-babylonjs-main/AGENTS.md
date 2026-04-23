# Workspace Agent Guide

Use this file as the top level router for all coding agents in this repository

Mandatory Read Order
1. `agentic-docs/DIRECTORY.md`
2. `agentic-docs/context/project-idea.md`
3. `agentic-docs/context/project-overview.md`
4. `agentic-docs/references/file-map.md`
5. `agentic-docs/specs/requirements.md`
6. `agentic-docs/specs/agent-workflow.md`

When Working On Steering Logic
- Load `.agents/skills/reynolds-steering/SKILL.md`
- Read `js/SteeringVehicle.js`
- Read `js/BehaviorManager.js`

When Working On App Runtime
- Read `js/BabylonApp.js`
- Read `js/BabylonGUI.js`
- Read `js/EyeTracking.js`

Tool Rules
- Follow `.agents/tools/babylon-runtime-tools.md`
- Prefer minimal diffs and keep behavior stable unless task says otherwise

Critical needed Documentation Maintenance 
- When you add a new file update `agentic-docs/references/file-map.md`
- When you add a new global update `agentic-docs/context/project-overview.md`
- When you change agent flow or validation rules update `agentic-docs/specs/agent-workflow.md`
- When you add a new skill or tool guide update `agentic-docs/DIRECTORY.md`
