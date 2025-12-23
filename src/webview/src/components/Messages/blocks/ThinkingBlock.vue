<template>
  <div class="thinking-block">
    <div class="thinking-header" @click="toggleExpanded">
      <span class="codicon" :class="expanded ? 'codicon-chevron-down' : 'codicon-chevron-right'" />
      <span class="thinking-label">Thinking</span>
    </div>
    <div v-if="expanded" class="thinking-content">
      {{ block.thinking }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { ThinkingBlock as ThinkingBlockType } from '../../../models/ContentBlock';

interface Props {
  block: ThinkingBlockType;
}

defineProps<Props>();

const expanded = ref(false);

function toggleExpanded() {
  expanded.value = !expanded.value;
}
</script>

<style scoped>
.thinking-block {
  margin: 2px 0;
}

.thinking-header {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  user-select: none;
  padding: 2px 0;
}

.thinking-header .codicon {
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
  opacity: 0.6;
  transition: opacity 0.1s ease;
}

.thinking-header:hover .codicon {
  opacity: 1;
}

.thinking-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--vscode-descriptionForeground);
  opacity: 0.6;
  transition: opacity 0.2s ease;
}

.thinking-header:hover .thinking-label {
  opacity: 1;
}

.thinking-content {
  margin-left: 15px;
  padding: 4px 8px;
  margin-top: 2px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--vscode-descriptionForeground);
  white-space: pre-wrap;
  word-wrap: break-word;
  opacity: 0.8;
}
</style>
