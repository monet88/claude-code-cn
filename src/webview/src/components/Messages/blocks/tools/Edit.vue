<template>
  <ToolMessageWrapper
    tool-icon="codicon-edit"
    tool-name="Edit"
    :tool-result="toolResult"
    :default-expanded="shouldExpand"
    :class="{ 'has-diff-view': hasDiffView }"
  >
    <template #main>
      <span class="tool-label">Edit</span>
      <ToolFilePath v-if="filePath" :file-path="filePath" :context="context" />
      <span v-if="diffStats" class="diff-stats">
        <span v-if="diffStats.added > 0" class="stat-add">+{{ diffStats.added }}</span>
        <span v-if="diffStats.removed > 0" class="stat-remove">-{{ diffStats.removed }}</span>
      </span>
    </template>

    <!-- Expandable content: display diff view -->
    <template #expandable>
      <!-- Replace option -->
      <div v-if="replaceAll" class="replace-option">
        <span class="codicon codicon-replace-all"></span>
        <span>Replace All</span>
      </div>

      <!-- Diff view -->
      <div v-if="structuredPatch && structuredPatch.length > 0" class="diff-view">
        <!-- File header -->
        <div v-if="filePath" class="diff-file-header">
          <FileIcon :file-name="filePath" :size="16" class="file-icon" />
          <span class="file-path">{{ displayFilePath }}</span>
          <span v-if="diffStats" class="diff-stats-badge">
            <span v-if="diffStats.added > 0" class="stat-add">+{{ diffStats.added }}</span>
            <span v-if="diffStats.removed > 0" class="stat-remove">-{{ diffStats.removed }}</span>
            <span v-if="diffStats.modified > 0" class="stat-modify">~{{ diffStats.modified }}</span>
          </span>
        </div>
        <!-- Diff double column layout: line numbers + content -->
        <div class="diff-scroll-container">
          <!-- Left: line numbers column -->
          <div ref="lineNumbersRef" class="diff-line-numbers">
            <div v-for="(patch, index) in structuredPatch" :key="index">
              <div
                v-for="(line, lineIndex) in patch.lines"
                :key="lineIndex"
                class="line-number-item"
                :class="getDiffLineClass(line)"
              >
                {{ getLineNumber(patch, lineIndex) }}
              </div>
            </div>
          </div>

          <!-- Right: content column (scrollable) -->
          <div ref="contentRef" class="diff-content" @scroll="handleContentScroll">
            <div v-for="(patch, index) in structuredPatch" :key="index" class="diff-block">
              <div class="diff-lines">
                <div
                  v-for="(line, lineIndex) in patch.lines"
                  :key="lineIndex"
                  class="diff-line"
                  :class="getDiffLineClass(line)"
                >
                  <span class="line-prefix">{{ getLinePrefix(line) }}</span>
                  <span class="line-content">{{ getLineContent(line) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Error content -->
      <ToolError :tool-result="toolResult" />
    </template>
  </ToolMessageWrapper>
</template>

<script setup lang="ts">
import { computed, ref, watch, inject } from 'vue';
import path from 'path-browserify-esm';
import type { ComputedRef } from 'vue';
import type { ToolContext } from '@/types/tool';
import ToolMessageWrapper from './common/ToolMessageWrapper.vue';
import ToolError from './common/ToolError.vue';
import ToolFilePath from './common/ToolFilePath.vue';
import FileIcon from '@/components/FileIcon.vue';
import { recordFromEditResult } from '@/stores/fileChangeStore';

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

const filePath = computed(() => {
  return props.toolUse?.input?.file_path || '';
});

const fileName = computed(() => {
  if (!filePath.value) return '';
  return path.basename(filePath.value);
});

// Display relative file path (similar to ToolFilePath logic)
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
  
  // Fallback patterns
  const patterns = ['/src/', '/lib/', '/app/', '/packages/', '/components/', '/webview/'];
  for (const pattern of patterns) {
    const index = normalizedPath.toLowerCase().indexOf(pattern);
    if (index !== -1) {
      return normalizedPath.substring(index + 1);
    }
  }
  
  return fileName.value;
});

const replaceAll = computed(() => {
  return props.toolUse?.input?.replace_all;
});

// Use ref to store structuredPatch, update through watch
const structuredPatch = ref<any>(null);

