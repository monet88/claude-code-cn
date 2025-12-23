<template>
  <div class="button-area-container">
    <div class="button-row">
      <!-- Left Section: Dropdowns -->
      <div class="controls-section">
        <!-- Mode Select -->
        <ModeSelect
          :permission-mode="permissionMode"
          @mode-select="(mode) => emit('modeSelect', mode)"
        />

        <!-- Model Select -->
        <ModelSelect
          :selected-model="selectedModel"
          @model-select="(modelId) => emit('modelSelect', modelId)"
        />
      </div>

      <!-- Right Section: Action Buttons -->
      <div class="actions-section">

        <!-- Thinking toggle button (hidden) -->
        <!-- <button
          class="action-button think-button"
          :class="{ 'thinking-active': isThinkingOn }"
          @click="handleThinkingToggle"
          :aria-label="isThinkingOn ? 'Thinking mode on' : 'Thinking mode off'"
          :title="isThinkingOn ? 'Thinking mode on' : 'Thinking mode off'"
        >
          <span class="codicon codicon-brain text-[16px]!" />
        </button> -->

        <!-- Command button with dropdown (hidden) -->
        <!-- <DropdownTrigger
          ref="commandDropdownRef"
          :show-search="true"
          :search-placeholder="'Filter commands...'"
          align="left"
          :selected-index="commandCompletion.activeIndex.value"
          :data-nav="commandCompletion.navigationMode.value"
          @open="handleDropdownOpen"
          @close="handleDropdownClose"
          @search="handleSearch"
        >
          <template #trigger>
            <button
              class="action-button"
              :aria-label="'Slash command'"
            >
              <span class="codicon codicon-italic text-[16px]!" />
            </button>
          </template>

          <template #content="{ close }">
            <div @mouseleave="commandCompletion.handleMouseLeave">
              <template v-for="(item, index) in commandCompletion.items.value" :key="item.id">
                <DropdownSeparator v-if="item.type === 'separator'" />
                <DropdownSectionHeader v-else-if="item.type === 'section-header'" :text="item.text" />
                <DropdownItem
                  v-else
                  :item="item"
                  :index="index"
                  :is-selected="index === commandCompletion.activeIndex.value"
                  @click="(item) => handleCommandClick(item, close)"
                  @mouseenter="commandCompletion.handleMouseEnter(index)"
                />
              </template>
            </div>
          </template>
        </DropdownTrigger> -->

        <!-- Mention button with dropdown (hidden) -->
        <!-- <DropdownTrigger
          ref="mentionDropdownRef"
          :show-search="true"
          :search-placeholder="'Search files...'"
          align="left"
          :selected-index="fileCompletion.activeIndex.value"
          :data-nav="fileCompletion.navigationMode.value"
          @open="handleMentionDropdownOpen"
          @close="handleMentionDropdownClose"
          @search="handleMentionSearch"
        >
          <template #trigger>
            <button
              class="action-button"
              :aria-label="'Reference file'"
            >
              <span class="codicon codicon-mention text-[16px]!" />
            </button>
          </template>

          <template #content="{ close }">
            <div @mouseleave="fileCompletion.handleMouseLeave">
              <template v-for="(item, index) in fileCompletion.items.value" :key="item.id">
                <DropdownItem
                  :item="item"
                  :index="index"
                  :is-selected="index === fileCompletion.activeIndex.value"
                  @click="(item) => handleFileClick(item, close)"
                  @mouseenter="fileCompletion.handleMouseEnter(index)"
                >
                  <template #icon v-if="'data' in item && item.data?.file">
                    <FileIcon :file-name="item.data.file.name" :size="16" />
                  </template>
                </DropdownItem>
              </template>
            </div>
          </template>
        </DropdownTrigger> -->

        <!-- Sparkle button (hidden) -->
        <!-- <button
          class="action-button"
          @click="handleSparkleClick"
          :aria-label="'Smart suggestions'"
        >
          <span class="codicon codicon-wand text-[16px]!" />
        </button> -->

        <!-- Attach File Button -->
        <button
          class="action-button"
          @click="handleAttachClick"
          :aria-label="'Add attachment'"
          :disabled="isActionDisabled"
        >
          <span class="codicon codicon-attach text-[16px]!" />
          <input
            ref="fileInputRef"
            type="file"
            multiple
            style="display: none;"
            @change="handleFileUpload"
          >
        </button>

        <!-- Submit Button -->
        <button
          class="submit-button"
          @click="handleSubmit"
          :disabled="submitVariant === 'disabled'"
          :data-variant="submitVariant"
          :aria-label="submitVariant === 'stop' ? 'Stop conversation' : 'Send message'"
        >
          <span
            v-if="submitVariant === 'stop'"
            class="codicon codicon-debug-stop text-[12px]! bg-(--vscode-editor-background)e-[0.6] rounded-[1px]"
          />
          <span
            v-else
            class="codicon codicon-arrow-up-two text-[12px]!"
          />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PermissionMode } from '@anthropic-ai/claude-agent-sdk'
