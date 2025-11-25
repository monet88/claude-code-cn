<template>
  <div class="mcp-panel">
    <!-- 头部 -->
    <div class="panel-header">
      <div class="header-left">
        <span class="header-title">MCP</span>
        <button class="help-btn" @click="showHelp" title="什么是 MCP?">
          <span class="codicon codicon-question"></span>
        </button>
      </div>
      <div class="header-right">
        <button class="refresh-btn" @click="handleRefresh" :disabled="mcpStore.loading" title="刷新服务器状态">
          <span :class="['codicon', 'codicon-refresh', { 'spinning': mcpStore.loading }]"></span>
        </button>
        <div class="add-dropdown" ref="dropdownRef">
          <button class="add-btn" @click="toggleDropdown">
            <span class="codicon codicon-add"></span>
            添加
            <span class="codicon codicon-chevron-down"></span>
          </button>
          <div v-if="showDropdown" class="dropdown-menu">
            <div class="dropdown-item" @click="handleAddManual">
              <span class="codicon codicon-json"></span>
              手动配置
            </div>
            <div class="dropdown-item" @click="handleAddFromMarket">
              <span class="codicon codicon-extensions"></span>
              从 MCP市场 添加
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 服务器列表 -->
    <div class="server-list" v-if="!mcpStore.loading || mcpStore.serverList.length > 0">
      <div
        v-for="server in mcpStore.serverList"
        :key="server.id"
        :class="['server-card', { expanded: expandedServers.has(server.id), disabled: !isServerEnabled(server) }]"
      >
        <!-- 卡片头部 - 始终显示 -->
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

        <!-- 展开内容 -->
        <div v-if="expandedServers.has(server.id)" class="card-content">
          <!-- 服务器信息 -->
          <div class="info-section">
            <div class="info-row" v-if="server.description">
              <span class="info-label">描述:</span>
              <span class="info-value">{{ server.description }}</span>
            </div>
            <div class="info-row" v-if="server.server.command">
              <span class="info-label">命令:</span>
              <code class="info-value command">{{ server.server.command }} {{ (server.server.args || []).join(' ') }}</code>
            </div>
            <!-- <div class="info-row" v-else-if="server.server.url">
              <span class="info-label">URL:</span>
              <code class="info-value url">{{ server.server.url }}</code>
            </div> -->
          </div>

          <!-- 标签 -->
          <div class="tags-section" v-if="server.tags && server.tags.length">
            <span v-for="tag in server.tags" :key="tag" class="tag">{{ tag }}</span>
          </div>

          <!-- 操作按钮 -->
          <div class="actions-section">
            <button
              class="action-btn check-btn"
              @click="handleCheckStatus(server)"
              :disabled="checkingStatus[server.id]"
              title="检测连接状态"
            >
              <span :class="['codicon', checkingStatus[server.id] ? 'codicon-loading codicon-modifier-spin' : 'codicon-plug']"></span>
              {{ checkingStatus[server.id] ? '检测中...' : '检测连接' }}
            </button>
            <button
              v-if="server.homepage"
              class="action-btn"
              @click="openUrl(server.homepage!)"
              title="访问主页"
            >
              <span class="codicon codicon-home"></span>
              主页
            </button>
            <button
              v-if="server.docs"
              class="action-btn"
              @click="openUrl(server.docs!)"
              title="查看文档"
            >
              <span class="codicon codicon-book"></span>
              文档
            </button>
            <button
              class="action-btn edit-btn"
              @click="handleEdit(server)"
              title="编辑配置"
            >
              <span class="codicon codicon-edit"></span>
              编辑
            </button>
            <button
              class="action-btn delete-btn"
              @click="handleDelete(server)"
              title="删除服务器"
            >
              <span class="codicon codicon-trash"></span>
              删除
            </button>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="mcpStore.serverCount === 0 && !mcpStore.loading" class="empty-state">
        <span class="codicon codicon-server"></span>
        <p>暂无 MCP 服务器</p>
        <p class="hint">点击"添加"按钮添加服务器</p>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="mcpStore.loading && mcpStore.serverList.length === 0" class="loading-state">
      <span class="codicon codicon-loading codicon-modifier-spin"></span>
      <p>加载中...</p>
    </div>

    <!-- 添加/编辑对话框 -->
    <McpServerDialog
      v-if="showAddDialog || editingServer"
      :server="editingServer"
      :existing-ids="existingIds"
      @close="handleCloseDialog"
      @save="handleSave"
    />

    <!-- 预设选择对话框 -->
    <McpPresetDialog
      v-if="showPresetDialog"
      @close="showPresetDialog = false"
      @select="handleSelectPreset"
    />

    <!-- 确认对话框 -->
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
import { ref, computed, onMounted, onUnmounted, reactive } from 'vue';
import { useMcpStore } from '../stores/mcpStore';
import type { McpServer, McpPreset } from '../types/mcp';
import McpServerDialog from './McpServerDialog.vue';
import McpPresetDialog from './McpPresetDialog.vue';
import MessageDialog from './MessageDialog.vue';

