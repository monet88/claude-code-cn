# Context Save: Model Selection & Hooks Debug Session

**Session:** 2024-12-22 00:34
**Project:** claude-code-cn (VSCode Extension)
**Branch:** master

---

## Session Summary

### Issues Addressed

#### 1. Model Configuration Not Recognized
**Problem:** User configured `gemini-claude-opus-4-5-thinking` but extension sent `claude-opus-4-5-20251101` to API
**Error:** `API Error: 400 {"error":{"message":"unknown provider for model claude-opus-4-5-20251101"}}`

**Root Cause:** Hardcoded fallback models in `ModelSelect.vue`:
```javascript
// OLD - Lines 73-79
if (options.length === 1) {
  options.push(
    { id: 'claude-sonnet-4-5', label: 'Sonnet 4.5' },
    { id: 'claude-opus-4-5-20251101', label: 'Opus 4.5' }  // Hardcoded Anthropic model
  )
}
```

**Fix Applied:** Replace hardcoded fallback with provider's `mainModel`:
```javascript
// NEW
if (activeProvider?.mainModel) {
  options.push({ id: activeProvider.mainModel, label: 'Main' })
}
```

**Files Modified:**
- `src/webview/src/components/ModelSelect.vue` (lines 73-79, 85-104)

#### 2. Hooks Not Working (False Alarm)
**Problem:** User reported hooks not being received
**Investigation:** Added debug logging to Session.ts to verify hook_response messages
**Result:** Hooks ARE working - SDK loads from `settingSources: ['user', 'project', 'local']`
**Debug log added then removed** after confirmation

---

## Key Files & Architecture

### Model Selection Flow
```
User selects model in dropdown
  → ModelSelect.vue emits 'modelSelect' event
  → ChatInputBox.vue → ChatPage.vue
  → ClaudeAgentService.setModel()
  → Saves to claudecodecn.selectedModel in VSCode settings
  → ClaudeSdkService.query() uses model parameter
  → SDK sends to CLI with model name
```

### Hooks Flow
```
SDK loads settings from:
  - ~/.claude/settings.json (user)
  - .claude/settings.json (project)
  - .claude/settings.local.json (local)

Hooks defined in settings.json:
  - PreCompact, PreToolUse, SessionEnd
  - SessionStart, SubagentStart, UserPromptSubmit

SDK executes hooks → sends SDKHookResponseMessage (type: 'system', subtype: 'hook_response')
  → ClaudeAgentService forwards to webview
  → Session.ts receives (currently not rendered, only state updates)
```

### Provider Configuration
```typescript
// Provider stores model names in:
interface ProviderConfig {
  mainModel?: string;        // ANTHROPIC_DEFAULT_MODEL
  haikuModel?: string;       // ANTHROPIC_DEFAULT_HAIKU_MODEL
  sonnetModel?: string;      // ANTHROPIC_DEFAULT_SONNET_MODEL
  opusModel?: string;        // ANTHROPIC_DEFAULT_OPUS_MODEL
}
```

---

## Important Locations

| Purpose | File | Lines |
|---------|------|-------|
| Model dropdown options | `src/webview/src/components/ModelSelect.vue` | 56-79 |
| Model selection logic | `src/services/claude/ClaudeSdkService.ts` | 115-131 |
| SDK options (hooks, settings) | `src/services/claude/ClaudeSdkService.ts` | 140-203 |
| Message forwarding | `src/services/claude/ClaudeAgentService.ts` | 443-452 |
| Message processing | `src/webview/src/core/Session.ts` | 394-432 |
| SDK types (hooks, messages) | `node_modules/.pnpm/@anthropic-ai+claude-agent-sdk@0.1.69_zod@3.25.76/.../agentSdkTypes.d.ts` | Full file |

---

## User Settings Location

VSCode settings for model:
```json
{
  "claudecodecn.selectedModel": "default"  // or specific model name
}
```

Claude hooks config:
```
C:\Users\monet\.claude\settings.json
```

---

## Build Commands

```powershell
# Build webview + extension
pnpm build

# Package VSIX
pnpm package

# Output: claude-code-1.2.0.vsix (25.55 MB)
```

---

## Pending/Future Work

1. **Model dropdown UX** - Consider showing all provider models dynamically
2. **Hook response display** - Currently not rendered in UI (only logged if debug enabled)
3. **Error handling** - Better feedback when model is not supported by provider

---

## Session Artifacts

- Debug report: `plans/reports/debugger-251221-2357-model-transformation-bug.md`
- VSIX package: `claude-code-1.2.0.vsix`
