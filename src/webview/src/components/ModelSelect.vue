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
          checked: selectedTier === option.id,
          type: 'model'
        }"
        :is-selected="selectedTier === option.id"
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

// Always show all 3 model tiers - ChatPage handles mapping to actual model IDs
const modelOptions = computed(() => {
  return [
    { id: 'opus', label: 'Opus' },
    { id: 'sonnet', label: 'Sonnet' },
    { id: 'haiku', label: 'Haiku' }
  ]
})

// Reverse map: convert actual model ID back to tier ID for comparison
const selectedTier = computed(() => {
  const modelId = props.selectedModel
  if (!modelId) return 'sonnet' // Default to sonnet
  
  // Check if it's already a tier ID
  if (['opus', 'sonnet', 'haiku'].includes(modelId)) {
    return modelId
  }
  
  // Map actual model ID back to tier
  const activeProvider = providerStore.activeProvider
  if (activeProvider) {
    if (activeProvider.opusModel === modelId) return 'opus'
    if (activeProvider.sonnetModel === modelId) return 'sonnet'
    if (activeProvider.haikuModel === modelId) return 'haiku'
  }
  
  // Fallback: try to detect tier from model ID string
  const lowerModelId = modelId.toLowerCase()
  if (lowerModelId.includes('opus')) return 'opus'
  if (lowerModelId.includes('sonnet')) return 'sonnet'
  if (lowerModelId.includes('haiku')) return 'haiku'
  
  return 'sonnet' // Default to sonnet
})

// Compute the display name for the model
const selectedModelLabel = computed(() => {
  const tier = selectedTier.value
  const option = modelOptions.value.find(o => o.id === tier)
  if (option) return option.label

  // Show model ID if unknown (truncate if too long)
  const modelId = props.selectedModel || 'Default'
  return modelId.length > 20 ? modelId.substring(0, 17) + '...' : modelId
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
