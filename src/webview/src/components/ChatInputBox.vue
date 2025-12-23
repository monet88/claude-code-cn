<template>
  <!-- Wrapper for status bar + input box -->
  <div class="chat-input-wrapper">
    <!-- 0. Sticky status bar (file changes + context window) - OUTSIDE the input box -->
    <InputStatusBar
      :percentage="normalizedProgress"
      :context-window="contextWindow"
      :show-progress="showProgress"
    />
    
    <!-- Unified input container -->
    <div ref="containerRef" class="full-input-box">
      
      <!-- 1. Attachment preview area (horizontal scroll) -->
    <div
      v-if="imageAttachments.length || fileAttachments.length"
      class="attachments-scroll-view custom-scrollbar"
    >
      <!-- Image attachments (motion-v enhances add/remove/hover animations) -->
      <template v-if="props.enableAttachmentMotion">
        <Motion
          v-for="(attachment, index) in imageAttachments"
          :key="attachment.id"
          :data-index="index"
          class="attachment-card is-image"
          :initial="{ opacity: 0, scale: 0.9, y: 4 }"
          :animate="{ opacity: 1, scale: 1, y: 0 }"
          :exit="{ opacity: 0, scale: 0.9, y: -4 }"
          :transition="{ duration: 0.18, ease: 'easeOut' }"
          :hover="{ scale: 1.02, y: -2 }"
          @click="handlePreviewImage(attachment)"
        >
          <img :src="getImageDataUrl(attachment)" :alt="attachment.fileName" class="attachment-thumb" />
          <!-- Hover overlay and delete button -->
          <div class="attachment-overlay">
            <button
              class="delete-btn"
              @click.stop="handleRemoveAttachment(attachment.id)"
              :aria-label="`Remove ${attachment.fileName}`"
            >
              <span class="codicon codicon-close" />
            </button>
          </div>
        </Motion>
      </template>
      <template v-else>
        <div
          v-for="(attachment, index) in imageAttachments"
          :key="attachment.id"
          :data-index="index"
          class="attachment-card is-image"
          @click="handlePreviewImage(attachment)"
        >
          <img :src="getImageDataUrl(attachment)" :alt="attachment.fileName" class="attachment-thumb" />
          <!-- Hover overlay and delete button -->
          <div class="attachment-overlay">
            <button
              class="delete-btn"
              @click.stop="handleRemoveAttachment(attachment.id)"
              :aria-label="`Remove ${attachment.fileName}`"
            >
              <span class="codicon codicon-close" />
            </button>
          </div>
        </div>
      </template>

      <!-- File attachments -->
      <div
        v-for="attachment in fileAttachments"
        :key="attachment.id"
        class="attachment-card is-file"
      >
        <div class="file-icon">
          <FileIcon :file-name="attachment.fileName" :size="16" />
        </div>
        <span class="file-name" :title="attachment.fileName">{{ attachment.fileName }}</span>
        <button
          class="delete-btn-file"
          @click.stop="handleRemoveAttachment(attachment.id)"
          :aria-label="`Remove ${attachment.fileName}`"
        >
          <span class="codicon codicon-close" />
        </button>
      </div>
    </div>

    <!-- Image preview dialog -->
    <ImagePreviewDialog
      :visible="previewVisible"
      :image-src="previewImageSrc"
      :image-alt="previewImageAlt"
      @close="handleClosePreview"
    />

    <!-- 2. Input box area -->
    <div
      ref="textareaRef"
      contenteditable="true"
      class="aislash-editor-input custom-scroll-container"
      :data-placeholder="placeholderText"
      style="min-height: 34px; max-height: 240px; resize: none; overflow-y: hidden; word-wrap: break-word; white-space: pre-wrap; width: 100%; height: 34px;"
      @input="handleInput"
      @keydown="handleKeydown"
      @paste="handlePaste"
    />

        <!-- 3. Bottom button area -->
    <div class="button-area-wrapper">
      <ButtonArea
        :disabled="isSubmitDisabled"
        :loading="isLoading"
        :selected-model="selectedModel"
        :conversation-working="conversationWorking"
        :has-input-content="!!content.trim()"
        :show-progress="showProgress"
        :progress-percentage="progressPercentage"
        :context-window="contextWindow"
        :thinking-level="thinkingLevel"
        :permission-mode="permissionMode"
        @submit="handleSubmit"
        @stop="handleStop"
        @add-attachment="handleAddFiles"
        @mention="handleMention"
        @thinking-toggle="() => emit('thinkingToggle')"
        @mode-select="(mode) => emit('modeSelect', mode)"
        @model-select="(modelId) => emit('modelSelect', modelId)"
      />
    </div>

    <!-- Slash Command Dropdown -->
    <Dropdown
      v-if="slashCompletion.isOpen.value"
      :is-visible="slashCompletion.isOpen.value"
      :position="slashCompletion.position.value"
      :width="dropdownWidth"
      :should-auto-focus="false"
      :close-on-click-outside="false"
      :data-nav="slashCompletion.navigationMode.value"
      :selected-index="slashCompletion.activeIndex.value"
      :offset-y="-8"
      :offset-x="0"
      :prefer-placement="'above'"
      @close="slashCompletion.close"
    >
      <template #content>
        <div @mouseleave="slashCompletion.handleMouseLeave">
          <template v-if="slashCompletion.items.value.length > 0">
            <template v-for="(item, index) in slashCompletion.items.value" :key="item.id">
              <DropdownItem
                :item="item"
                :index="index"
                :is-selected="index === slashCompletion.activeIndex.value"
                @click="slashCompletion.selectActive()"
                @mouseenter="slashCompletion.handleMouseEnter(index)"
              />
            </template>
          </template>
          <div v-else class="px-2 py-1 text-xs opacity-60">No matches</div>
        </div>
      </template>
    </Dropdown>

    <!-- @ file reference dropdown -->
    <Dropdown
      v-if="fileCompletion.isOpen.value"
      :is-visible="fileCompletion.isOpen.value"
      :position="fileCompletion.position.value"
      :width="dropdownWidth"
      :should-auto-focus="false"
      :close-on-click-outside="false"
      :data-nav="fileCompletion.navigationMode.value"
      :selected-index="fileCompletion.activeIndex.value"
      :offset-y="-8"
      :offset-x="0"
      :prefer-placement="'above'"
      @close="fileCompletion.close"
    >
      <template #content>
        <div @mouseleave="fileCompletion.handleMouseLeave">
          <template v-if="fileCompletion.items.value.length > 0">
            <template v-for="(item, index) in fileCompletion.items.value" :key="item.id">
              <DropdownItem
                :item="item"
                :index="index"
                :is-selected="index === fileCompletion.activeIndex.value"
                @click="fileCompletion.selectActive()"
                @mouseenter="fileCompletion.handleMouseEnter(index)"
              >
                <template #icon v-if="'data' in item && item.data?.file">
                  <FileIcon
                    :file-name="item.data.file.name"
                    :is-directory="item.data.file.type === 'directory'"
                    :folder-path="item.data.file.path"
                    :size="16"
                  />
                </template>
              </DropdownItem>
            </template>
          </template>
          <div v-else class="px-2 py-1 text-xs opacity-60">No matches</div>
        </div>
      </template>
    </Dropdown>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, inject, onMounted, onUnmounted } from 'vue'
