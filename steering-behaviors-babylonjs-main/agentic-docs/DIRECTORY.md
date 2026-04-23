# Agentic Docs Directory

Purpose
- Provide one stable place where AI agents can find project context
- Document which files to read before coding
- Define reusable skills and tool usage rules

Read Order For Agents
1. `agentic-docs/context/project-idea.md`
2. `agentic-docs/context/project-overview.md`
3. `agentic-docs/references/file-map.md`
4. `agentic-docs/specs/requirements.md`
5. `agentic-docs/specs/agent-workflow.md`
6. `.agents/skills/reynolds-steering/SKILL.md`
7. `.agents/tools/babylon-runtime-tools.md`

Sections
- `agentic-docs/context/`: high level architecture and runtime flow
- `agentic-docs/references/`: source of truth mapping to key files
- `agentic-docs/specs/`: implementation workflow and quality gates

Agent Assets
- `.agents/README.md`: local agent layout and conventions
- `.agents/skills/README.md`: skill loading rules
- `.agents/tools/README.md`: tool execution rules
- `agentic-docs/specs/requirements.md`: workspace agent requirements and strict rules
- `agentic-docs/context/project-idea.md`: high level game concept and pedagogical intent