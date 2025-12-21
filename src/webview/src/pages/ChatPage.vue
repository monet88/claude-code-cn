<template>
  <div class="chat-page">
    <!-- Global drag-and-drop upload overlay -->
    <Transition name="drag-fade">
      <div 
        v-if="isDragOver" 
        class="drag-overlay"
        @dragenter.prevent.stop="handleOverlayDragEnter"
        @dragover.prevent="handleOverlayDragOver"
        @dragleave.prevent.stop="handleOverlayDragLeave"
        @drop.prevent="handleOverlayDrop"
      >
        <div class="drag-box">
          <div class="drag-icon-wrapper">
            <span class="codicon codicon-cloud-upload text-[32px]!" />
          </div>
          <div class="drag-content">
            <span class="drag-title">Drop files here</span>
            <span class="drag-subtitle">Claude will analyze them for you</span>
          </div>
        </div>
        <!-- Fallback file input: triggered when dataTransfer.files is empty -->
        <input
          ref="fallbackInputRef"
          type="file"
          multiple
          class="sr-only"
          @change="handleFallbackFileSelect"
        >
      </div>
    </Transition>

    <!-- Top header bar -->
    <div class="chat-header">
      <div class="header-left">
        <button class="menu-btn" @click="$emit('switchToSessions')">
          <span class="codicon codicon-menu"></span>
        </button>
        <h2 class="chat-title">{{ title }}</h2>
      </div>
      <div class="header-right">
        <button class="settings-btn" title="Settings" @click="$emit('switchToSettings')">
          <span class="codicon codicon-settings-gear"></span>
        </button>
        <button class="new-chat-btn" title="New Chat" @click="createNew">
          <span class="codicon codicon-plus"></span>
        </button>
      </div>
    </div>

    <!-- Main content: message container -->
    <div class="main">
      <!-- <div class="chatContainer"> -->
        <div
          ref="containerEl"
          :class="['messagesContainer', 'custom-scroll-container', { dimmed: permissionRequestsLen > 0 }]"
        >
          <template v-if="messages.length === 0">
            <div v-if="isBusy" class="emptyState">
              <div class="emptyWordmark">
                <ClaudeWordmark class="emptyWordmarkSvg" />
                <span class="version-text">Beta</span>
              </div>
            </div>
            <div v-else class="emptyState">
              <div class="emptyWordmark">
                <ClaudeWordmark class="emptyWordmarkSvg" />
                <span class="version-text">Beta</span>
              </div>
              <RandomTip :platform="platform" />
            </div>
          </template>
          <template v-else>
            <!-- <div class="msg-list"> -->
              <MessageRenderer
                v-for="(m, i) in messages"
                :key="m?.id ?? i"
                :message="m"
                :context="toolContext"
              />
            <!-- </div> -->
            <div v-if="isBusy" class="spinnerRow">
              <Spinner :size="16" :permission-mode="permissionMode" />
            </div>
            <div ref="endEl" />
          </template>
        </div>

        <div class="inputContainer">
          <!-- Sticky Task List -->
          <TodoList
            :todos="todos"
            :visible="todos.length > 0"
            :initial-expanded="true"
          />
          <PermissionRequestModal
            v-if="pendingPermission && toolContext"
            :request="pendingPermission"
            :context="toolContext"
            :on-resolve="handleResolvePermission"
            data-permission-panel="1"
          />
          <ChatInputBox
            :show-progress="true"
            :progress-percentage="progressPercentage"
            :conversation-working="isBusy"
            :attachments="attachments"
            :thinking-level="session?.thinkingLevel.value"
            :permission-mode="session?.permissionMode.value"
            :selected-model="session?.modelSelection.value"
            @submit="handleSubmit"
            @stop="handleStop"
            @add-attachment="handleAddAttachment"
            @remove-attachment="handleRemoveAttachment"
            @thinking-toggle="handleToggleThinking"
            @mode-select="handleModeSelect"
            @model-select="handleModelSelect"
          />
        </div>
      <!-- </div> -->
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, inject, onMounted, onUnmounted, nextTick, watch } from 'vue';
  import { RuntimeKey } from '../composables/runtimeContext';
  import { useSession } from '../composables/useSession';
  import type { Session } from '../core/Session';
  import type { PermissionRequest } from '../core/PermissionRequest';
  import type { ToolContext } from '../types/tool';
  import type { AttachmentItem } from '../types/attachment';
  import { convertFileToAttachment } from '../types/attachment';
  import ChatInputBox from '../components/ChatInputBox.vue';
  import PermissionRequestModal from '../components/PermissionRequestModal.vue';
  import Spinner from '../components/Messages/WaitingIndicator.vue';
  import ClaudeWordmark from '../components/ClaudeWordmark.vue';
  import RandomTip from '../components/RandomTip.vue';
  import MessageRenderer from '../components/Messages/MessageRenderer.vue';
  import TodoList from '../components/TodoList.vue';
  import { useKeybinding } from '../utils/useKeybinding';
  import { useSignal } from '@gn8/alien-signals-vue';
  import type { PermissionMode } from '@anthropic-ai/claude-agent-sdk';

  const runtime = inject(RuntimeKey);
  if (!runtime) throw new Error('[ChatPage] runtime not provided');

  const toolContext = computed<ToolContext>(() => ({
    fileOpener: {
      open: (filePath: string, location?: any) => {
        void runtime.appContext.fileOpener.open(filePath, location);
      },
      openContent: (content: string, fileName: string, editable: boolean) => {
        return runtime.appContext.fileOpener.openContent(
          content,
          fileName,
          editable
        );
      },
    },
  }));

  // Subscribe to activeSession (alien-signal → Vue ref)
  const activeSessionRaw = useSignal<Session | undefined>(
    runtime.sessionStore.activeSession
  );

  // Use useSession to convert alien-signals to Vue Refs
  const session = computed(() => {
    const raw = activeSessionRaw.value;
    return raw ? useSession(raw) : null;
  });

  // All access now uses Vue Ref (.value)
  const title = computed(() => session.value?.summary.value || 'New Chat');
  const messages = computed<any[]>(() => session.value?.messages.value ?? []);
  const isBusy = computed(() => session.value?.busy.value ?? false);
  const permissionMode = computed(
    () => session.value?.permissionMode.value ?? 'acceptEdits'
  );
  const permissionRequests = computed(
    () => session.value?.permissionRequests.value ?? []
  );
  const permissionRequestsLen = computed(() => permissionRequests.value.length);
  const pendingPermission = computed(() => permissionRequests.value[0] as any);
  const platform = computed(() => runtime.appContext.platform);

  // Todos from session for sticky task list
  const todos = computed(() => session.value?.todos.value ?? []);

  // Register command: permissionMode.toggle (register after defining the function below)

  // Estimate Token usage percentage (based on usageData.inputTokens for accurate context window usage)
  const progressPercentage = computed(() => {
    const s = session.value;
    if (!s) return 0;

    const usage = s.usageData.value;
    // Use inputTokens for context window calculation (matches CLI behavior)
    const current = usage.inputTokens;
    const windowSize = usage.contextWindow || 200000;

    if (typeof current === 'number' && current > 0) {
      return Math.max(0, Math.min(100, (current / windowSize) * 100));
    }

    return 0;
  });

  // DOM refs
  const containerEl = ref<HTMLDivElement | null>(null);
  const endEl = ref<HTMLDivElement | null>(null);
  const fallbackInputRef = ref<HTMLInputElement | null>(null);

  // Attachment state management
  const attachments = ref<AttachmentItem[]>([]);
  const isDragOver = ref(false);

  function hasFiles(event: DragEvent): boolean {
    const dt = event.dataTransfer;
    if (!dt) return false;
    // Check if types contains Files
    if (dt.types && Array.from(dt.types).includes('Files')) return true;
    // Check items (some browsers/environments)
    if (dt.items && dt.items.length > 0) {
      const hasFileItem = Array.from(dt.items).some(it => it.kind === 'file');
      if (hasFileItem) return true;
    }
    return false;
  }

  // Global entry: detect drag entering the window
  function handleGlobalDragEnter(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    isDragOver.value = true;
  }

  // Global Over: ensure overlay is activated + prevent default behavior (Failsafe)
  function handleGlobalDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    // If dragenter didn't trigger (e.g., started directly on an element), fallback here
    if (!isDragOver.value && hasFiles(event)) {
      isDragOver.value = true;
    }
  }

  // Global Leave: close overlay when leaving the window
  function handleGlobalDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    const related = event.relatedTarget as HTMLElement | null;
    // When relatedTarget is empty, it means drag left the window
    if (!related) {
      isDragOver.value = false;
    }
  }

  // Fallback file selection: triggered when drop has no files
  function handleFallbackFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      void handleAddAttachment(input.files);
    }
    // Clear to allow re-selecting the same file
    input.value = '';
  }

  // Overlay Over: keep visible, set copy effect
  function handleOverlayDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  function handleOverlayDragEnter(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    isDragOver.value = true;
  }

  // Overlay Leave: check if really leaving the overlay (or just entering a child element)
  function handleOverlayDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    
    const currentTarget = event.currentTarget as HTMLElement;
    const relatedTarget = event.relatedTarget as HTMLElement;

    // If relatedTarget is empty (leaving window) or relatedTarget is not inside currentTarget
    // then consider it as leaving the overlay
    if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
      isDragOver.value = false;
    }
  }

  // Overlay Drop: handle files
  function handleOverlayDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    isDragOver.value = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      void handleAddAttachment(files);
      return;
    }

    // In some environments drop has no files, fallback to trigger file selection
    fallbackInputRef.value?.click();
  }

  // Global Drop: prevent file opening behavior not captured by overlay, and try to handle
  function handleGlobalDrop(event: DragEvent) {
    if (hasFiles(event)) {
      event.preventDefault();
      event.stopPropagation();
      isDragOver.value = false;
      
      const files = event.dataTransfer?.files;
      if (files && files.length > 0) {
        void handleAddAttachment(files);
      }
    }
  }


  // Record last message count to determine if scrolling is needed
  let prevCount = 0;

  function stringify(m: any): string {
    try {
      return JSON.stringify(m ?? {}, null, 2);
    } catch {
      return String(m);
    }
  }

  function scrollToBottom(): void {
    const end = endEl.value;
    if (!end) return;
    requestAnimationFrame(() => {
      try {
        end.scrollIntoView({ block: 'end' });
      } catch {}
    });
  }

  watch(session, async () => {
    // Session switch: reset and scroll to bottom
    prevCount = 0;
    await nextTick();
    scrollToBottom();
  });

  // moved above

  watch(
    () => messages.value.length,
    async len => {
      const increased = len > prevCount;
      prevCount = len;
      if (increased) {
        await nextTick();
        scrollToBottom();
      }
    }
  );

  watch(permissionRequestsLen, async () => {
    // Also ensure scroll to bottom when permission request appears
    await nextTick();
    scrollToBottom();
  });

  onMounted(async () => {
    prevCount = messages.value.length;
    await nextTick();
    scrollToBottom();

    // Bind global dragenter to trigger overlay
    window.addEventListener('dragenter', handleGlobalDragEnter, true);
    // Bind global dragover to prevent default preview behavior and as backup for dragenter
    window.addEventListener('dragover', handleGlobalDragOver, true);
    // Close overlay when leaving window
    window.addEventListener('dragleave', handleGlobalDragLeave, true);
    // Bind global drop in case overlay didn't capture in time
    window.addEventListener('drop', handleGlobalDrop, true);
  });

  onUnmounted(() => {
    try { unregisterToggle?.(); } catch {}
    window.removeEventListener('dragenter', handleGlobalDragEnter, true);
    window.removeEventListener('dragover', handleGlobalDragOver, true);
    window.removeEventListener('dragleave', handleGlobalDragLeave, true);
    window.removeEventListener('drop', handleGlobalDrop, true);
  });

  async function createNew(): Promise<void> {
    if (!runtime) return;

    // 1. First try to create new tab via appContext.startNewConversationTab (multi-tab mode)
    if (runtime.appContext.startNewConversationTab()) {
      return;
    }

    // 2. If not in multi-tab mode, check if current session is empty
    const currentMessages = messages.value;
    if (currentMessages.length === 0) {
      // Current is already an empty session, no need to create new
      return;
    }

    // 3. Current session has content, create new session
    await runtime.sessionStore.createSession({ isExplicit: true });
  }

  // ChatInput event handlers
  async function handleSubmit(content: string) {
    const s = session.value;
    const raw = content ?? '';
    const trimmed = raw.trim();
    // Only use trimmed to check "is empty", but preserve user's actual input (including leading spaces)
    if (!s || (!trimmed && attachments.value.length === 0) || isBusy.value) return;

    try {
      // Pass attachments to send method, use original content
      await s.send(raw, attachments.value);

      // Clear attachments after successful send
      attachments.value = [];
    } catch (e) {
      console.error('[ChatPage] send failed', e);
    }
  }

  async function handleToggleThinking() {
    const s = session.value;
    if (!s) return;

    const currentLevel = s.thinkingLevel.value;
    const newLevel = currentLevel === 'off' ? 'default_on' : 'off';

    await s.setThinkingLevel(newLevel);
  }

  async function handleModeSelect(mode: PermissionMode) {
    const s = session.value;
    if (!s) return;

    await s.setPermissionMode(mode);
  }

  // permissionMode.toggle: rotate in fixed order
  const togglePermissionMode = () => {
    const s = session.value;
    if (!s) return;
    const order: PermissionMode[] = ['acceptEdits', 'default', 'plan'];
    const cur = (s.permissionMode.value as PermissionMode) ?? 'acceptEdits';
    const idx = Math.max(0, order.indexOf(cur));
    const next = order[(idx + 1) % order.length];
    void s.setPermissionMode(next);
  };

  // Now register command (toggle is defined)
  const unregisterToggle = runtime.appContext.commandRegistry.registerAction(
    {
      id: 'permissionMode.toggle',
      label: 'Toggle Permission Mode',
      description: 'Cycle permission mode in fixed order'
    },
    'App Shortcuts',
    () => {
      togglePermissionMode();
    }
  );

  // Register keyboard shortcut: shift+tab → permissionMode.toggle (allowed in input area)
  useKeybinding({
    keys: 'shift+tab',
    handler: togglePermissionMode,
    allowInEditable: true,
    priority: 100,
  });

  async function handleModelSelect(modelId: string) {
    const s = session.value;
    if (!s) return;

    await s.setModel({ value: modelId });
  }

  function handleStop() {
    const s = session.value;
    if (s) {
      // Method is already bound in useSession, can be called directly
      void s.interrupt();
    }
  }

  async function handleAddAttachment(files: FileList) {
    if (!files || files.length === 0) return;

    try {
      // Convert all files to AttachmentItem
      const conversions = await Promise.all(
        Array.from(files).map(convertFileToAttachment)
      );

      // Add to attachment list
      attachments.value = [...attachments.value, ...conversions];

      console.log('[ChatPage] Added attachments:', conversions.map(a => a.fileName));
    } catch (e) {
      console.error('[ChatPage] Failed to convert files:', e);
    }
  }

  function handleRemoveAttachment(id: string) {
    attachments.value = attachments.value.filter(a => a.id !== id);
  }

  // Permission modal handler
  function handleResolvePermission(request: PermissionRequest, allow: boolean) {
    try {
      if (allow) {
        request.accept(request.inputs);
      } else {
        request.reject('User denied', true);
      }
    } catch (e) {
      console.error('[ChatPage] permission resolve failed', e);
    }
  }
