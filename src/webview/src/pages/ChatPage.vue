<template>
  <div class="chat-page">
    <!-- 全局拖拽上传遮罩 -->
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
        <!-- 兜底 file input：当 dataTransfer.files 为空时触发 -->
        <input
          ref="fallbackInputRef"
          type="file"
          multiple
          class="sr-only"
          @change="handleFallbackFileSelect"
        >
      </div>
    </Transition>

    <!-- 顶部标题栏 -->
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

    <!-- 主体：消息容器 -->
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
                <span class="version-text">Preview</span>
              </div>
            </div>
            <div v-else class="emptyState">
              <div class="emptyWordmark">
                <ClaudeWordmark class="emptyWordmarkSvg" />
                <span class="version-text">Preview</span>
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

  // 订阅 activeSession（alien-signal → Vue ref）
  const activeSessionRaw = useSignal<Session | undefined>(
    runtime.sessionStore.activeSession
  );

  // 使用 useSession 将 alien-signals 转换为 Vue Refs
  const session = computed(() => {
    const raw = activeSessionRaw.value;
    return raw ? useSession(raw) : null;
  });

  // 现在所有访问都使用 Vue Ref（.value）
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

  // 注册命令：permissionMode.toggle（在下方定义函数后再注册）

  // 估算 Token 使用占比（基于 usageData）
  const progressPercentage = computed(() => {
    const s = session.value;
    if (!s) return 0;

    const usage = s.usageData.value;
    const total = usage.totalTokens;
    const windowSize = usage.contextWindow || 200000;

    if (typeof total === 'number' && total > 0) {
      return Math.max(0, Math.min(100, (total / windowSize) * 100));
    }

    return 0;
  });

  // DOM refs
  const containerEl = ref<HTMLDivElement | null>(null);
  const endEl = ref<HTMLDivElement | null>(null);
  const fallbackInputRef = ref<HTMLInputElement | null>(null);

  // 附件状态管理
  const attachments = ref<AttachmentItem[]>([]);
  const isDragOver = ref(false);

  function hasFiles(event: DragEvent): boolean {
    const dt = event.dataTransfer;
    if (!dt) return false;
    // 检查 types 是否包含 Files
    if (dt.types && Array.from(dt.types).includes('Files')) return true;
    // 检查 items (某些浏览器/环境)
    if (dt.items && dt.items.length > 0) {
      const hasFileItem = Array.from(dt.items).some(it => it.kind === 'file');
      if (hasFileItem) return true;
    }
    return false;
  }

  // 全局入口：检测拖拽进入窗口
  function handleGlobalDragEnter(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    isDragOver.value = true;
  }

  // 全局 Over：确保激活遮罩 + 防止默认行为 (Failsafe)
  function handleGlobalDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    // 如果 dragenter 没触发（例如直接在元素上开始），这里补救
    if (!isDragOver.value && hasFiles(event)) {
      isDragOver.value = true;
    }
  }

  // 全局 Leave：离开窗口时关闭遮罩
  function handleGlobalDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    const related = event.relatedTarget as HTMLElement | null;
    // 当 relatedTarget 为空，表示拖拽离开窗口
    if (!related) {
      isDragOver.value = false;
    }
  }

  // 兜底文件选择：当 drop 未携带 files 时触发
  function handleFallbackFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      void handleAddAttachment(input.files);
    }
    // 清空以允许重复选择同一文件
    input.value = '';
  }

  // 遮罩层 Over：保持显示，设置 copy 效果
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

  // 遮罩层 Leave：检测是否真的离开了遮罩层（还是只是进入了子元素）
  function handleOverlayDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    
    const currentTarget = event.currentTarget as HTMLElement;
    const relatedTarget = event.relatedTarget as HTMLElement;

    // 如果 relatedTarget 为空（离开窗口）或 relatedTarget 不在 currentTarget 内部
    // 则认为离开了遮罩层
    if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
      isDragOver.value = false;
    }
  }

  // 遮罩层 Drop：处理文件
  function handleOverlayDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    isDragOver.value = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      void handleAddAttachment(files);
      return;
    }

    // 某些环境下 drop 无 files，兜底触发文件选择
    fallbackInputRef.value?.click();
  }

  // 全局 Drop：防止未被遮罩层捕获的文件打开行为，并尝试处理
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


  // 记录上次消息数量，用于判断是否需要滚动
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
    // 切换会话：复位并滚动底部
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
    // 有权限请求出现时也确保滚动到底部
    await nextTick();
    scrollToBottom();
  });

  onMounted(async () => {
    prevCount = messages.value.length;
    await nextTick();
    scrollToBottom();

    // 绑定全局 dragenter 用于触发遮罩层
    window.addEventListener('dragenter', handleGlobalDragEnter, true);
    // 绑定全局 dragover 防止默认预览行为并作为 dragenter 的备份
    window.addEventListener('dragover', handleGlobalDragOver, true);
    // 离开窗口时关闭遮罩
    window.addEventListener('dragleave', handleGlobalDragLeave, true);
    // 绑定全局 drop 以防遮罩层未及时捕获
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

    // 1. 先尝试通过 appContext.startNewConversationTab 创建新标签（多标签模式）
    if (runtime.appContext.startNewConversationTab()) {
      return;
    }

    // 2. 如果不是多标签模式，检查当前会话是否为空
    const currentMessages = messages.value;
    if (currentMessages.length === 0) {
      // 当前已经是空会话，无需创建新会话
      return;
    }

    // 3. 当前会话有内容，创建新会话
    await runtime.sessionStore.createSession({ isExplicit: true });
  }

  // ChatInput 事件处理
  async function handleSubmit(content: string) {
    const s = session.value;
    const raw = content ?? '';
    const trimmed = raw.trim();
    // 只用 trimmed 判断“是否为空”，但保留用户真实输入（包括前导空格）
    if (!s || (!trimmed && attachments.value.length === 0) || isBusy.value) return;

    try {
      // 传递附件给 send 方法，使用原始内容
      await s.send(raw, attachments.value);

      // 发送成功后清空附件
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

  // permissionMode.toggle：按固定顺序轮转
  const togglePermissionMode = () => {
    const s = session.value;
    if (!s) return;
    const order: PermissionMode[] = ['acceptEdits', 'default', 'plan'];
    const cur = (s.permissionMode.value as PermissionMode) ?? 'acceptEdits';
    const idx = Math.max(0, order.indexOf(cur));
    const next = order[(idx + 1) % order.length];
    void s.setPermissionMode(next);
  };

  // 现在注册命令（toggle 已定义）
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

  // 注册快捷键：shift+tab → permissionMode.toggle（允许在输入区生效）
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
      // 方法已经在 useSession 中绑定，可以直接调用
      void s.interrupt();
    }
  }

  async function handleAddAttachment(files: FileList) {
    if (!files || files.length === 0) return;

    try {
      // 将所有文件转换为 AttachmentItem
      const conversions = await Promise.all(
        Array.from(files).map(convertFileToAttachment)
      );

      // 添加到附件列表
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

  /* 拖拽遮罩 - 玻璃拟态与微交互 */
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
    /* 移除 pointer-events: none 以便捕获事件 */
    pointer-events: auto;
    /* 增强的玻璃拟态背景 - 降低不透明度以突显模糊 */
    background: color-mix(in srgb, var(--vscode-editor-background) 40%, transparent);
    backdrop-filter: blur(12px) saturate(150%);
    /* 径向渐变增加质感 */
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
    /* 边框与背景 */
    border: 1px solid color-mix(in srgb, var(--vscode-focusBorder) 30%, transparent);
    background: color-mix(in srgb, var(--vscode-editor-background) 90%, var(--vscode-focusBorder) 5%);
    box-shadow: 
      0 16px 48px -8px rgba(0, 0, 0, 0.25),
      0 0 0 1px color-mix(in srgb, var(--vscode-focusBorder) 10%, transparent);
    color: var(--vscode-foreground);
    /* 初始缩放状态 */
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
    /* 自适应剩余空间，避免溢出 */
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

  /* Chat 容器与消息滚动容器（对齐 React） */
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

  /* 其他样式复用 */

  /* 输入区域容器 */
  .inputContainer {
    padding: 8px 12px 12px;
  }

  /* 底部对话框区域钉在底部 */
  .main > :last-child {
    flex-shrink: 0;
    background-color: var(--vscode-sideBar-background);
    /* border-top: 1px solid var(--vscode-panel-border); */
    max-width: 1200px;
    width: 100%;
    align-self: center;
  }

  /* 空状态样式 */
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


