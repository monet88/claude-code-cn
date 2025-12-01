<template>
  <div class="user-message">
    <div class="message-wrapper">
      <div
        ref="containerRef"
        class="message-content"
        :class="{ editing: isEditing }"
      >
        <!-- 普通显示模式 -->
        <div
          v-if="!isEditing"
          class="message-view"
          role="button"
          tabindex="0"
          @click.stop="startEditing"
          @keydown.enter.prevent="startEditing"
          @keydown.space.prevent="startEditing"
        >
          <!-- 附件预览区域 (横向滚动) -->
          <div
            v-if="imageAttachmentsDisplay.length || fileAttachmentsDisplay.length"
            class="attachments-scroll-view custom-scrollbar"
          >
            <!-- 图片附件 -->
            <div
              v-for="(att, index) in imageAttachmentsDisplay"
              :key="att.id"
              :data-index="index"
              class="attachment-card is-image"
            >
              <img :src="`data:${att.mediaType};base64,${att.data}`" :alt="att.fileName" class="attachment-thumb" />
            </div>

            <!-- 文件附件 -->
            <div
              v-for="att in fileAttachmentsDisplay"
              :key="att.id"
              class="attachment-card is-file"
            >
              <div class="file-icon-box">
                <FileIcon :file-name="att.fileName" :size="16" />
              </div>
              <span class="file-name">{{ att.fileName }}</span>
            </div>
          </div>

          <div class="message-text-row">
            <div class="message-text">{{ displayContent }}</div>
            <button
              class="restore-button"
              @click.stop="handleRestore"
              title="恢复检查点"
            >
              <span class="codicon codicon-restore"></span>
            </button>
          </div>
        </div>

        <!-- 编辑模式 -->
        <div v-else class="edit-mode">
          <ChatInputBox
            :show-progress="false"
            :conversation-working="false"
            :attachments="attachments"
            :enable-attachment-motion="false"
            ref="chatInputRef"
            @submit="handleSaveEdit"
            @stop="cancelEdit"
            @remove-attachment="handleRemoveAttachment"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue';
import type { Message } from '../../models/Message';
import type { ToolContext } from '../../types/tool';
import type { AttachmentItem } from '../../types/attachment';
import { IMAGE_MEDIA_TYPES } from '../../types/attachment';
import ChatInputBox from '../ChatInputBox.vue';
import FileIcon from '../FileIcon.vue';

interface Props {
  message: Message;
  context: ToolContext;
}

const props = defineProps<Props>();

const isEditing = ref(false);
const chatInputRef = ref<InstanceType<typeof ChatInputBox>>();
const containerRef = ref<HTMLElement>();
const attachments = ref<AttachmentItem[]>([]);
const displayAttachments = computed<AttachmentItem[]>(() => extractAttachments());
const imageAttachmentsDisplay = computed(() => displayAttachments.value.filter(a => isImage(a)));
const fileAttachmentsDisplay = computed(() => displayAttachments.value.filter(a => !isImage(a)));

// 显示内容（纯文本）
const displayContent = computed(() => {
  if (typeof props.message.message.content === 'string') {
    // 保留用户原始输入，包括前导空格
    return props.message.message.content;
  }
  // 如果是 content blocks，提取文本
  if (Array.isArray(props.message.message.content)) {
    return props.message.message.content
      .map(wrapper => {
        const block = wrapper.content;
        // 只保留文本 block，自身的前导空格原样保留
        if (block.type === 'text') {
          return block.text;
        }
        // 对 image / document 等非文本 block，在展示纯文本时不占位，避免产生多余空格
        return '';
      })
      // 丢弃完全为空的片段，避免因为 join(' ') 在前面拼出额外空格
      .filter(part => part.length > 0)
      // 文本块之间直接拼接，不额外插入空格，交给原始文本自己决定是否有空白
      .join('');
  }
  return '';
});

// 从消息内容中提取附件（image 和 document blocks）
function extractAttachments(): AttachmentItem[] {
  if (typeof props.message.message.content === 'string') {
    return [];
  }

  if (!Array.isArray(props.message.message.content)) {
    return [];
  }

  const extracted: AttachmentItem[] = [];
  let index = 0;

  for (const wrapper of props.message.message.content) {
    const block = wrapper.content;

    if (block.type === 'image' && block.source?.type === 'base64') {
      const ext = block.source.media_type?.split('/')[1] || 'png';
      extracted.push({
        id: `image-${index++}`,
        fileName: `image.${ext}`,
        mediaType: block.source.media_type || 'image/png',
        data: block.source.data,
        fileSize: 0, // 历史消息无法获取原始大小
      });
    } else if (block.type === 'document' && block.source) {
      const title = block.title || 'document';
      extracted.push({
        id: `document-${index++}`,
        fileName: title,
        mediaType: block.source.media_type || 'application/octet-stream',
        data: block.source.data,
        fileSize: 0,
      });
    }
  }

  return extracted;
}

function isImage(att: AttachmentItem): boolean {
  return IMAGE_MEDIA_TYPES.includes((att.mediaType || '').toLowerCase() as (typeof IMAGE_MEDIA_TYPES)[number]);
}

async function startEditing() {
  isEditing.value = true;

  // 提取附件
  attachments.value = extractAttachments();

  // 等待 DOM 更新后设置输入框内容和焦点
  await nextTick();
  if (chatInputRef.value) {
    chatInputRef.value.setContent?.(displayContent.value || '');
    chatInputRef.value.focus?.();
  }
}