// Listen to props changes, update structuredPatch
watch(
  () => [props.toolUseResult, props.toolUse, props.toolResult],
  () => {

    // If there is an error, do not display diff
    if (props.toolResult?.is_error) {
      structuredPatch.value = null;
      return;
    }

    // If there is a structuredPatch in toolUseResult, use it (the real diff after execution)
    if (props.toolUseResult?.structuredPatch) {
      structuredPatch.value = props.toolUseResult.structuredPatch;
      // Record file change for realtime stats
      if (filePath.value && props.toolUseResult.structuredPatch) {
        recordFromEditResult(filePath.value, props.toolUseResult.structuredPatch);
      }
    }
    // If there is an input, generate a temporary diff (for permission request stage or after real-time conversation execution)
    else if (props.toolUse?.input?.old_string && props.toolUse?.input?.new_string) {
      structuredPatch.value = generatePatchFromInput(
        props.toolUse.input.old_string,
        props.toolUse.input.new_string
      );
    }
  },
  { immediate: true, deep: true }
);

const hasDiffView = computed(() => {
  return structuredPatch.value && structuredPatch.value.length > 0;
});

// Determine if it is in the permission request stage (temporary diff from input).
const isPermissionRequest = computed(() => {
  const hasToolUseResult = !!props.toolUseResult?.structuredPatch;
  const hasInputDiff = !!(props.toolUse?.input?.old_string && props.toolUse?.input?.new_string);

  return !hasToolUseResult && hasInputDiff;
});

// Only expand in permission request stage, do not expand after execution
const shouldExpand = computed(() => {
  const result = hasDiffView.value && isPermissionRequest.value;
  return result;
});

// DOM reference
const lineNumbersRef = ref<HTMLElement>();
const contentRef = ref<HTMLElement>();

// Synchronize vertical scrolling of line numbers column and content column
function handleContentScroll() {
  if (lineNumbersRef.value && contentRef.value) {
    lineNumbersRef.value.scrollTop = contentRef.value.scrollTop;
  }
}

// Generate simple patch from old_string and new_string
function generatePatchFromInput(oldStr: string, newStr: string): any[] {
  const oldLines = oldStr.split('\n');
  const newLines = newStr.split('\n');

  const lines: string[] = [];

  // Add deleted lines
  oldLines.forEach(line => {
    lines.push('-' + line);
  });

  // Add new lines
  newLines.forEach(line => {
    lines.push('+' + line);
  });

  return [{
    oldStart: 1,
    oldLines: oldLines.length,
    newStart: 1,
    newLines: newLines.length,
    lines
  }];
}

// Calculate diff statistics
const diffStats = computed(() => {
  if (!structuredPatch.value) return null;

  let added = 0;
  let removed = 0;

  structuredPatch.value.forEach((patch: any) => {
    patch.lines.forEach((line: string) => {
      if (line.startsWith('+')) added++;
      if (line.startsWith('-')) removed++;
    });
  });

  // Calculate modified as minimum of added/removed (lines that were changed)
  const modified = Math.min(added, removed);

  return { added, removed, modified };
});

// Get diff line type class name
function getDiffLineClass(line: string): string {
  if (line.startsWith('-')) return 'diff-line-delete';
  if (line.startsWith('+')) return 'diff-line-add';
  return 'diff-line-context';
}

// Get line prefix
function getLinePrefix(line: string): string {
  if (line.startsWith('-') || line.startsWith('+')) {
    return line[0];
  }
  return ' ';
}

// Get line content (remove prefix)
function getLineContent(line: string): string {
  if (line.startsWith('-') || line.startsWith('+')) {
    return line.substring(1);
  }
  return line;
}

// Calculate line number (deleted lines show old line numbers, added lines show new line numbers)
function getLineNumber(patch: any, lineIndex: number): string {
  const currentLine = patch.lines[lineIndex];

  if (currentLine.startsWith('-')) {
    // Deleted line: show old line number
    let oldLine = patch.oldStart;
    for (let i = 0; i < lineIndex; i++) {
      const line = patch.lines[i];
      if (!line.startsWith('+')) {
        oldLine++;
      }
    }
    return String(oldLine);
  } else if (currentLine.startsWith('+')) {
    // Added line: show new line number
    let newLine = patch.newStart;
    for (let i = 0; i < lineIndex; i++) {
      const line = patch.lines[i];
      if (!line.startsWith('-')) {
        newLine++;
      }
    }
    return String(newLine);
  } else {
    // Context line: show new line number
    let newLine = patch.newStart;
    for (let i = 0; i < lineIndex; i++) {
      const line = patch.lines[i];
      if (!line.startsWith('-')) {
        newLine++;
      }
    }
    return String(newLine);
  }
}
</script>

<style scoped>
/* Remove left border and margin when there is a diff view, error keep default style */
.has-diff-view :deep(.expandable-content) {
  border-left: none;
  padding: 0;
  margin-left: 0;
}

.tool-label {
  font-weight: 500;
  color: var(--vscode-foreground);
  font-size: 0.9em;
}

.diff-stats {
  display: flex;
  gap: 4px;
  margin-left: 8px;
  font-size: 0.85em;
  font-weight: 500;
}

