<template>
  <ToolMessageWrapper
    tool-icon="codicon-new-file"
    tool-name="Write"
    :tool-result="toolResult"
    :default-expanded="shouldExpand"
    :class="{ 'has-content-view': hasContentView }"
  >
    <template #main>
      <span class="tool-label">Write</span>
      <ToolFilePath v-if="filePath" :file-path="filePath" :context="context" />
      <span v-if="contentStats" class="content-stats">
        <span class="stat-new">+{{ contentStats.lines }}</span>
      </span>
    </template>

    <template #expandable>
      <!-- File content view -->
      <div v-if="content && !toolResult?.is_error" class="write-view">
        <!-- File header -->
        <div v-if="filePath" class="write-file-header">
          <FileIcon :file-name="filePath" :size="16" class="file-icon" />
          <span class="file-path">{{ displayFilePath }}</span>
          <span v-if="contentStats" class="write-stats-badge">
            <span class="stat-new">+{{ contentStats.lines }}</span>
          </span>
        </div>

        <!-- Content display -->
        <div class="write-scroll-container">
          <!-- Left side line number column -->
          <div ref="lineNumbersRef" class="write-line-numbers">
            <div
              v-for="n in lineCount"
              :key="n"
              class="line-number-item"
            >
              {{ n }}
            </div>
          </div>

          <!-- Right side content column -->
          <div ref="contentRef" class="write-content" @scroll="handleContentScroll">
            <pre class="content-text">{{ content }}</pre>
          </div>
        </div>
      </div>

      <!-- Error content -->
      <ToolError :tool-result="toolResult" />
    </template>
  </ToolMessageWrapper>
</template>

<script setup lang="ts">
import { computed, ref, inject, onMounted } from 'vue';
import path from 'path-browserify-esm';
import type { ComputedRef } from 'vue';
import type { ToolContext } from '@/types/tool';
import ToolMessageWrapper from './common/ToolMessageWrapper.vue';
import ToolError from './common/ToolError.vue';
import ToolFilePath from './common/ToolFilePath.vue';
import FileIcon from '@/components/FileIcon.vue';
import { recordFromWriteResult } from '@/stores/fileChangeStore';

interface Props {
  toolUse?: any;
  toolResult?: any;
  toolUseResult?: any;
  context?: ToolContext;
}

const props = defineProps<Props>();

// Inject workspace root for relative path display
const workspaceRootRef = inject<ComputedRef<string> | string>('workspaceRoot', '');
const workspaceRoot = computed(() => {
  if (typeof workspaceRootRef === 'string') return workspaceRootRef;
  return workspaceRootRef?.value || '';
});

// vcc-re data acquisition method: only from inputs
const filePath = computed(() => {
  return props.toolUse?.input?.file_path || '';
});

const fileName = computed(() => {
  if (!filePath.value) return '';
  return path.basename(filePath.value);
});

// Display relative file path
const displayFilePath = computed(() => {
  if (!filePath.value) return '';
  
  const normalizedPath = filePath.value.replace(/\\/g, '/');
  const normalizedRoot = (workspaceRoot.value || '').replace(/\\/g, '/');
  
  if (normalizedRoot && normalizedPath.toLowerCase().startsWith(normalizedRoot.toLowerCase())) {
    let relativePath = normalizedPath.substring(normalizedRoot.length);
    if (relativePath.startsWith('/')) {
      relativePath = relativePath.substring(1);
    }
    return relativePath || fileName.value;
  }
  
  const patterns = ['/src/', '/lib/', '/app/', '/packages/', '/components/', '/webview/'];
  for (const pattern of patterns) {
    const index = normalizedPath.toLowerCase().indexOf(pattern);
    if (index !== -1) {
      return normalizedPath.substring(index + 1);
    }
  }
  
  return fileName.value;
});

// vcc-re data acquisition method: only from inputs.content
const content = computed(() => {
  return props.toolUse?.input?.content || '';
});

// Content statistics
const contentStats = computed(() => {
  if (!content.value) return null;

  const lines = content.value.split('\n').length;
  const chars = content.value.length;

  return { lines, chars };
});

// Line count
const lineCount = computed(() => {
  if (!content.value) return 0;
  return content.value.split('\n').length;
});

// Has content view
const hasContentView = computed(() => {
  return !!content.value && !props.toolResult?.is_error;
});

// Default collapsed - user clicks to expand
const shouldExpand = computed(() => {
  return false;
});

