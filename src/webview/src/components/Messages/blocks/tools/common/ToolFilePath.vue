<template>
  <button
    class="tool-filepath"
    role="button"
    tabindex="0"
    @click="handleClick"
    :title="fullPath"
  >
    <FileIcon :file-name="fileName" :size="14" class="file-icon" />
    <span class="filepath-name">{{ displayPath }}</span>
  </button>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue';
import type { ToolContext } from '@/types/tool';
import FileIcon from '@/components/FileIcon.vue';

interface Props {
  filePath: string;
  context?: ToolContext;
  startLine?: number;
  endLine?: number;
}

const props = defineProps<Props>();

// Try to get workspace root from runtime or context (injected as ComputedRef)
import type { ComputedRef } from 'vue';
const workspaceRootRef = inject<ComputedRef<string> | string>('workspaceRoot', '');

// Unwrap: could be a ComputedRef or plain string
const workspaceRoot = computed(() => {
  if (typeof workspaceRootRef === 'string') return workspaceRootRef;
  return workspaceRootRef?.value || '';
});

const fileName = computed(() => {
  if (!props.filePath) return '';
  // Simple path parsing (cross-platform)
  return props.filePath.split('/').pop() || props.filePath.split('\\').pop() || props.filePath;
});

const fullPath = computed(() => {
  return props.filePath;
});

// Display relative path if possible
const displayPath = computed(() => {
  if (!props.filePath) return '';
  
  // Normalize path separators
  const normalizedPath = props.filePath.replace(/\\/g, '/');
  const normalizedRoot = (workspaceRoot.value || '').replace(/\\/g, '/');
  
  // If workspace root is available and path starts with it, show relative
  if (normalizedRoot && normalizedPath.toLowerCase().startsWith(normalizedRoot.toLowerCase())) {
    let relativePath = normalizedPath.substring(normalizedRoot.length);
    // Remove leading slash
    if (relativePath.startsWith('/')) {
      relativePath = relativePath.substring(1);
    }
    return relativePath || fileName.value;
  }
  
  // Fallback: try to extract relative path from common patterns
  // Look for src/, lib/, app/, packages/, etc.
  const patterns = ['/src/', '/lib/', '/app/', '/packages/', '/components/', '/webview/'];
  for (const pattern of patterns) {
    const index = normalizedPath.toLowerCase().indexOf(pattern);
    if (index !== -1) {
      return normalizedPath.substring(index + 1); // Include the folder name
    }
  }
  
  // Last fallback: just show the file name
  return fileName.value;
});

function handleClick(event: MouseEvent) {
  event.stopPropagation();
  event.preventDefault();

  if (!props.context?.fileOpener) {
    console.warn('[ToolFilePath] No fileOpener available');
    return;
  }

  // Open file and jump to specified line
  props.context.fileOpener.open(props.filePath, {
    startLine: props.startLine,
    endLine: props.endLine,
  });
}
</script>

<style scoped>
.tool-filepath {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  padding: 0px 4px;
  border-radius: var(--theme-radius-sm, 4px);
  cursor: pointer;
  font-family: var(--vscode-editor-font-family);
  font-size: 0.9em;
  color: var(--vscode-foreground);
  transition: background-color 0.2s;
}

.tool-filepath:hover {
  background-color: color-mix(
    in srgb,
    var(--vscode-list-hoverBackground) 50%,
    transparent
  );
}

.file-icon {
  flex-shrink: 0;
  opacity: 0.9;
}

.filepath-name {
  font-weight: 500;
  color: var(--vscode-textLink-foreground);
}
</style>
