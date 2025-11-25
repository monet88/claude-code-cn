<template>
  <div class="usage-statistics">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <span class="codicon codicon-loading codicon-modifier-spin"></span>
      <p>加载统计数据中...</p>
    </div>

    <!-- 主要内容 -->
    <div v-else class="statistics-content">
      <!-- 顶部控制栏 -->
      <div class="control-bar">
        <!-- 项目范围切换器 -->
        <div class="scope-switcher">
          <button
            :class="['scope-btn', { active: projectScope === 'current' }]"
            @click="handleProjectScopeChange('current')"
            title="查看当前项目统计"
          >
            <span class="codicon codicon-file-directory"></span>
            当前项目
          </button>
          <button
            :class="['scope-btn', { active: projectScope === 'all' }]"
            @click="handleProjectScopeChange('all')"
            title="查看所有项目统计"
          >
            <span class="codicon codicon-globe"></span>
            所有项目
          </button>
        </div>

        <!-- 日期范围筛选器 -->
        <div class="date-filter">
          <button
            v-for="range in dateRanges"
            :key="range.value"
            :class="['filter-btn', { active: selectedDateRange === range.value }]"
            @click="handleDateRangeChange(range.value)"
          >
            {{ range.label }}
          </button>
        </div>

        <!-- 操作按钮组 -->
        <div class="action-group">
          <button class="action-btn" @click="handleRefresh" title="刷新数据">
            <span class="codicon codicon-refresh"></span>
          </button>
        </div>
      </div>

      <!-- 标签页导航 -->
      <div class="tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          :class="['tab', { active: activeTab === tab.id }]"
          @click="handleTabChange(tab.id)"
        >
          <span :class="`codicon ${tab.icon}`"></span>
          {{ tab.label }}
        </button>
      </div>

      <!-- 标签页内容 -->
      <div class="tab-content">
        <template v-if="statistics">
          <!-- Overview 标签页 -->
          <div v-if="activeTab === 'overview'" class="tab-panel">
          <!-- 项目信息（仅显示项目名称） -->
          <div v-if="statistics" class="project-info-header">
            <h3 class="project-title">
              <span :class="`codicon ${projectScope === 'current' ? 'codicon-file-directory' : 'codicon-globe'}`"></span>
              {{ statistics.projectName }}
            </h3>
          </div>

          <!-- 总览卡片 -->
          <div class="overview-cards">
            <div class="stat-card">
              <div class="card-header">
                <span class="card-icon cost-icon">
                  <span class="codicon codicon-credit-card"></span>
                </span>
                <span class="card-title">总消费</span>
              </div>
              <div class="card-value">${{ statistics.estimatedCost.toFixed(4) }}</div>
              <div v-if="statistics.weeklyComparison" class="card-trend" :class="getTrendClass(statistics.weeklyComparison.trends.cost)">
                <span class="codicon" :class="getTrendIcon(statistics.weeklyComparison.trends.cost)"></span>
                <span>较上周 {{ formatTrend(statistics.weeklyComparison.trends.cost) }}</span>
              </div>
            </div>

            <div class="stat-card">
              <div class="card-header">
                <span class="card-icon sessions-icon">
                  <span class="codicon codicon-comment-discussion"></span>
                </span>
                <span class="card-title">总会话</span>
              </div>
              <div class="card-value">{{ statistics.totalSessions }}</div>
              <div v-if="statistics.weeklyComparison" class="card-trend" :class="getTrendClass(statistics.weeklyComparison.trends.sessions)">
                <span class="codicon" :class="getTrendIcon(statistics.weeklyComparison.trends.sessions)"></span>
                <span>较上周 {{ formatTrend(statistics.weeklyComparison.trends.sessions) }}</span>
              </div>
            </div>

            <div class="stat-card">
              <div class="card-header">
                <span class="card-icon tokens-icon">
                  <span class="codicon codicon-symbol-namespace"></span>
                </span>
                <span class="card-title">总 Token</span>
              </div>
              <div class="card-value">{{ formattedTotalTokens }}</div>
              <div v-if="statistics.weeklyComparison" class="card-trend" :class="getTrendClass(statistics.weeklyComparison.trends.tokens)">
                <span class="codicon" :class="getTrendIcon(statistics.weeklyComparison.trends.tokens)"></span>
                <span>较上周 {{ formatTrend(statistics.weeklyComparison.trends.tokens) }}</span>
              </div>
            </div>

            <div class="stat-card">
              <div class="card-header">
                <span class="card-icon average-icon">
                  <span class="codicon codicon-graph-line"></span>
                </span>
                <span class="card-title">平均/会话</span>
              </div>
              <div class="card-value">${{ avgCostPerSession.toFixed(4) }}</div>
            </div>
          </div>

          <!-- Token 分解 -->
          <div class="section">
            <h4 class="section-title">Token 使用分解</h4>
            <div class="token-breakdown">
              <div class="breakdown-item">
                <div class="breakdown-header">
                  <span class="breakdown-label">
                    <span class="breakdown-dot input-dot"></span>
                    输入 Token
                  </span>
                  <span class="breakdown-value">{{ formatNumber(statistics.totalUsage.inputTokens) }}</span>
                </div>
                <div class="breakdown-bar">
                  <div class="bar-fill input-bar" :style="{ width: getTokenPercentage('inputTokens') + '%' }"></div>
                </div>
              </div>

              <div class="breakdown-item">
                <div class="breakdown-header">
                  <span class="breakdown-label">
                    <span class="breakdown-dot output-dot"></span>
                    输出 Token
                  </span>
                  <span class="breakdown-value">{{ formatNumber(statistics.totalUsage.outputTokens) }}</span>
                </div>
                <div class="breakdown-bar">
                  <div class="bar-fill output-bar" :style="{ width: getTokenPercentage('outputTokens') + '%' }"></div>
                </div>
              </div>

              <div class="breakdown-item">
                <div class="breakdown-header">
                  <span class="breakdown-label">
                    <span class="breakdown-dot cache-write-dot"></span>
                    缓存写入
                  </span>
                  <span class="breakdown-value">{{ formatNumber(statistics.totalUsage.cacheWriteTokens) }}</span>
                </div>
                <div class="breakdown-bar">
                  <div class="bar-fill cache-write-bar" :style="{ width: getTokenPercentage('cacheWriteTokens') + '%' }"></div>
                </div>
              </div>

              <div class="breakdown-item">
                <div class="breakdown-header">
                  <span class="breakdown-label">
                    <span class="breakdown-dot cache-read-dot"></span>
                    缓存读取
                  </span>
                  <span class="breakdown-value">{{ formatNumber(statistics.totalUsage.cacheReadTokens) }}</span>
                </div>
                <div class="breakdown-bar">
                  <div class="bar-fill cache-read-bar" :style="{ width: getTokenPercentage('cacheReadTokens') + '%' }"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- 最常用模型 Top 3 -->
          <div v-if="statistics.byModel && statistics.byModel.length > 0" class="section">
            <h4 class="section-title">最常用模型</h4>
            <div class="model-summary">
              <div v-for="(model, index) in statistics.byModel.slice(0, 3)" :key="model.model" class="model-card">
                <div class="model-rank">#{{ index + 1 }}</div>
                <div class="model-info">
                  <div class="model-name">{{ model.model }}</div>
                  <div class="model-stats">
                    <span>{{ model.sessionCount }} 会话</span>
                    <span class="separator">•</span>
                    <span>${{ model.totalCost.toFixed(4) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Models 标签页 -->
        <div v-if="activeTab === 'models'" class="tab-panel">
          <div v-if="statistics.byModel && statistics.byModel.length > 0" class="models-list">
            <div v-for="model in statistics.byModel" :key="model.model" class="model-item">
              <div class="model-header">
                <div class="model-title">
                  <span class="codicon codicon-circuit-board"></span>
                  {{ model.model }}
                </div>
                <div class="model-cost">${{ model.totalCost.toFixed(4) }}</div>
              </div>
              <div class="model-details">
                <div class="detail-item">
                  <span class="detail-label">会话数</span>
                  <span class="detail-value">{{ model.sessionCount }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">总 Token</span>
                  <span class="detail-value">{{ formatNumber(model.totalTokens) }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">输入 Token</span>
                  <span class="detail-value">{{ formatNumber(model.inputTokens) }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">输出 Token</span>
                  <span class="detail-value">{{ formatNumber(model.outputTokens) }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">缓存写入</span>
                  <span class="detail-value">{{ formatNumber(model.cacheCreationTokens) }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">缓存读取</span>
                  <span class="detail-value">{{ formatNumber(model.cacheReadTokens) }}</span>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">
            <span class="codicon codicon-info"></span>
            <p>暂无模型统计数据</p>
          </div>
        </div>

        <!-- Sessions 标签页 -->
        <div v-if="activeTab === 'sessions'" class="tab-panel">
          <div class="section">
            <div class="section-header">
              <h4 class="section-title">最近会话</h4>
              <div class="sort-buttons">
                <button
                  :class="['sort-btn', { active: sortBy === 'cost' }]"
                  @click="handleSortChange('cost')"
                  title="按消费排序"
                >
                  <span class="codicon codicon-credit-card"></span>
                  按金额
                </button>
                <button
                  :class="['sort-btn', { active: sortBy === 'time' }]"
                  @click="handleSortChange('time')"
                  title="按时间排序"
                >
                  <span class="codicon codicon-clock"></span>
                  按时间
                </button>
              </div>
            </div>
            <div class="sessions-list">
              <div v-for="(session, index) in paginatedSessions" :key="session.sessionId" class="session-item">
                <div class="session-rank">{{ (currentPage - 1) * pageSize + index + 1 }}</div>
                <div class="session-info">
                  <div class="session-title">{{ session.summary || session.sessionId }}</div>
                  <div class="session-meta">
                    <span class="session-model">{{ session.model }}</span>
                    <span class="separator">•</span>
                    <span class="session-time">{{ formatTime(session.timestamp) }}</span>
                  </div>
                </div>
                <div class="session-stats">
                  <span class="session-cost">${{ session.cost.toFixed(4) }}</span>
                  <span class="session-tokens" :title="`输入: ${session.usage.inputTokens} | 输出: ${session.usage.outputTokens}`">
                    <span class="codicon codicon-symbol-namespace"></span>
                    {{ formatNumber(session.usage.totalTokens) }}
                  </span>
                </div>
              </div>

              <div v-if="sortedSessions.length === 0" class="empty-sessions">
                <span class="codicon codicon-info"></span>
                <p>{{ projectScope === 'current' ? '当前项目暂无会话记录' : '暂无会话记录' }}</p>
              </div>
            </div>

            <!-- 分页控制 -->
            <div v-if="totalPages > 1" class="pagination">
              <button class="page-btn" :disabled="currentPage === 1" @click="currentPage--">
                <span class="codicon codicon-chevron-left"></span>
              </button>
              <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
              <button class="page-btn" :disabled="currentPage === totalPages" @click="currentPage++">
                <span class="codicon codicon-chevron-right"></span>
              </button>
            </div>
          </div>
        </div>

        <!-- Timeline 标签页 -->
        <div v-if="activeTab === 'timeline'" class="tab-panel">
          <div v-if="statistics.dailyUsage && statistics.dailyUsage.length > 0" class="section">
            <h4 class="section-title">每日使用趋势</h4>
            <div class="daily-chart-minimal">
              <div class="chart-header">
                <div class="chart-title">使用</div>
              </div>
              <div class="chart-container-minimal">
                <!-- Y轴标签 -->
                <div class="y-axis">
                  <div class="y-label">${{ getMaxCost().toFixed(2) }}</div>
                  <div class="y-label">${{ (getMaxCost() / 2).toFixed(2) }}</div>
                  <div class="y-label">$0.00</div>
                </div>

                <!-- 图表区域 -->
                <div class="chart-content">
                  <!-- 网格线 -->
                  <div class="grid-lines">
                    <div class="grid-line"></div>
                    <div class="grid-line"></div>
                    <div class="grid-line"></div>
                  </div>

                  <!-- 柱状图 -->
                  <div class="chart-bars-minimal">
                    <div
                      v-for="day in statistics.dailyUsage.slice(-7)"
                      :key="day.date"
                      class="chart-bar-item"
                      @mouseenter="showDayTooltip($event, day)"
                      @mouseleave="hideDayTooltip"
                    >
                      <div class="bar-minimal" :style="{ height: getDayBarHeightMinimal(day.cost) + '%' }"></div>
                      <div class="bar-label">{{ formatChartDateMinimal(day.date) }}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="chart-footer">
                <div class="chart-subtitle">使用时间线</div>
              </div>

              <!-- Tooltip -->
              <div v-if="tooltip.visible" class="chart-tooltip-minimal" :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }">
                <div class="tooltip-date">{{ tooltip.data?.date }}</div>
                <div class="tooltip-row">
                  <span>消费:</span>
                  <span>${{ tooltip.data?.cost.toFixed(4) }}</span>
                </div>
                <div class="tooltip-row">
                  <span>会话:</span>
                  <span>{{ tooltip.data?.sessions }}</span>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">
            <span class="codicon codicon-graph"></span>
            <p>暂无时间线数据</p>
          </div>
        </div>
        </template>
        <div v-else class="empty-state empty-tab-placeholder">
          <span class="codicon codicon-graph"></span>
          <p v-if="error">{{ error }}</p>
          <p v-else>{{ projectScope === 'current' ? '当前项目暂无使用数据' : '暂无使用数据' }}</p>
          <button class="action-btn" @click="handleRefresh">
            <span class="codicon codicon-refresh"></span>
            刷新数据
          </button>
        </div>
      </div>

      <!-- 更新时间 -->
      <div v-if="statistics" class="last-update">
        最后更新: {{ formatLastUpdate }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useUsageStore, type DailyUsage } from '../stores/usageStore';

const usageStore = useUsageStore();

// 响应式数据
const currentPage = ref(1);
const pageSize = 10;

// Tooltip 状态
const tooltip = ref<{
  visible: boolean;
  x: number;
  y: number;
  data: DailyUsage | null;
}>({
  visible: false,
  x: 0,
  y: 0,
  data: null
});

// 日期范围选项
const dateRanges = [
  { label: '最近 7 天', value: '7d' as const },
  { label: '最近 30 天', value: '30d' as const },
  { label: '全部时间', value: 'all' as const }
];

// 标签页定义
const tabs = [
  { id: 'overview', label: '概览', icon: 'codicon-dashboard' },
  { id: 'models', label: '按模型', icon: 'codicon-circuit-board' },
  { id: 'sessions', label: '会话', icon: 'codicon-comment-discussion' },
  { id: 'timeline', label: '时间线', icon: 'codicon-graph-line' }
];

// 从 store 获取数据
const statistics = computed(() => usageStore.statistics);
const loading = computed(() => usageStore.loading);
const error = computed(() => usageStore.error);
const formattedTotalTokens = computed(() => usageStore.formattedTotalTokens);
const avgCostPerSession = computed(() => usageStore.avgCostPerSession);
const lastUpdate = computed(() => usageStore.lastUpdate);
const selectedDateRange = computed(() => usageStore.selectedDateRange);
const activeTab = computed(() => usageStore.activeTab);
const projectScope = computed(() => usageStore.projectScope);

// 排序方式
const sortBy = ref<'cost' | 'time'>('cost');  // 默认按消费排序

// 排序后的会话列表（限制最多显示100条）
const sortedSessions = computed(() => {
  if (!statistics.value) return [];
  // 根据选择的排序方式排序
  const sorted = [...statistics.value.sessions].sort((a, b) => {
    if (sortBy.value === 'cost') {
      // 按消费金额降序排序（金额高的在前）
      const costDiff = b.cost - a.cost;
      // 如果金额相同，则按时间排序（最新的在前）
      if (costDiff === 0) {
        // 时间戳已经是毫秒单位
        const timeA = Number(a.timestamp) || 0;
        const timeB = Number(b.timestamp) || 0;
        return timeB - timeA;
      }
      return costDiff;
    } else {
      // 按时间戳倒序排序（最新的在前）
      // 时间戳已经是毫秒单位
      const timeA = Number(a.timestamp) || 0;
      const timeB = Number(b.timestamp) || 0;
      return timeB - timeA;
    }
  });
  // 只取前100条用于展示（从200条中选出最相关的100条）
  return sorted.slice(0, 100);
});

// 分页会话列表
const paginatedSessions = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  const end = start + pageSize;
  return sortedSessions.value.slice(start, end);
});

const totalPages = computed(() => {
  return Math.ceil(sortedSessions.value.length / pageSize);
});

// 格式化最后更新时间
const formatLastUpdate = computed(() => {
  const date = new Date(lastUpdate.value);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;

  const days = Math.floor(hours / 24);
  return `${days}天前`;
});

// 格式化数字
function formatNumber(num: number): string {
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
  return num.toString();
}

// 格式化时间
function formatTime(timestamp: number): string {
  // 时间戳已经从后端转换为毫秒单位
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  // 防止负数时间差（未来时间）
  if (diff < 0) {
    return '刚刚';
  }

  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(hours / 24);

  if (hours < 1) {
    const minutes = Math.floor(diff / 60000);
    if (minutes <= 0) return '刚刚';
    return `${minutes}分钟前`;
  } else if (days < 1) {
    return `${hours}小时前`;
  } else if (days < 7) {
    return `${days}天前`;
  } else {
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  }
}

// 获取 Token 百分比
function getTokenPercentage(type: 'inputTokens' | 'outputTokens' | 'cacheWriteTokens' | 'cacheReadTokens'): number {
  if (!statistics.value) return 0;
  const total = statistics.value.totalUsage.totalTokens;
  if (total === 0) return 0;
  return (statistics.value.totalUsage[type] / total) * 100;
}

// 获取趋势类名
function getTrendClass(trend: number): string {
  if (trend > 0) return 'trend-up';
  if (trend < 0) return 'trend-down';
  return 'trend-neutral';
}

// 获取趋势图标
function getTrendIcon(trend: number): string {
  if (trend > 0) return 'codicon-arrow-up';
  if (trend < 0) return 'codicon-arrow-down';
  return 'codicon-dash';
}

// 格式化趋势百分比
function formatTrend(trend: number): string {
  const absValue = Math.abs(trend);
  if (absValue < 1) return '无变化';
  const sign = trend > 0 ? '+' : '';
  return `${sign}${trend.toFixed(1)}%`;
}

// 计算每天柱状图的高度百分比
function getDayBarHeight(value: number, type: 'cost' | 'sessions'): number {
  if (!statistics.value || !statistics.value.dailyUsage) return 0;

  const days = statistics.value.dailyUsage.slice(-30);
  if (days.length === 0) return 0;

  if (type === 'cost') {
    const maxCost = Math.max(...days.map(d => d.cost), 0.01);
    return (value / maxCost) * 80;
  } else {
    const maxSessions = Math.max(...days.map(d => d.sessions), 1);
    return (value / maxSessions) * 80;
  }
}

// 格式化图表日期
function formatChartDate(dateStr: string): string {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day}`;
}

// 格式化极简图表日期
function formatChartDateMinimal(dateStr: string): string {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}月${day}日`;
}

// 获取最大成本
function getMaxCost(): number {
  if (!statistics.value || !statistics.value.dailyUsage) return 0;
  const days = statistics.value.dailyUsage.slice(-7);
  if (days.length === 0) return 0;
  return Math.max(...days.map(d => d.cost), 0.01);
}

// 计算极简柱状图高度
function getDayBarHeightMinimal(value: number): number {
  const maxCost = getMaxCost();
  if (maxCost === 0) return 0;
  return (value / maxCost) * 100;
}

// Tooltip 显示/隐藏
function showDayTooltip(event: MouseEvent, day: DailyUsage) {
  const rect = (event.target as HTMLElement).getBoundingClientRect();
  tooltip.value = {
    visible: true,
    x: rect.left + rect.width / 2,
    y: rect.top - 10,
    data: day
  };
}

function hideDayTooltip() {
  tooltip.value.visible = false;
}

// 事件处理
async function handleRefresh() {
  await usageStore.refresh();
}

async function handleDateRangeChange(range: '7d' | '30d' | 'all') {
  await usageStore.setDateRange(range);
  currentPage.value = 1; // 重置分页
}

async function handleProjectScopeChange(scope: 'current' | 'all') {
  await usageStore.setProjectScope(scope);
  currentPage.value = 1; // 重置分页
}

function handleTabChange(tab: string) {
  usageStore.setActiveTab(tab);
  currentPage.value = 1; // 重置分页
}

function handleExportCSV() {
  usageStore.exportToCSV();
}

function handleExportJSON() {
  usageStore.exportToJSON();
}

// 处理排序方式变更
function handleSortChange(sort: 'cost' | 'time') {
  sortBy.value = sort;
  currentPage.value = 1; // 重置分页
}

// 监听标签页变化，重置分页
watch(activeTab, () => {
  currentPage.value = 1;
});

// 生命周期
onMounted(async () => {
  await usageStore.initialize();
});
</script>

<style scoped>
.usage-statistics {
  width: 100%;
}

/* 加载状态 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: var(--vscode-descriptionForeground);
}

.loading-state .codicon {
  font-size: 32px;
  margin-bottom: 16px;
}

/* 主要内容 */
.statistics-content {
  padding: 0;
}

/* 项目信息头部 */
.project-info-header {
  margin-bottom: 20px;
}

.project-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: var(--vscode-foreground);
}

.project-title .codicon {
  color: var(--vscode-textLink-foreground);
  font-size: 18px;
}

/* 控制栏 */
.control-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--vscode-panel-border);
  flex-wrap: wrap;
}

