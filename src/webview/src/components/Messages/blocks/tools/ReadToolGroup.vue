<template>
  <div class="read-tool-group">
    <!-- Collapsed view: single line showing count -->
    <div
      class="group-header"
      @click="toggleExpand"
      @mouseenter="isHovered = true"
      @mouseleave="isHovered = false"
    >
      <button class="tool-icon-btn" title="Read files">
        <span
          v-if="!isHovered"
          class="codicon codicon-eye-two"
        ></span>
        <span
          v-else-if="isExpanded"
          class="codicon codicon-fold"
        ></span>
        <span
          v-else
          class="codicon codicon-unfold"
        ></span>
      </button>

      <span class="group-label">
        Read {{ items.length }} files
      </span>

      <!-- Success indicator if all completed -->
      <ToolStatusIndicator
        v-if="allCompleted"
        state="success"
        class="status-indicator"
      />
    </div>

    <!-- Expanded view: show all Read items -->
    <div v-if="isExpanded" class="group-items">
      <ContentBlock
        v-for="(wrapper, index) in items"
        :key="index"
        :block="wrapper.content"
        :wrapper="wrapper"
        :context="context"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { ContentBlockWrapper } from '@/models/ContentBlockWrapper';
import type { ToolContext } from '@/types/tool';
import ToolStatusIndicator from './common/ToolStatusIndicator.vue';
import ContentBlock from '../../ContentBlock.vue';

interface Props {
  items: ContentBlockWrapper[];
  context?: ToolContext;
}

const props = defineProps<Props>();

const isExpanded = ref(false);
const isHovered = ref(false);

// Check if all Read operations completed successfully
const allCompleted = computed(() => {
  return props.items.every(wrapper => {
    const result = wrapper.toolResult?.value || wrapper.toolUseResult;
    return result && !result.is_error;
  });
});

function toggleExpand() {
  isExpanded.value = !isExpanded.value;
}
</script>

<style scoped>
.read-tool-group {
  display: flex;
  flex-direction: column;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 0;
  cursor: pointer;
  user-select: none;
}

.group-header:hover {
  background-color: color-mix(in srgb, var(--vscode-list-hoverBackground) 30%, transparent);
}

.tool-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  padding: 2px;
  color: var(--vscode-foreground);
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.tool-icon-btn .codicon {
  font-size: 16px;
}

.group-label {
  font-weight: 500;
  color: var(--vscode-foreground);
  font-size: 0.9em;
}

.status-indicator {
  margin-left: auto;
}

.group-items {
  padding-left: 16px;
  margin-left: 10px;
  border-left: 1px solid var(--vscode-panel-border);
}
</style>
