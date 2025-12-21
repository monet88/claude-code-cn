<template>
  <div class="output-style-panel">
    <!-- Toolbar -->
    <div class="toolbar">
      <div class="filter-tabs">
        <div
          :class="['tab-item', { active: currentFilter === 'all' }]"
          @click="currentFilter = 'all'"
        >
          All <span class="count-badge">{{ outputStyleStore.totalCount }}</span>
        </div>
        <div
          :class="['tab-item', { active: currentFilter === 'global' }]"
          @click="currentFilter = 'global'"
        >
          Global <span class="count-badge">{{ outputStyleStore.globalCount }}</span>
        </div>
        <div
          :class="['tab-item', { active: currentFilter === 'local' }]"
          @click="currentFilter = 'local'"
        >
          Local <span class="count-badge">{{ outputStyleStore.localCount }}</span>
        </div>
      </div>

      <div class="toolbar-right">
        <div class="search-box">
          <span class="codicon codicon-search"></span>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search Styles..."
            class="search-input"
          />
        </div>

        <div class="add-dropdown" ref="dropdownRef">
          <button class="action-btn primary" @click="toggleDropdown" title="Import Output Style">
            <span class="codicon codicon-add"></span>
          </button>
          <div v-if="showDropdown" class="dropdown-menu">
            <div class="dropdown-item" @click="handleImport('global')">
              <span class="codicon codicon-globe"></span>
              Import to Global
            </div>
            <div class="dropdown-item" @click="handleImport('local')">
              <span class="codicon codicon-desktop-download"></span>
              Import to Local
            </div>
          </div>
        </div>

        <button class="action-btn" @click="handleRefresh" :disabled="outputStyleStore.loading" title="Refresh">
          <span :class="['codicon', 'codicon-refresh', { 'spinning': outputStyleStore.loading }]"></span>
        </button>
      </div>
    </div>

    <!-- Output Style List -->
    <div class="style-list">
      <div
        v-for="style in filteredStyles"
        :key="style.id"
        :class="['style-card', { expanded: expandedStyles.has(style.id) }]"
      >
        <div class="card-header" @click="toggleExpand(style.id)">
          <div class="style-icon-wrapper" :style="{ color: getIconColor(style.id) }">
            <span class="codicon codicon-output"></span>
          </div>

          <div class="style-info">
            <div class="style-header-row">
              <span class="style-name">{{ style.name }}</span>
              <span :class="['scope-badge', style.scope]">
                <span :class="['codicon', style.scope === 'global' ? 'codicon-globe' : 'codicon-desktop-download']"></span>
                {{ style.scope === 'global' ? 'Global' : 'Local' }}
              </span>
            </div>
            <div class="style-path" :title="style.path">{{ style.path }}</div>
          </div>

          <div class="expand-indicator">
            <span :class="['codicon', expandedStyles.has(style.id) ? 'codicon-chevron-down' : 'codicon-chevron-right']"></span>
          </div>
        </div>

        <div v-if="expandedStyles.has(style.id)" class="card-content">
          <div class="info-section">
            <div class="description-container" v-if="style.description">
              <div class="description-label">Description:</div>
              <div class="description-content">{{ style.description }}</div>
            </div>
            <div v-else class="description-placeholder">
              No description
            </div>
          </div>

          <div class="actions-section">
            <button class="action-btn edit-btn" @click.stop="handleOpen(style)">
              <span class="codicon codicon-edit"></span> Edit
            </button>
            <button class="action-btn delete-btn" @click.stop="handleDelete(style)">
              <span class="codicon codicon-trash"></span> Delete
            </button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="filteredStyles.length === 0 && !outputStyleStore.loading" class="empty-state">
        <p>No matching Output Styles found</p>
      </div>

      <!-- Loading State -->
      <div v-if="outputStyleStore.loading && filteredStyles.length === 0" class="loading-state">
        <span class="codicon codicon-loading codicon-modifier-spin"></span>
        <p>Loading...</p>
      </div>
    </div>

    <!-- Confirm Dialog -->
    <MessageDialog
      v-model:visible="confirmDialog.visible"
      :type="confirmDialog.type"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      :confirm-text="confirmDialog.confirmText"
      :cancel-text="confirmDialog.cancelText"
      @confirm="confirmDialog.onConfirm"
      @cancel="confirmDialog.onCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, reactive, computed } from 'vue';
import { useOutputStyleStore } from '../stores/outputStyleStore';
import { useToastStore } from '../stores/toastStore';
import type { OutputStyle, OutputStyleScope } from '../types/outputStyle';
import MessageDialog from './MessageDialog.vue';

const outputStyleStore = useOutputStyleStore();
const toastStore = useToastStore();

const showDropdown = ref(false);
const expandedStyles = ref<Set<string>>(new Set());
const dropdownRef = ref<HTMLElement | null>(null);
const currentFilter = ref<'all' | 'global' | 'local'>('all');
const searchQuery = ref('');