.stat-add {
  color: var(--vscode-gitDecoration-addedResourceForeground);
}

.stat-remove {
  color: var(--vscode-gitDecoration-deletedResourceForeground);
}

.replace-option {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--vscode-charts-orange);
  font-size: 0.85em;
  font-weight: 500;
  padding: 4px 0;
}

.replace-option .codicon {
  font-size: 12px;
}

.diff-view {
  display: flex;
  flex-direction: column;
  gap: 0;
  font-family: var(--vscode-editor-font-family);
  font-size: 0.85em;
  border: .5px solid var(--vscode-widget-border);
  border-bottom-left-radius: 4px;
  border-bottom-right-radius: 4px;
  overflow: hidden;
}

.diff-file-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background-color: var(--vscode-sideBarSectionHeader-background, color-mix(in srgb, var(--vscode-editor-background) 90%, var(--vscode-foreground) 10%));
  border-bottom: 1px solid var(--vscode-widget-border);
  font-weight: 500;
  flex-shrink: 0;
}

.diff-file-header :deep(.mdi),
.diff-file-header :deep(.codicon) {
  flex-shrink: 0;
}

.diff-file-header .file-path {
  flex: 1;
  color: var(--vscode-foreground);
  font-family: var(--vscode-editor-font-family);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.diff-stats-badge {
  display: flex;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  margin-left: auto;
}

.diff-stats-badge .stat-add {
  color: var(--vscode-gitDecoration-addedResourceForeground, #89d185);
}

.diff-stats-badge .stat-remove {
  color: var(--vscode-gitDecoration-deletedResourceForeground, #f48771);
}

.diff-stats-badge .stat-modify {
  color: var(--vscode-gitDecoration-modifiedResourceForeground, #e2c08d);
}

.diff-scroll-container {
  display: flex;
  max-height: 400px;
  background-color: var(--vscode-editor-background);
}

/* 左侧行号列 */
.diff-line-numbers {
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

/* 右侧内容列 */
.diff-content {
  flex: 1;
  overflow: auto;
  position: relative;
}

/* Monaco 风格滚动条(仅应用于内容列) */
.diff-content::-webkit-scrollbar {
  width: 14px;
  height: 14px;
}

.diff-content::-webkit-scrollbar-track {
  background: transparent;
}

.diff-content::-webkit-scrollbar-thumb {
  background-color: transparent;
  border-radius: 9px;
  border: 4px solid transparent;
  background-clip: content-box;
}

.diff-content:hover::-webkit-scrollbar-thumb {
  background-color: color-mix(in srgb, var(--vscode-scrollbarSlider-background) 60%, transparent);
}

.diff-content::-webkit-scrollbar-thumb:hover {
  background-color: var(--vscode-scrollbarSlider-hoverBackground);
}

.diff-content::-webkit-scrollbar-thumb:active {
  background-color: var(--vscode-scrollbarSlider-activeBackground);
}

.diff-content::-webkit-scrollbar-corner {
  background: transparent;
}

.diff-block {
  width: 100%;
}

.diff-lines {
  background-color: var(--vscode-editor-background);
  width: fit-content;
  min-width: 100%;
}

.diff-line {
  display: flex;
  font-family: var(--vscode-editor-font-family);
  white-space: nowrap;
  height: 22px;
  line-height: 22px;
}

.line-prefix {
  display: inline-block;
  width: 20px;
  text-align: center;
  padding: 0 4px;
  flex-shrink: 0;
  user-select: none;
}

.line-content {
  flex: 1;
  padding: 0 8px 0 4px;
  white-space: pre;
}

.diff-line-delete {
  background-color: var(--vscode-diffEditor-removedLineBackground, rgba(255, 0, 0, 0.2));
}

.diff-line-delete .line-prefix {
  color: var(--vscode-diffEditor-removedTextForeground, #f48771);
  background-color: var(--vscode-diffEditor-removedTextBackground, rgba(255, 0, 0, 0.3));
}

.diff-line-delete .line-content {
  color: inherit;
}

.diff-line-add {
  background-color: var(--vscode-diffEditor-insertedLineBackground, rgba(0, 255, 0, 0.2));
}

.diff-line-add .line-prefix {
  color: var(--vscode-diffEditor-insertedTextForeground, #89d185);
  background-color: var(--vscode-diffEditor-insertedTextBackground, rgba(0, 255, 0, 0.3));
}

.diff-line-add .line-content {
  color: inherit;
}

.diff-line-context {
  background-color: var(--vscode-editor-background);
}

.diff-line-context .line-prefix {
  color: color-mix(in srgb, var(--vscode-foreground) 40%, transparent);
}

.diff-line-context .line-content {
  color: var(--vscode-editor-foreground);
}
</style>
