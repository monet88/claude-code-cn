/**
 * File Change Store
 * 
 * Tracks file changes made during the current session in realtime.
 * Counts files modified, lines added, removed, and modified.
 */
import { ref, computed } from 'vue';

export interface FileChange {
  filePath: string;
  added: number;
  removed: number;
  modified: number;
  timestamp: number;
}

// Store state
const fileChanges = ref<Map<string, FileChange>>(new Map());

// Computed totals
export const totalStats = computed(() => {
  let filesChanged = 0;
  let totalAdded = 0;
  let totalRemoved = 0;
  let totalModified = 0;

  fileChanges.value.forEach(change => {
    filesChanged++;
    totalAdded += change.added;
    totalRemoved += change.removed;
    totalModified += change.modified;
  });

  return {
    filesChanged,
    added: totalAdded,
    removed: totalRemoved,
    modified: totalModified
  };
});

// Format stats for display
export const formattedStats = computed(() => {
  const stats = totalStats.value;
  
  // Format large numbers with k suffix
  const formatNumber = (n: number): string => {
    if (n >= 1000) {
      return `${(n / 1000).toFixed(1)}k`;
    }
    return String(n);
  };

  return {
    filesChanged: stats.filesChanged,
    added: formatNumber(stats.added),
    removed: formatNumber(stats.removed),
    modified: formatNumber(stats.modified)
  };
});

// Record a file change
export function recordFileChange(
  filePath: string,
  added: number,
  removed: number,
  modified: number = Math.min(added, removed)
) {
  const existing = fileChanges.value.get(filePath);
  
  if (existing) {
    // Accumulate changes for the same file
    existing.added += added;
    existing.removed += removed;
    existing.modified += modified;
    existing.timestamp = Date.now();
  } else {
    fileChanges.value.set(filePath, {
      filePath,
      added,
      removed,
      modified,
      timestamp: Date.now()
    });
  }
  
  // Trigger reactivity
  fileChanges.value = new Map(fileChanges.value);
}

// Record from edit tool result
export function recordFromEditResult(filePath: string, structuredPatch: any[]) {
  if (!structuredPatch || !Array.isArray(structuredPatch)) return;
  
  let added = 0;
  let removed = 0;
  
  structuredPatch.forEach(patch => {
    if (patch.lines && Array.isArray(patch.lines)) {
      patch.lines.forEach((line: string) => {
        if (line.startsWith('+')) added++;
        if (line.startsWith('-')) removed++;
      });
    }
  });
  
  const modified = Math.min(added, removed);
  recordFileChange(filePath, added, removed, modified);
}

// Record from write tool (new file)
export function recordFromWriteResult(filePath: string, lineCount: number) {
  recordFileChange(filePath, lineCount, 0, 0);
}

// Reset all changes (e.g., when starting a new session)
export function resetFileChanges() {
  fileChanges.value.clear();
  fileChanges.value = new Map();
}

// Get changes for a specific file
export function getFileChange(filePath: string): FileChange | undefined {
  return fileChanges.value.get(filePath);
}

// Composable for components
export function useFileChangeStore() {
  return {
    fileChanges,
    totalStats,
    formattedStats,
    recordFileChange,
    recordFromEditResult,
    recordFromWriteResult,
    resetFileChanges,
    getFileChange
  };
}