const mcpStore = useMcpStore();

// 状态
const showAddDialog = ref(false);
const showPresetDialog = ref(false);
const showDropdown = ref(false);
const editingServer = ref<McpServer | null>(null);
const expandedServers = ref<Set<string>>(new Set());
const serverStatus = ref<Record<string, 'connected' | 'checking' | 'error' | null>>({});
const checkingStatus = ref<Record<string, boolean>>({});
const dropdownRef = ref<HTMLElement | null>(null);

// 确认对话框状态
const confirmDialog = reactive({
  visible: false,
  type: 'confirm' as 'confirm' | 'alert',
  title: '提示',
  message: '',
  confirmText: '确定',
  cancelText: '取消',
  onConfirm: () => {},
  onCancel: () => {}
});

// 计算已存在的 ID 列表
const existingIds = computed(() => Object.keys(mcpStore.servers));

// 服务器图标颜色
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

// 获取服务器类型
function getServerType(server: McpServer): string {
  return server.server.type || 'stdio';
}

// 获取服务器类型标签
function getServerTypeLabel(server: McpServer): string {
  const type = getServerType(server);
  const labels: Record<string, string> = {
    stdio: 'STDIO',
    http: 'HTTP',
    sse: 'SSE',
  };
  return labels[type] || type.toUpperCase();
}

// 判断服务器是否启用
function isServerEnabled(server: McpServer): boolean {
  // 优先使用 enabled 字段，如果没有则检查 apps.claude
  if (server.enabled !== undefined) {
    return server.enabled;
  }
  return server.apps?.claude !== false;
}

// 获取状态提示
function getStatusTitle(serverId: string): string {
  const status = serverStatus.value[serverId];
  switch (status) {
    case 'connected':
      return '已连接';
    case 'checking':
      return '检测中...';
    case 'error':
      return '连接失败';
    default:
      return '';
  }
}

// 切换展开状态
function toggleExpand(serverId: string) {
  if (expandedServers.value.has(serverId)) {
    expandedServers.value.delete(serverId);
  } else {
    expandedServers.value.add(serverId);
  }
  expandedServers.value = new Set(expandedServers.value);
}

// 切换下拉菜单
function toggleDropdown() {
  showDropdown.value = !showDropdown.value;
}

// 点击外部关闭下拉菜单
function handleClickOutside(event: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    showDropdown.value = false;
  }
}

// 显示帮助
function showHelp() {
  showAlert(
    '什么是 MCP?',
    'MCP (Model Context Protocol) 是一个让 AI 模型访问外部工具和数据的协议。通过配置 MCP 服务器，您可以为 Claude 扩展更多能力，如访问文件系统、执行代码、查询数据库等。\n\n了解更多: https://modelcontextprotocol.io'
  );
}

// 刷新
async function handleRefresh() {
  await mcpStore.loadServers();
  // 重新检测所有服务器状态
  for (const server of mcpStore.serverList) {
    if (isServerEnabled(server)) {
      handleCheckStatus(server, true);
    }
  }
}

// 手动添加
function handleAddManual() {
  showDropdown.value = false;
  showAddDialog.value = true;
}

// 从 MCP市场 添加
function handleAddFromMarket() {
  showDropdown.value = false;
  showAlert('提示', 'MCP市场功能暂未开发完成,敬请期待');
}

// 从预设添加
function handleAddPreset() {
  showDropdown.value = false;
  showPresetDialog.value = true;
}