import { Motion } from 'motion-v'
import type { PermissionMode } from '@anthropic-ai/claude-agent-sdk'
import FileIcon from './FileIcon.vue'
import ButtonArea from './ButtonArea.vue'
import InputStatusBar from './InputStatusBar.vue'
import type { AttachmentItem } from '../types/attachment'
import { IMAGE_MEDIA_TYPES } from '../types/attachment'
import { Dropdown, DropdownItem } from './Dropdown'
import { RuntimeKey } from '../composables/runtimeContext'
import { useCompletionDropdown } from '../composables/useCompletionDropdown'
import { getSlashCommands, commandToDropdownItem } from '../providers/slashCommandProvider'
import { getFileReferences, fileToDropdownItem } from '../providers/fileReferenceProvider'
import ImagePreviewDialog from './ImagePreviewDialog.vue'

interface Props {
  showProgress?: boolean
  progressPercentage?: number
  contextWindow?: number
  placeholder?: string
  readonly?: boolean
  showSearch?: boolean
  selectedModel?: string
  conversationWorking?: boolean
  attachments?: AttachmentItem[]
  thinkingLevel?: string
  permissionMode?: PermissionMode
  /**
   * Whether to enable motion animations for attachment images
   * - Default true: the main input shows motion on add/remove/hover
   * - Set to false in contexts like editing history to avoid repeated animation noise
   */
  enableAttachmentMotion?: boolean
}

