<template>
  <!-- 融合式输入框容器 -->
  <div class="full-input-box">
    
    <!-- 1. 附件预览区域 (横向滚动) -->
    <div
      v-if="imageAttachments.length || fileAttachments.length"
      class="attachments-scroll-view custom-scrollbar"
    >
      <!-- 图片附件（使用 motion-v 增强添加 / 删除 / hover 动画） -->
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
          <!-- 悬浮遮罩与删除按钮 -->
          <div class="attachment-overlay">
            <button
              class="delete-btn"
              @click.stop="handleRemoveAttachment(attachment.id)"
              :aria-label="`移除 ${attachment.fileName}`"
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
          <!-- 悬浮遮罩与删除按钮 -->
          <div class="attachment-overlay">
            <button
              class="delete-btn"
              @click.stop="handleRemoveAttachment(attachment.id)"
              :aria-label="`移除 ${attachment.fileName}`"
            >
              <span class="codicon codicon-close" />
            </button>
          </div>
        </div>
      </template>

      <!-- 文件附件 -->
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
          :aria-label="`移除 ${attachment.fileName}`"
        >
          <span class="codicon codicon-close" />
        </button>
      </div>
    </div>

    <!-- 图片预览对话框 -->
    <ImagePreviewDialog
      :visible="previewVisible"
      :image-src="previewImageSrc"
      :image-alt="previewImageAlt"
      @close="handleClosePreview"
    />

    <!-- 2. 输入框区域 -->
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

    <!-- 3. 底部按钮区域 -->
    <div class="button-area-wrapper">
      <ButtonArea
        :disabled="isSubmitDisabled"
        :loading="isLoading"
        :selected-model="selectedModel"
        :conversation-working="conversationWorking"
        :has-input-content="!!content.trim()"
        :show-progress="showProgress"
        :progress-percentage="progressPercentage"
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
      :width="240"
      :should-auto-focus="false"
      :close-on-click-outside="false"
      :data-nav="slashCompletion.navigationMode.value"
      :selected-index="slashCompletion.activeIndex.value"
      :offset-y="-8"
      :offset-x="-8"
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
          <div v-else class="px-2 py-1 text-xs opacity-60">无匹配项</div>
        </div>
      </template>
    </Dropdown>

    <!-- @ 文件引用 Dropdown -->
    <Dropdown
      v-if="fileCompletion.isOpen.value"
      :is-visible="fileCompletion.isOpen.value"
      :position="fileCompletion.position.value"
      :width="320"
      :should-auto-focus="false"
      :close-on-click-outside="false"
      :data-nav="fileCompletion.navigationMode.value"
      :selected-index="fileCompletion.activeIndex.value"
      :offset-y="-8"
      :offset-x="-8"
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
          <div v-else class="px-2 py-1 text-xs opacity-60">无匹配项</div>
        </div>
      </template>
    </Dropdown>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, inject, onMounted, onUnmounted } from 'vue'