// 选择预设
async function handleSelectPreset(preset: McpPreset) {
  showPresetDialog.value = false;
  const server = mcpStore.createFromPreset(preset);
  // 如果 ID 已存在，生成唯一 ID
  if (mcpStore.isIdExists(server.id)) {
    server.id = mcpStore.generateUniqueId(server.id);
  }
  const result = await mcpStore.upsertServer(server);
  if (!result.success) {
    await showAlert('错误', result.error || '添加失败');
  }
}

// 打开 URL
function openUrl(url: string) {
  window.open(url, '_blank');
}

// 显示确认对话框
function showConfirm(title: string, message: string): Promise<boolean> {
  return new Promise((resolve) => {
    confirmDialog.type = 'confirm';
    confirmDialog.title = title;
    confirmDialog.message = message;
    confirmDialog.confirmText = '确定';
    confirmDialog.cancelText = '取消';
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

// 显示提示对话框
function showAlert(title: string, message: string): Promise<void> {
  return new Promise((resolve) => {
    confirmDialog.type = 'alert';
    confirmDialog.title = title;
    confirmDialog.message = message;
    confirmDialog.confirmText = '确定';
    confirmDialog.onConfirm = () => {
      confirmDialog.visible = false;
      resolve();
    };
    confirmDialog.visible = true;
  });
}

// 切换服务器启用状态
async function handleToggleServer(server: McpServer, event: Event) {
  const target = event.target as HTMLInputElement;
  const enabled = target.checked;

  // 更新服务器配置
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
    // 回滚 checkbox 状态
    target.checked = !enabled;
    await showAlert('错误', result.error || '更新失败');
  } else if (enabled) {
    // 如果启用了，自动检测连接状态
    handleCheckStatus(server, true);
  } else {
    // 如果禁用了，清除状态
    serverStatus.value[server.id] = null;
  }
}

// 检测服务器状态
async function handleCheckStatus(server: McpServer, silent = false) {
  if (checkingStatus.value[server.id]) return;

  checkingStatus.value[server.id] = true;
  serverStatus.value[server.id] = 'checking';

  try {
    // 调用 store 的验证方法
    const result = await mcpStore.validateServer(server);

    if (result.valid) {
      serverStatus.value[server.id] = 'connected';
      if (!silent) {
        await showAlert('检测成功', `服务器 "${server.name || server.id}" 配置有效`);
      }
    } else {
      serverStatus.value[server.id] = 'error';
      if (!silent) {
        await showAlert('检测失败', `服务器配置有问题:\n${result.errors.join('\n')}`);
      }
    }
  } catch (error) {
    serverStatus.value[server.id] = 'error';
    if (!silent) {
      await showAlert('检测失败', `无法检测服务器状态: ${error}`);
    }
  } finally {
    checkingStatus.value[server.id] = false;
  }
}

// 处理编辑
function handleEdit(server: McpServer) {
  editingServer.value = { ...server };
  showAddDialog.value = true;
}

// 处理删除
async function handleDelete(server: McpServer) {
  const confirmed = await showConfirm(
    '删除服务器',
    `确定要删除服务器 "${server.name || server.id}" 吗？\n\n此操作无法撤销。`
  );

  if (confirmed) {
    const result = await mcpStore.deleteServer(server.id);
    if (!result.success) {
      await showAlert('错误', result.error || '删除失败');
    } else {
      // 清除相关状态
      expandedServers.value.delete(server.id);
      delete serverStatus.value[server.id];
    }
  }
}

// 处理保存
async function handleSave(server: McpServer) {
  const result = await mcpStore.upsertServer(server);
  if (result.success) {
    handleCloseDialog();
    // 自动检测新添加的服务器
    handleCheckStatus(server, true);
  } else {
    await showAlert('错误', result.error || '保存失败');
  }
}

// 关闭对话框
function handleCloseDialog() {
  showAddDialog.value = false;
  editingServer.value = null;
}

// 初始化
onMounted(async () => {
  await mcpStore.initialize();
  document.addEventListener('click', handleClickOutside);

  // 自动检测已启用的服务器状态
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

/* 头部样式 */
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

/* 下拉菜单 */
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

/* 服务器列表 */
.server-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 服务器卡片 */
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

/* 卡片头部 */
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

/* Toggle 开关 */
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

/* 卡片内容 */
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

/* 信息区 */
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

/* 标签区 */
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

/* 操作区 */
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

/* 空状态 & 加载状态 */
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

/* 动画 */
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

/* 响应式适配 */
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
