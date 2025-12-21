<template>
  <!-- Compact inline indicator - full list is shown in sticky bottom panel -->
  <div class="todowrite-inline-indicator">
    <span class="codicon codicon-checklist indicator-icon"></span>
    <span class="indicator-text">Task List</span>
    <span class="indicator-count">{{ todos.length }}</span>
    <span class="indicator-status">
      <span v-if="inProgressCount > 0" class="status-badge in-progress">
        {{ inProgressCount }} in progress
      </span>
      <span v-if="completedCount > 0" class="status-badge completed">
        {{ completedCount }}/{{ todos.length }} done
      </span>
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Todo {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  activeForm: string;
}

interface Props {
  toolUse?: any;
  toolResult?: any;
  toolUseResult?: any;
}

const props = defineProps<Props>();

const todos = computed<Todo[]>(() => {
  return props.toolUse?.input?.todos || [];
});

const inProgressCount = computed(() => {
  return todos.value.filter(t => t.status === 'in_progress').length;
});

const completedCount = computed(() => {
  return todos.value.filter(t => t.status === 'completed').length;
});
</script>

<style scoped>
.todowrite-inline-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: color-mix(in srgb, var(--vscode-editor-background) 90%, transparent);
  border: 1px solid color-mix(in srgb, var(--vscode-panel-border) 50%, transparent);
  border-radius: 4px;
  font-size: 0.85em;
  color: var(--vscode-foreground);
  opacity: 0.9;
}

.indicator-icon {
  font-size: 12px;
  opacity: 0.7;
}

.indicator-text {
  font-weight: 500;
  opacity: 0.8;
}

.indicator-count {
  background: color-mix(in srgb, var(--vscode-badge-background) 60%, transparent);
  color: var(--vscode-badge-foreground);
  padding: 1px 5px;
  border-radius: 8px;
  font-size: 0.85em;
  font-weight: 600;
}

.indicator-status {
  display: flex;
  gap: 4px;
  margin-left: 4px;
}

.status-badge {
  font-size: 0.8em;
  padding: 1px 6px;
  border-radius: 3px;
}

.status-badge.in-progress {
  background: color-mix(in srgb, var(--vscode-charts-blue) 20%, transparent);
  color: var(--vscode-charts-blue);
}

.status-badge.completed {
  background: color-mix(in srgb, var(--vscode-charts-green) 20%, transparent);
  color: var(--vscode-charts-green);
}
</style>