const filteredStyles = computed(() => {
  let styles: OutputStyle[] = [];
  if (currentFilter.value === 'all') {
    styles = [...outputStyleStore.globalOutputStyleList, ...outputStyleStore.localOutputStyleList];
  } else if (currentFilter.value === 'global') {
    styles = [...outputStyleStore.globalOutputStyleList];
  } else {
    styles = [...outputStyleStore.localOutputStyleList];
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    styles = styles.filter(s =>
      s.name.toLowerCase().includes(query) ||
      s.path.toLowerCase().includes(query) ||
      (s.description && s.description.toLowerCase().includes(query))
    );
  }

  return styles;
});

const confirmDialog = reactive({
  visible: false,
  type: 'confirm' as 'confirm' | 'alert',
  title: 'Confirm',
  message: '',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  onConfirm: () => {},
  onCancel: () => {}
});

const iconColors = [
  '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B',
  '#EF4444', '#EC4899', '#06B6D4', '#6366F1',
];

function getIconColor(styleId: string): string {
  let hash = 0;
  for (let i = 0; i < styleId.length; i++) {
    hash = styleId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return iconColors[Math.abs(hash) % iconColors.length];
}

function toggleExpand(styleId: string) {
  if (expandedStyles.value.has(styleId)) {
    expandedStyles.value.delete(styleId);
  } else {
    expandedStyles.value.clear();
    expandedStyles.value.add(styleId);
  }
  expandedStyles.value = new Set(expandedStyles.value);
}

function toggleDropdown() {
  showDropdown.value = !showDropdown.value;
}

function handleClickOutside(event: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    showDropdown.value = false;
  }
}

async function handleRefresh() {
  await outputStyleStore.loadOutputStyles();
  toastStore.success('Output Styles list refreshed');
}

async function handleImport(scope: OutputStyleScope) {
  showDropdown.value = false;
  const result = await outputStyleStore.importOutputStyle(scope);

  if (result.success) {
    const scopeName = scope === 'global' ? 'Global' : 'Local';
    const count = result.count || 0;
    const total = result.total || 0;

    if (result.errors && result.errors.length > 0) {
      const errorMsg = result.errors.map((e: any) => `• ${e.path}: ${e.error}`).join('\n');
      await showAlert(
        'Partial import failed',
        `Successfully imported ${count}/${total} to ${scopeName} Output Styles\n\nFailed:\n${errorMsg}`
      );
    } else {
      if (count === 1) {
        toastStore.success(`Successfully imported 1 to ${scopeName} Output Styles`);
      } else {
        toastStore.success(`Successfully imported ${count} to ${scopeName} Output Styles`);
      }
    }
  } else {
    await showAlert('Import failed', result.error || 'Failed to import Output Style');
  }
}

async function handleOpen(style: OutputStyle) {
  const result = await outputStyleStore.openOutputStyle(style.path);
  if (!result.success) {
    await showAlert('Open failed', result.error || 'Failed to open Output Style in editor');
  }
}

async function handleDelete(style: OutputStyle) {
  const scopeName = style.scope === 'global' ? 'Global' : 'Local';
  const confirmed = await showConfirm(
    'Delete Output Style',
    `Are you sure you want to delete ${scopeName} Output Style "${style.name}"?\n\nThis action cannot be undone.`
  );

  if (confirmed) {
    const result = await outputStyleStore.deleteOutputStyle(style.id, style.scope);
    if (result.success) {
      expandedStyles.value.delete(style.id);
      toastStore.success(`Successfully deleted ${scopeName} Output Style "${style.name}"`);
    } else {
      await showAlert('Delete failed', result.error || 'Failed to delete Output Style');
    }
  }
}

function showConfirm(title: string, message: string): Promise<boolean> {
  return new Promise((resolve) => {
    confirmDialog.type = 'confirm';
    confirmDialog.title = title;
    confirmDialog.message = message;
    confirmDialog.confirmText = 'Confirm';
    confirmDialog.cancelText = 'Cancel';
    confirmDialog.onConfirm = () => {
      confirmDialog.visible = false;
      resolve(true);
    };
    confirmDialog.onCancel = () => {
      confirmDialog.visible = false;
      resolve(false);
    };
    confirmDialog.visible = true;
  });
}

function showAlert(title: string, message: string): Promise<void> {
  return new Promise((resolve) => {
    confirmDialog.type = 'alert';
    confirmDialog.title = title;
    confirmDialog.message = message;
    confirmDialog.confirmText = 'OK';
    confirmDialog.onConfirm = () => {
      confirmDialog.visible = false;
      resolve();
    };
    confirmDialog.visible = true;
  });
}

onMounted(async () => {
  await outputStyleStore.initialize();
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.output-style-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--vscode-panel-border);
}

