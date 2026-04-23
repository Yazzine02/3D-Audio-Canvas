# Requirements

This file is the source of truth for what agents must strictly adhere to in this workspace.

## Mandatory Rules
- Read the required routing and context files before changing code or docs
- Keep behavior stable unless the user explicitly asks for a behavior change
- Prefer minimal diffs and avoid unrelated refactors
- Preserve existing public method names unless a rename is requested
- Use the correct file name casing in script tags and asset paths
- Never introduce destructive shell commands or overwrite unrelated user changes
- Keep all runtime math and steering logic in `BABYLON.Vector3`
- Do not mix p5 drawing logic into Babylon runtime code unless the task explicitly involves the tracking overlay

## Required Read Order
1. `AGENTS.md`
2. `agentic-docs/DIRECTORY.md`
3. `agentic-docs/context/project-idea.md`
4. `agentic-docs/context/project-overview.md`
5. `agentic-docs/references/file-map.md`
6. `agentic-docs/specs/agent-workflow.md`
7. `agentic-docs/specs/requirements.md`
8. Any skill file named by the task such as `.agents/skills/reynolds-steering/SKILL.md`

## Change Rules
- If a new runtime file is added update `agentic-docs/references/file-map.md`
- If a new global is added update `agentic-docs/context/project-overview.md`
- If a workflow or validation rule changes update `agentic-docs/specs/agent-workflow.md`
- If a new skill or tool guide is added update `agentic-docs/DIRECTORY.md`
- If a new `.agents` asset is added update the matching `.agents` README
- If a script path or asset name changes update `index.html` and the file map together

## Runtime Rules
- Keep steering behavior deterministic and bounded by the current force and speed caps
- Use the existing runtime bridge globals instead of inventing new ones unless needed
- Keep UI state and runtime state aligned for toggles and sliders
- Keep debug meshes disposable and short lived
- Keep head tracking, mouse control, and calibration flow stable unless the task targets them

## Validation Rules
- Run syntax checks on edited JS files with `node -c`
- Validate script and asset paths after any file rename or move
- Verify any new slider or toggle uses the expected value type and range
- Verify any new global is both written and read by the correct runtime file
- Verify debug toggles and vehicle count controls affect runtime behavior immediately

## Documentation Rules
- Keep comments short, practical, and implementation focused
- Add new file references as soon as the file exists
- Remove stale references when a file is deleted or renamed
- Keep agent docs consistent across `AGENTS.md`, `agentic-docs`, `.agents`, and `.github/agents`

## Agent Ownership Rules
- `AGENTS.md` is the top level router for workspace agents
- `agentic-docs/DIRECTORY.md` is the index for the agent docs tree
- `agentic-docs/context/project-overview.md` stores runtime context and globals
- `agentic-docs/references/file-map.md` stores the current source of truth for important files
- `agentic-docs/specs/agent-workflow.md` stores workflow and validation rules
- `.agents/skills/*/SKILL.md` stores task specific skills
- `.agents/tools/*` stores tool usage rules
