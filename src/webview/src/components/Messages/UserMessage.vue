<template>
  <div class="user-message">
    <div class="message-wrapper">
      <div
        ref="containerRef"
        class="message-content"
        :class="{ editing: isEditing }"
      >
        <!-- Normal display mode -->
        <div
          v-if="!isEditing"
          class="message-view"
          role="button"
          tabindex="0"
          @click.stop="startEditing"
          @keydown.enter.prevent="startEditing"
          @keydown.space.prevent="startEditing"
        >
          <!-- Attachment preview area (horizontal scrolling) -->
          <div
            v-if="imageAttachmentsDisplay.length || fileAttachmentsDisplay.length"
            class="attachments-scroll-view custom-scrollbar"
          >
            <!-- Image attachments -->
            <div
              v-for="(att, index) in imageAttachmentsDisplay"
              :key="att.id"
              :data-index="index"
              class="attachment-card is-image"
            >
              <img :src="`data:${att.mediaType};base64,${att.data}`" :alt="att.fileName" class="attachment-thumb" />
            </div>

            <!-- File attachments -->
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
              title="Restore checkpoint"
            >
              <span class="codicon codicon-restore"></span>
            </button>
          </div>
        </div>

        <!-- Edit mode -->
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

// Display content (plain text)
const displayContent = computed(() => {
  if (typeof props.message.message.content === 'string') {
    // Preserve the user's original input, including leading spaces.
    return props.message.message.content;
  }
  // If it's content blocks, extract text
  if (Array.isArray(props.message.message.content)) {
    return props.message.message.content
      .map(wrapper => {
        const block = wrapper.content;
        // Only keep text blocks, preserving leading spaces
        if (block.type === 'text') {
          return block.text;
        }
        // For non-text blocks (image / document), do not reserve space when showing plain text, to avoid extra spaces
        return '';
      })
      // Discard completely empty segments to avoid extra spaces when joining
      .filter(part => part.length > 0)
      // Text blocks are directly joined, no extra spaces are inserted, let the original text decide if there are spaces
      .join('');
  }
  return '';
});

// Extract attachments (image and document blocks) from message content
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
        fileSize: 0, // History messages cannot get the original size
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

  // Extract attachments
  attachments.value = extractAttachments();

  // Wait for DOM update to set input box content and focus
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
  attachments.value = []; // Clear attachment list
}

function handleSaveEdit(content?: string) {
  const finalContent = content || displayContent.value;

  if (finalContent.trim() && finalContent !== displayContent.value) {
    // TODO: Call session.send() to send the edited message.
    console.log('[UserMessage] Save edit:', finalContent.trim());
  }

  cancelEdit();
}

function handleRestore() {
  // TODO: Implement restore checkpoint logic
  console.log('[UserMessage] Restore checkpoint clicked');
}

// Listen to keyboard events
function handleKeydown(event: KeyboardEvent) {
  if (isEditing.value && event.key === 'Escape') {
    event.preventDefault();
    cancelEdit();
  }
}

// Listen to clicks outside to cancel editing
function handleClickOutside(event: MouseEvent) {
  if (!isEditing.value) return;

  const target = event.target as HTMLElement;

  // Check if clicked inside the component
  if (containerRef.value?.contains(target)) return;

  // Clicked outside, cancel editing
  cancelEdit();
}

// Lifecycle management
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
  padding: 0;
  margin: 8px 12px;
  background-color: transparent;
  opacity: 1;
}

.message-wrapper {
  background-color: transparent;
}

/* Message content container - unified border and background */
.message-content {
  display: flex;
  flex-direction: column;
  width: 100%;
  background-color: var(--theme-input-bg, var(--vscode-input-background));
  outline: none;
  border: 1px solid var(--theme-border-subtle, rgba(255, 255, 255, 0.03));
  border-radius: var(--theme-radius-lg, 12px);
  position: relative;
  transition: all 0.2s ease;
}

.message-content:hover {
  border-color: var(--theme-border-default, rgba(255, 255, 255, 0.2));
}

.message-content.editing {
  z-index: 200;
  border: 1px solid var(--theme-border-focus, var(--vscode-focusBorder));
  background-color: var(--theme-input-bg, var(--vscode-input-background));
  box-shadow: 0 0 0 1px var(--theme-border-focus, var(--vscode-focusBorder));
}

/* Normal display mode */
.message-view {
  display: flex;
  flex-direction: column;
  width: 100%;
  cursor: pointer;
}

/* Attachment preview area: horizontal scrolling */
.attachments-scroll-view {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 8px 4px 8px;
  overflow-x: auto;
  white-space: nowrap;
  scrollbar-width: thin;
}

/* Attachment card base style */
.attachment-card {
  position: relative;
  flex-shrink: 0;
  border-radius: var(--theme-radius-md, 8px);
  border: 1px solid var(--theme-border-subtle, rgba(255, 255, 255, 0.03));
  background-color: var(--theme-bg-secondary, var(--vscode-editor-background));
  user-select: none;
  cursor: default;
}

/* Image attachment card */
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

/* More image counter */
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

/* File attachment card (Chip style) */
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

/* Text area row */
.message-text-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  /* Aligns with the single-line height of the input box, minimum default 34px */
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

/* Restore checkpoint button */
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
  opacity: 0; /* Default hidden, show on hover */
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

/* Attachment scroll view scrollbar style */
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

/* Edit mode */
.edit-mode {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  position: relative;
  width: 100%;
  box-sizing: border-box;
}

/* Edit mode specific style overrides */
.edit-mode :deep(.full-input-box) {
  /* When editing inside the message, the outer .message-content provides the card visual, and the internal full-input-box is only used as a layout container */
  background: transparent;
  border: none;
  box-shadow: none;
  padding: 0;
}

.edit-mode :deep(.full-input-box:focus-within) {
  /* When editing inside the message, the outer .message-content provides the card visual, and the internal full-input-box is only used as a layout container */
  box-shadow: none;
}
</style>
