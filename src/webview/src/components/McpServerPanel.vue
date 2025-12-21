<template>
  <div class="mcp-panel">
    <!-- Header -->
    <div class="panel-header">
      <div class="header-left">
        <span class="header-title">MCP</span>
        <button class="help-btn" @click="showHelp" title="What is MCP?">
          <span class="codicon codicon-question"></span>
        </button>
      </div>
      <div class="header-right">
        <button class="refresh-btn" @click="handleRefresh" :disabled="mcpStore.loading" title="Refresh server status">
          <span :class="['codicon', 'codicon-refresh', { 'spinning': mcpStore.loading }]"></span>
        </button>
        <div class="add-dropdown" ref="dropdownRef">
          <button class="add-btn" @click="toggleDropdown">
            <span class="codicon codicon-add"></span>
            Add
            <span class="codicon codicon-chevron-down"></span>
          </button>
          <div v-if="showDropdown" class="dropdown-menu">
             <div class="dropdown-item" @click="handleAddManual">
              <span class="codicon codicon-json"></span>
               Manual configuration
            </div>
             <div class="dropdown-item" @click="handleAddFromMarket">
              <span class="codicon codicon-extensions"></span>
               Add from MCP Market
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Server list -->
    <div class="server-list" v-if="!mcpStore.loading || mcpStore.serverList.length > 0">
      <div
        v-for="server in mcpStore.serverList"
        :key="server.id"
        :class="['server-card', { expanded: expandedServers.has(server.id), disabled: !isServerEnabled(server) }]"
      >
        <!-- Card header - always visible -->
        <div class="card-header" @click="toggleExpand(server.id)">
          <div class="header-left-section">
            <span :class="['expand-icon', 'codicon', expandedServers.has(server.id) ? 'codicon-chevron-down' : 'codicon-chevron-right']"></span>
            <div class="server-icon" :style="{ background: getIconColor(server.id) }">
              {{ getServerInitial(server) }}
            </div>
            <span class="server-name">{{ server.name || server.id }}</span>
            <span
              v-if="serverStatus[server.id]"
              :class="['status-indicator', serverStatus[server.id]]"
              :title="getStatusTitle(server.id)"
            >
              <span v-if="serverStatus[server.id] === 'connected'" class="codicon codicon-check"></span>
              <span v-else-if="serverStatus[server.id] === 'checking'" class="codicon codicon-loading codicon-modifier-spin"></span>
              <span v-else-if="serverStatus[server.id] === 'error'" class="codicon codicon-error"></span>
            </span>
          </div>
          <div class="header-right-section" @click.stop>
            <label class="toggle-switch">
              <input
                type="checkbox"
                :checked="isServerEnabled(server)"
                @change="handleToggleServer(server, $event)"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- Expanded content -->
        <div v-if="expandedServers.has(server.id)" class="card-content">
          <!-- Server information -->
          <div class="info-section">
            <div class="info-row" v-if="server.description">
              <span class="info-label">Description:</span>
              <span class="info-value">{{ server.description }}</span>
            </div>
            <div class="info-row" v-if="server.server.command">
              <span class="info-label">Command:</span>
              <code class="info-value command">{{ server.server.command }} {{ (server.server.args || []).join(' ') }}</code>
            </div>
            <!-- <div class="info-row" v-else-if="server.server.url">
              <span class="info-label">URL:</span>
              <code class="info-value url">{{ server.server.url }}</code>
            </div> -->
          </div>

          <!-- Tags -->
          <div class="tags-section" v-if="server.tags && server.tags.length">
            <span v-for="tag in server.tags" :key="tag" class="tag">{{ tag }}</span>
          </div>

          <!-- Action buttons -->
          <div class="actions-section">
            <button
              class="action-btn check-btn"
              @click="handleCheckStatus(server)"
              :disabled="checkingStatus[server.id]"
               title="Check connection status"
            >
              <span :class="['codicon', checkingStatus[server.id] ? 'codicon-loading codicon-modifier-spin' : 'codicon-plug']"></span>
               {{ checkingStatus[server.id] ? 'Checking...' : 'Check connection' }}
            </button>
            <button
              v-if="server.homepage"
              class="action-btn"
              @click="openUrl(server.homepage!)"
               title="Visit homepage"
            >
              <span class="codicon codicon-home"></span>
               Homepage
            </button>
            <button
              v-if="server.docs"
              class="action-btn"
              @click="openUrl(server.docs!)"
               title="View documentation"
            >
              <span class="codicon codicon-book"></span>
               Docs
            </button>
            <button
              class="action-btn edit-btn"
              @click="handleEdit(server)"
               title="Edit configuration"
            >
              <span class="codicon codicon-edit"></span>
               Edit
            </button>
            <button
              class="action-btn delete-btn"
              @click="handleDelete(server)"
               title="Remove server"
            >
              <span class="codicon codicon-trash"></span>
               Delete
            </button>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="mcpStore.serverCount === 0 && !mcpStore.loading" class="empty-state">
        <span class="codicon codicon-server"></span>
         <p>No MCP servers yet</p>
         <p class="hint">Click the "Add" button to create a server</p>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="mcpStore.loading && mcpStore.serverList.length === 0" class="loading-state">
      <span class="codicon codicon-loading codicon-modifier-spin"></span>
       <p>Loading...</p>
    </div>

    <!-- Add/Edit dialog -->
    <McpServerDialog
      v-if="showAddDialog || editingServer"
      :server="editingServer"
      :existing-ids="existingIds"
      @close="handleCloseDialog"
      @save="handleSave"
    />

    <!-- Preset selection dialog -->
    <McpPresetDialog
      v-if="showPresetDialog"
      @close="showPresetDialog = false"
      @select="handleSelectPreset"
    />

    <!-- Confirmation dialog -->
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
import { ref, computed, onMounted, onUnmounted, reactive, inject } from 'vue';
import { useMcpStore } from '../stores/mcpStore';
import { useToastStore } from '../stores/toastStore';
import { RuntimeKey } from '../composables/runtimeContext';
import type { McpServer, McpPreset } from '../types/mcp';
import McpServerDialog from './McpServerDialog.vue';
import McpPresetDialog from './McpPresetDialog.vue';
import MessageDialog from './MessageDialog.vue';

