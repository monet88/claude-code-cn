<template>
  <DropdownTrigger
    align="left"
    :close-on-click-outside="true"
  >
    <template #trigger>
      <div class="model-dropdown">
        <div class="dropdown-content">
          <div class="dropdown-text">
            <span class="dropdown-label">{{ selectedModelLabel }}</span>
          </div>
        </div>
        <div class="codicon codicon-chevron-up chevron-icon text-[12px]!" />
      </div>
    </template>

    <template #content="{ close }">
      <DropdownItem
        v-for="(option, index) in modelOptions"
        :key="option.id"
        :item="{
          id: option.id,
          label: option.label,
          checked: selectedModel === option.id,
          type: 'model'
        }"
        :is-selected="selectedModel === option.id"
        :index="index"
        @click="(item) => handleModelSelect(item, close)"
      />
    </template>
  </DropdownTrigger>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { DropdownTrigger, DropdownItem, type DropdownItemData } from './Dropdown'
import { useProviderStore } from '../stores/providerStore'

interface Props {
  selectedModel?: string
}

interface Emits {
  (e: 'modelSelect', modelId: string): void
}

const props = withDefaults(defineProps<Props>(), {
  selectedModel: 'default'
})

const emit = defineEmits<Emits>()
const providerStore = useProviderStore()

// Get model options from active provider or use defaults
const modelOptions = computed(() => {
  const activeProvider = providerStore.activeProvider
  const options: Array<{ id: string; label: string }> = []

  // Always add "Default" option first - uses provider's ANTHROPIC_DEFAULT_MODEL
  options.push({ id: 'default', label: 'Default' })

  if (activeProvider?.haikuModel) {
    options.push({ id: activeProvider.haikuModel, label: 'Haiku' })
  }
  if (activeProvider?.sonnetModel) {
    options.push({ id: activeProvider.sonnetModel, label: 'Sonnet' })
  }
  if (activeProvider?.opusModel) {
    options.push({ id: activeProvider.opusModel, label: 'Opus' })
  }

  // If only "Default" option (no custom models), add fallback options
  if (options.length === 1) {
    options.push(
      { id: 'claude-sonnet-4-5', label: 'Sonnet 4.5' },
      { id: 'claude-opus-4-5-20251101', label: 'Opus 4.5' }
    )
  }

  return options
})

// Compute the display name for the model
const selectedModelLabel = computed(() => {
  // Handle "default" specially
  if (props.selectedModel === 'default') {
    return 'Default'
  }

  const option = modelOptions.value.find(o => o.id === props.selectedModel)
  if (option) return option.label

  // Fallback labels for known models
  switch (props.selectedModel) {
    case 'claude-sonnet-4-5':
      return 'Sonnet 4.5'
    case 'claude-opus-4-5-20251101':
      return 'Opus 4.5'
    default:
      // Show model ID if unknown
      return props.selectedModel || 'Default'
  }
})

function handleModelSelect(item: DropdownItemData, close: () => void) {
  console.log('Selected model:', item)
  close()

  // Emit a model switch event
  emit('modelSelect', item.id)
}
</script>

<style scoped>
/* Model dropdown styling - sleek transparent look */
.model-dropdown {
  display: flex;
  gap: 4px;
  font-size: 12px;
  align-items: center;
  line-height: 24px;
  min-width: 0;
  max-width: 100%;
  padding: 2.5px 6px;
  border-radius: 23px;
  flex-shrink: 1;
  cursor: pointer;
  border: none;
  background: transparent;
  overflow: hidden;
  transition: background-color 0.2s ease;
}

.model-dropdown:hover {
  background-color: var(--vscode-inputOption-hoverBackground);
}

/* Shared Dropdown styles */
.dropdown-content {
  display: flex;
  align-items: center;
  gap: 3px;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
}

.dropdown-text {
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 12px;
  display: flex;
  align-items: baseline;
  gap: 3px;
  height: 13px;
  font-weight: 400;
}

.dropdown-label {
  opacity: 0.8;
  max-width: 120px;
  overflow: hidden;
  height: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.chevron-icon {
  font-size: 9px;
  flex-shrink: 0;
  opacity: 0.5;
  color: var(--vscode-foreground);
}
</style>
