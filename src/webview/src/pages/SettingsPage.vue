<template>
  <div class="settings-page">
    <!-- 顶部标题栏 -->
    <div class="settings-header">
      <div class="header-left">
        <button class="back-btn" @click="$emit('back')">
          <span class="codicon codicon-arrow-left"></span>
        </button>
        <h2 class="settings-title">Settings</h2>
      </div>
      <div class="header-right">
        <!-- 已隐藏保存更改按钮 -->
      </div>
    </div>

    <!-- 主体内容 -->
    <div class="settings-main">
      <!-- 侧边栏 -->
      <div :class="['settings-sidebar', { collapsed: isCollapsed }]" ref="sidebarRef">
        <div class="sidebar-items">
          <div
            :class="['sidebar-item', { active: currentTab === 'basic' }]"
            @click="currentTab = 'basic'"
            :title="isCollapsed ? '基础配置' : ''"
          >
            <span class="codicon codicon-settings-gear"></span>
            <span class="sidebar-item-text">Basic settings</span>
          </div>
          <div
            :class="['sidebar-item', { active: currentTab === 'usage' }]"
            @click="currentTab = 'usage'"
            :title="isCollapsed ? '使用统计' : ''"
          >
            <span class="codicon codicon-graph"></span>
            <span class="sidebar-item-text">Usage & limits</span>
          </div>
          <div
            :class="['sidebar-item', { active: currentTab === 'mcp' }]"
            @click="currentTab = 'mcp'"
            :title="isCollapsed ? 'MCP服务器' : ''"
          >
            <span class="codicon codicon-server"></span>
            <span class="sidebar-item-text">MCP servers</span>
          </div>
          <div
            :class="['sidebar-item', { active: currentTab === 'skills' }]"
            @click="currentTab = 'skills'"
            :title="isCollapsed ? 'Skills' : ''"
          >
            <span class="codicon codicon-book"></span>
            <span class="sidebar-item-text">Skills</span>
          </div>
          <div
            :class="['sidebar-item', { active: currentTab === 'permissions', warning: true }]"
            @click="currentTab = 'permissions'"
            :title="isCollapsed ? '权限配置' : ''"
          >
            <span class="codicon codicon-shield"></span>
            <span class="sidebar-item-text">Permissions</span>
            <span class="codicon codicon-warning"></span>
          </div>
          <div
            :class="['sidebar-item', { active: currentTab === 'agents', warning: true }]"
            @click="currentTab = 'agents'"
            :title="isCollapsed ? 'Agents' : ''"
          >
            <span class="codicon codicon-robot"></span>
            <span class="sidebar-item-text">Agents</span>
            <span class="codicon codicon-warning"></span>
          </div>
          <div
            :class="['sidebar-item', { active: currentTab === 'community' }]"
            @click="currentTab = 'community'"
            :title="isCollapsed ? '官方交流群' : ''"
          >
            <span class="codicon codicon-comment-discussion"></span>
            <span class="sidebar-item-text">Community</span>
          </div>
        </div>

        <!-- 折叠按钮移到底部 -->
        <div class="sidebar-toggle" @click="toggleManualCollapse" :title="isCollapsed ? '展开侧边栏' : '折叠侧边栏'">
          <span :class="['codicon', isCollapsed ? 'codicon-chevron-right' : 'codicon-chevron-left']"></span>
        </div>
      </div>

      <!-- 内容区域 -->
      <div class="settings-content">
        <!-- 基础配置 -->
        <div v-if="currentTab === 'basic'" class="config-section">
          <h3 class="section-title">Basic settings</h3>
          <p class="section-desc">Configure basic settings and environment for Claude Code.</p>

          <!-- 界面主题 -->
          <div class="theme-section">
            <div class="section-header">
              <h4>
                <span class="codicon codicon-symbol-color"></span>
                Interface Theme
              </h4>
            </div>

            <div class="theme-options">
              <div
                :class="['theme-option', { active: themeStore.mode === 'light' }]"
                @click="themeStore.setTheme('light')"
              >
                <div class="theme-icon light-theme-icon">
                  <span class="codicon codicon-circle-large"></span>
                </div>
                <div class="theme-info">
                  <h5>Light theme</h5>
                  <span class="theme-desc">Fresh and bright, suitable for daytime use.</span>
                </div>
                <div v-if="themeStore.mode === 'light'" class="theme-check">
                  <span class="codicon codicon-check"></span>
                </div>
              </div>

              <div
                :class="['theme-option', { active: themeStore.mode === 'dark' }]"
                @click="themeStore.setTheme('dark')"
              >
                <div class="theme-icon dark-theme-icon">
                  <span class="codicon codicon-circle-filled"></span>
                </div>
                <div class="theme-info">
                  <h5>Dark theme</h5>
                  <span class="theme-desc">Eye-friendly and comfortable, suitable for nighttime use.</span>
                </div>
                <div v-if="themeStore.mode === 'dark'" class="theme-check">
                  <span class="codicon codicon-check"></span>
                </div>
              </div>
            </div>

            <div class="theme-follow-options">
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  :checked="themeStore.followSystem"
                  @change="(e) => themeStore.setFollowSystem((e.target as HTMLInputElement).checked)"
                />
                <span>Follow the system theme</span>
              </label>
            </div>
          </div>

          <!-- 供应商列表 -->
          <div class="provider-section">
            <div class="section-header">
              <h4>Providers Management</h4>
              <button class="add-provider-btn" @click="showAddDialog = true">
                <span class="codicon codicon-add"></span>
                Add Providers
              </button>
            </div>

            <div class="provider-list">
              <div
                v-for="provider in providers"
                :key="provider.id"
                :class="['provider-item', { active: provider.isActive }]"
              >
                <div class="provider-main">
                  <div class="provider-info">
                    <h5 class="provider-name">
                      {{ provider.name }}
                      <span v-if="provider.isActive" class="active-badge">Active</span>
                    </h5>
                    <a
                      v-if="provider.websiteUrl"
                      :href="provider.websiteUrl"
                      class="provider-url"
                      target="_blank"
                    >
                      {{ provider.websiteUrl }}
                    </a>
                  </div>
                  <div class="provider-actions">
                    <button
                      v-if="!provider.isActive"
                      class="use-btn"
                      @click="handleSwitchProvider(provider.id)"
                    >
                      <span class="codicon codicon-play"></span>
                      Enable
                    </button>
                    <span v-else class="using-badge">
                      <span class="codicon codicon-check"></span>
                      In use
                    </span>
                    <button class="edit-btn" @click="handleEditProvider(provider)" title="Edit">
                      <span class="codicon codicon-edit"></span>
                    </button>
                    <!-- <button class="stats-btn" title="Stats">
                      <span class="codicon codicon-graph"></span>
                    </button> -->
                    <button
                      class="delete-btn"
                      :title="providers.length === 1 ? 'Keep at least 1 provider' : 'Delete'"
                      :disabled="providers.length === 1"
                      @click="handleDeleteProvider(provider)"
                    >
                      <span class="codicon codicon-trash"></span>
                    </button>
                  </div>
                </div>
              </div>

              <div v-if="providers.length === 0" class="empty-state">
                <span class="codicon codicon-info"></span>
                <p>There are no providers currently listed. Click the "Add Provider" button above to add one.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 使用统计 -->
        <div v-else-if="currentTab === 'usage'" class="config-section usage-section">
          <h3 class="section-title">Usage & limits</h3>
          <p class="section-desc">View token usage and context window information.</p>

          <UsageStatisticsSection />
        </div>

        <!-- 官方交流群 -->
        <div v-else-if="currentTab === 'community'" class="config-section community-section">
          <h3 class="section-title">Community</h3>
          <p class="section-desc">Join the community to get help, share feedback, and follow updates.</p>

          <div class="qrcode-container">
            <div class="qrcode-wrapper">
              <img
                src="https://claudecodecn-1253302184.cos.ap-beijing.myqcloud.com/vscode/wxq.png"
                alt="Scan to join the Claude Code community"
                class="qrcode-image"
              />
              <p class="qrcode-tip">Scan the QR code to join the community.</p>
            </div>
          </div>
        </div>

        <!-- MCP Server -->
        <div v-else-if="currentTab === 'mcp'" class="config-section mcp-section">
          <h3 class="section-title">MCP servers</h3>
          <p class="section-desc">Configure MCP (Model Context Protocol) servers so Claude can connect to your tools and data.</p>

          <McpServerPanel />
        </div>

        <!-- Skills -->
        <div v-else-if="currentTab === 'skills'" class="config-section skills-section">
          <h3 class="section-title">Skills</h3>
          <p class="section-desc">Manage Claude Code skills that extend the agent's capabilities.</p>

          <SkillPanel />
        </div>

        <!-- Other tabs are placeholders. -->
        <div v-else class="config-section">
          <h3 class="section-title">{{ currentTab }}</h3>
          <p class="section-desc">More settings coming soon...</p>
        </div>
      </div>
    </div>

    <!-- 编辑供应商对话框 -->
    <ProviderEditDialog
      v-if="showEditDialog && editingProvider"
      :provider="editingProvider"
      :total-providers="providers.length"
      @close="showEditDialog = false"
      @save="handleSaveProvider"
      @delete="handleDeleteFromEdit"
      @test="handleTestConnection"
    />

    <!-- 添加供应商对话框 -->
    <AddProviderDialog
      v-if="showAddDialog"
      @close="showAddDialog = false"
      @add="handleAddProvider"
    />

    <!-- 消息对话框 -->
    <MessageDialog
      v-model:visible="messageDialog.visible"
      :type="messageDialog.type"
      :title="messageDialog.title"
      :message="messageDialog.message"
      :confirm-text="messageDialog.confirmText"
      :cancel-text="messageDialog.cancelText"
      @confirm="messageDialog.onConfirm"
      @cancel="messageDialog.onCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, reactive, computed, inject } from 'vue';