function handleRemoveAttachment(id: string) {
  attachments.value = attachments.value.filter(a => a.id !== id);
}

function cancelEdit() {
  isEditing.value = false;
  attachments.value = []; // 清空附件列表
}

function handleSaveEdit(content?: string) {
  const finalContent = content || displayContent.value;

  if (finalContent.trim() && finalContent !== displayContent.value) {
    // TODO: 调用 session.send() 发送编辑后的消息
    console.log('[UserMessage] Save edit:', finalContent.trim());
  }

  cancelEdit();
}

function handleRestore() {
  // TODO: 实现 restore checkpoint 逻辑
  console.log('[UserMessage] Restore checkpoint clicked');
}

// 监听键盘事件
function handleKeydown(event: KeyboardEvent) {
  if (isEditing.value && event.key === 'Escape') {
    event.preventDefault();
    cancelEdit();
  }
}

// 监听点击外部取消编辑
function handleClickOutside(event: MouseEvent) {
  if (!isEditing.value) return;

  const target = event.target as HTMLElement;

  // 检查是否点击了组件内部
  if (containerRef.value?.contains(target)) return;

  // 点击外部，取消编辑
  cancelEdit();
}

// 生命周期管理
onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.user-message {
  display: block;
  outline: none;
  padding: 1px 12px 8px;
  background-color: var(--vscode-sideBar-background);
  opacity: 1;
}

.message-wrapper {
  background-color: transparent;
}

/* 消息内容容器 - 统一边框和背景 */
.message-content {
  display: flex;
  flex-direction: column;
  width: 100%;
  background-color: var(--vscode-input-background); /* 统一使用输入框背景 */
  outline: none;
  border: 1px solid var(--vscode-input-border);
  border-radius: 6px;
  position: relative;
  transition: all 0.2s ease;
}

.message-content:hover {
  border-color: var(--vscode-focusBorder);
}

.message-content.editing {
  z-index: 200;
  /* 编辑模式下保持与普通模式一致的卡片边框和背景，避免左右抖动 */
  border: 1px solid var(--vscode-input-border);
  background-color: var(--vscode-input-background);
}

/* 普通显示模式 */
.message-view {
  display: flex;
  flex-direction: column;
  width: 100%;
  cursor: pointer;
}

/* 附件预览区域：横向滚动 */
.attachments-scroll-view {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 8px 4px 8px;
  overflow-x: auto;
  white-space: nowrap;
  scrollbar-width: thin;
}

/* 附件卡片基础样式 */
.attachment-card {
  position: relative;
  flex-shrink: 0;
  border-radius: 6px;
  border: 1px solid var(--vscode-editorWidget-border);
  background-color: var(--vscode-editor-background);
  user-select: none;
  cursor: default;
}

/* 图片附件卡片 */
.attachment-card.is-image {
  width: 56px;
  height: 56px;
  padding: 0;
  overflow: hidden;
  cursor: zoom-in;
}

.attachment-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* 更多图片计数器 */
.attachment-card.more-count {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--vscode-badge-background);
  color: var(--vscode-badge-foreground);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.attachment-card.more-count:hover {
  opacity: 0.9;
}

/* 文件附件卡片 (Chip 样式) */
.attachment-card.is-file {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 8px 0 6px;
  max-width: 200px;
}

.file-icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
}

.file-name {
  font-size: 12px;
  color: var(--vscode-foreground);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 文本区域行 */
.message-text-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  /* 与输入框单行高度对齐，默认最小 34px */
  min-height: 34px;
  padding: 0;
  width: 100%;
  box-sizing: border-box;
}

.message-text {
  min-width: 0;
  line-height: 1.5;
  font-family: inherit;
  font-size: 13px;
  padding: 6px 8px;
  color: var(--vscode-input-foreground);
  background-color: transparent;
  outline: none;
  border: none;
  overflow-wrap: break-word;
  word-break: break-word;
  user-select: text;
  white-space: pre-wrap;
  flex: 1;
}

/* restore checkpoint 按钮 */
.restore-button {
  background: transparent;
  border: none;
  color: var(--vscode-descriptionForeground);
  display: flex;
  width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
  padding: 0;
  flex-shrink: 0;
  cursor: pointer;
  border-radius: 3px;
  transition: all 0.2s ease;
  opacity: 0; /* 默认隐藏，hover 时显示 */
}

.message-content:hover .restore-button {
  opacity: 1;
}

.restore-button:hover {
  background-color: var(--vscode-list-hoverBackground);
  color: var(--vscode-foreground);
}

.restore-button .codicon {
  font-size: 14px;
}

/* 滚动条样式 */
.attachments-scroll-view::-webkit-scrollbar {
  height: 4px;
}
.attachments-scroll-view::-webkit-scrollbar-thumb {
  background: var(--vscode-scrollbarSlider-background);
  border-radius: 2px;
}
.attachments-scroll-view::-webkit-scrollbar-track {
  background: transparent;
}

/* 编辑模式 */
.edit-mode {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  position: relative;
  width: 100%;
  box-sizing: border-box;
}

/* 编辑模式下的特定样式覆盖 */
.edit-mode :deep(.full-input-box) {
  /* 在消息内编辑时，由外层 .message-content 提供卡片视觉，内部 full-input-box 仅作为布局容器 */
  background: transparent;
  border: none;
  box-shadow: none;
  padding: 0;
}

.edit-mode :deep(.full-input-box:focus-within) {
  /* 编辑时不需要额外阴影，input box 自带 focus 样式 */
  box-shadow: none;
}
</style>