/* 项目范围切换器 */
.scope-switcher {
  display: flex;
  gap: 4px;
  background: var(--vscode-input-background);
  border-radius: 6px;
  padding: 4px;
  flex: 0 0 auto; /* 不占用过多空间 */
}

.scope-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--vscode-foreground);
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;
  white-space: nowrap;
}

.scope-btn:hover {
  background: var(--vscode-list-hoverBackground);
}

.scope-btn.active {
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
}

/* 日期筛选器 */
.date-filter {
  display: flex;
  gap: 4px;
  background: var(--vscode-input-background);
  border-radius: 6px;
  padding: 4px;
  flex: 0 0 auto; /* 不占用过多空间 */
}

.filter-btn {
  padding: 6px 14px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--vscode-foreground);
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;
}

.filter-btn:hover {
  background: var(--vscode-list-hoverBackground);
}

.filter-btn.active {
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
}

/* 操作按钮 */
.action-group {
  display: flex;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--vscode-button-border);
  border-radius: 4px;
  background: transparent;
  color: var(--vscode-foreground);
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.action-btn:hover {
  background: var(--vscode-toolbar-hoverBackground);
}

/* 标签页 */
.tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--vscode-panel-border);
  overflow-x: auto; /* 支持横向滚动 */
  overflow-y: hidden;
  /* 隐藏滚动条但保持功能 */
  scrollbar-width: thin; /* Firefox */
  -ms-overflow-style: -ms-autohiding-scrollbar; /* IE/Edge */
}

