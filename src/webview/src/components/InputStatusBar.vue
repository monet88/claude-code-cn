<template>
  <!-- Sticky status bar above chat input - shows file changes and context window -->
  <div v-if="shouldShow" class="input-status-bar">
    <!-- Left: File change stats -->
    <div v-if="hasFileChanges" class="file-change-stats">
      <span class="codicon codicon-git-commit stats-icon" />
      <span class="stats-files">{{ formattedStats.filesChanged }} files</span>
      <span class="stats-add">+{{ formattedStats.added }}</span>
      <span class="stats-remove">-{{ formattedStats.removed }}</span>
      <span class="stats-modify">~{{ formattedStats.modified }}</span>
    </div>
    <div v-else class="empty-spacer" />

    <!-- Right: Context window indicator -->
    <div class="context-indicator">
      <span class="codicon codicon-dashboard stats-icon" />
      <span class="context-text">{{ formattedDisplay }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * InputStatusBar Component
 * 
 * A sticky header bar that displays realtime file change statistics
 * and context window usage. Positioned above the chat input box.
 */
import { computed } from 'vue';
import { useFileChangeStore } from '../stores/fileChangeStore';

interface Props {
  /** Current context window usage percentage (0-100) */
  percentage?: number;
  /** Total context window size in tokens */
  contextWindow?: number;
  /** Whether to show the status bar */
  showProgress?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  percentage: 0,
  contextWindow: 200000,
  showProgress: true
});

// File change store for realtime stats
const { totalStats, formattedStats } = useFileChangeStore();

// Check if there are any file changes to display
const hasFileChanges = computed(() => totalStats.value.filesChanged > 0);

// Show the bar when there are file changes OR we have context window info
const shouldShow = computed(() => props.showProgress || hasFileChanges.value);

// Format percentage for display (integer or 1 decimal)
const formattedPercentage = computed(() => {
  const value = props.percentage;
  return value % 1 === 0 ? Math.round(value) : value.toFixed(1);
});

// Format context window size (e.g., "168k" or "1.5M")
const formattedContextWindow = computed(() => {
  const window = props.contextWindow;
  if (window >= 1000000) {
    return `${(window / 1000000).toFixed(1)}M`;
  } else if (window >= 1000) {
    return `${Math.round(window / 1000)}k`;
  }
  return String(window);
});

// Combined display format: "30% of 168k"
const formattedDisplay = computed(() => {
  return `${formattedPercentage.value}% of ${formattedContextWindow.value}`;
});
</script>

<style scoped>
/* Main container - sticky header style matching chat header */
.input-status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background-color: var(--theme-input-bg, var(--vscode-input-background));
  border: 1px solid rgba(255, 255, 255, 0.03);
  border-bottom: none;
  border-radius: var(--theme-radius-lg, 12px) var(--theme-radius-lg, 12px) 0 0;
  font-size: 11px;
  font-family: var(--vscode-editor-font-family);
  min-height: 24px;
  user-select: none;
}

/* Empty spacer when no file changes */
.empty-spacer {
  flex: 1;
}

/* Stats icon styling */
.stats-icon {
  font-size: 11px;
  opacity: 0.7;
  margin-right: 4px;
}

/* File Change Stats - left side */
.file-change-stats {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--vscode-descriptionForeground);
}

.stats-files {
  color: var(--vscode-foreground);
  opacity: 0.8;
}

.stats-add {
  color: var(--vscode-gitDecoration-addedResourceForeground, #89d185);
  font-weight: 500;
}

.stats-remove {
  color: var(--vscode-gitDecoration-deletedResourceForeground, #f48771);
  font-weight: 500;
}

.stats-modify {
  color: var(--vscode-gitDecoration-modifiedResourceForeground, #e2c08d);
  font-weight: 500;
}

/* Context window indicator - right side */
.context-indicator {
  display: flex;
  align-items: center;
  color: #e5a54b;
  font-weight: 500;
}

.context-text {
  font-size: 11px;
  line-height: 1;
}
</style>