interface Emits {
  (e: 'submit', content: string): void
  (e: 'queueMessage', content: string): void
  (e: 'stop'): void
  (e: 'input', content: string): void
  (e: 'attach'): void
  (e: 'addAttachment', files: FileList): void
  (e: 'removeAttachment', id: string): void
  (e: 'thinkingToggle'): void
  (e: 'modeSelect', mode: PermissionMode): void
  (e: 'modelSelect', modelId: string): void
}

const props = withDefaults(defineProps<Props>(), {
  showProgress: true,
  progressPercentage: 0,
  contextWindow: 200000,
  placeholder: '',
  readonly: false,
  showSearch: false,
  selectedModel: 'default',
  conversationWorking: false,
  attachments: () => [],
  thinkingLevel: 'default_on',
  permissionMode: 'acceptEdits',
  enableAttachmentMotion: true
})

const emit = defineEmits<Emits>()

const runtime = inject(RuntimeKey)

const content = ref('')
const isLoading = ref(false)
const textareaRef = ref<HTMLDivElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)

// Image preview state
const previewVisible = ref(false)
const previewImageSrc = ref('')
const previewImageAlt = ref('')

// Dynamic placeholder
const placeholderText = computed(() => props.placeholder || '@ reference file, / execute command...')

const attachmentsList = computed(() => props.attachments ?? [])
const imageAttachments = computed(() => attachmentsList.value.filter(a => isImageAttachment(a)))
const fileAttachments = computed(() => attachmentsList.value.filter(a => !isImageAttachment(a)))

const isSubmitDisabled = computed(() => {
  return !content.value.trim() || isLoading.value
})

const normalizedProgress = computed(() => {
  const raw = Number(props.progressPercentage ?? 0)
  if (Number.isNaN(raw)) return 0
  return Math.min(100, Math.max(0, raw))
})

// Dropdown width based on container
const dropdownWidth = computed(() => {
  if (containerRef.value) {
    return containerRef.value.getBoundingClientRect().width
  }
  return 500
})

// === Using the new Completion Dropdown composable ===

// Slash command completion
const slashCompletion = useCompletionDropdown({
  mode: 'inline',
  trigger: '/',
  provider: (query, signal) => getSlashCommands(query, runtime, signal),
  toDropdownItem: commandToDropdownItem,
  onSelect: (command, query) => {
    if (query) {
      // Replace text
      const updated = slashCompletion.replaceText(content.value, `${command.label} `)
      content.value = updated

      // Update DOM
      if (textareaRef.value) {
        textareaRef.value.textContent = updated
        placeCaretAtEnd(textareaRef.value)
      }

      // Emit input event
      emit('input', updated)
    }
  },
  anchorElement: textareaRef
})

// @ file reference completion
const fileCompletion = useCompletionDropdown({
  mode: 'inline',
  trigger: '@',
  provider: (query, signal) => getFileReferences(query, runtime, signal),
  toDropdownItem: fileToDropdownItem,
  onSelect: (file, query) => {
    if (query) {
      // Replace text and insert the file path
      const updated = fileCompletion.replaceText(content.value, `@${file.path} `)
      content.value = updated

      // Update DOM
      if (textareaRef.value) {
        textareaRef.value.textContent = updated
        placeCaretAtEnd(textareaRef.value)
      }

      // Emit input event
      emit('input', updated)
    }
  },
  anchorElement: textareaRef
})