const mcpStore = useMcpStore();
const toastStore = useToastStore();
const runtime = inject(RuntimeKey);

// State
const showAddDialog = ref(false);
const showPresetDialog = ref(false);
const showDropdown = ref(false);
const editingServer = ref<McpServer | null>(null);
const expandedServers = ref<Set<string>>(new Set());
const serverStatus = ref<Record<string, 'connected' | 'checking' | 'error' | null>>({});
const checkingStatus = ref<Record<string, boolean>>({});
const dropdownRef = ref<HTMLElement | null>(null);

// Confirm dialog state
const confirmDialog = reactive({
  visible: false,
  type: 'confirm' as 'confirm' | 'alert',
  title: 'Notice',
  message: '',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  onConfirm: () => {},
  onCancel: () => {}
});

// Compute existing ID list
const existingIds = computed(() => Object.keys(mcpStore.servers));

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

function getIconColor(serverId: string): string {
  let hash = 0;
  for (let i = 0; i < serverId.length; i++) {
    hash = serverId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return iconColors[Math.abs(hash) % iconColors.length];
}

function getServerInitial(server: McpServer): string {
  const name = server.name || server.id;
  return name.charAt(0).toUpperCase();
}

// Determine server type
function getServerType(server: McpServer): string {
  return server.server.type || 'stdio';
}

// Get server type label
function getServerTypeLabel(server: McpServer): string {
  const type = getServerType(server);
  const labels: Record<string, string> = {
    stdio: 'STDIO',
    http: 'HTTP',
    sse: 'SSE',
  };
  return labels[type] || type.toUpperCase();
}

// Check if the server is enabled
function isServerEnabled(server: McpServer): boolean {
  // Prefer the enabled field, falling back to apps.claude
  if (server.enabled !== undefined) {
    return server.enabled;
  }
  return server.apps?.claude !== false;
}

/**
 * Restart the current session to apply MCP configuration changes
 * @param message Notification message
 * @param type Notification type: 'success' for enable/add, 'error' for disable/remove
 */
async function restartSessionForMcp(message: string, type: 'success' | 'error' = 'success') {
  const activeSession = runtime?.sessionStore.activeSession();
  if (activeSession) {
    try {
      await activeSession.restartClaude();
      if (type === 'error') {
        toastStore.error(message);
      } else {
        toastStore.success(message);
      }
      console.log('[McpServerPanel] Session restarted; MCP configuration applied');
    } catch (error) {
      console.warn('[McpServerPanel] Failed to restart session:', error);
      toastStore.warning('MCP configuration saved but session restart failed; please restart manually.');
    }
  } else {
    if (type === 'error') {
      toastStore.error(message);
    } else {
      toastStore.success(message);
    }
  }
}

// Get status tooltip
function getStatusTitle(serverId: string): string {
  const status = serverStatus.value[serverId];
  switch (status) {
    case 'connected':
      return 'Connected';
    case 'checking':
      return 'Checking...';
    case 'error':
      return 'Connection failed';
    default:
      return '';
  }
}

// Toggle expansion state
function toggleExpand(serverId: string) {
  if (expandedServers.value.has(serverId)) {
    expandedServers.value.delete(serverId);
  } else {
    expandedServers.value.add(serverId);
  }
  expandedServers.value = new Set(expandedServers.value);
}

// Toggle dropdown
function toggleDropdown() {
  showDropdown.value = !showDropdown.value;
}

// Close dropdown when clicking outside
function handleClickOutside(event: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    showDropdown.value = false;
  }
}