/* WebKit 浏览器滚动条样式 */
.tabs::-webkit-scrollbar {
  height: 4px;
}

.tabs::-webkit-scrollbar-track {
  background: transparent;
}

.tabs::-webkit-scrollbar-thumb {
  background: var(--vscode-scrollbarSlider-background);
  border-radius: 2px;
}

.tabs::-webkit-scrollbar-thumb:hover {
  background: var(--vscode-scrollbarSlider-hoverBackground);
}

.tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--vscode-descriptionForeground);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
  white-space: nowrap; /* 不换行 */
  flex-shrink: 0; /* 防止被压缩 */
}

.tab:hover {
  color: var(--vscode-foreground);
  background: var(--vscode-list-hoverBackground);
}

.tab.active {
  color: var(--vscode-textLink-foreground);
  border-bottom-color: var(--vscode-textLink-foreground);
  background: transparent;
}

/* 标签页内容 */
.tab-content {
  min-height: 400px;
}

.tab-panel {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 总览卡片 */
.overview-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.stat-card {
  padding: 16px;
  background: var(--vscode-sideBar-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 8px;
  transition: all 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  color: #fff;
}

.cost-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.sessions-icon {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.tokens-icon {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.average-icon {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.card-title {
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
}

.card-value {
  font-size: 24px;
  font-weight: 600;
  color: var(--vscode-foreground);
}

/* 趋势指示器 */
.card-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 4px;
}

.trend-up {
  color: #10b981;
  background: rgba(16, 185, 129, 0.1);
}

.trend-down {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

.trend-neutral {
  color: var(--vscode-descriptionForeground);
  background: var(--vscode-input-background);
}

/* 章节 */
.section {
  margin-bottom: 32px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

/* 排序按钮组 */
.sort-buttons {
  display: flex;
  gap: 4px;
  background: var(--vscode-input-background);
  border-radius: 6px;
  padding: 2px;
}

.sort-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--vscode-foreground);
  cursor: pointer;
  font-size: 11px;
  font-weight: 500;
  transition: all 0.2s;
  white-space: nowrap;
}

.sort-btn:hover {
  background: var(--vscode-list-hoverBackground);
}

.sort-btn.active {
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 16px 0;
  color: var(--vscode-foreground);
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.small-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid var(--vscode-button-border);
  border-radius: 4px;
  background: transparent;
  color: var(--vscode-foreground);
  cursor: pointer;
  font-size: 11px;
}

.small-btn:hover {
  background: var(--vscode-toolbar-hoverBackground);
}

/* Token 分解 */
.token-breakdown {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.breakdown-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.breakdown-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.breakdown-label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--vscode-descriptionForeground);
}

.breakdown-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.input-dot {
  background: #3b82f6;
}

.output-dot {
  background: #10b981;
}

.cache-write-dot {
  background: #f59e0b;
}

.cache-read-dot {
  background: #8b5cf6;
}

.breakdown-value {
  font-weight: 500;
  color: var(--vscode-foreground);
}

.breakdown-bar {
  height: 8px;
  background: var(--vscode-input-background);
  border-radius: 4px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.input-bar {
  background: #3b82f6;
}

.output-bar {
  background: #10b981;
}

.cache-write-bar {
  background: #f59e0b;
}

.cache-read-bar {
  background: #8b5cf6;
}

/* 模型概要 */
.model-summary {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.model-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--vscode-sideBar-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 6px;
}

.model-rank {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.model-info {
  flex: 1;
}

.model-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--vscode-foreground);
  margin-bottom: 4px;
}

.model-stats {
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
}

.separator {
  margin: 0 6px;
}

/* 模型列表 */
.models-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.model-item {
  padding: 16px;
  background: var(--vscode-sideBar-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 8px;
}

.model-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--vscode-panel-border);
}

.model-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--vscode-foreground);
}

