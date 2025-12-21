# Scout Report: settings.json and Hooks Handling

**ID**: scout-251221-2103-hooks-settings-analysis  
**Date**: 2025-12-21

## Summary

Extension reads `~/.claude/settings.json` via multiple services. Hooks are **hardcoded in SDK service**, NOT loaded from user's settings.json. This is a critical gap.

---

## 1. Settings.json Loading/Parsing

### Primary Service: `claudeSettingsService.ts`
**Path**: `F:\VSCODE Extension\claude-code-cn\src\services\claudeSettingsService.ts`

| Function | Lines | Description |
|----------|-------|-------------|
| `getSettingsPath()` | 72-75 | Returns `~/.claude/settings.json` |
| `readSettings()` | 80-105 | Reads and parses JSON, returns dynamic structure |
| `writeSettings()` | 110-130 | Writes settings with 2-space indentation |

**Interface** (lines 19-24):
```typescript
export interface ClaudeSettings {
  env?: Record<string, string | undefined>;  // Only special field
  [key: string]: any;  // Dynamic fields - INCLUDES hooks
}
```

### Secondary Service: `ccSwitchSettingsService.ts`
**Path**: `F:\VSCODE Extension\claude-code-cn\src\services\ccSwitchSettingsService.ts`

Uses `claudeSettingsService.readSettings()` to create default provider config (line 271).
Stores full settings.json snapshot in `ClaudeProvider.settingsConfig` (lines 61-71).

---

## 2. Hooks Configuration from Settings

### ISSUE: Hooks NOT read from settings.json

**File**: `F:\VSCODE Extension\claude-code-cn\src\services\claude\ClaudeSdkService.ts`

Lines 187-209 - **Hardcoded hooks**:
```typescript
hooks: {
    PreToolUse: [{
        matcher: "Edit|Write|MultiEdit",
        hooks: [async (input, toolUseID, options) => {
            // ... hardcoded logging only
            return { continue: true };
        }]
    }],
    PostToolUse: [/* similar hardcoded */]
}
```

The SDK service does NOT:
1. Read hooks from `~/.claude/settings.json`
2. Pass user-defined hook commands to the SDK
3. Support `PreToolUse`, `PostToolUse`, `PreMessage`, `PostMessage` from config

### SDK Options passed (lines 142-224):
```typescript
const options: Options = {
    cwd, resume, model, permissionMode, maxThinkingTokens,
    canUseTool,
    stderr: (data) => { /* logging */ },
    env: envVariables,  // ← env is passed
    systemPrompt: { type: 'preset', ... },
    hooks: { /* HARDCODED, NOT from settings */ },
    pathToClaudeCodeExecutable: ...,
    settingSources: ['user', 'project', 'local'],  // ← settings sources
    includePartialMessages: true
};
```

---

## 3. Where Hooks SHOULD Be Executed

### CLI (bundled) 
**Path**: `F:\VSCODE Extension\claude-code-cn\resources\claude-code\cli.js`

CLI references hooks extensively (minified, hard to trace exact lines):
- Line 2065: Hook confirmation logic
- Line 1126: References `--no-verify` for git hooks
- Lines 3016-3018: Hook patterns like `Write`, `Edit`

CLI loads hooks from settings.json internally.

### Extension's SDK Service
**Path**: `F:\VSCODE Extension\claude-code-cn\src\services\claude\ClaudeSdkService.ts`

SDK calls use `settingSources: ['user', 'project', 'local']` (line 221), which **should** make the CLI load hooks from:
- `~/.claude/settings.json` (user)
- `.claude/settings.json` (project)
- `.claude/settings.local.json` (local)

---

## 4. CLI vs Extension Differences

| Aspect | CLI | Extension |
|--------|-----|-----------|
| Settings sources | Full chain (user/project/local) | Passed via `settingSources` |
| Hooks loading | From settings.json | **Hardcoded + SDK internal** |
| Env variables | Direct | Overlay from `cc-switch` provider |
| Hook execution | Full support | **UNCLEAR** - depends on SDK |

### Environment Variable Overlay
**File**: `ClaudeSdkService.ts` lines 317-351

Provider's `settingsConfig.env` is merged into environment, but **other settingsConfig fields (like hooks) are ignored**.

---

## 5. Potential Issues

### CRITICAL: User hooks may not work in extension

1. **Extension hardcodes hooks** (lines 187-209) - only logs, doesn't run user commands
2. **settingsConfig not passed to SDK** - only `env` is extracted and passed
3. **settingSources is passed** - SDK *should* read hooks from settings files internally

### Verification needed:
- Does `@anthropic-ai/claude-agent-sdk` load hooks from `settingSources` automatically?
- Or must hooks be passed explicitly via `options.hooks`?

---

## File Reference Summary

| File | Relevance |
|------|-----------|
| `src/services/claudeSettingsService.ts` | Primary settings.json reader |
| `src/services/ccSwitchSettingsService.ts` | Provider management, uses claudeSettingsService |
| `src/services/claude/ClaudeSdkService.ts` | SDK wrapper, **hardcoded hooks** |
| `src/services/claude/handlers/handlers.ts` | Opens config files, doesn't process hooks |
| `resources/claude-code/cli.js` | Bundled CLI with full hook support |

---

## Unresolved Questions

1. Does `settingSources: ['user', 'project', 'local']` make SDK auto-load hooks?
2. If yes, why are hardcoded hooks in `ClaudeSdkService` needed at all?
3. If no, how to properly pass user hooks from settings.json to SDK?
4. Are hook shell commands executed in CLI subprocess or extension process?