</script>

<style scoped>
  .chat-page {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-width: 360px;
  }

  /* Drag overlay - glass morphism and micro-interactions */
  .drag-fade-enter-active,
  .drag-fade-leave-active {
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .drag-fade-enter-from,
  .drag-fade-leave-to {
    opacity: 0;
    backdrop-filter: blur(0);
  }

  .drag-overlay {
    position: fixed;
    inset: 0;
    z-index: 999;
    display: flex;
    align-items: center;
    justify-content: center;
    /* Remove pointer-events: none to capture events */
    pointer-events: auto;
    /* Enhanced glass morphism background - reduce opacity to emphasize blur */
    background: color-mix(in srgb, var(--vscode-editor-background) 40%, transparent);
    backdrop-filter: blur(12px) saturate(150%);
    /* Radial gradient for texture */
    background-image: radial-gradient(
      circle at center, 
      color-mix(in srgb, var(--vscode-textLink-activeForeground) 5%, transparent) 0%,
      transparent 70%
    );
  }

  .drag-box {
    pointer-events: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 32px 48px;
    border-radius: 24px;
    /* Border and background */
    border: 1px solid color-mix(in srgb, var(--vscode-focusBorder) 30%, transparent);
    background: color-mix(in srgb, var(--vscode-editor-background) 90%, var(--vscode-focusBorder) 5%);
    box-shadow: 
      0 16px 48px -8px rgba(0, 0, 0, 0.25),
      0 0 0 1px color-mix(in srgb, var(--vscode-focusBorder) 10%, transparent);
    color: var(--vscode-foreground);
    /* Initial scale state */
    transform: scale(1);
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .drag-fade-enter-from .drag-box,
  .drag-fade-leave-to .drag-box {
    transform: scale(0.9);
  }

  .drag-icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--vscode-focusBorder) 15%, transparent);
    color: var(--vscode-focusBorder);
    margin-bottom: 4px;
    animation: bounce 2s infinite;
  }

  .drag-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .drag-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--vscode-foreground);
  }

  .drag-subtitle {
    font-size: 12px;
    opacity: 0.7;
  }

  @keyframes bounce {
    0%, 20%, 50%, 80%, 100% {
      transform: translateY(0);
    }
    40% {
      transform: translateY(-6px);
    }
    60% {
      transform: translateY(-3px);
    }
  }


  .chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--vscode-panel-border);
    min-height: 32px;
    padding: 0 12px;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }

  .menu-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    color: var(--vscode-titleBar-activeForeground);
    border-radius: 3px;
    cursor: pointer;
    transition: background-color 0.2s;
    opacity: 0.7;
  }

  .menu-btn .codicon {
    font-size: 12px;
  }

  .menu-btn:hover {
    background: var(--vscode-toolbar-hoverBackground);
    opacity: 1;
  }

  .chat-title {
    margin: 0;
    font-size: 12px;
    font-weight: 600;
    color: var(--vscode-titleBar-activeForeground);
    /* Adapt to remaining space, avoid overflow */
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .header-right {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  }

  .settings-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    color: var(--vscode-titleBar-activeForeground);
    border-radius: 3px;
    cursor: pointer;
    transition: background-color 0.2s;
    opacity: 0.7;
  }

  .settings-btn .codicon {
    font-size: 12px;
  }

  .settings-btn:hover {
    background: var(--vscode-toolbar-hoverBackground);
    opacity: 1;
  }

  .new-chat-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    color: var(--vscode-titleBar-activeForeground);
    border-radius: 3px;
    cursor: pointer;
    transition: background-color 0.2s;
    opacity: 0.7;
  }

  .new-chat-btn .codicon {
    font-size: 12px;
  }

  .new-chat-btn:hover {
    background: var(--vscode-toolbar-hoverBackground);
    opacity: 1;
  }

  .main {
    flex: 1;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
  }

  /* Chat container and message scroll container (aligned with React) */
  .chatContainer {
    position: relative;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  .messagesContainer {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 8px 0 12px;
    position: relative;
  }
  .messagesContainer.dimmed {
    filter: blur(1px);
    opacity: 0.5;
    pointer-events: none;
  }

  .msg-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 0 12px;
  }

  .msg-item {
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    padding: 8px;
  }

  .json-block {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: var(
      --app-monospace-font-family,
      ui-monospace,
      SFMono-Regular,
      Menlo,
      Monaco,
      Consolas,
      'Liberation Mono',
      'Courier New',
      monospace
    );
    font-size: var(--app-monospace-font-size, 12px);
    line-height: 1.5;
    color: var(--vscode-editor-foreground);
  }

  /* Other styles reuse */

  /* Input area container */
  .inputContainer {
    padding: 8px 12px 12px;
  }

  /* Bottom dialog area pinned at bottom */
  .main > :last-child {
    flex-shrink: 0;
    background-color: var(--vscode-sideBar-background);
    /* border-top: 1px solid var(--vscode-panel-border); */
    max-width: 1200px;
    width: 100%;
    align-self: center;
  }

  /* Empty state styles */
  .emptyState {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 32px 16px;
  }

  .emptyWordmark {
    display: flex;
    align-items: flex-start;
    justify-content: center;
    margin-bottom: 24px;
    gap: 4px;
    position: relative;
  }

  .version-text {
    font-size: 10px;
    font-weight: 600;
    color: #c8a2ff;
    padding: 3px 6px;
    border-radius: 4px;
    background: rgba(147, 51, 234, 0.15);
    border: 1px solid rgba(147, 51, 234, 0.3);
    margin-top: 1px;
    line-height: 1.2;
    box-shadow:
      0 0 8px rgba(147, 51, 234, 0.25),
      0 0 16px rgba(147, 51, 234, 0.15),
      inset 0 0 8px rgba(147, 51, 234, 0.1);
    backdrop-filter: blur(4px);
    letter-spacing: 0.3px;
  }
</style>