import { useProviderStore } from '../stores/providerStore';
import { useThemeStore } from '../stores/themeStore';
import type { ProviderConfig } from '../types/provider';
import ProviderEditDialog from '../components/ProviderEditDialog.vue';
import AddProviderDialog from '../components/AddProviderDialog.vue';
import MessageDialog from '../components/MessageDialog.vue';
import UsageStatisticsSection from '../components/UsageStatisticsSection.vue';
import McpServerPanel from '../components/McpServerPanel.vue';
import SkillPanel from '../components/SkillPanel.vue';
import { RuntimeKey } from '../composables/runtimeContext';

defineEmits<{
  back: [];
}>();

const runtime = inject(RuntimeKey);
const providerStore = useProviderStore();
const themeStore = useThemeStore();
const currentTab = ref('basic');
const showEditDialog = ref(false);
const showAddDialog = ref(false);
const editingProvider = ref<ProviderConfig | null>(null);

// 侧边栏相关状态
const sidebarRef = ref<HTMLElement | null>(null);
const windowWidth = ref(window.innerWidth);
const manualCollapsed = ref<boolean | null>(null); // null表示跟随自动，true/false表示手动设置

// 自动折叠阈值（窗口宽度）
const AUTO_COLLAPSE_THRESHOLD = 900;

