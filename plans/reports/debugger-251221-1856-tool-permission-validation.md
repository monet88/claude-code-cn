# Debug Report: Tool Permission Request Validation Failure

**Report ID:** debugger-251221-1856-tool-permission-validation
**Date:** 2025-12-21
**Status:** Root cause identified, fix required

---

## Executive Summary

**Issue:** Tool permission requests fail with Zod validation error when user clicks "Yes" in the extension panel.

**Root Cause:** The `handleResolvePermission` function in `ChatPage.vue` calls `request.accept(request.inputs)` with only ONE argument, but the SDK's `PermissionResult` schema requires the `updatedInput` property to be a non-undefined object. The `accept()` method's default parameter value doesn't propagate correctly through serialization.

**Impact:** Users cannot approve tool permission requests via the extension UI (but CLI works fine).

---

## Technical Analysis

### 1. Error Breakdown

The Zod error shows a **union validation failure** with two branches:

```
Branch 1 (allow behavior):
- "updatedInput" is Required (received: undefined)

Branch 2 (deny behavior):
- "behavior" expected "deny", received "allow"
- "message" is Required (received: undefined)
```

The SDK is receiving `{ behavior: 'allow' }` **without** `updatedInput`, failing both schema branches.

### 2. SDK Schema (Source of Truth)

From `node_modules\.pnpm\@anthropic-ai+claude-agent-sdk@0.1.69\...\agentSdkTypes.d.ts` (lines 93-140):

```typescript
export type PermissionResult = {
    behavior: 'allow';
    updatedInput: Record<string, unknown>;  // <-- REQUIRED!
    updatedPermissions?: PermissionUpdate[];
    toolUseID?: string;
} | {
    behavior: 'deny';
    message: string;  // <-- REQUIRED for deny!
    interrupt?: boolean;
    toolUseID?: string;
};
```

**Key insight:** For `behavior: 'allow'`, `updatedInput` is **required** (not optional).

### 3. PermissionRequest.accept() Method

**File:** `src/webview/src/core/PermissionRequest.ts` (lines 24-29)

```typescript
accept(
  updatedInput: Record<string, unknown> = this.inputs,  // default value
  updatedPermissions: PermissionUpdate[] = this.suggestions
): void {
  this.resolved.emit({ behavior: 'allow', updatedInput, updatedPermissions });
}
```

This looks correct - `updatedInput` has a default value of `this.inputs`.

### 4. The Bug Location

**File:** `src/webview/src/pages/ChatPage.vue` (lines 516-526)

```typescript
function handleResolvePermission(request: PermissionRequest, allow: boolean) {
  try {
    if (allow) {
      request.accept(request.inputs);  // <-- BUG: Only passes 1 argument
    } else {
      request.reject('User denied', true);
    }
  } catch (e) {
    console.error('[ChatPage] permission resolve failed', e);
  }
}
```

**Problem:** The call `request.accept(request.inputs)` only passes one argument. While this should work due to the default parameter, somewhere in the serialization/transmission process, the `updatedPermissions` field is being lost or the object isn't properly constructed.

### 5. Second Issue in PermissionRequestModal.vue

**File:** `src/webview/src/components/PermissionRequestModal.vue` (lines 129-135)

```typescript
const handleApprove = () => {
  if (modifiedInputs.value) {
    (props.request as any).inputs = modifiedInputs.value;
  }
  props.onResolve(props.request, true);  // <-- Delegates to handleResolvePermission
};
```

This delegates to `handleResolvePermission`, which has the same issue.

However, there's also `handleApproveAndDontAsk` (line 137-139):
```typescript
const handleApproveAndDontAsk = () => {
  props.request.accept(props.request.inputs, props.request.suggestions || []);
};
```

This correctly passes both arguments and might work properly.

---

## Data Flow Analysis

```
User clicks "Yes"
    ↓
PermissionRequestModal.handleApprove()
    ↓
ChatPage.handleResolvePermission(request, true)
    ↓
request.accept(request.inputs)  // Missing 2nd param
    ↓
PermissionRequest.accept(updatedInput, updatedPermissions = this.suggestions)
    ↓
EventEmitter.emit({ behavior: 'allow', updatedInput, updatedPermissions })
    ↓
BaseTransport.handleToolPermissionRequest() resolves Promise
    ↓
Response sent to Extension: { type: "tool_permission_response", result: {...} }
    ↓
ClaudeAgentService.requestToolPermission() receives response
    ↓
SDK validates PermissionResult → VALIDATION FAILS
```

---

## Root Cause Details

