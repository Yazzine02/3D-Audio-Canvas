# Agent Workflow Spec

## Required Start Sequence
1. Read `AGENTS.md`
2. Read `agentic-docs/DIRECTORY.md`
3. Read `agentic-docs/context/project-idea.md`
4. Read context and reference docs in the declared order
5. Read `agentic-docs/specs/requirements.md`
6. If steering logic is touched load `.agents/skills/reynolds-steering/SKILL.md`

## Change Rules
- Keep behavior stable and unchanged unless user asks for behavior changes
- Apply minimal diffs
- Avoid renaming files or symbols without reason
- Keep script paths and case exact

## New File Checklist
- Add the new file to `agentic-docs/references/file-map.md`
- If the file is a runtime JS file check whether `index.html` must load it
- If the file introduces globals document them in `agentic-docs/context/project-overview.md`
- If the file changes a workflow or runtime contract update this spec
- If the file is an agent asset update `agentic-docs/DIRECTORY.md` and the matching `.agents` readme

## Validation Rules
- Run syntax check for edited JS files with `node -c`
- Validate runtime paths for assets and scripts
- Recheck any global used across modules
- When behavior depends on UI state verify the UI writes and the runtime reads the same flag
- When adding a slider or toggle verify the callback uses the correct type and expected range

## Documentation Rules
- Prefer short dev comments near core logic
- Keep comments practical and implementation focused
- Avoid redundant comments

## Delivery Rules
- Report what changed and why
- List touched files
- Mention validations executed and result