.model-cost {
  font-size: 18px;
  font-weight: 600;
  color: var(--vscode-textLink-foreground);
}

.model-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-label {
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
}

.detail-value {
  font-size: 13px;
  font-weight: 500;
  color: var(--vscode-foreground);
}

/* 会话列表 */
.sessions-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.session-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--vscode-sideBar-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 6px;
  transition: all 0.2s;
}

.session-item:hover {
  background: var(--vscode-list-hoverBackground);
}

.session-rank {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}

.session-info {
  flex: 1;
  min-width: 0;
}

.session-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--vscode-foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 4px;
}

.session-meta {
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
}

.session-model {
  font-weight: 500;
}

.session-stats {
  display: flex;
  gap: 12px;
  align-items: center;
}

.session-cost {
  font-size: 13px;
  font-weight: 600;
  color: var(--vscode-textLink-foreground);
}

.session-tokens {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
}

/* 分页 */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 16px;
}

.page-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--vscode-button-border);
  border-radius: 4px;
  background: transparent;
  color: var(--vscode-foreground);
  cursor: pointer;
}

.page-btn:hover:not(:disabled) {
  background: var(--vscode-toolbar-hoverBackground);
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  font-size: 12px;
  color: var(--vscode-foreground);
}

/* 极简时间线图表 */
.daily-chart-minimal {
  background: var(--vscode-sideBar-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 8px;
  padding: 24px;
  position: relative;
  overflow: hidden;
}

.chart-header {
  margin-bottom: 16px;
}

.chart-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--vscode-foreground);
}