// Move the caret to the end
function placeCaretAtEnd(node: HTMLElement) {
  const range = document.createRange()
  range.selectNodeContents(node)
  range.collapse(false)
  const selection = window.getSelection()
  selection?.removeAllRanges()
  selection?.addRange(range)
}

// Get the caret's client rect
function getCaretClientRect(editable: HTMLElement | null): DOMRect | undefined {
  if (!editable) return undefined

  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return undefined

  const range = sel.getRangeAt(0).cloneRange()
  if (!editable.contains(range.startContainer)) return undefined

  // Collapsed ranges usually have zero width but nonzero height; prefer getClientRects first
  const rects = range.getClientRects()
  const rect = rects[0] || range.getBoundingClientRect()
  if (!rect) return undefined

  // Use fallback line height to avoid dropdown layout issues when height is zero
  const lh = parseFloat(getComputedStyle(editable).lineHeight || '0') || 16
  const height = rect.height || lh

  return new DOMRect(rect.left, rect.top, rect.width, height)
}

// Get rect at character offset (used to anchor at the trigger start)
function getRectAtCharOffset(editable: HTMLElement, charOffset: number): DOMRect | undefined {
  const walker = document.createTreeWalker(editable, NodeFilter.SHOW_TEXT)
  let remaining = charOffset
  let node: Text | null = null

  while ((node = walker.nextNode() as Text | null)) {
    const len = node.textContent?.length ?? 0
    if (remaining <= len) {
      const range = document.createRange()
      range.setStart(node, Math.max(0, remaining))
      range.collapse(true)
      const rects = range.getClientRects()
      const rect = rects[0] || range.getBoundingClientRect()
      const lh = parseFloat(getComputedStyle(editable).lineHeight || '0') || 16
      const height = rect.height || lh
      return new DOMRect(rect.left, rect.top, rect.width, height)
    }
    remaining -= len
  }

  return undefined
}

// Update dropdown position
function updateDropdownPosition(
  completion: typeof slashCompletion | typeof fileCompletion,
  anchor: 'caret' | 'queryStart' = 'queryStart'
) {
  const el = textareaRef.value
  if (!el) return

  let rect: DOMRect | undefined

  // Prefer anchoring at the trigger start
  if (anchor === 'queryStart' && completion.triggerQuery.value) {
    rect = getRectAtCharOffset(el, completion.triggerQuery.value.start)
  }

  // Fallback: anchor at the caret position
  if (!rect && anchor === 'caret') {
    rect = getCaretClientRect(el)
  }

  // Final fallback: use the input's own rect
  if (!rect) {
    const r = el.getBoundingClientRect()
    rect = new DOMRect(r.left, r.top, r.width, r.height)
  }

  // Use input element's width for dropdown to match chatbox width
  const inputRect = el.getBoundingClientRect()

  completion.updatePosition({
    top: rect.top,
    left: inputRect.left,
    width: inputRect.width,
    height: rect.height
  })
}

function handleInput(event: Event) {
  const target = event.target as HTMLDivElement
  const textContent = target.textContent || ''

  // Clear the div only when it is completely empty
  if (textContent.length === 0) {
    target.innerHTML = ''
  }

  content.value = textContent
  emit('input', textContent)

  // Evaluate slash and @ completions
  slashCompletion.evaluateQuery(textContent)
  fileCompletion.evaluateQuery(textContent)

  // Update dropdown position (anchor at trigger start)
  if (slashCompletion.isOpen.value) {
    nextTick(() => {
      updateDropdownPosition(slashCompletion, 'queryStart')
    })
  }
  if (fileCompletion.isOpen.value) {
    nextTick(() => {
      updateDropdownPosition(fileCompletion, 'queryStart')
    })
  }

  // Auto resize the textarea
  autoResizeTextarea()
}

