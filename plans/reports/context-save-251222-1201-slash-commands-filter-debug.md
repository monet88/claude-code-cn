# Context Save: Slash Commands Filter Debug

**Date:** 2025-12-22 12:01
**Session Type:** Bug Investigation & Fix
**Status:** Completed

## Summary

Investigated and improved slash commands filtering logic in `useRuntime.ts`.

## Key Findings

### Commands vs Skills in Claude Code

| Feature | Commands | Skills |
|---------|----------|--------|
| **Location** | `.claude/commands/` | `.claude/skills/` |
| **Invocation** | Manual (`/command-name`) | Auto by AI |
| **Context** | Full file loaded on invoke | Brief desc → full on demand |
| **CLI API** | Returned by `supportedCommands()` | NOT returned, managed by AI |

### Investigation Result

- CLI `supportedCommands()` returns **Commands only** (154 registered)
- Skills are auto-triggered by AI, not in dropdown
- Original code was functionally correct but lacked validation

## Changes Made

### File: `src/webview/src/composables/useRuntime.ts`

**Lines 71-80** - Improved filtering logic:

```typescript
// Before:
.filter((cmd: any) => typeof cmd?.name === 'string' && cmd.name)

// After:
const validCommands = claudeConfig.slashCommands.filter((cmd: any) => {
  const isValid = typeof cmd?.name === 'string' && cmd.name.trim().length > 0;
  if (!isValid && cmd) {
    console.warn('[Runtime] Skipping invalid command:', cmd);
  }
  return isValid;
});
```

**Improvements:**
1. Better validation: `name.trim().length > 0`
2. Debug logging: raw CLI data
3. Warning log for invalid commands
4. Accurate comments about Commands vs Skills

## Test Result

```
[Runtime] Registered 154 slash commands
```

## Related Files

- `src/webview/src/composables/useRuntime.ts` - Main change
- `src/services/skillService.ts` - Skills management (separate)
- `src/services/claude/handlers/handlers.ts:655` - CLI data source

## Context Fingerprint

```
project: claude-code-cn
branch: master
focus: slash-commands-filtering
files_modified: 1
commands_registered: 154
```