.chart-container-minimal {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  overflow-x: auto;
  overflow-y: hidden;
}

/* Y轴 */
.y-axis {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 50px;
  padding: 8px 0;
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
}

.y-label {
  text-align: right;
  line-height: 1;
}

/* 图表内容区域 */
.chart-content {
  flex: 1;
  position: relative;
  min-height: 250px;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

/* 网格线 */
.grid-lines {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 30px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  pointer-events: none;
}

.grid-line {
  height: 1px;
  background: var(--vscode-panel-border);
  opacity: 0.3;
}

/* 柱状图区域 */
.chart-bars-minimal {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  gap: 8px;
  height: 220px;
  padding: 0 12px;
  position: relative;
  z-index: 1;
  min-width: 400px;
}

.chart-bar-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  height: 100%;
  cursor: pointer;
  max-width: 80px;
  min-width: 40px;
}

.bar-minimal {
  width: 100%;
  background: linear-gradient(180deg, #7c3aed 0%, #a78bfa 100%);
  border-radius: 4px 4px 0 0;
  transition: all 0.2s ease;
  min-height: 2px;
}

.chart-bar-item:hover .bar-minimal {
  opacity: 0.8;
  transform: translateY(-2px);
}

.bar-label {
  margin-top: 12px;
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
  white-space: nowrap;
  text-align: center;
}

.chart-footer {
  margin-top: 8px;
  text-align: center;
}

.chart-subtitle {
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
  opacity: 0.7;
}

/* 极简 Tooltip */
.chart-tooltip-minimal {
  position: fixed;
  transform: translate(-50%, -100%);
  padding: 8px 12px;
  background: var(--vscode-dropdown-background);
  border: 1px solid var(--vscode-dropdown-border);
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  pointer-events: none;
  font-size: 11px;
  min-width: 120px;
  margin-bottom: 8px;
}

.chart-tooltip-minimal .tooltip-date {
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--vscode-foreground);
  font-size: 12px;
}