// Show help
function showHelp() {
  showAlert(
    'What is MCP?',
    'MCP (Model Context Protocol) is a framework that enables AI models to reach external tools and data. Configure MCP servers to give Claude capabilities such as file system access, running code, and querying databases.\n\nLearn more: https://modelcontextprotocol.io'
  );
}

// Refresh
async function handleRefresh() {
  await mcpStore.loadServers();
  // Recheck all server statuses
  for (const server of mcpStore.serverList) {
    if (isServerEnabled(server)) {
      handleCheckStatus(server, true);
    }
  }
}

// Manual add
function handleAddManual() {
  showDropdown.value = false;
  showAddDialog.value = true;
}

// Add from MCP Market
function handleAddFromMarket() {
  showDropdown.value = false;
  showAlert('Notice', 'The MCP Market feature is under development. Stay tuned.');
}

// Add from presets
function handleAddPreset() {
  showDropdown.value = false;
  showPresetDialog.value = true;
}

// Choose preset
async function handleSelectPreset(preset: McpPreset) {
  showPresetDialog.value = false;
  const server = mcpStore.createFromPreset(preset);
  // If the ID already exists, generate a unique ID
  if (mcpStore.isIdExists(server.id)) {
    server.id = mcpStore.generateUniqueId(server.id);
  }
  const result = await mcpStore.upsertServer(server);
  if (!result.success) {
    await showAlert('Error', result.error || 'Failed to add server');
  } else {
    // Auto-detect the server
    handleCheckStatus(server, true);
    // Restart session to apply MCP configuration
    const serverName = server.name || server.id;
    await restartSessionForMcp(`MCP server "${serverName}" added successfully`);
  }
}

// Open URL
function openUrl(url: string) {
  window.open(url, '_blank');
}

// Show confirmation dialog
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

// Show alert dialog
function showAlert(title: string, message: string): Promise<void> {
  return new Promise((resolve) => {
    confirmDialog.type = 'alert';
    confirmDialog.title = title;
    confirmDialog.message = message;
    confirmDialog.confirmText = 'Confirm';
    confirmDialog.onConfirm = () => {
      confirmDialog.visible = false;
      resolve();
    };
    confirmDialog.visible = true;
  });
}

// Toggle server enabled state
async function handleToggleServer(server: McpServer, event: Event) {
  const target = event.target as HTMLInputElement;
  const enabled = target.checked;

  // Update server configuration
  const updatedServer: McpServer = {
    ...server,
    enabled,
    apps: {
      claude: enabled,
      codex: server.apps?.codex ?? false,
      gemini: server.apps?.gemini ?? false,
    }
  };

  const result = await mcpStore.upsertServer(updatedServer);
  if (!result.success) {
    // Roll back checkbox state
    target.checked = !enabled;
    await showAlert('Error', result.error || 'Update failed');
  } else {
    // Restart session to apply MCP configuration
    const serverName = server.name || server.id;
    const message = enabled
      ? `Enabled MCP server "${serverName}"`
      : `Disabled MCP server "${serverName}"`;
    await restartSessionForMcp(message, enabled ? 'success' : 'error');

    if (enabled) {
      // If enabled, automatically check connection status
      handleCheckStatus(server, true);
    } else {
      // If disabled, clear the status
      serverStatus.value[server.id] = null;
    }
  }
}

