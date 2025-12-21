<template>
  <div class="dialog-overlay" @click.self="$emit('close')">
    <div class="dialog">
      <div class="dialog-header">
        <h3>Choose a Preset Server</h3>
        <button class="close-btn" @click="$emit('close')">
          <span class="codicon codicon-close"></span>
        </button>
      </div>

      <div class="dialog-body">
        <p class="dialog-desc">
          Select a preset MCP server to add quickly. These are officially recommended utilities.
        </p>

        <div class="preset-list">
          <div
            v-for="preset in presets"
            :key="preset.id"
            class="preset-item"
            @click="handleSelect(preset)"
          >
            <div class="preset-icon" :style="{ background: getIconColor(preset.id) }">
              {{ preset.name.charAt(0).toUpperCase() }}
            </div>
            <div class="preset-info">
              <h4 class="preset-name">{{ preset.name }}</h4>
              <p v-if="preset.description" class="preset-desc">{{ preset.description }}</p>
              <div class="preset-meta">
                <span class="type-badge" :class="getServerType(preset)">
                  {{ getServerTypeLabel(preset) }}
                </span>
                <span v-if="preset.tags" class="preset-tags">
                  <span v-for="tag in preset.tags.slice(0, 3)" :key="tag" class="tag">{{ tag }}</span>
                </span>
              </div>
            </div>
            <span class="add-icon codicon codicon-add"></span>
          </div>
        </div>
      </div>

      <div class="dialog-footer">
        <div class="footer-hint">
          <span class="codicon codicon-info"></span>
          Click a preset to add it
        </div>
        <button class="btn btn-secondary" @click="$emit('close')">Cancel</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useMcpStore, MCP_PRESETS } from '../stores/mcpStore';
import type { McpPreset } from '../types/mcp';

const emit = defineEmits<{
  close: [];
  select: [preset: McpPreset];
}>();

const mcpStore = useMcpStore();

// Get preset list
const presets = computed(() => MCP_PRESETS);

// Server icon colors
const iconColors = [
  '#3B82F6', // blue
  '#10B981', // green
  '#8B5CF6', // purple
  '#F59E0B', // amber
  '#EF4444', // red
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#6366F1', // indigo
];

function getIconColor(presetId: string): string {
  let hash = 0;
  for (let i = 0; i < presetId.length; i++) {
    hash = presetId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return iconColors[Math.abs(hash) % iconColors.length];
}

// Determine server type
function getServerType(preset: McpPreset): string {
  return preset.server.type || 'stdio';
}

// Get server type label
function getServerTypeLabel(preset: McpPreset): string {
  const type = getServerType(preset);
  const labels: Record<string, string> = {
    stdio: 'STDIO',
    http: 'HTTP',
    sse: 'SSE',
  };
  return labels[type] || type.toUpperCase();
}

// Select preset
function handleSelect(preset: McpPreset) {
  emit('select', preset);
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: var(--vscode-editor-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--vscode-panel-border);
}

.dialog-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--vscode-foreground);
  cursor: pointer;
}

.close-btn:hover {
  background: var(--vscode-toolbar-hoverBackground);
}

.dialog-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.dialog-desc {
  margin: 0 0 16px 0;
  font-size: 13px;
  color: var(--vscode-descriptionForeground);
  line-height: 1.5;
}

.preset-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preset-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--vscode-panel-border);
  border-radius: 8px;
  background: var(--vscode-sideBar-background);
  cursor: pointer;
  transition: all 0.15s ease;
}

.preset-item:hover {
  background: var(--vscode-list-hoverBackground);
  border-color: var(--vscode-focusBorder);
}

.preset-item:hover .add-icon {
  opacity: 1;
}

.preset-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
  flex-shrink: 0;
}

.preset-info {
  flex: 1;
  min-width: 0;
}

.preset-name {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--vscode-foreground);
}

.preset-desc {
  margin: 0 0 8px 0;
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
  line-height: 1.4;
}

.preset-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.type-badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
  text-transform: uppercase;
}

.type-badge.stdio {
  background: #3b82f6;
  color: #ffffff;
}

.type-badge.http {
  background: #22c55e;
  color: #ffffff;
}

.type-badge.sse {
  background: #a855f7;
  color: #ffffff;
}

.preset-tags {
  display: flex;
  gap: 4px;
}

.tag {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--vscode-badge-background);
  color: var(--vscode-badge-foreground);
}

.add-icon {
  font-size: 18px;
  color: var(--vscode-descriptionForeground);
  opacity: 0;
  transition: opacity 0.15s ease;
  flex-shrink: 0;
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-top: 1px solid var(--vscode-panel-border);
}

.footer-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
}

.btn-secondary {
  background: transparent;
  color: var(--vscode-foreground);
  border: 1px solid var(--vscode-button-border, var(--vscode-panel-border));
}

.btn-secondary:hover {
  background: var(--vscode-list-hoverBackground);
}

/* Responsive tweaks */
@media (max-width: 480px) {
  .dialog {
    width: 95%;
    max-height: 90vh;
  }

  .preset-item {
    padding: 10px 12px;
  }

  .preset-icon {
    width: 36px;
    height: 36px;
    font-size: 14px;
  }

  .preset-name {
    font-size: 13px;
  }

  .preset-desc {
    font-size: 11px;
  }

  .dialog-footer {
    flex-direction: column;
    gap: 12px;
  }

  .btn-secondary {
    width: 100%;
    text-align: center;
  }
}
</style>