.filter-tabs {
  display: flex;
  background: var(--vscode-input-background);
  padding: 3px;
  border-radius: 6px;
  gap: 4px;
}

.tab-item {
  padding: 3px 10px;
  font-size: 12px;
  cursor: pointer;
  border-radius: 4px;
  color: var(--vscode-descriptionForeground);
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}

.tab-item:hover {
  background: var(--vscode-list-hoverBackground);
  color: var(--vscode-foreground);
}

.tab-item.active {
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
}

.count-badge {
  background: rgba(255, 255, 255, 0.2);
  padding: 0 6px;
  border-radius: 10px;
  font-size: 10px;
}

.tab-item:not(.active) .count-badge {
  background: var(--vscode-badge-background);
  color: var(--vscode-badge-foreground);
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-box .codicon-search {
  position: absolute;
  left: 8px;
  color: var(--vscode-descriptionForeground);
  pointer-events: none;
  font-size: 14px;
}

.search-input {
  padding: 4px 8px 4px 26px;
  background: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border: 1px solid var(--vscode-input-border);
  border-radius: 4px;
  outline: none;
  width: 180px;
  font-size: 12px;
  height: 24px;
}

.search-input:focus {
  border-color: var(--vscode-focusBorder);
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1px solid var(--vscode-panel-border);
  border-radius: 4px;
  background: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
  cursor: pointer;
}

.action-btn.primary {
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border-color: transparent;
}

.action-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spinning {
  animation: spin 1s linear infinite;
}

.style-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.style-card {
  background: var(--vscode-sideBar-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 6px;
  overflow: hidden;
  transition: all 0.2s;
}

.style-card:hover {
  border-color: var(--vscode-focusBorder);
  background-color: var(--vscode-list-hoverBackground);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.card-header {
  display: flex;
  align-items: center;
  padding: 10px;
  cursor: pointer;
  gap: 12px;
}

.style-icon-wrapper {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(128, 128, 128, 0.1);
  border-radius: 6px;
  flex-shrink: 0;
}

.style-icon-wrapper .codicon {
  font-size: 18px;
}

.style-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}

.style-header-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.style-name {
  font-weight: 600;
  font-size: 13px;
  color: var(--vscode-foreground);
}

.scope-badge {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 500;
}

.scope-badge.global {
  background: rgba(59, 130, 246, 0.1);
  color: #3B82F6;
}

.scope-badge.local {
  background: rgba(16, 185, 129, 0.1);
  color: #10B981;
}

.style-path {
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.expand-indicator {
  color: var(--vscode-descriptionForeground);
  font-size: 14px;
}

.card-content {
  padding: 0 10px 10px 54px;
  animation: slideDown 0.2s ease-out;
}

.info-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 12px;
  font-size: 12px;
}

.description-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.description-label {
  color: var(--vscode-descriptionForeground);
  font-weight: 500;
  font-size: 12px;
}

.description-content {
  color: var(--vscode-foreground);
  font-size: 12px;
  line-height: 1.6;
  word-wrap: break-word;
  word-break: break-word;
  white-space: pre-wrap;
  max-height: 150px;
  overflow-y: auto;
  padding: 8px;
  background: var(--vscode-input-background);
  border: 1px solid var(--vscode-input-border);
  border-radius: 4px;
}

.description-placeholder {
  color: var(--vscode-descriptionForeground);
  font-size: 12px;
  font-style: italic;
  padding: 8px;
  text-align: center;
}

.actions-section {
  display: flex;
  gap: 8px;
}

.action-btn.edit-btn,
.action-btn.delete-btn {
  width: auto;
  padding: 0 10px;
  height: 24px;
  font-size: 11px;
  gap: 4px;
}

.action-btn.delete-btn {
  color: var(--vscode-errorForeground);
  border-color: rgba(244, 67, 54, 0.2);
  background: rgba(244, 67, 54, 0.05);
}

.action-btn.delete-btn:hover {
  background: rgba(244, 67, 54, 0.1);
}

.add-dropdown {
  position: relative;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  min-width: 150px;
  background: var(--vscode-dropdown-background);
  border: 1px solid var(--vscode-dropdown-border);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  z-index: 100;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 12px;
  color: var(--vscode-dropdown-foreground);
}

.dropdown-item:hover {
  background: var(--vscode-list-hoverBackground);
}

.empty-state, .loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px;
  color: var(--vscode-descriptionForeground);
  gap: 10px;
  font-size: 13px;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 500px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    padding-bottom: 12px;
  }

  .filter-tabs {
    width: 100%;
  }

  .tab-item {
    flex: 1;
    justify-content: center;
  }

  .toolbar-right {
    width: 100%;
  }

  .search-box {
    flex: 1;
  }

  .search-input {
    width: 100%;
  }

  .card-content {
    padding-left: 10px;
  }
}
</style>
