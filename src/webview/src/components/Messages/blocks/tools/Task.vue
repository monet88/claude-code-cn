<template>
  <ToolMessageWrapper
    tool-icon="codicon-tasklist"
    :tool-result="toolResult"
    :default-expanded="shouldExpand"
  >
    <template #main>
      <span class="tool-label">Task</span>
      <span v-if="subagentType" class="agent-badge">{{ subagentType }}</span>
      <span v-if="description" class="description-text">{{ description }}</span>
    </template>

    <template #expandable>
      <!-- Error content -->
      <ToolError :tool-result="toolResult" />
    </template>
  </ToolMessageWrapper>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import ToolMessageWrapper from './common/ToolMessageWrapper.vue';
import ToolError from './common/ToolError.vue';

interface Props {
  toolUse?: any;
  toolResult?: any;
  toolUseResult?: any;
}

const props = defineProps<Props>();

// Subagent type
const subagentType = computed(() => {
  return props.toolUse?.input?.subagent_type || props.toolUseResult?.subagent_type;
});

// Task description
const description = computed(() => {
  return props.toolUse?.input?.description || props.toolUseResult?.description;
});

// Always collapse by default - user can click to expand if needed
const shouldExpand = computed(() => {
  return false;
});
</script>

<style scoped>
.tool-label {
  font-weight: 500;
  color: var(--vscode-foreground);
  font-size: 0.9em;
}

.agent-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  background-color: color-mix(in srgb, var(--vscode-charts-orange) 20%, transparent);
  color: var(--vscode-charts-orange);
  border-radius: 3px;
  font-size: 0.75em;
  font-weight: 600;
  font-family: var(--vscode-editor-font-family);
}

.description-text {
  font-family: var(--vscode-editor-font-family);
  font-size: 0.85em;
  color: color-mix(in srgb, var(--vscode-foreground) 85%, transparent);
  font-style: italic;
}
</style>