function autoResizeTextarea() {
  if (!textareaRef.value) return

  nextTick(() => {
    const divElement = textareaRef.value!

    // Reset height to measure scrollHeight accurately
    divElement.style.height = '20px'

    // Compute the required height
    const scrollHeight = divElement.scrollHeight
    const minHeight = 20
    const maxHeight = 240

    if (scrollHeight <= maxHeight) {
      // Content fits within max height: adjust height and hide scrollbar
      divElement.style.height = Math.max(scrollHeight, minHeight) + 'px'
      divElement.style.overflowY = 'hidden'
    } else {
      // Content exceeds max height: cap height and show scrollbar
      divElement.style.height = maxHeight + 'px'
      divElement.style.overflowY = 'auto'
    }
  })
}

function handleKeydown(event: KeyboardEvent) {
  // Let completion menus handle keyboard events first
  if (slashCompletion.isOpen.value) {
    slashCompletion.handleKeydown(event)
    return
  }

  // Handle keyboard events for file completions
  if (fileCompletion.isOpen.value) {
    fileCompletion.handleKeydown(event)
    return
  }

  // Handle other keys
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    handleSubmit()
  }

  // Delay checking for empty content (after key handling)
  if (event.key === 'Backspace' || event.key === 'Delete') {
    setTimeout(() => {
      const target = event.target as HTMLDivElement
      const textContent = target.textContent || ''
      if (textContent.length === 0) {
        target.innerHTML = ''
        content.value = ''
      }
    }, 0)
  }
}

function handlePaste(event: ClipboardEvent) {
  const clipboard = event.clipboardData
  if (!clipboard) {
    return
  }

  const items = clipboard.items
  if (!items || items.length === 0) {
    return
  }

  const files: File[] = []
  for (const item of Array.from(items)) {
    if (item.kind === 'file') {
      const file = item.getAsFile()
      if (file) {
        files.push(file)
      }
    }
  }

  if (files.length > 0) {
    event.preventDefault()
    // Create a FileList-like object
    const dataTransfer = new DataTransfer()
    for (const file of files) {
      dataTransfer.items.add(file)
    }
    // Trigger attachment addition
    handleAddFiles(dataTransfer.files)
  }
}

function handleSubmit() {
  if (!content.value.trim()) return

  if (props.conversationWorking) {
    // Conversation is working; queue the message
    emit('queueMessage', content.value)
  } else {
    // Conversation is idle; send immediately
    emit('submit', content.value)
  }

  // Clear the input
  content.value = ''
  if (textareaRef.value) {
    textareaRef.value.textContent = ''
  }
}

function handleStop() {
  emit('stop')
}

function handleMention(filePath?: string) {
  if (!filePath) return

  // Insert @file path at the caret position
  const updatedContent = content.value + `@${filePath} `
  content.value = updatedContent

  // Update the DOM
  if (textareaRef.value) {
    textareaRef.value.textContent = updatedContent
    placeCaretAtEnd(textareaRef.value)
  }

  // Emit an input event
  emit('input', updatedContent)

  // Automatically focus the input
  nextTick(() => {
    textareaRef.value?.focus()
  })
}

function handleAddFiles(files: FileList) {
  emit('addAttachment', files)
}

function handleRemoveAttachment(id: string) {
  emit('removeAttachment', id)
}

// Check whether the attachment is an image
function isImageAttachment(attachment: AttachmentItem): boolean {
  return IMAGE_MEDIA_TYPES.includes(attachment.mediaType as any)
}

// Get the data URL for the image preview
function getImageDataUrl(attachment: AttachmentItem): string {
  return `data:${attachment.mediaType};base64,${attachment.data}`
}

// Open the image preview
function handlePreviewImage(attachment: AttachmentItem) {
  if (!isImageAttachment(attachment)) return

  previewImageSrc.value = getImageDataUrl(attachment)
  previewImageAlt.value = attachment.fileName
  previewVisible.value = true
}

// Close the image preview
function handleClosePreview() {
  previewVisible.value = false
  previewImageSrc.value = ''
  previewImageAlt.value = ''
}