import { Motion } from 'motion-v'
import type { PermissionMode } from '@anthropic-ai/claude-agent-sdk'
import FileIcon from './FileIcon.vue'
import ButtonArea from './ButtonArea.vue'
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
  placeholder?: string
  readonly?: boolean
  showSearch?: boolean
  selectedModel?: string
  conversationWorking?: boolean
  attachments?: AttachmentItem[]
  thinkingLevel?: string
  permissionMode?: PermissionMode
  /**
   * 是否启用附件图片的 Motion 动画
   * - 默认 true：用于主输入框，新增/删除/hover 都有轻动效
   * - 编辑历史消息等场景可置为 false，避免重复加载动画干扰
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
  placeholder: '',
  readonly: false,
  showSearch: false,
  selectedModel: 'claude-sonnet-4-5',
  conversationWorking: false,
  attachments: () => [],
  thinkingLevel: 'default_on',
  permissionMode: 'default',
  enableAttachmentMotion: true
})

const emit = defineEmits<Emits>()

const runtime = inject(RuntimeKey)

const content = ref('')
const isLoading = ref(false)
const textareaRef = ref<HTMLDivElement | null>(null)

// 图片预览状态
const previewVisible = ref(false)
const previewImageSrc = ref('')
const previewImageAlt = ref('')

// 动态placeholder
const placeholderText = computed(() => props.placeholder || '@ 引用文件，/ 执行命令...')

const attachmentsList = computed(() => props.attachments ?? [])
const imageAttachments = computed(() => attachmentsList.value.filter(a => isImageAttachment(a)))
const fileAttachments = computed(() => attachmentsList.value.filter(a => !isImageAttachment(a)))

const isSubmitDisabled = computed(() => {
  return !content.value.trim() || isLoading.value
})

// === 使用新的 Completion Dropdown Composable ===

// Slash Command 补全
const slashCompletion = useCompletionDropdown({
  mode: 'inline',
  trigger: '/',
  provider: (query, signal) => getSlashCommands(query, runtime, signal),
  toDropdownItem: commandToDropdownItem,
  onSelect: (command, query) => {
    if (query) {
      // 替换文本
      const updated = slashCompletion.replaceText(content.value, `${command.label} `)
      content.value = updated

      // 更新 DOM
      if (textareaRef.value) {
        textareaRef.value.textContent = updated
        placeCaretAtEnd(textareaRef.value)
      }

      // 触发输入事件
      emit('input', updated)
    }
  },
  anchorElement: textareaRef
})

// @ 文件引用补全
const fileCompletion = useCompletionDropdown({
  mode: 'inline',
  trigger: '@',
  provider: (query, signal) => getFileReferences(query, runtime, signal),
  toDropdownItem: fileToDropdownItem,
  onSelect: (file, query) => {
    if (query) {
      // 替换文本，插入文件路径
      const updated = fileCompletion.replaceText(content.value, `@${file.path} `)
      content.value = updated

      // 更新 DOM
      if (textareaRef.value) {
        textareaRef.value.textContent = updated
        placeCaretAtEnd(textareaRef.value)
      }

      // 触发输入事件
      emit('input', updated)
    }
  },
  anchorElement: textareaRef
})

// 将光标移至末尾
function placeCaretAtEnd(node: HTMLElement) {
  const range = document.createRange()
  range.selectNodeContents(node)
  range.collapse(false)
  const selection = window.getSelection()
  selection?.removeAllRanges()
  selection?.addRange(range)
}

// 获取光标的客户端矩形
function getCaretClientRect(editable: HTMLElement | null): DOMRect | undefined {
  if (!editable) return undefined

  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return undefined

  const range = sel.getRangeAt(0).cloneRange()
  if (!editable.contains(range.startContainer)) return undefined

  // collapsed range 一般有 0 宽度，但有行高；用 getClientRects 优先
  const rects = range.getClientRects()
  const rect = rects[0] || range.getBoundingClientRect()
  if (!rect) return undefined

  // 兜底行高，避免 0 高导致 Dropdown 内部计算异常
  const lh = parseFloat(getComputedStyle(editable).lineHeight || '0') || 16
  const height = rect.height || lh

  return new DOMRect(rect.left, rect.top, rect.width, height)
}

// 根据字符偏移获取矩形（用于锚定在触发词开头）
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

// 更新 dropdown 位置
function updateDropdownPosition(
  completion: typeof slashCompletion | typeof fileCompletion,
  anchor: 'caret' | 'queryStart' = 'queryStart'
) {
  const el = textareaRef.value
  if (!el) return

  let rect: DOMRect | undefined

  // 优先锚定在触发词开头
  if (anchor === 'queryStart' && completion.triggerQuery.value) {
    rect = getRectAtCharOffset(el, completion.triggerQuery.value.start)
  }

  // 兜底：锚定在光标位置
  if (!rect && anchor === 'caret') {
    rect = getCaretClientRect(el)
  }

  // 最终兜底：使用输入框自身矩形
  if (!rect) {
    const r = el.getBoundingClientRect()
    rect = new DOMRect(r.left, r.top, r.width, r.height)
  }

  completion.updatePosition({
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height
  })
}

function handleInput(event: Event) {
  const target = event.target as HTMLDivElement
  const textContent = target.textContent || ''

  // 只有在完全没有内容时才清理 div
  if (textContent.length === 0) {
    target.innerHTML = ''
  }

  content.value = textContent
  emit('input', textContent)

  // 评估补全（slash 和 @）
  slashCompletion.evaluateQuery(textContent)
  fileCompletion.evaluateQuery(textContent)

  // 更新 dropdown 位置（锚定在触发词开头）
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

  // 自适应高度
  autoResizeTextarea()
}

function autoResizeTextarea() {
  if (!textareaRef.value) return

  nextTick(() => {
    const divElement = textareaRef.value!

    // 重置高度以获取准确的 scrollHeight
    divElement.style.height = '20px'

    // 计算所需高度
    const scrollHeight = divElement.scrollHeight
    const minHeight = 20
    const maxHeight = 240

    if (scrollHeight <= maxHeight) {
      // 内容未超出最大高度，调整高度并隐藏滚动条
      divElement.style.height = Math.max(scrollHeight, minHeight) + 'px'
      divElement.style.overflowY = 'hidden'
    } else {
      // 内容超出最大高度，设置最大高度并显示滚动条
      divElement.style.height = maxHeight + 'px'
      divElement.style.overflowY = 'auto'
    }
  })
}

function handleKeydown(event: KeyboardEvent) {
  // 优先处理补全菜单的键盘事件
  if (slashCompletion.isOpen.value) {
    slashCompletion.handleKeydown(event)
    return
  }

  // 处理文件引用补全的键盘事件
  if (fileCompletion.isOpen.value) {
    fileCompletion.handleKeydown(event)
    return
  }

  // 其他按键处理
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    handleSubmit()
  }

  // 延迟检查内容是否为空（在按键处理后）
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
    // 创建 FileList-like 对象
    const dataTransfer = new DataTransfer()
    for (const file of files) {
      dataTransfer.items.add(file)
    }
    // 触发附件添加
    handleAddFiles(dataTransfer.files)
  }
}

function handleSubmit() {
  if (!content.value.trim()) return

  if (props.conversationWorking) {
    // 对话工作中，添加到队列
    emit('queueMessage', content.value)
  } else {
    // 对话未工作，直接发送
    emit('submit', content.value)
  }

  // 清空输入框
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

  // 在光标位置插入 @文件路径
  const updatedContent = content.value + `@${filePath} `
  content.value = updatedContent

  // 更新 DOM
  if (textareaRef.value) {
    textareaRef.value.textContent = updatedContent
    placeCaretAtEnd(textareaRef.value)
  }

  // 触发输入事件
  emit('input', updatedContent)

  // 自动聚焦到输入框
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

// 检查附件是否为图片
function isImageAttachment(attachment: AttachmentItem): boolean {
  return IMAGE_MEDIA_TYPES.includes(attachment.mediaType as any)
}

// 获取图片的 data URL（用于预览）
function getImageDataUrl(attachment: AttachmentItem): string {
  return `data:${attachment.mediaType};base64,${attachment.data}`
}

// 打开图片预览
function handlePreviewImage(attachment: AttachmentItem) {
  if (!isImageAttachment(attachment)) return

  previewImageSrc.value = getImageDataUrl(attachment)
  previewImageAlt.value = attachment.fileName
  previewVisible.value = true
}

// 关闭图片预览
function handleClosePreview() {
  previewVisible.value = false
  previewImageSrc.value = ''
  previewImageAlt.value = ''
}

// 监听光标位置变化（仅在下拉菜单已打开时更新位置，避免重复触发请求）
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

// 添加/移除 selectionchange 监听
onMounted(() => {
  document.addEventListener('selectionchange', handleSelectionChange)
})

onUnmounted(() => {
  document.removeEventListener('selectionchange', handleSelectionChange)
})

// 暴露方法：供父组件设置内容与聚焦
defineExpose({
  /** 设置输入框内容并同步内部状态 */
  setContent(text: string) {
    content.value = text || ''
    if (textareaRef.value) {
      textareaRef.value.textContent = content.value
    }
    autoResizeTextarea()
  },
  /** 聚焦到输入框，并将光标移动到最后一个字符 */
  focus() {
    nextTick(() => {
      const el = textareaRef.value
      if (!el) return
      // 先将光标移动到末尾，再聚焦，确保编辑时从最后一个字继续输入
      placeCaretAtEnd(el)
      el.focus()
    })
  }
})

</script>

<style scoped>
/* 全局输入框容器：融合式设计 */
.full-input-box {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  background-color: var(--vscode-input-background);
  border: 1px solid var(--vscode-input-border);
  border-radius: 6px;
  transition: border-color 0.2s ease;
}

/* 聚焦时高亮边框 */
.full-input-box:focus-within {
  border-color: var(--vscode-focusBorder);
  outline: none;
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
  transition: all 0.2s ease;
  user-select: none;
  cursor: default;
}

.attachment-card:hover {
  border-color: var(--vscode-focusBorder);
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

/* 图片悬浮遮罩 */
.attachment-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.1);
  opacity: 0;
  transition: opacity 0.2s ease;
  /* 改为 block 以便绝对定位子元素 */
  display: block;
}

.attachment-card.is-image:hover .attachment-overlay {
  opacity: 1;
}

/* 删除按钮（图片） */
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

/* 文件删除按钮 */
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

/* 输入框样式 */
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

/* 按钮区域容器 */
.button-area-wrapper {
  padding: 2px 8px 6px 8px;
}

/* 隐藏横向滚动条 */
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