// 计算是否应该折叠
const isCollapsed = computed(() => {
  // 如果手动设置过，优先使用手动设置
  if (manualCollapsed.value !== null) {
    return manualCollapsed.value;
  }
  // 否则根据窗口宽度自动判断
  return windowWidth.value < AUTO_COLLAPSE_THRESHOLD;
});

const providers = ref<ProviderConfig[]>([]);

// 消息对话框状态
const messageDialog = reactive({
  visible: false,
  type: 'confirm' as 'confirm' | 'alert',
  title: 'Tip',
  message: '',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  onConfirm: () => {},
  onCancel: () => {}
});

// 显示确认对话框
function showConfirm(title: string, message: string): Promise<boolean> {
  return new Promise((resolve) => {
    messageDialog.type = 'confirm';
    messageDialog.title = title;
    messageDialog.message = message;
    messageDialog.confirmText = 'Confirm';
    messageDialog.cancelText = 'Cancel';
    messageDialog.onConfirm = () => {
      messageDialog.visible = false;
      resolve(true);
    };
    messageDialog.onCancel = () => {
      messageDialog.visible = false;
      resolve(false);
    };
    messageDialog.visible = true;
  });
}

// 显示提示对话框
function showAlert(title: string, message: string): Promise<void> {
  return new Promise((resolve) => {
    messageDialog.type = 'alert';
    messageDialog.title = title;
    messageDialog.message = message;
    messageDialog.confirmText = 'Confirm';
    messageDialog.onConfirm = () => {
      messageDialog.visible = false;
      resolve();
    };
    messageDialog.visible = true;
  });
}

// 窗口大小变化监听
const handleResize = () => {
  windowWidth.value = window.innerWidth;

  // 如果窗口大小变化导致应该自动切换状态，重置手动设置
  // 这样可以让侧边栏在窗口变化时重新适应
  const shouldAutoCollapse = windowWidth.value < AUTO_COLLAPSE_THRESHOLD;
  if (manualCollapsed.value !== null) {
    // 如果当前手动状态和自动状态一致，则清除手动设置，回归自动模式
    if (manualCollapsed.value === shouldAutoCollapse) {
      manualCollapsed.value = null;
    }
  }
};

