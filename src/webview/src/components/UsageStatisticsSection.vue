<template>
  <div class="usage-statistics">
    <!-- Loading state -->
    <div v-if="loading" class="loading-state">
      <span class="codicon codicon-loading codicon-modifier-spin"></span>
      <p>Loading statistics...</p>
    </div>

    <!-- Main content -->
    <div v-else class="statistics-content">
      <!-- Top control bar -->
      <div class="control-bar">
        <!-- Project scope switcher -->
        <div class="scope-switcher">
          <button
            :class="['scope-btn', { active: projectScope === 'current' }]"
            @click="handleProjectScopeChange('current')"
            title="View statistics for current project"
          >
            <span class="codicon codicon-file-directory"></span>
            Current project
          </button>
          <button
            :class="['scope-btn', { active: projectScope === 'all' }]"
            @click="handleProjectScopeChange('all')"
            title="View statistics for all projects"
          >
            <span class="codicon codicon-globe"></span>
            All projects
          </button>
        </div>

        <!-- Date range filter -->
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

        <!-- Action button group -->
        <div class="action-group">
          <button class="action-btn" @click="handleRefresh" title="Refresh data">
            <span class="codicon codicon-refresh"></span>
          </button>
        </div>
      </div>

      <!-- Tab navigation -->
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

      <!-- Tab content -->
      <div class="tab-content">
        <template v-if="statistics">
          <!-- Overview tab -->
          <div v-if="activeTab === 'overview'" class="tab-panel">
          <!-- Project info (name only) -->
          <div v-if="statistics" class="project-info-header">
            <h3 class="project-title">
              <span :class="`codicon ${projectScope === 'current' ? 'codicon-file-directory' : 'codicon-globe'}`"></span>
              {{ statistics.projectName }}
            </h3>
          </div>

          <!-- Overview cards -->
          <div class="overview-cards">
            <div class="stat-card">
              <div class="card-header">
                <span class="card-icon cost-icon">
                  <span class="codicon codicon-credit-card"></span>
                </span>
                 <span class="card-title">Total Spend</span>
              </div>
              <div class="card-value">${{ statistics.estimatedCost.toFixed(4) }}</div>
              <div v-if="statistics.weeklyComparison" class="card-trend" :class="getTrendClass(statistics.weeklyComparison.trends.cost)">
                <span class="codicon" :class="getTrendIcon(statistics.weeklyComparison.trends.cost)"></span>
                 <span>Compared to last week {{ formatTrend(statistics.weeklyComparison.trends.cost) }}</span>
              </div>
            </div>

            <div class="stat-card">
              <div class="card-header">
                <span class="card-icon sessions-icon">
                  <span class="codicon codicon-comment-discussion"></span>
                </span>
                 <span class="card-title">Total Sessions</span>
              </div>
              <div class="card-value">{{ statistics.totalSessions }}</div>
              <div v-if="statistics.weeklyComparison" class="card-trend" :class="getTrendClass(statistics.weeklyComparison.trends.sessions)">
                <span class="codicon" :class="getTrendIcon(statistics.weeklyComparison.trends.sessions)"></span>
                 <span>Compared to last week {{ formatTrend(statistics.weeklyComparison.trends.sessions) }}</span>
              </div>
            </div>

            <div class="stat-card">
              <div class="card-header">
                <span class="card-icon tokens-icon">
                  <span class="codicon codicon-symbol-namespace"></span>
                </span>
                 <span class="card-title">Total Tokens</span>
              </div>
              <div class="card-value">{{ formattedTotalTokens }}</div>
              <div v-if="statistics.weeklyComparison" class="card-trend" :class="getTrendClass(statistics.weeklyComparison.trends.tokens)">
                <span class="codicon" :class="getTrendIcon(statistics.weeklyComparison.trends.tokens)"></span>
                 <span>Compared to last week {{ formatTrend(statistics.weeklyComparison.trends.tokens) }}</span>
              </div>
            </div>

            <div class="stat-card">
              <div class="card-header">
                <span class="card-icon average-icon">
                  <span class="codicon codicon-graph-line"></span>
                </span>
                <span class="card-title">Avg per session</span>
              </div>
              <div class="card-value">${{ avgCostPerSession.toFixed(4) }}</div>
            </div>
          </div>

          <!-- Token breakdown -->
          <div class="section">
            <h4 class="section-title">Token breakdown</h4>
            <div class="token-breakdown">
              <div class="breakdown-item">
                <div class="breakdown-header">
                    <span class="breakdown-label">
                      <span class="breakdown-dot input-dot"></span>
                      Input Tokens
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
                    Output Tokens
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
                    Cache writes
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
                    Cache reads
                  </span>
                  <span class="breakdown-value">{{ formatNumber(statistics.totalUsage.cacheReadTokens) }}</span>
                </div>
                <div class="breakdown-bar">
                  <div class="bar-fill cache-read-bar" :style="{ width: getTokenPercentage('cacheReadTokens') + '%' }"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Top 3 models -->
          <div v-if="statistics.byModel && statistics.byModel.length > 0" class="section">
            <h4 class="section-title">Most used models</h4>
            <div class="model-summary">
              <div v-for="(model, index) in statistics.byModel.slice(0, 3)" :key="model.model" class="model-card">
                <div class="model-rank">#{{ index + 1 }}</div>
                <div class="model-info">
                  <div class="model-name">{{ model.model }}</div>
                  <div class="model-stats">
                    <span>{{ model.sessionCount }} sessions</span>
                    <span class="separator">•</span>
                    <span>${{ model.totalCost.toFixed(4) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Models tab -->
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
                  <span class="detail-label">Sessions</span>
                  <span class="detail-value">{{ model.sessionCount }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Total Tokens</span>
                  <span class="detail-value">{{ formatNumber(model.totalTokens) }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Input Tokens</span>
                  <span class="detail-value">{{ formatNumber(model.inputTokens) }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Output Tokens</span>
                  <span class="detail-value">{{ formatNumber(model.outputTokens) }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Cache write</span>
                  <span class="detail-value">{{ formatNumber(model.cacheCreationTokens) }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Cache read</span>
                  <span class="detail-value">{{ formatNumber(model.cacheReadTokens) }}</span>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">
            <span class="codicon codicon-info"></span>
            <p>No model statistics available</p>
          </div>
        </div>

        <!-- Sessions tab -->
        <div v-if="activeTab === 'sessions'" class="tab-panel">
          <div class="section">
            <div class="section-header">
              <h4 class="section-title">Recent sessions</h4>
              <div class="sort-buttons">
                <button
                  :class="['sort-btn', { active: sortBy === 'cost' }]"
                  @click="handleSortChange('cost')"
                   title="Sort by cost"
                >
                  <span class="codicon codicon-credit-card"></span>
                   By cost
                </button>
                <button
                  :class="['sort-btn', { active: sortBy === 'time' }]"
                  @click="handleSortChange('time')"
                   title="Sort by time"
                >
                  <span class="codicon codicon-clock"></span>
                   By time
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
                  <span class="session-tokens" :title="`Input: ${session.usage.inputTokens} | Output: ${session.usage.outputTokens}`">
                    <span class="codicon codicon-symbol-namespace"></span>
                    {{ formatNumber(session.usage.totalTokens) }}
                  </span>
                </div>
              </div>

              <div v-if="sortedSessions.length === 0" class="empty-sessions">
                <span class="codicon codicon-info"></span>
                <p>{{ projectScope === 'current' ? 'No session records for the current project' : 'No sessions available' }}</p>
              </div>
            </div>

            <!-- Pagination controls -->
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

        <!-- Timeline tab -->
        <div v-if="activeTab === 'timeline'" class="tab-panel">
          <div v-if="statistics.dailyUsage && statistics.dailyUsage.length > 0" class="section">
            <h4 class="section-title">Daily usage trends</h4>
            <div class="daily-chart-minimal">
              <div class="chart-header">
                <div class="chart-title">Usage</div>
              </div>
              <div class="chart-container-minimal">
                <!-- Y-axis labels -->
                <div class="y-axis">
                  <div class="y-label">${{ getMaxCost().toFixed(2) }}</div>
                  <div class="y-label">${{ (getMaxCost() / 2).toFixed(2) }}</div>
                  <div class="y-label">$0.00</div>
                </div>

                <!-- Chart area -->
                <div class="chart-content">
                  <!-- Grid lines -->
                  <div class="grid-lines">
                    <div class="grid-line"></div>
                    <div class="grid-line"></div>
                    <div class="grid-line"></div>
                  </div>

                  <!-- Bars -->
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
                <div class="chart-subtitle">Usage timeline</div>
              </div>

              <!-- Tooltip -->
              <div v-if="tooltip.visible" class="chart-tooltip-minimal" :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }">
                <div class="tooltip-date">{{ tooltip.data?.date }}</div>
                <div class="tooltip-row">
                  <span>Cost:</span>
                  <span>${{ tooltip.data?.cost.toFixed(4) }}</span>
                </div>
                <div class="tooltip-row">
                  <span>Sessions:</span>
                  <span>{{ tooltip.data?.sessions }}</span>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">
            <span class="codicon codicon-graph"></span>
            <p>No timeline data</p>
          </div>
        </div>
        </template>
        <div v-else class="empty-state empty-tab-placeholder">
          <span class="codicon codicon-graph"></span>
          <p v-if="error">{{ error }}</p>
          <p v-else>{{ projectScope === 'current' ? 'No usage data for the current project' : 'No usage data' }}</p>
          <button class="action-btn" @click="handleRefresh">
            <span class="codicon codicon-refresh"></span>
            Refresh data
          </button>
        </div>
      </div>

      <!-- Last update -->
      <div v-if="statistics" class="last-update">
        Last updated: {{ formatLastUpdate }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useUsageStore, type DailyUsage } from '../stores/usageStore';

const usageStore = useUsageStore();

// Reactive data
const currentPage = ref(1);
const pageSize = 10;

// Tooltip state
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

// Date range options
const dateRanges = [
  { label: 'Last 7 days', value: '7d' as const },
  { label: 'Last 30 days', value: '30d' as const },
  { label: 'All time', value: 'all' as const }
];

// Tab definitions
const tabs = [
  { id: 'overview', label: 'Overview', icon: 'codicon-dashboard' },
  { id: 'models', label: 'By model', icon: 'codicon-circuit-board' },
  { id: 'sessions', label: 'Sessions', icon: 'codicon-comment-discussion' },
  { id: 'timeline', label: 'Timeline', icon: 'codicon-graph-line' }
];

// Fetch data from store
const statistics = computed(() => usageStore.statistics);
const loading = computed(() => usageStore.loading);
const error = computed(() => usageStore.error);
const formattedTotalTokens = computed(() => usageStore.formattedTotalTokens);
const avgCostPerSession = computed(() => usageStore.avgCostPerSession);
const lastUpdate = computed(() => usageStore.lastUpdate);
const selectedDateRange = computed(() => usageStore.selectedDateRange);
const activeTab = computed(() => usageStore.activeTab);
const projectScope = computed(() => usageStore.projectScope);

// Sorting options
const sortBy = ref<'cost' | 'time'>('cost');  // Default sort by cost

// Sorted session list (limit to top 100 entries)
const sortedSessions = computed(() => {
  if (!statistics.value) return [];
  // Sort based on the selected sort mode
  const sorted = [...statistics.value.sessions].sort((a, b) => {
    if (sortBy.value === 'cost') {
      // Order by cost (highest first)
      const costDiff = b.cost - a.cost;
      // If cost ties, sort by time (most recent first)
      if (costDiff === 0) {
        // Timestamp already in milliseconds
        const timeA = Number(a.timestamp) || 0;
        const timeB = Number(b.timestamp) || 0;
        return timeB - timeA;
      }
      return costDiff;
    } else {
      // Sort by timestamp descending (most recent first)
      // Timestamp already in milliseconds
      const timeA = Number(a.timestamp) || 0;
      const timeB = Number(b.timestamp) || 0;
      return timeB - timeA;
    }
  });
  // Keep top 100 entries for display (from the top 200)
  return sorted.slice(0, 100);
});

// Pagination for sessions
const paginatedSessions = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  const end = start + pageSize;
  return sortedSessions.value.slice(start, end);
});

const totalPages = computed(() => {
  return Math.ceil(sortedSessions.value.length / pageSize);
});

// Format last updated
const formatLastUpdate = computed(() => {
  const date = new Date(lastUpdate.value);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minutes ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;

  const days = Math.floor(hours / 24);
  return `${days} days ago`;
});

// Format numbers
function formatNumber(num: number): string {
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
  return num.toString();
}

// Format time
function formatTime(timestamp: number): string {
  // Timestamp already converted to milliseconds
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  // Guard against negative time differences
  if (diff < 0) {
    return 'Just now';
  }

  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(hours / 24);

  if (hours < 1) {
    const minutes = Math.floor(diff / 60000);
    if (minutes <= 0) return 'Just now';
    return `${minutes} minutes ago`;
  } else if (days < 1) {
    return `${hours} hours ago`;
  } else if (days < 7) {
    return `${days} days ago`;
  } else {
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  }
}

// Get token percentages
function getTokenPercentage(type: 'inputTokens' | 'outputTokens' | 'cacheWriteTokens' | 'cacheReadTokens'): number {
  if (!statistics.value) return 0;
  const total = statistics.value.totalUsage.totalTokens;
  if (total === 0) return 0;
  return (statistics.value.totalUsage[type] / total) * 100;
}

// Get trend class
function getTrendClass(trend: number): string {
  if (trend > 0) return 'trend-up';
  if (trend < 0) return 'trend-down';
  return 'trend-neutral';
}

// Get trend icon
function getTrendIcon(trend: number): string {
  if (trend > 0) return 'codicon-arrow-up';
  if (trend < 0) return 'codicon-arrow-down';
  return 'codicon-dash';
}

// Format trend percentages
function formatTrend(trend: number): string {
  const absValue = Math.abs(trend);
  if (absValue < 1) return 'No change';
  const sign = trend > 0 ? '+' : '';
  return `${sign}${trend.toFixed(1)}%`;
}

// Compute daily bar heights
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

// Format chart dates
function formatChartDate(dateStr: string): string {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day}`;
}

// Format simplified chart dates
function formatChartDateMinimal(dateStr: string): string {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day}`;
}

// Get maximum cost
function getMaxCost(): number {
  if (!statistics.value || !statistics.value.dailyUsage) return 0;
  const days = statistics.value.dailyUsage.slice(-7);
  if (days.length === 0) return 0;
  return Math.max(...days.map(d => d.cost), 0.01);
}

// Calculate simplified bar heights
function getDayBarHeightMinimal(value: number): number {
  const maxCost = getMaxCost();
  if (maxCost === 0) return 0;
  return (value / maxCost) * 100;
}

// Show/hide tooltip
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

// Event handling
async function handleRefresh() {
  await usageStore.refresh();
}

async function handleDateRangeChange(range: '7d' | '30d' | 'all') {
  await usageStore.setDateRange(range);
  currentPage.value = 1; // Reset pagination
}

async function handleProjectScopeChange(scope: 'current' | 'all') {
  await usageStore.setProjectScope(scope);
  currentPage.value = 1; // Reset pagination
}

function handleTabChange(tab: string) {
  usageStore.setActiveTab(tab);
  currentPage.value = 1; // Reset pagination
}

function handleExportCSV() {
  usageStore.exportToCSV();
}

function handleExportJSON() {
  usageStore.exportToJSON();
}

// Handle sort mode change
function handleSortChange(sort: 'cost' | 'time') {
  sortBy.value = sort;
  currentPage.value = 1; // Reset pagination
}

// Watch tab changes and reset pagination
watch(activeTab, () => {
  currentPage.value = 1;
});

// Lifecycle
onMounted(async () => {
  await usageStore.initialize();
});
</script>

<style scoped>
.usage-statistics {
  width: 100%;
}

/* Loading state */
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

/* Main content */
.statistics-content {
  padding: 0;
}

/* Project info header */
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

/* Control bar */
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

/* Scope switcher */
.scope-switcher {
  display: flex;
  gap: 4px;
  background: var(--vscode-input-background);
  border-radius: 6px;
  padding: 4px;
  flex: 0 0 auto; /* Avoid taking too much space */
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

/* Date filter */
.date-filter {
  display: flex;
  gap: 4px;
  background: var(--vscode-input-background);
  border-radius: 6px;
  padding: 4px;
  flex: 0 0 auto; /* Avoid taking too much space */
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

/* Action buttons */
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

/* Tabs */
.tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--vscode-panel-border);
  overflow-x: auto; /* Support horizontal scrolling */
  overflow-y: hidden;
  /* Hide scrollbar while keeping functionality */
  scrollbar-width: thin; /* Firefox */
  -ms-overflow-style: -ms-autohiding-scrollbar; /* IE/Edge */
}

/* WebKit scrollbar styles */
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
  white-space: nowrap; /* Prevent wrapping */
  flex-shrink: 0; /* Prevent shrinking */
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

/* Tab content */
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

/* Overview cards */
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

/* Trend indicator */
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

/* Sections */
.section {
  margin-bottom: 32px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

/* Sort button group */
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

/* Token breakdown */
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

/* Model summary */
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

/* Model list */
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

/* Session list */
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

/* Pagination */
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

/* Minimal timeline chart */
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

/* Y-axis */
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

/* Chart area */
.chart-content {
  flex: 1;
  position: relative;
  min-height: 250px;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

/* Grid lines */
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

/* Bar area */
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

/* Minimal tooltip */
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

/* Empty state */
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

/* Last update */
.last-update {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--vscode-panel-border);
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
  text-align: center;
}

/* Responsive */
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
    flex: 1 0 auto; /* Fill width on small screens */
  }

  .scope-btn {
    flex: 1;
    justify-content: center;
  }

  .date-filter {
    width: 100%;
    flex: 1 0 auto; /* Fill width on small screens */
  }

  .filter-btn {
    flex: 1;
    justify-content: center;
  }

  .tabs {
    /* overflow-x: auto already set in main styles */
    margin-left: -12px; /* Align to page edge and add scroll padding */
    margin-right: -12px;
    padding-left: 12px;
    padding-right: 12px;
  }

  .model-details {
    grid-template-columns: 1fr 1fr;
  }

  /* Chart adjustments */
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