// DOM reference
const lineNumbersRef = ref<HTMLElement>();
const contentRef = ref<HTMLElement>();

// Synchronize the vertical scrolling of the line number column and content column
function handleContentScroll() {
  if (lineNumbersRef.value && contentRef.value) {
    lineNumbersRef.value.scrollTop = contentRef.value.scrollTop;
  }
}

// Track write for file change stats - only when tool completed successfully
const hasRecorded = ref(false);
onMounted(() => {
  if (!hasRecorded.value && filePath.value && lineCount.value > 0 && !props.toolResult?.is_error) {
    recordFromWriteResult(filePath.value, lineCount.value);
    hasRecorded.value = true;
  }
});
</script>

<style scoped>
/* Remove left border and margin when there is a content view, error keep default style */
.has-content-view :deep(.expandable-content) {
  border-left: none;
  padding: 0;
  margin-left: 0;
}

.tool-label {
  font-weight: 500;
  color: var(--vscode-foreground);
  font-size: 0.9em;
}

.content-stats {
  display: flex;
  gap: 8px;
  margin-left: 8px;
  font-size: 12px;
  font-weight: 600;
}

.stat-new {
  color: var(--vscode-gitDecoration-addedResourceForeground, #89d185);
}

.write-view {
  display: flex;
  flex-direction: column;
  gap: 0;
  font-family: var(--vscode-editor-font-family);
  font-size: 0.85em;
  border: 0.5px solid var(--vscode-widget-border);
  border-bottom-left-radius: 4px;
  border-bottom-right-radius: 4px;
  overflow: hidden;
}

.write-file-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background-color: var(--vscode-sideBarSectionHeader-background, color-mix(in srgb, var(--vscode-editor-background) 90%, var(--vscode-foreground) 10%));
  border-bottom: 1px solid var(--vscode-widget-border);
  font-weight: 500;
  flex-shrink: 0;
}

.write-file-header :deep(.mdi),
.write-file-header :deep(.codicon) {
  flex-shrink: 0;
}

.write-file-header .file-path {
  flex: 1;
  color: var(--vscode-foreground);
  font-family: var(--vscode-editor-font-family);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.write-stats-badge {
  display: flex;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  margin-left: auto;
}

.write-stats-badge .stat-new {
  color: var(--vscode-gitDecoration-addedResourceForeground, #89d185);
}

.write-scroll-container {
  display: flex;
  max-height: 400px;
  background-color: var(--vscode-editor-background);
}

/* Left side line number column */
.write-line-numbers {
  width: 50px;
  flex-shrink: 0;
  overflow: hidden;
  background-color: color-mix(in srgb, var(--vscode-editor-background) 95%, transparent);
  border-right: 1px solid var(--vscode-panel-border);
}

.line-number-item {
  height: 22px;
  line-height: 22px;
  padding: 0 8px;
  text-align: right;
  font-family: var(--vscode-editor-font-family);
  font-size: 0.85em;
  color: var(--vscode-editorLineNumber-foreground);
  user-select: none;
}

/* Right side content column */
.write-content {
  flex: 1;
  overflow: auto;
  position: relative;
}

/* Monaco style scrollbar (only applied to content column) */
.write-content::-webkit-scrollbar {
  width: 14px;
  height: 14px;
}

.write-content::-webkit-scrollbar-track {
  background: transparent;
}

.write-content::-webkit-scrollbar-thumb {
  background-color: transparent;
  border-radius: 9px;
  border: 4px solid transparent;
  background-clip: content-box;
}

.write-content:hover::-webkit-scrollbar-thumb {
  background-color: color-mix(in srgb, var(--vscode-scrollbarSlider-background) 60%, transparent);
}

.write-content::-webkit-scrollbar-thumb:hover {
  background-color: var(--vscode-scrollbarSlider-hoverBackground);
}

.write-content::-webkit-scrollbar-thumb:active {
  background-color: var(--vscode-scrollbarSlider-activeBackground);
}

.write-content::-webkit-scrollbar-corner {
  background: transparent;
}

.content-text {
  background-color: var(--vscode-editor-background);
  color: var(--vscode-editor-foreground);
  font-family: var(--vscode-editor-font-family);
  font-size: 0.85em;
  line-height: 22px;
  margin: 0;
  padding: 0 8px 0 4px;
  white-space: pre;
  min-width: 100%;
  width: fit-content;
}
</style>
