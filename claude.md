# Claude Agent Instructions

This document contains mandatory protocols for AI agents working on this repository.

## 1. Todo List Management

### 1.1 Todo List Requirements

**MANDATORY**: When working on any task in this repository, the AI agent MUST generate a comprehensive, detailed todo list that:

- Breaks down the task into discrete, actionable steps
- Includes all sub-tasks - no step is too small to document
- Specifies file paths where changes will be made
- Notes dependencies between tasks (what must be done before what)
- Includes verification steps (testing, building, validation)
- Estimates complexity for each item (simple/moderate/complex)

### 1.2 Todo List Persistence

Every generated todo list MUST be saved to the `claude/` directory in the repository root using the following format:

**Filename Format**: `todo_YYYY-MM-DD_HH-MM-SS_nnnnnn.md`

- Uses America/Toronto timezone (Eastern Time)
- Atomic timestamp with microseconds for uniqueness
- Example: `todo_2026-01-05_14-32-45_123456.md`

**File Structure**:

```markdown
# Todo List: [Brief Task Description]

**Generated**: YYYY-MM-DD HH:MM:SS America/Toronto
**Task Summary**: [One-line description of the overall goal]

## Tasks

- [ ] Task 1 description
  - File(s): `path/to/file.ts`
  - Complexity: simple|moderate|complex
  - Dependencies: none|Task N

- [ ] Task 2 description
  - File(s): `path/to/file.ts`, `path/to/other.ts`
  - Complexity: simple|moderate|complex
  - Dependencies: Task 1

## Verification

- [ ] Build succeeds
- [ ] Tests pass
- [ ] Documentation updated (if applicable)

## Notes

[Any additional context, considerations, or potential issues]
```

### 1.3 Todo List Usage

- Create the todo list BEFORE starting work on any non-trivial task
- Update task status as work progresses (mark items complete)
- Add new tasks discovered during implementation
- Reference the todo file in commit messages when relevant

### 1.4 Task Completion Protocol

**CRITICAL**: After completing EACH task item, the AI agent MUST:

1. **Update the todo file** - Mark the completed item with `[x]` and add a completion timestamp

2. **Re-review the entire todo list** - Before proceeding to the next task:
   - Verify the original goal is still being addressed
   - Confirm remaining tasks are still relevant and correctly ordered
   - Check that no scope creep or deviation has occurred
   - Ensure the next task aligns with the overall objective
   - Add course-correction notes if any deviation is detected in the `## Notes` section

This prevents the agent from "going off track" during long or complex implementations.

### 1.5 Todo List Retention Policy

**NEVER delete todo list files.** All todo lists are permanent records that:

- Provide audit trails for completed work
- Enable review of past decisions and approaches
- Support debugging if issues arise from previous changes
- Document the evolution of task understanding

### 1.6 Repository Synchronization

**MANDATORY**: Todo list files MUST be pushed to the repository:

- **Initial commit** - Push the todo file immediately after creation
- **Progress commits** - Push updates after completing each task item (or batch of related items)
- **Final commit** - Ensure the completed todo file is pushed before ending the session

**Commit message format for todo updates**:

```
chore(todo): Update todo list - [brief description]

- Completed: [task description]
- Remaining: [N] tasks
```

## 2. Code Quality Standards

### 2.1 TypeScript Best Practices

- Maintain strict type safety - avoid `any` types in domain models
- Use proper interfaces for all API entities
- Ensure all functions have explicit return types
- Use optional chaining and nullish coalescing where appropriate

### 2.2 Error Handling

- Always check content-type headers before parsing responses
- Provide meaningful error messages with context
- Include HTTP status codes in API error messages
- Handle both JSON and non-JSON error responses gracefully

### 2.3 Documentation

- Update README.md when adding new features or tools
- Document all MCP tools with clear descriptions and parameter specifications
- Include usage examples for new functionality
- Keep API documentation in sync with implementation

## 3. Testing and Validation

### 3.1 Build Verification

- Run `npm run build` after any TypeScript changes
- Ensure no compilation errors or warnings
- Verify generated files in `dist/` directory

### 3.2 Code Review Checklist

Before committing changes, verify:

- [ ] TypeScript compiles without errors
- [ ] No `any` types introduced in domain models
- [ ] Error handling is comprehensive
- [ ] Documentation is updated
- [ ] Commit message is descriptive
- [ ] Todo list is updated (if applicable)

## 4. Git Workflow

### 4.1 Branch Management

- Work on feature branches with descriptive names
- Branch naming: `claude/[feature-description]-[session-id]`
- Never force push to main/master
- Always use `-u` flag when pushing new branches

### 4.2 Commit Messages

Follow conventional commit format:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types**: feat, fix, docs, style, refactor, test, chore

**Examples**:
```
feat(api): Add work package type discovery tools
fix(client): Handle non-JSON error responses
docs(readme): Update tool documentation
chore(todo): Complete error handling improvements
```

### 4.3 Commit Frequency

- Commit logically related changes together
- Don't batch unrelated changes in single commits
- Push regularly to sync with remote repository

## 5. MCP Server Specific Guidelines

### 5.1 Tool Implementation

When adding new MCP tools:

1. Define the tool schema in the `tools` array
2. Implement the client method in `OpenProjectClient`
3. Add the handler case in `CallToolRequestSchema`
4. Update TypeScript types if needed
5. Document in README.md
6. Test compilation

### 5.2 API Client Standards

- All API methods should use the centralized `request()` method
- Use query parameter builders for consistent formatting
- Return properly typed responses
- Handle pagination parameters consistently

### 5.3 Type Definitions

- Keep all OpenProject entity types in `src/types.ts`
- Use HAL+JSON structure (\_type, \_links, \_embedded)
- Export all public interfaces
- Use proper TypeScript generics for collections

## 6. Security Considerations

### 6.1 API Credentials

- Never commit `.env` files
- Validate environment variables at startup
- Warn users about HTTP vs HTTPS
- Validate URL formats before use

### 6.2 Input Validation

- Validate required parameters
- Check URL protocols and formats
- Sanitize user inputs before API calls
- Provide clear error messages for invalid inputs

## 7. Repository Structure

```
mcp-openproject/
├── claude/              # Todo lists and agent notes
├── src/                 # TypeScript source files
│   ├── index.ts        # MCP server entry point
│   ├── openproject-client.ts  # API client
│   └── types.ts        # Type definitions
├── dist/               # Compiled JavaScript (gitignored)
├── .env.example        # Environment template
├── .gitignore
├── package.json
├── tsconfig.json
├── README.md
└── claude.md           # This file
```

## 8. Session Management

### 8.1 Starting a Session

1. Review existing todo lists in `claude/` directory
2. Check git status and recent commits
3. Understand current state of the codebase
4. Create new todo list if starting new work

### 8.2 During a Session

1. Follow the todo list systematically
2. Update todo list after each completed task
3. Commit and push changes regularly
4. Re-review objectives before each new task

### 8.3 Ending a Session

1. Complete and mark all finished tasks in todo list
2. Push final changes to repository
3. Ensure build is clean
4. Document any incomplete work in todo list notes

---

**Last Updated**: 2026-01-06
**Repository**: mcp-openproject
**Primary Language**: TypeScript
**Framework**: Model Context Protocol (MCP)