// Check server status
async function handleCheckStatus(server: McpServer, silent = false) {
  if (checkingStatus.value[server.id]) return;

  checkingStatus.value[server.id] = true;
  serverStatus.value[server.id] = 'checking';

  try {
    // Call the store verification method
    const result = await mcpStore.validateServer(server);

    if (result.valid) {
      serverStatus.value[server.id] = 'connected';
      if (!silent) {
        await showAlert('Success', `Server "${server.name || server.id}" configuration is valid`);
      }
    } else {
      serverStatus.value[server.id] = 'error';
      if (!silent) {
        await showAlert('Failure', `Server configuration has issues:\n${result.errors.join('\n')}`);
      }
    }
  } catch (error) {
    serverStatus.value[server.id] = 'error';
    if (!silent) {
      await showAlert('Failure', `Unable to detect server status: ${error}`);
    }
  } finally {
    checkingStatus.value[server.id] = false;
  }
}

// Handle edit
function handleEdit(server: McpServer) {
  editingServer.value = { ...server };
  showAddDialog.value = true;
}

// Handle delete
async function handleDelete(server: McpServer) {
  const serverName = server.name || server.id;
  const confirmed = await showConfirm(
    'Delete Server',
    `Are you sure you want to delete server "${serverName}"?\n\nThis action cannot be undone.`
  );

  if (confirmed) {
    const result = await mcpStore.deleteServer(server.id);
    if (!result.success) {
      await showAlert('Error', result.error || 'Failed to delete');
    } else {
      // Clear related state
      expandedServers.value.delete(server.id);
      delete serverStatus.value[server.id];
      // Restart session to apply MCP configuration
      await restartSessionForMcp(`MCP server "${serverName}" removed`, 'error');
    }
  }
}

// Handle save
async function handleSave(server: McpServer) {
  const isNew = !mcpStore.isIdExists(server.id) || editingServer.value === null;
  const result = await mcpStore.upsertServer(server);
  if (result.success) {
    handleCloseDialog();
    // Auto-detect the server
    handleCheckStatus(server, true);
    // Restart session to apply MCP configuration
    const serverName = server.name || server.id;
    const message = isNew
      ? `Added MCP server "${serverName}"`
      : `Updated MCP server "${serverName}"`;
    await restartSessionForMcp(message);
  } else {
    await showAlert('Error', result.error || 'Failed to save');
  }
}

// Close dialog
function handleCloseDialog() {
  showAddDialog.value = false;
  editingServer.value = null;
}

// Initialize
onMounted(async () => {
  await mcpStore.initialize();
  document.addEventListener('click', handleClickOutside);

  // Automatically check statuses of enabled servers
  for (const server of mcpStore.serverList) {
    if (isServerEnabled(server)) {
      handleCheckStatus(server, true);
    }
  }
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.mcp-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Header styles */
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--vscode-foreground);
}

.help-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: var(--vscode-badge-background);
  color: var(--vscode-badge-foreground);
  cursor: pointer;
  font-size: 12px;
}

.help-btn:hover {
  opacity: 0.8;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.refresh-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid var(--vscode-panel-border);
  border-radius: 6px;
  background: var(--vscode-input-background);
  color: var(--vscode-foreground);
  cursor: pointer;
}

.refresh-btn:hover:not(:disabled) {
  background: var(--vscode-list-hoverBackground);
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.refresh-btn .spinning {
  animation: spin 1s linear infinite;
}

/* Dropdown */
.add-dropdown {
  position: relative;
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  cursor: pointer;
  font-size: 13px;
}

.add-btn:hover {
  background: var(--vscode-button-hoverBackground);
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  min-width: 160px;
  background: var(--vscode-dropdown-background);
  border: 1px solid var(--vscode-dropdown-border);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  z-index: 100;
  overflow: hidden;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  cursor: pointer;
  font-size: 13px;
  color: var(--vscode-dropdown-foreground);
}

.dropdown-item:hover {
  background: var(--vscode-list-hoverBackground);
}

.dropdown-item .codicon {
  font-size: 14px;
  opacity: 0.8;
}

/* Server list */
.server-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Server cards */
.server-card {
  border: 1px solid var(--vscode-panel-border);
  border-radius: 8px;
  background: var(--vscode-sideBar-background);
  overflow: hidden;
  transition: all 0.15s ease;
}

.server-card:hover {
  border-color: var(--vscode-focusBorder);
}

.server-card.disabled {
  opacity: 0.6;
}

.server-card.disabled .card-header {
  background: transparent;
}

/* Card header */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  cursor: pointer;
  user-select: none;
}