import { ref, computed, inject } from 'vue'
import ModeSelect from './ModeSelect.vue'
import ModelSelect from './ModelSelect.vue'
import FileIcon from './FileIcon.vue'
import { DropdownTrigger, DropdownItem, DropdownSeparator, DropdownSectionHeader } from './Dropdown'
import { RuntimeKey } from '../composables/runtimeContext'
import { useCompletionDropdown } from '../composables/useCompletionDropdown'
import { getSlashCommands, commandToDropdownItem } from '../providers/slashCommandProvider'
import { getFileReferences, fileToDropdownItem } from '../providers/fileReferenceProvider'

interface Props {
  disabled?: boolean
  loading?: boolean
  selectedModel?: string
  conversationWorking?: boolean
  hasInputContent?: boolean
  showProgress?: boolean
  progressPercentage?: number
  contextWindow?: number
  thinkingLevel?: string
  permissionMode?: PermissionMode
}

interface Emits {
  (e: 'submit'): void
  (e: 'stop'): void
  (e: 'attach'): void
  (e: 'addAttachment', files: FileList): void
  (e: 'mention', filePath?: string): void
  (e: 'thinkingToggle'): void
  (e: 'sparkle'): void
  (e: 'modeSelect', mode: PermissionMode): void
  (e: 'modelSelect', modelId: string): void
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  loading: false,
  selectedModel: 'default',
  conversationWorking: false,
  hasInputContent: false,
  showProgress: true,
  progressPercentage: 0,
  contextWindow: 200000,
  thinkingLevel: 'default_on',
  permissionMode: 'acceptEdits'
})

const emit = defineEmits<Emits>()

const fileInputRef = ref<HTMLInputElement>()
const commandDropdownRef = ref<InstanceType<typeof DropdownTrigger>>()
const mentionDropdownRef = ref<InstanceType<typeof DropdownTrigger>>()

// Get runtime to access CommandRegistry
const runtime = inject(RuntimeKey)

// === Using the new Completion Dropdown composable ===

// Slash command completion
const commandCompletion = useCompletionDropdown({
  mode: 'manual',
  provider: (query, signal) => getSlashCommands(query, runtime, signal),
  toDropdownItem: commandToDropdownItem,
  onSelect: (command) => {
    // Execute the command
    if (runtime) {
      runtime.appContext.commandRegistry.executeCommand(command.id)
    }
    commandCompletion.close()
  },
  showSectionHeaders: false, // Section headers are hidden for simplicity
  searchFields: ['label', 'description']
})

// @ file reference completion
const fileCompletion = useCompletionDropdown({
  mode: 'manual',
  provider: (query, signal) => getFileReferences(query, runtime, signal),
  toDropdownItem: fileToDropdownItem,
  onSelect: (file) => {
    // Emit a mention event with the file path
    emit('mention', file.path)
    fileCompletion.close()
  },
  showSectionHeaders: false,
  searchFields: ['name', 'path']
})


const isActionDisabled = computed(() => props.disabled || props.loading)

const isThinkingOn = computed(() => props.thinkingLevel !== 'off')

const submitVariant = computed(() => {
  // Match React: always show the stop button while busy
  if (props.conversationWorking) {
    return 'stop'
  }

  if (isActionDisabled.value) {
    return 'disabled'
  }

  // Disabled when not busy and there is no input
  if (!props.hasInputContent) {
    return 'disabled'
  }

  // Otherwise allow sending
  return 'enabled'
})

function handleSubmit() {
  if (submitVariant.value === 'stop') {
    emit('stop')
  } else if (submitVariant.value === 'enabled') {
    emit('submit')
  }
}

// Command dropdown handlers
function handleCommandClick(item: any, close: () => void) {
  console.log('Command clicked:', item)

  // Use commandCompletion to choose the command
  if (item.data?.command) {
    // Find the command index in the list and select it
    const index = commandCompletion.items.value.findIndex(i => i.id === item.id)
    if (index !== -1) {
      commandCompletion.selectIndex(index)
    }
  }

  // Close the menu
  close()
}