// Watch caret position changes (only update while dropdown is open to avoid duplicate requests)
function handleSelectionChange() {
  if (!content.value || !textareaRef.value) return

  if (slashCompletion.isOpen.value) {
    nextTick(() => {
      updateDropdownPosition(slashCompletion, 'queryStart')
    })
  }
  if (fileCompletion.isOpen.value) {
    nextTick(() => {
      updateDropdownPosition(fileCompletion, 'queryStart')
    })
  }
}

// Add/remove selectionchange listener
onMounted(() => {
  document.addEventListener('selectionchange', handleSelectionChange)
})

onUnmounted(() => {
  document.removeEventListener('selectionchange', handleSelectionChange)
})

// Expose methods for parents to set content and manage focus
defineExpose({
  /** Set the input content and sync the internal state */
  setContent(text: string) {
    content.value = text || ''
    if (textareaRef.value) {
      textareaRef.value.textContent = content.value
    }
    autoResizeTextarea()
  },
  /** Focus the input and move the caret to the end */
  focus() {
    nextTick(() => {
      const el = textareaRef.value
      if (!el) return
      // Move the caret to the end before focusing so editing resumes at the last character
      placeCaretAtEnd(el)
      el.focus()
    })
  }
})

</script>

<style scoped>
/* Wrapper for status bar + input box */
.chat-input-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
}

/* Unified input container layout */
.full-input-box {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  background-color: var(--theme-input-bg, var(--vscode-input-background));
  border: none;
  border-radius: 0 0 var(--theme-radius-lg, 12px) var(--theme-radius-lg, 12px);
  transition: box-shadow 0.2s ease;
}

/* Highlight border when focused */
.full-input-box:focus-within {
  box-shadow: none;
  outline: none;
}

/* Attachment preview area with horizontal scroll */
.attachments-scroll-view {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 8px 4px 8px;
  overflow-x: auto;
  white-space: nowrap;
  scrollbar-width: thin;
}

/* Attachment card base styles */
.attachment-card {
  position: relative;
  flex-shrink: 0;
  border-radius: var(--theme-radius-md, 8px);
  border: 1px solid var(--theme-border-subtle, rgba(255, 255, 255, 0.03));
  background-color: var(--theme-bg-secondary, var(--vscode-editor-background));
  transition: all 0.2s ease;
  user-select: none;
  cursor: default;
}

.attachment-card:hover {
  border-color: var(--theme-border-default, rgba(255, 255, 255, 0.2));
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

/* More images counter */
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

/* Image hover overlay */
.attachment-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.1);
  opacity: 0;
  transition: opacity 0.2s ease;
  /* Use block layout so absolutely positioned children align correctly */
  display: block;
}

.attachment-card.is-image:hover .attachment-overlay {
  opacity: 1;
}

/* Delete button (image) */
.delete-btn {
  position: absolute;
  top: 2px;
  right: 2px;
  background: rgba(0, 0, 0, 0.6);
  border: none;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  transition: background 0.2s ease;
}

.delete-btn:hover {
  background: rgba(255, 59, 48, 0.9);
}

.delete-btn .codicon {
  font-size: 14px;
}

/* File chip-style card */
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

/* File delete button */
.delete-btn-file {
  background: none;
  border: none;
  color: var(--vscode-descriptionForeground);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
  margin-left: 2px;
  opacity: 0.6;
  transition: all 0.2s ease;
}

.delete-btn-file:hover {
  background-color: var(--vscode-list-hoverBackground);
  color: var(--vscode-errorForeground);
  opacity: 1;
}

/* Input area styles */
.aislash-editor-input {
  min-width: 0;
  line-height: 1.5;
  font-family: inherit;
  font-size: 13px;
  padding: 6px 8px;
  outline: none;
  border: none;
  background: transparent;
  color: var(--vscode-input-foreground);
}

.aislash-editor-input:empty::before {
  content: attr(data-placeholder);
  color: var(--vscode-input-placeholderForeground);
  pointer-events: none;
}

/* Button area container */
.button-area-wrapper {
  padding: 2px 8px 6px 8px;
}

/* Hide horizontal scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  height: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--vscode-scrollbarSlider-background);
  border-radius: 2px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
</style>