// 手动切换折叠状态
const toggleManualCollapse = () => {
  if (manualCollapsed.value === null) {
    // 如果当前是自动模式，切换到手动模式
    manualCollapsed.value = !isCollapsed.value;
  } else {
    // 如果已经是手动模式，切换状态
    manualCollapsed.value = !manualCollapsed.value;
  }
};

onMounted(async () => {
  await providerStore.initialize();
  providers.value = providerStore.providers;

  // 添加窗口大小变化监听
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  // 移除监听器
  window.removeEventListener('resize', handleResize);
});

function handleSave() {
  // 保存所有配置
  console.log('Saving settings...');
}

function handleEditProvider(provider: ProviderConfig) {
  editingProvider.value = { ...provider };
  showEditDialog.value = true;
}

async function handleSaveProvider(updates: Partial<ProviderConfig>) {
  if (editingProvider.value) {
    await providerStore.updateProvider(editingProvider.value.id, updates);
    providers.value = providerStore.providers;
    showEditDialog.value = false;
  }
}

async function handleAddProvider(provider: ProviderConfig) {
  await providerStore.addProvider(provider);
  providers.value = providerStore.providers;
  showAddDialog.value = false;
}

async function handleDeleteProvider(provider: ProviderConfig) {
  // 如果只有一个供应商，禁止删除
  if (providers.value.length === 1) {
    await showAlert('Unable to delete', 'At least one provider configuration needs to be retained.');
    return;
  }

  // 如果是当前使用的供应商，禁止删除，提示先切换
  if (provider.isActive) {
    await showAlert('Unable to delete', 'You cannot delete the currently used provider. Please switch to another provider before deleting.');
    return;
  }

  // 二次确认对话框
  const confirmMessage = `Confirm to remove provider "${provider.name}"? \n\nThis operation cannot be undone.`;

  const confirmed = await showConfirm('Remove provider', confirmMessage);
  if (!confirmed) {
    return;
  }

  try {
    await providerStore.deleteProvider(provider.id);
    providers.value = providerStore.providers;
  } catch (error) {
    console.error('Failed to delete provider:', error);
    await showAlert('Error', `Failed to delete supplier: ${error}`);
  }
}

async function handleSwitchProvider(id: string) {
  try {
    await providerStore.switchProvider(id);
    providers.value = providerStore.providers;

    // 自动重启当前会话，以使用新的供应商配置
    const activeSession = runtime?.sessionStore.activeSession();
    if (activeSession) {
      try {
        await activeSession.restartClaude();
        console.log('[SettingsPage] 会话已自动重启，使用新的供应商配置');
      } catch (restartError) {
        console.warn('[SettingsPage] 重启会话失败:', restartError);
      }
    }

    await showAlert('Success', 'Provider switch successful! Session has been automatically restarted');
  } catch (error) {
    console.error('Failed to switch provider:', error);
    await showAlert('Error', `Failed to switch provider: ${error}`);
  }
}

// 处理从编辑对话框删除供应商
async function handleDeleteFromEdit(id: string) {
  const provider = providers.value.find(p => p.id === id);
  if (!provider) return;

  // 如果只有一个供应商，禁止删除
  if (providers.value.length === 1) {
    await showAlert('Cannot be deleted', 'At least one provider configuration must be retained');
    return;
  }

  // 如果是当前使用的供应商，禁止删除，提示先切换
  if (provider.isActive) {
    await showAlert('Unable to delete', 'Unable to delete the currently used provider. Please switch to another provider before deleting.');
    return;
  }

  const confirmMessage = `Are you sure you want to remove provider "${provider.name}"? \n\nThis operation cannot be undone. `;
  const confirmed = await showConfirm('Delete Provider', confirmMessage);

  if (confirmed) {
    try {
      await providerStore.deleteProvider(id);
      providers.value = providerStore.providers;
      showEditDialog.value = false;
    } catch (error) {
      console.error('Failed to delete provider:', error);
      await showAlert('Error', `Failed to remove provider: ${error}`);
    }
  }
}

// 处理测试连接
async function handleTestConnection() {
  await showAlert('Alert', 'Connection testing feature coming soon!');
}
</script>