// File (Mention) dropdown handlers
function handleFileClick(item: any, close: () => void) {
  console.log('File clicked:', item)

  // Use fileCompletion to select the file
  if (item.data?.file) {
    const index = fileCompletion.items.value.findIndex(i => i.id === item.id)
    if (index !== -1) {
      // Set activeIndex first, then call selectActive
      fileCompletion.activeIndex.value = index
      fileCompletion.selectActive()
    }
  }

  // Close the menu
  close()
}

function handleThinkingToggle() {
  emit('thinkingToggle')
}

function handleSparkleClick() {
  emit('sparkle')
}

function handleAttachClick() {
  fileInputRef.value?.click()
}

function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    emit('addAttachment', target.files)
    // Clear the input so the same file can be chosen again
    target.value = ''
  }
}

// Command dropdown - open handling
function handleDropdownOpen() {
  commandCompletion.open()
  // Add keyboard event listeners
  document.addEventListener('keydown', handleCommandKeydown)
}

// Command dropdown - close handling
function handleDropdownClose() {
  commandCompletion.close()
  // Remove keyboard event listeners
  document.removeEventListener('keydown', handleCommandKeydown)
}

// Command dropdown - search handling
function handleSearch(term: string) {
  commandCompletion.handleSearch(term)
}

// Command dropdown - keyboard handling
function handleCommandKeydown(event: KeyboardEvent) {
  commandCompletion.handleKeydown(event)
}

// Mention dropdown - open handling
function handleMentionDropdownOpen() {
  fileCompletion.open()
  // Add keyboard event listeners
  document.addEventListener('keydown', handleMentionKeydown)
}

// Mention dropdown - close handling
function handleMentionDropdownClose() {
  fileCompletion.close()
  // Remove keyboard event listeners
  document.removeEventListener('keydown', handleMentionKeydown)
}

// Mention dropdown - search handling
function handleMentionSearch(term: string) {
  fileCompletion.handleSearch(term)
}

// Mention dropdown - keyboard handling
function handleMentionKeydown(event: KeyboardEvent) {
  fileCompletion.handleKeydown(event)
}

</script>

<style scoped>
.button-area-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.25rem;
  flex-shrink: 0;
  cursor: auto;
  width: 100%;
  user-select: none;
}

.button-row {
  display: grid;
  grid-template-columns: 4fr 1fr;
  align-items: center;
  height: 28px;
  padding-right: 2px;
  box-sizing: border-box;
  flex: 1 1 0%;
  justify-content: space-between;
  width: 100%;
}

.controls-section {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-right: 6px;
  flex-shrink: 1;
  flex-grow: 0;
  min-width: 0;
  height: 20px;
  max-width: 100%;
}

.actions-section {
  display: flex;
  align-items: center;
  gap: 4px;
  justify-content: flex-end;
}

.action-button,
.submit-button {
  opacity: 0.5;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 17px;
  height: 17px;
  border: none;
  background: transparent;
  border-radius: 50%;
  cursor: pointer;
  transition: background-color 0.2s ease, opacity 0.2s ease;
  color: var(--vscode-foreground);
  position: relative;
}


.action-button:hover:not(:disabled) {
  opacity: 1;
}

.action-button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.action-button.thinking-active {
  color: var(--vscode-button-secondaryForeground);
  opacity: 1;
}

/* Think button detail: remove hover opacity to prevent confusion when off */
.action-button.think-button:hover:not(.thinking-active) {
  opacity: 0.5; /* Keep base opacity without ramping to 1 */
}

/* Hover behavior can remain when active */
.action-button.think-button.thinking-active:hover {
  opacity: 1;
}

.submit-button {
  scale: 1.1;
}

.submit-button[data-variant="enabled"] {
  background-color: color-mix(in srgb, var(--vscode-editor-foreground) 80%, transparent);
  color: var(--vscode-editor-background);
  opacity: 1;
  outline: 1.5px solid color-mix(in srgb, var(--vscode-editor-foreground) 60%, transparent);
  outline-offset: 1px;
}

.submit-button[data-variant="disabled"] {
  background-color: color-mix(in srgb, var(--vscode-editor-foreground) 80%, transparent);
  color: var(--vscode-editor-background);
  opacity: 0.5;
  cursor: not-allowed;
}

.submit-button[data-variant="stop"] {
  background-color: color-mix(in srgb, var(--vscode-editor-foreground) 80%, transparent);
  color: var(--vscode-editor-background);
  opacity: 1;
  outline: 1.5px solid color-mix(in srgb, var(--vscode-editor-foreground) 60%, transparent);
  outline-offset: 1px;
}


.codicon-modifier-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