.chart-tooltip-minimal .tooltip-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 2px;
  color: var(--vscode-descriptionForeground);
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: var(--vscode-descriptionForeground);
}

.empty-state .codicon {
  font-size: 48px;
  opacity: 0.5;
  margin-bottom: 16px;
}

.empty-tab-placeholder {
  min-height: 400px;
  width: 100%;
}

.empty-sessions {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  color: var(--vscode-descriptionForeground);
}

.empty-sessions .codicon {
  font-size: 32px;
  opacity: 0.5;
  margin-bottom: 8px;
}

/* 最后更新 */
.last-update {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--vscode-panel-border);
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
  text-align: center;
}

/* 响应式 */
@media (max-width: 768px) {
  .overview-cards {
    grid-template-columns: 1fr;
  }

  .control-bar {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .scope-switcher {
    width: 100%;
    flex: 1 0 auto; /* 在小屏幕下占满宽度 */
  }

  .scope-btn {
    flex: 1;
    justify-content: center;
  }

  .date-filter {
    width: 100%;
    flex: 1 0 auto; /* 在小屏幕下占满宽度 */
  }

  .filter-btn {
    flex: 1;
    justify-content: center;
  }

  .tabs {
    /* 已经在主样式中设置了 overflow-x: auto */
    margin-left: -12px; /* 对齐到页面边缘,增加滚动空间 */
    margin-right: -12px;
    padding-left: 12px;
    padding-right: 12px;
  }

  .model-details {
    grid-template-columns: 1fr 1fr;
  }

  /* 图表适配 */
  .daily-chart-minimal {
    padding: 16px;
  }

  .chart-container-minimal {
    gap: 8px;
  }

  .y-axis {
    min-width: 40px;
    font-size: 10px;
  }

  .chart-content {
    min-height: 200px;
  }

  .chart-bars-minimal {
    height: 180px;
    min-width: 350px;
    padding: 0 8px;
    gap: 4px;
  }

  .chart-bar-item {
    min-width: 35px;
  }

  .bar-label {
    font-size: 10px;
    margin-top: 8px;
  }

  .chart-title {
    font-size: 14px;
  }

  .chart-subtitle {
    font-size: 11px;
  }
}
</style>
