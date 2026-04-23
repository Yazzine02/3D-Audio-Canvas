
## Agentic System In This Project
### Why this project uses agentic docs
This repository is intentionally organized as an agent-first workspace.
I tried to build what I think of an ideal markdown reference system for coding agents:
- one clear routing entry point
- explicit read order
- strict requirements file
- practical workflow and validation rules
- reusable skills and tool guides
The first goal is to test and play to see how agents reacts and if it is not an overkill. Globally with the aim to reduce ambiguity so agents make fewer wrong assumptions and keep outputs consistent across sessions.

### Main agentic entry points
- `AGENTS.md`: top-level routing for all coding agents
- `agentic-docs/DIRECTORY.md`: index and read order for docs
- `agentic-docs/specs/requirements.md`: strict rules agents must follow
- `agentic-docs/specs/agent-workflow.md`: execution and validation workflow
- `.agents/skills/reynolds-steering/SKILL.md`: steering-specific workflow
- `.agents/tools/babylon-runtime-tools.md`: command and safety rules

### How to use agents on this project
1. Open chat in VS Code from this workspace.
2. Use the default coding agent for general tasks.
3. For steering behavior tasks choose the custom Reynolds agent when available in the agent selector.
4. If your chat supports explicit agent call, request Reynolds with a prompt like "Use Reynolds agent for this steering task".
5. Always provide target files and expected validation checks in the same message.

### What to do before prompting
- Identify if your request is steering logic or runtime integration.
- For steering logic include expected behaviors and constraints such as keep X unchanged.
- For runtime integration include expected mode behavior such as mouse mode or headtracking mode.
- State what must stay unchanged to avoid broad refactors.

### Which files to refer when prompting
Global routing and rules
- `AGENTS.md`
- `agentic-docs/DIRECTORY.md`
- `agentic-docs/specs/requirements.md`
- `agentic-docs/specs/agent-workflow.md`

Project context
- `agentic-docs/context/project-idea.md`
- `agentic-docs/context/project-overview.md`
- `agentic-docs/references/file-map.md`

Steering prompts
- `js/SteeringVehicle.js`
- `js/BehaviorManager.js`
- `.agents/skills/reynolds-steering/SKILL.md`

Runtime prompts
- `js/BabylonApp.js`
- `js/BabylonGUI.js`
- `js/EyeTracking.js`
- `index.html`
- `style.css`

Prompt template you can reuse
- Context: which files and mode are impacted
- Goal: exact behavior to implement or fix
- Constraints: what must remain unchanged
- Validation: which checks to run such as `node -c js/BabylonApp.js`

Example prompts
1. "Update `js/BabylonApp.js` pointer move logic so mouse mode clamps target inside bounds and do not change headtracking behavior. Run node syntax checks after edit."
2. "Add short dev-oriented comments in `js/BehaviorManager.js` core methods only and keep logic unchanged."
3. "If you add a new runtime file, also update `agentic-docs/references/file-map.md` and `agentic-docs/specs/agent-workflow.md`."
4. "Improve the debug toggle flow between GUI and runtime and verify both writer and reader use the same flag."

### Prompting tips for best results
- Name exact files and symbols when possible
- State whether behavior must remain unchanged
- Ask for minimal diffs to avoid broad rewrites
- Request specific validations such as `node -c` on touched JS files
- Ask the agent to update agentic docs when architecture changes

### Maintenance rule for contributors and agents
If you create a new file or introduce a new runtime contract, update the agentic docs in the same change set:
- add file references to `agentic-docs/references/file-map.md`
- update global/runtime context in `agentic-docs/context/project-overview.md`
- update process constraints in `agentic-docs/specs/requirements.md` or `agentic-docs/specs/agent-workflow.md`

---