<style scoped>
.settings-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--vscode-editor-background);
  color: var(--vscode-editor-foreground);
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--vscode-panel-border);
  background: var(--vscode-sideBar-background);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.back-btn,
.save-btn,
.add-provider-btn,
.use-btn,
.edit-btn,
.stats-btn,
.delete-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  cursor: pointer;
  font-size: 13px;
}

.back-btn {
  padding: 6px 8px;
  background: transparent;
  color: var(--vscode-foreground);
}

.back-btn:hover {
  background: var(--vscode-toolbar-hoverBackground);
}

.save-btn:hover,
.add-provider-btn:hover,
.use-btn:hover {
  background: var(--vscode-button-hoverBackground);
}

.settings-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.settings-main {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.settings-sidebar {
  width: 200px;
  background: var(--vscode-sideBar-background);
  border-right: 1px solid var(--vscode-panel-border);
  padding: 8px 0;
  overflow-y: auto;
  transition: width 0.2s ease;
  display: flex;
  flex-direction: column;
}

.settings-sidebar.collapsed {
  width: 60px;
}

.sidebar-items {
  flex: 1;
  overflow-y: auto;
}

.sidebar-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  margin: 8px 8px 0 8px;
  cursor: pointer;
  color: var(--vscode-foreground);
  border-radius: 4px;
  transition: background 0.15s ease;
  border-top: 1px solid var(--vscode-panel-border);
  margin-top: auto;
  flex-shrink: 0;
}

.sidebar-toggle .codicon {
  font-size: 16px;
}

.sidebar-toggle:hover {
  background: var(--vscode-toolbar-hoverBackground);
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  cursor: pointer;
  font-size: 13px;
  color: var(--vscode-foreground);
  position: relative;
  white-space: nowrap;
}

.sidebar-item .codicon:first-child {
  font-size: 16px;
  flex-shrink: 0;
}

.settings-sidebar.collapsed .sidebar-item {
  justify-content: center;
  padding: 10px 8px;
}

.settings-sidebar.collapsed .sidebar-item-text {
  display: none;
}

.settings-sidebar.collapsed .sidebar-item .codicon:first-child {
  margin: 0;
  font-size: 16px;
}

.sidebar-item:hover {
  background: var(--vscode-list-hoverBackground);
}

.sidebar-item.active {
  background: var(--vscode-list-activeSelectionBackground);
  color: var(--vscode-list-activeSelectionForeground);
}

.sidebar-item.warning .codicon-warning {
  position: absolute;
  right: 16px;
  color: var(--vscode-editorWarning-foreground);
}

.settings-sidebar.collapsed .sidebar-item.warning .codicon-warning {
  display: block;
  position: absolute;
  top: 6px;
  right: 12px;
  font-size: 10px;
}

.settings-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.config-section {
  max-width: 900px;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.section-desc {
  color: var(--vscode-descriptionForeground);
  margin: 0 0 24px 0;
  font-size: 13px;
}

.provider-section {
  margin-top: 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--vscode-descriptionForeground);
}

.provider-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.provider-item {
  border: 1px solid var(--vscode-panel-border);
  border-radius: 8px;
  padding: 14px 16px;
  background: var(--vscode-sideBar-background);
  transition: all 0.15s ease;
}

.provider-item:hover {
  background: var(--vscode-list-hoverBackground);
  border-color: var(--vscode-list-hoverBackground);
}

.provider-item.active {
  background: var(--vscode-list-activeSelectionBackground);
  border-color: var(--vscode-focusBorder);
}

.provider-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.provider-info {
  flex: 1;
  min-width: 0;
}

.provider-name {
  margin: 0 0 6px 0;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--vscode-foreground);
}

.active-badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  background: #16a34a;
  color: #ffffff;
  font-weight: 500;
}

.provider-url {
  color: var(--vscode-descriptionForeground);
  text-decoration: none;
  font-size: 12px;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.provider-url:hover {
  color: var(--vscode-textLink-foreground);
  text-decoration: underline;
}

.provider-actions {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-shrink: 0;
}

.use-btn {
  background: transparent;
  color: var(--vscode-foreground);
  border: 1px solid var(--vscode-button-border);
  padding: 6px 12px;
  font-size: 12px;
}

.use-btn:hover {
  background: var(--vscode-button-hoverBackground);
  color: var(--vscode-button-foreground);
  border-color: transparent;
}

.using-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 4px;
  background: #16a34a;
  color: #ffffff;
  font-size: 12px;
  font-weight: 500;
}