.card-header:hover {
  background: var(--vscode-list-hoverBackground);
}

.header-left-section {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.expand-icon {
  font-size: 14px;
  color: var(--vscode-descriptionForeground);
  transition: transform 0.15s ease;
}

.server-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
  flex-shrink: 0;
}

.server-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--vscode-foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.status-indicator.connected {
  color: #22c55e;
}

.status-indicator.checking {
  color: var(--vscode-descriptionForeground);
}

.status-indicator.error {
  color: #ef4444;
}

.status-indicator .codicon {
  font-size: 14px;
}

.header-right-section {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* Toggle switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
  cursor: pointer;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--vscode-input-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 11px;
  transition: 0.2s;
}

.toggle-slider::before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 2px;
  bottom: 2px;
  background-color: var(--vscode-descriptionForeground);
  border-radius: 50%;
  transition: 0.2s;
}

.toggle-switch input:checked + .toggle-slider {
  background-color: #22c55e;
  border-color: #22c55e;
}

.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(18px);
  background-color: #ffffff;
}

/* Card content */
.card-content {
  padding: 0 14px 14px 14px;
  border-top: 1px solid var(--vscode-panel-border);
  animation: slideDown 0.15s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Info section */
.info-section {
  padding: 12px 0;
}

.info-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 13px;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-label {
  color: var(--vscode-descriptionForeground);
  flex-shrink: 0;
  min-width: 50px;
}

.info-value {
  color: var(--vscode-foreground);
  word-break: break-all;
}

.info-value.command,
.info-value.url {
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  background: var(--vscode-textCodeBlock-background);
}

.info-value.link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--vscode-textLink-foreground);
  text-decoration: none;
  cursor: pointer;
  word-break: break-all;
}

.info-value.link:hover {
  color: var(--vscode-textLink-activeForeground);
  text-decoration: underline;
}

.info-value.link .codicon {
  font-size: 12px;
  flex-shrink: 0;
}

/* Tags area */
.tags-section {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding-bottom: 12px;
}

.tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--vscode-badge-background);
  color: var(--vscode-badge-foreground);
}

/* Actions area */
.actions-section {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--vscode-panel-border);
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--vscode-panel-border);
  border-radius: 6px;
  background: var(--vscode-input-background);
  color: var(--vscode-foreground);
  cursor: pointer;
  font-size: 12px;
  transition: all 0.15s ease;
}

.action-btn:hover:not(:disabled) {
  background: var(--vscode-list-hoverBackground);
  border-color: var(--vscode-focusBorder);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn .codicon {
  font-size: 14px;
}

.action-btn.check-btn {
  background: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
  border-color: transparent;
}

.action-btn.check-btn:hover:not(:disabled) {
  background: var(--vscode-button-secondaryHoverBackground);
}

.action-btn.edit-btn:hover {
  background: var(--vscode-button-secondaryBackground);
}

.action-btn.delete-btn:hover {
  background: var(--vscode-inputValidation-errorBackground);
  color: var(--vscode-inputValidation-errorForeground);
  border-color: transparent;
}

/* Empty & loading states */
.empty-state,
.loading-state {
  text-align: center;
  padding: 48px 24px;
  color: var(--vscode-descriptionForeground);
}

.empty-state .codicon,
.loading-state .codicon {
  font-size: 48px;
  opacity: 0.5;
  margin-bottom: 16px;
  display: block;
}

.empty-state p,
.loading-state p {
  margin: 0 0 8px 0;
}

.empty-state .hint {
  font-size: 12px;
  opacity: 0.8;
}

/* Animations */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.codicon-modifier-spin {
  animation: spin 1s linear infinite;
}

/* Responsive adjustments */
@media (max-width: 480px) {
  .panel-header {
    flex-wrap: wrap;
    gap: 12px;
  }

  .header-right {
    width: 100%;
    justify-content: flex-end;
  }

  .card-header {
    padding: 10px 12px;
  }

  .server-icon {
    width: 28px;
    height: 28px;
    font-size: 12px;
  }

  .server-name {
    font-size: 13px;
  }

  .actions-section {
    flex-direction: column;
  }

  .action-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
