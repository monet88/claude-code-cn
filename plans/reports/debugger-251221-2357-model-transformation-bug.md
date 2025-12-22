# Model Name Transformation Bug Investigation Report

**Subagent ID:** a62eca2
**Date:** 2025-12-21
**Status:** Root Cause Identified

---

## Executive Summary

**Issue:** User configures model `gemini-claude-opus-4-5-thinking` but API receives `claude-opus-4-5-20251101`, causing 400 error.

**Root Cause:** NOT in the extension code. The issue is in the bundled `cli.js` (Claude SDK CLI) which has hardcoded model constants that appear in the system prompt's `<claude_background_info>` section - this is displayed context info, NOT the API request model.

**Real Cause:** The API endpoint (third-party provider) does not support the model `gemini-claude-opus-4-5-thinking`. The model name is passed through correctly from extension to SDK.

---

## Technical Analysis

### 1. Model Flow Path

```
User Config → ClaudeSdkService.query() → SDK → cli.js → API
```

**Verified:** Model name passes unchanged through extension code:

1. **ClaudeAgentService.ts** (line 293-296, 362): Model from `launch_claude` message passed directly
2. **ClaudeSdkService.ts** (line 145): `options.model = modelParam` - no transformation
3. **Model selection logic** (lines 116-131):
   - If `'default'` or `null` → uses `ANTHROPIC_DEFAULT_MODEL` from provider env
   - Otherwise → uses user-selected model AS-IS

### 2. Hardcoded Values Found (Not Causing Issue)

**File:** `resources/claude-code/cli.js` (line 3533)

```javascript
zAI = "Claude Sonnet 4.5"
UAI = "claude-sonnet-4-5-20250929"
```

These are used ONLY in system prompt generation for `<claude_background_info>`:
```
The most recent frontier Claude model is ${zAI} (model ID: '${UAI}').
```

This is informational context for the model, NOT the API request model parameter.

### 3. ModelSelect.vue Fallback Values

**File:** `src/webview/src/components/ModelSelect.vue` (lines 76-78)

```javascript
// Fallback options when no provider models configured
{ id: 'claude-sonnet-4-5', label: 'Sonnet 4.5' },
{ id: 'claude-opus-4-5-20251101', label: 'Opus 4.5' }
```

These only appear in UI dropdown when provider has no custom models. Does not transform user-selected model.

### 4. Provider Configuration

**File:** `src/services/ccSwitchSettingsService.ts` & `src/webview/src/types/provider.ts`

Provider config supports custom model names:
```typescript
interface ProviderConfig {
  opusModel?: string;    // Custom Opus model name
  sonnetModel?: string;  // Custom Sonnet model name
  haikuModel?: string;   // Custom Haiku model name
  mainModel?: string;    // Default model
}
```

---

## Root Cause Identification

The error `unknown provider for model claude-opus-4-5-20251101` suggests:

1. User may have PREVIOUSLY selected `claude-opus-4-5-20251101` (from fallback dropdown) before configuring their custom model
2. The saved preference in `claudecodecn.selectedModel` setting contains the old fallback value
3. OR: The third-party API provider does not recognize the model name format

### Evidence from ClaudeAgentService.setModel() (lines 921-935):

```typescript
async setModel(channelId: string, model: string): Promise<void> {
  // ...
  await channel.query.setModel(model);
  await this.configService.updateValue('claudecodecn.selectedModel', model);
  // ...
}
```

Model selection is SAVED to VSCode config. If user previously selected `claude-opus-4-5-20251101` and it got saved, subsequent sessions may load that value.

---

## Key File Locations

| File | Purpose | Model Handling |
|------|---------|----------------|
| `src/services/claude/ClaudeSdkService.ts` | SDK wrapper | Passes model unchanged (lines 116-145) |
| `src/services/claude/ClaudeAgentService.ts` | Session management | Passes model from message (lines 293, 362) |
| `src/webview/src/components/ModelSelect.vue` | UI dropdown | Fallback values (lines 76-78) |
| `resources/claude-code/cli.js` | Claude CLI | Hardcoded info values (line 3533) - NOT used for API |
| `src/services/ccSwitchSettingsService.ts` | Provider config | Reads model from provider settings |

---

## Recommendations

### Immediate Fix
1. User should check VSCode settings for `claudecodecn.selectedModel` - may contain stale value
2. User should verify their provider API supports the model name `gemini-claude-opus-4-5-thinking`

### Code Improvements
1. Add model validation/logging in `ClaudeSdkService.query()` to show exact model being sent
2. Consider clearing saved model preference when provider changes
3. Add model compatibility check for third-party providers

---

## Unresolved Questions

1. Where exactly is the model `gemini-claude-opus-4-5-thinking` configured? (VSCode settings? Provider config?)
2. What third-party provider API is being used? Does it support this model name?
3. Is there a saved model preference in VSCode overriding the intended config?