.edit-btn,
.stats-btn,
.delete-btn {
  padding: 6px;
  background: transparent;
  color: var(--vscode-foreground);
  border-radius: 4px;
  min-width: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.edit-btn:hover,
.stats-btn:hover {
  background: var(--vscode-toolbar-hoverBackground);
}

.delete-btn:hover {
  background: var(--vscode-inputValidation-errorBackground);
  color: var(--vscode-inputValidation-errorForeground);
}

.delete-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.delete-btn:disabled:hover {
  background: transparent;
  color: var(--vscode-foreground);
}

.empty-state {
  text-align: center;
  padding: 48px 24px;
  color: var(--vscode-descriptionForeground);
}

.empty-state .codicon {
  font-size: 48px;
  opacity: 0.5;
  margin-bottom: 16px;
}

.empty-state p {
  margin: 0;
}

.temp-notice {
  text-align: center;
  padding: 48px 24px;
  color: var(--vscode-descriptionForeground);
  background: var(--vscode-input-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 6px;
}

.temp-notice .codicon {
  font-size: 48px;
  opacity: 0.5;
  margin-bottom: 16px;
  display: block;
}

.temp-notice p {
  margin: 0;
  font-size: 14px;
}

/* 使用统计样式 */
.usage-section {
  max-width: 1200px;
}

/* 官方交流群样式 */
.community-section {
  max-width: 600px;
}

.qrcode-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 32px 0;
  margin-top: 20px;
}

.qrcode-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 24px;
  background: var(--vscode-sideBar-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.qrcode-image {
  width: 280px;
  height: 280px;
  object-fit: contain;
  border-radius: 4px;
  background: #ffffff;
  padding: 8px;
}

.qrcode-tip {
  margin: 0;
  font-size: 14px;
  color: var(--vscode-descriptionForeground);
  text-align: center;
}

/* 响应式适配 - 360px 小屏幕 */
@media (max-width: 480px) {
  .settings-header {
    padding: 8px 12px;
  }

  .header-left {
    gap: 4px;
  }

  .settings-title {
    font-size: 16px;
  }

  .save-btn {
    padding: 6px 8px;
    font-size: 12px;
  }

  .save-btn .codicon {
    margin-right: 2px;
  }

  /* 侧边栏在小屏幕下调整 */
  .settings-sidebar {
    width: 60px;
    padding: 8px 0;
  }

  .sidebar-item {
    flex-direction: column;
    padding: 12px 8px;
    gap: 4px;
    font-size: 10px;
    text-align: center;
  }

  .sidebar-item .codicon:first-child {
    font-size: 16px;
  }

  .sidebar-item.warning .codicon-warning {
    position: static;
    font-size: 10px;
  }

  /* 内容区域调整 */
  .settings-content {
    padding: 12px;
  }

  .section-title {
    font-size: 16px;
    margin-bottom: 6px;
  }

  .section-desc {
    font-size: 12px;
    margin-bottom: 16px;
  }

  .temp-notice {
    padding: 32px 16px;
  }

  .temp-notice .codicon {
    font-size: 36px;
  }

  .temp-notice p {
    font-size: 12px;
  }

  /* 供应商列表适配 */
  .section-header {
    flex-direction: column;
    gap: 8px;
    align-items: stretch;
  }

  .section-header h4 {
    font-size: 13px;
  }

  .add-provider-btn {
    width: 100%;
    justify-content: center;
    padding: 7px 12px;
    font-size: 12px;
  }

  .provider-list {
    gap: 8px;
  }

  .provider-item {
    padding: 12px 14px;
  }

  .provider-main {
    flex-direction: column;
    gap: 10px;
    align-items: stretch;
  }

  .provider-info {
    width: 100%;
  }

  .provider-name {
    font-size: 13px;
    margin-bottom: 4px;
  }

  .active-badge {
    font-size: 9px;
    padding: 2px 5px;
  }

  .provider-url {
    font-size: 11px;
  }

  .provider-actions {
    width: 100%;
    justify-content: flex-start;
    gap: 6px;
  }

  .use-btn,
  .using-badge {
    font-size: 11px;
    padding: 5px 10px;
  }

  .edit-btn,
  .stats-btn,
  .delete-btn {
    padding: 5px;
    min-width: 30px;
  }
}

/* 超小屏幕 360px */
@media (max-width: 360px) {
  .settings-header {
    padding: 6px 8px;
  }

  .settings-title {
    font-size: 14px;
  }

  .save-btn {
    padding: 4px 6px;
    font-size: 11px;
  }

  /* 侧边栏进一步优化 */
  .settings-sidebar {
    width: 50px;
  }

  .sidebar-item {
    padding: 10px 4px;
    font-size: 9px;
  }

  .sidebar-item .codicon:first-child {
    font-size: 16px;
  }

  /* 内容区域进一步调整 */
  .settings-content {
    padding: 8px;
  }

  .section-title {
    font-size: 14px;
  }

  .section-desc {
    font-size: 11px;
  }

  .temp-notice {
    padding: 24px 12px;
  }

  .temp-notice .codicon {
    font-size: 32px;
    margin-bottom: 12px;
  }

  .temp-notice p {
    font-size: 11px;
  }

  /* 供应商列表适配 - 360px */
  .section-header {
    margin-bottom: 10px;
  }

  .section-header h4 {
    font-size: 12px;
  }

  .add-provider-btn {
    padding: 6px 10px;
    font-size: 11px;
  }

  .provider-section {
    margin-top: 14px;
  }

  .provider-list {
    gap: 6px;
  }

  .provider-item {
    padding: 10px 12px;
    border-radius: 6px;
  }

  .provider-main {
    gap: 8px;
  }

  .provider-info {
    width: 100%;
  }

  .provider-name {
    font-size: 12px;
    margin-bottom: 4px;
  }

  .active-badge {
    font-size: 9px;
    padding: 1px 4px;
  }

  .provider-url {
    font-size: 10px;
  }

  .provider-actions {
    gap: 4px;
  }

  .use-btn {
    font-size: 10px;
    padding: 4px 8px;
  }

  .using-badge {
    font-size: 10px;
    padding: 4px 8px;
  }

  .edit-btn,
  .stats-btn,
  .delete-btn {
    padding: 4px;
    min-width: 28px;
  }

  .edit-btn .codicon,
  .stats-btn .codicon,
  .delete-btn .codicon {
    font-size: 13px;
  }

  .empty-state {
    padding: 32px 16px;
  }

  .empty-state .codicon {
    font-size: 32px;
  }

  .empty-state p {
    font-size: 11px;
  }

  /* 官方交流群响应式 - 480px */
  .qrcode-container {
    padding: 24px 0;
  }

  .qrcode-wrapper {
    padding: 20px;
  }

  .qrcode-image {
    width: 240px;
    height: 240px;
  }

  .qrcode-tip {
    font-size: 13px;
  }
}

/* 官方交流群响应式 - 360px */
@media (max-width: 360px) {
  .qrcode-container {
    padding: 16px 0;
  }

  .qrcode-wrapper {
    padding: 16px;
  }

  .qrcode-image {
    width: 200px;
    height: 200px;
  }

  .qrcode-tip {
    font-size: 12px;
  }
}

/* 主题切换样式 */
.theme-section {
  margin-bottom: 32px;
  padding: 0;
}

.theme-section .section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.theme-section .section-header h4 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  margin: 0;
  color: var(--vscode-foreground);
}

.theme-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.theme-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: 1px solid var(--vscode-panel-border);
  border-radius: 6px;
  background: var(--vscode-editor-background);
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.theme-option:hover {
  background: var(--vscode-list-hoverBackground);
  border-color: var(--vscode-focusBorder);
}

.theme-option.active {
  background: var(--vscode-list-activeSelectionBackground);
  border-color: var(--vscode-focusBorder);
}

.theme-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 8px;
  font-size: 24px;
}

.light-theme-icon {
  background: linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%);
  color: #333333;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.dark-theme-icon {
  background: linear-gradient(135deg, #2d2d2d 0%, #1e1e1e 100%);
  color: #cccccc;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.theme-info {
  flex: 1;
}

.theme-info h5 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--vscode-foreground);
}

.theme-desc {
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
}

.theme-check {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
}

.theme-follow-options {
  padding: 12px 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  margin: 0;
}

.checkbox-label input[type="checkbox"]:disabled + span {
  opacity: 0.5;
}

.checkbox-label span {
  font-size: 13px;
  color: var(--vscode-foreground);
}

/* 响应式布局 */
@media (max-width: 768px) {
  .theme-options {
    grid-template-columns: 1fr;
  }
}
</style>