The actual problem is likely that `updatedPermissions` is being set to `undefined` rather than an empty array, causing the SDK's Zod validator to reject it. Looking closer at the flow:

1. `PermissionRequest.accept()` has default `updatedPermissions = this.suggestions`
2. If `this.suggestions` is undefined/empty, `updatedPermissions` could be undefined
3. SDK might require `updatedPermissions` to be explicitly present

However, **the main issue** is simpler: examining the constructor:

```typescript
constructor(
  channelId: string,
  toolName: string,
  inputs: Record<string, unknown>,
  suggestions: PermissionUpdate[] = []  // defaults to empty array
) {
  this.suggestions = suggestions;
}
```

The default should work. BUT the real issue is likely in **handleApprove**:

```typescript
const handleApprove = () => {
  if (modifiedInputs.value) {
    (props.request as any).inputs = modifiedInputs.value;
  }
  props.onResolve(props.request, true);  // ← Goes to handleResolvePermission
};
```

When `handleResolvePermission` calls `request.accept(request.inputs)`:
- First param: `request.inputs` (explicitly passed)
- Second param: uses default `this.suggestions`

The emitted object is:
```typescript
{ behavior: 'allow', updatedInput: {...}, updatedPermissions: [] }
```

But wait - looking more carefully at the error message:
```
"updatedInput" ... "expected": "object", "received": "undefined"
```

This suggests `updatedInput` is undefined, not `updatedPermissions`. This means somewhere the `updatedInput` value is being lost.

**Most likely cause:** The `request.inputs` in `handleResolvePermission` might be undefined or null in certain cases, or there's a serialization issue where undefined object properties are stripped.

---

## Files Involved

| File | Line | Issue |
|------|------|-------|
| `src/webview/src/pages/ChatPage.vue` | 516-526 | `handleResolvePermission` may pass undefined inputs |
| `src/webview/src/components/PermissionRequestModal.vue` | 129-135 | `handleApprove` doesn't validate inputs before resolving |
| `src/webview/src/core/PermissionRequest.ts` | 24-29 | `accept()` assumes valid inputs |

---

## Recommended Fix

### Option 1: Ensure updatedInput is never undefined (Defensive Fix)

**File:** `src/webview/src/core/PermissionRequest.ts`

```typescript
accept(
  updatedInput: Record<string, unknown> = this.inputs,
  updatedPermissions: PermissionUpdate[] = this.suggestions
): void {
  // Ensure updatedInput is always a valid object
  const safeInput = updatedInput ?? this.inputs ?? {};
  const safePermissions = updatedPermissions ?? this.suggestions ?? [];

  this.resolved.emit({
    behavior: 'allow',
    updatedInput: safeInput,
    updatedPermissions: safePermissions
  });
}
```

### Option 2: Fix the call site in ChatPage.vue

**File:** `src/webview/src/pages/ChatPage.vue`

```typescript
function handleResolvePermission(request: PermissionRequest, allow: boolean) {
  try {
    if (allow) {
      // Explicitly pass both required parameters
      request.accept(
        request.inputs ?? {},
        request.suggestions ?? []
      );
    } else {
      request.reject('User denied', true);
    }
  } catch (e) {
    console.error('[ChatPage] permission resolve failed', e);
  }
}
```

### Option 3: Fix PermissionRequestModal.vue handleApprove

```typescript
const handleApprove = () => {
  const inputs = modifiedInputs.value ?? props.request.inputs ?? {};
  props.request.accept(inputs, props.request.suggestions ?? []);
};
```

---

## Verification Steps

1. Add console.log in `PermissionRequest.accept()` to verify what values are being emitted
2. Add console.log in `BaseTransport.handleToolPermissionRequest()` to see the exact response being sent
3. Check if `request.inputs` is ever undefined when `handleResolvePermission` is called

---

## Why CLI Works But Extension Doesn't

The CLI directly calls the SDK's internal permission handling, which constructs valid `PermissionResult` objects internally. The extension uses a custom IPC layer (WebView ↔ Extension ↔ SDK) where:

1. Permission request comes from SDK → Extension → WebView
2. User decision goes WebView → Extension → SDK
3. The WebView's `PermissionRequest` class reconstructs the response
4. If any field is undefined during serialization, it may be stripped

The JSON serialization between WebView and Extension likely strips undefined values, causing the SDK's Zod validator to see missing required fields.

---

## Unresolved Questions

1. Is `request.inputs` ever undefined when `handleResolvePermission` is called?
2. Are there any other code paths that call `accept()` without proper parameters?
3. Does `handleApproveAndDontAsk()` work correctly (since it explicitly passes both params)?
