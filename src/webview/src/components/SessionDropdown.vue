<template>
  <div class="session-dropdown" ref="dropdownRef">
    <!-- Trigger: current session title -->
    <button class="session-trigger" @click="toggleDropdown">
      <span class="codicon codicon-menu trigger-icon"></span>
      <span class="session-title">{{ currentTitle }}</span>
      <span class="codicon codicon-chevron-down chevron" :class="{ rotated: isOpen }"></span>
    </button>

    <!-- Dropdown panel -->
    <Transition name="dropdown-fade">
      <div v-if="isOpen" class="dropdown-panel">
        <!-- Search input -->
        <div class="search-container">
          <span class="codicon codicon-search search-icon"></span>
          <input
            ref="searchInputRef"
            v-model="searchQuery"
            type="text"
            placeholder="Find thread..."
            class="search-input"
            @keydown.escape="closeDropdown"
            @keydown.enter="selectFirstResult"
            @keydown.down.prevent="focusNextItem"
            @keydown.up.prevent="focusPrevItem"
          >
        </div>

        <!-- Session list -->
        <div class="session-list custom-scroll-container">
          <div
            v-for="(session, index) in filteredSessions"
            :key="session.sessionId.value || `session-${index}`"
            class="session-item"
            :class="{ active: isActiveSession(session), focused: focusedIndex === index }"
            @click="selectSession(session)"
            @mouseenter="hoveredSessionId = session.sessionId.value"
            @mouseleave="hoveredSessionId = null"
          >
            <!-- Indicator dot -->
            <div class="session-indicator" :class="{ current: isActiveSession(session) }"></div>
            
            <!-- Session name -->
            <span class="session-name">{{ session.summary.value || 'Untitled' }}</span>
            
            <!-- Time ago -->
            <span class="session-time">{{ formatRelativeTime(session.lastModifiedTime.value) }}</span>
            
            <!-- Code change stats (placeholder - would need real data) -->
            <div class="session-stats">
              <span class="stat-add">+{{ getSessionStats(session).added }}</span>
              <span class="stat-remove">-{{ getSessionStats(session).removed }}</span>
              <span class="stat-modify">~{{ getSessionStats(session).modified }}</span>
            </div>
            
            <!-- Git branch -->
            <span class="session-branch">{{ getSessionBranch(session) }}</span>
            
            <!-- More menu (3 dots) -->
            <button 
              class="more-btn"
              :class="{ visible: hoveredSessionId === session.sessionId.value || menuOpenFor === session.sessionId.value }"
              @click.stop="toggleMenu(session.sessionId.value, $event)"
            >
              <span class="codicon codicon-ellipsis"></span>
            </button>
          </div>

          <!-- Empty state -->
          <div v-if="filteredSessions.length === 0" class="empty-state">
            <span class="codicon codicon-search-stop"></span>
            <span>No threads found</span>
          </div>
        </div>

        <!-- Footer actions -->
        <div class="dropdown-footer">
          <button class="footer-btn" @click="viewAllSessions">
            <span class="codicon codicon-list-flat"></span>
            <span>View All</span>
          </button>
        </div>
      </div>
    </Transition>

    <!-- Context menu -->
    <Transition name="menu-fade">
      <div 
        v-if="menuOpenFor" 
        class="context-menu"
        :style="menuPosition"
        ref="contextMenuRef"
      >
        <button class="menu-item" @click="copySessionId">
          <span class="codicon codicon-copy"></span>
          <span>Copy Session ID</span>
        </button>
        <button class="menu-item danger" @click="deleteSession">
          <span class="codicon codicon-trash"></span>
          <span>Delete</span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted, inject } from 'vue';
import { RuntimeKey } from '../composables/runtimeContext';
import { useSessionStore } from '../composables/useSessionStore';
import { useSession } from '../composables/useSession';
import { useSignal } from '@gn8/alien-signals-vue';
import type { Session } from '../core/Session';

interface Props {
  currentTitle?: string;
}

const props = withDefaults(defineProps<Props>(), {
  currentTitle: 'New Chat'
});

const emit = defineEmits<{
  switchToSessions: [];
  sessionSelected: [sessionId: string];
}>();

// Runtime injection
const runtime = inject(RuntimeKey);
if (!runtime) throw new Error('[SessionDropdown] runtime not provided');

const store = useSessionStore(runtime.sessionStore);

// Active session from store
const activeSessionRaw = useSignal<Session | undefined>(runtime.sessionStore.activeSession);

// Component state
const isOpen = ref(false);
const searchQuery = ref('');
const dropdownRef = ref<HTMLElement>();
const searchInputRef = ref<HTMLInputElement>();
const contextMenuRef = ref<HTMLElement>();
const focusedIndex = ref(-1);
const hoveredSessionId = ref<string | null>(null);
const menuOpenFor = ref<string | null>(null);
const menuPosition = ref({ top: '0px', left: '0px' });

// Session list
const sessionList = computed(() => {
  const rawSessions = (store.sessionsByLastModified.value || []).filter(Boolean) as Session[];
  return rawSessions.map(raw => useSession(raw));
});

// Filtered sessions based on search
const filteredSessions = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) return sessionList.value;
  
  return sessionList.value.filter(session => {
    const summary = (session.summary.value || 'Untitled').toLowerCase();
    const sessionId = (session.sessionId.value || '').toLowerCase();
    return summary.includes(query) || sessionId.includes(query);
  });
});

// Check if session is active
function isActiveSession(session: ReturnType<typeof useSession>): boolean {
  if (!activeSessionRaw.value) return false;
  return session.sessionId.value === activeSessionRaw.value.sessionId();
}

// Get session stats (placeholder - would use real data from session)
function getSessionStats(session: ReturnType<typeof useSession>) {
  // TODO: Get real stats from session when available
  const msgCount = session.messageCount.value || 0;
  return {
    added: Math.floor(msgCount * 15),
    removed: Math.floor(msgCount * 8),
    modified: Math.floor(msgCount * 5)
  };
}

// Get session branch (placeholder)
function getSessionBranch(_session: ReturnType<typeof useSession>) {
  // TODO: Get real branch from session when available
  return 'master';
}

// Toggle dropdown
function toggleDropdown() {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    nextTick(() => {
      searchInputRef.value?.focus();
    });
  } else {
    menuOpenFor.value = null;
  }
}

// Close dropdown
function closeDropdown() {
  isOpen.value = false;
  searchQuery.value = '';
  focusedIndex.value = -1;
  menuOpenFor.value = null;
}

// Select session
function selectSession(session: ReturnType<typeof useSession>) {
  const rawSession = session.__session;
  store.setActiveSession(rawSession);
  emit('sessionSelected', session.sessionId.value);
  closeDropdown();
}

// Select first result on Enter
function selectFirstResult() {
  if (filteredSessions.value.length > 0) {
    const index = focusedIndex.value >= 0 ? focusedIndex.value : 0;
    selectSession(filteredSessions.value[index]);
  }
}

// Keyboard navigation
function focusNextItem() {
  if (focusedIndex.value < filteredSessions.value.length - 1) {
    focusedIndex.value++;
  }
}

function focusPrevItem() {
  if (focusedIndex.value > 0) {
    focusedIndex.value--;
  }
}

// Toggle context menu
function toggleMenu(sessionId: string, event: MouseEvent) {
  if (menuOpenFor.value === sessionId) {
    menuOpenFor.value = null;
  } else {
    menuOpenFor.value = sessionId;
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const dropdownRect = dropdownRef.value?.getBoundingClientRect();
    if (dropdownRect) {
      menuPosition.value = {
        top: `${rect.bottom - dropdownRect.top + 4}px`,
        left: `${rect.left - dropdownRect.left - 100}px`
      };
    }
  }
}

// Copy session ID
function copySessionId() {
  if (menuOpenFor.value) {
    navigator.clipboard.writeText(menuOpenFor.value);
    menuOpenFor.value = null;
  }
}

// Delete session
async function deleteSession() {
  if (menuOpenFor.value) {
    const sessionId = menuOpenFor.value;
    menuOpenFor.value = null;
    
    // Find and delete the session
    const session = sessionList.value.find(s => s.sessionId.value === sessionId);
    if (session) {
      try {
        await store.deleteSession(session.__session);
      } catch (e) {
        console.error('[SessionDropdown] Failed to delete session:', e);
      }
    }
  }
}

// Create new session
async function createNewSession() {
  const rawSession = await store.createSession({ isExplicit: true });
  store.setActiveSession(rawSession);
  emit('sessionSelected', rawSession.sessionId());
  closeDropdown();
}

// View all sessions
function viewAllSessions() {
  emit('switchToSessions');
  closeDropdown();
}

// Format relative time
function formatRelativeTime(input?: number | string | Date): string {
  if (input === undefined || input === null) return 'now';
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return 'now';

  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return 'now';
  if (diff < 3_600_000) return `${Math.max(1, Math.round(diff / 60_000))}m`;
  if (diff < 86_400_000) return `${Math.max(1, Math.round(diff / 3_600_000))}h`;
  const days = Math.max(1, Math.round(diff / 86_400_000));
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.round(days / 7)}w`;
  return `${Math.round(days / 30)}mo`;
}

// Click outside to close
function handleClickOutside(event: MouseEvent) {
  const target = event.target as Node;
  
  // Close context menu if clicking outside
  if (menuOpenFor.value && contextMenuRef.value && !contextMenuRef.value.contains(target)) {
    menuOpenFor.value = null;
  }
  
  // Close dropdown if clicking outside
  if (dropdownRef.value && !dropdownRef.value.contains(target)) {
    closeDropdown();
  }
}

// Watch for dropdown open to load sessions
watch(isOpen, (open) => {
  if (open) {
    store.listSessions();
  }
});

onMounted(() => {
  document.addEventListener('click', handleClickOutside, true);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside, true);
});
</script>

<style scoped>
.session-dropdown {
  position: relative;
  flex: 1;
  min-width: 0;
}

.session-trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 4px 8px;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  color: var(--vscode-foreground);
  transition: background-color 0.15s;
}

.session-trigger:hover {
  background: var(--vscode-toolbar-hoverBackground);
}

.trigger-icon {
  font-size: 12px;
  opacity: 0.7;
}

.session-title {
  flex: 1;
  font-size: 12px;
  font-weight: 600;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chevron {
  font-size: 10px;
  opacity: 0.6;
  transition: transform 0.2s;
}

.chevron.rotated {
  transform: rotate(180deg);
}

/* Dropdown panel */
.dropdown-panel {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  min-width: 280px;
  max-width: 100%;
  background: var(--vscode-dropdown-background, var(--vscode-editor-background));
  border: 1px solid var(--vscode-dropdown-border, var(--vscode-widget-border));
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  overflow: hidden;
}

/* Transition */
.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: all 0.15s ease;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* Search */
.search-container {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--vscode-widget-border);
}

.search-icon {
  font-size: 14px;
  opacity: 0.5;
}

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--vscode-input-foreground);
  font-size: 13px;
}

.search-input::placeholder {
  color: var(--vscode-input-placeholderForeground);
}

/* Session list */
.session-list {
  max-height: 320px;
  overflow-y: auto;
  padding: 4px 0;
}

.session-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  cursor: pointer;
  transition: background-color 0.1s;
  font-size: 12px;
}

.session-item:hover,
.session-item.focused {
  background: var(--vscode-list-hoverBackground);
}

.session-item.active {
  background: var(--vscode-list-activeSelectionBackground);
}

.session-indicator {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--vscode-descriptionForeground);
  opacity: 0.3;
  flex-shrink: 0;
}

.session-indicator.current {
  background: var(--vscode-gitDecoration-addedResourceForeground, #89d185);
  opacity: 1;
}

.session-name {
  flex: 1;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.session-time {
  color: var(--vscode-descriptionForeground);
  flex-shrink: 0;
  min-width: 28px;
}

.session-stats {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
  font-family: var(--vscode-editor-font-family);
  font-size: 11px;
}

.stat-add {
  color: var(--vscode-gitDecoration-addedResourceForeground, #89d185);
}

.stat-remove {
  color: var(--vscode-gitDecoration-deletedResourceForeground, #f48771);
}

.stat-modify {
  color: var(--vscode-gitDecoration-modifiedResourceForeground, #e2c08d);
}

.session-branch {
  color: var(--vscode-descriptionForeground);
  flex-shrink: 0;
  font-size: 11px;
  max-width: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.more-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: transparent;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  color: var(--vscode-foreground);
  opacity: 0;
  transition: opacity 0.1s, background-color 0.1s;
  flex-shrink: 0;
}

.more-btn.visible {
  opacity: 0.7;
}

.more-btn:hover {
  opacity: 1;
  background: var(--vscode-toolbar-hoverBackground);
}

.more-btn .codicon {
  font-size: 14px;
}

/* Context menu */
.context-menu {
  position: absolute;
  background: var(--vscode-menu-background, var(--vscode-dropdown-background));
  border: 1px solid var(--vscode-menu-border, var(--vscode-widget-border));
  border-radius: 4px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  z-index: 1001;
  min-width: 140px;
  padding: 4px 0;
}

.menu-fade-enter-active,
.menu-fade-leave-active {
  transition: all 0.1s ease;
}

.menu-fade-enter-from,
.menu-fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 12px;
  background: transparent;
  border: none;
  color: var(--vscode-menu-foreground, var(--vscode-foreground));
  font-size: 12px;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.1s;
}

.menu-item:hover {
  background: var(--vscode-menu-selectionBackground, var(--vscode-list-hoverBackground));
}

.menu-item.danger {
  color: var(--vscode-errorForeground, #f48771);
}

.menu-item .codicon {
  font-size: 12px;
  opacity: 0.8;
}

/* Empty state */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px;
  color: var(--vscode-descriptionForeground);
  font-size: 13px;
}

.empty-state .codicon {
  font-size: 24px;
  opacity: 0.5;
}

/* Footer */
.dropdown-footer {
  display: flex;
  gap: 4px;
  padding: 8px;
  border-top: 1px solid var(--vscode-widget-border);
  background: var(--vscode-sideBarSectionHeader-background, rgba(0, 0, 0, 0.1));
}

.footer-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 12px;
  background: transparent;
  border: 1px solid var(--vscode-button-secondaryBackground);
  border-radius: 4px;
  color: var(--vscode-foreground);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.footer-btn:hover {
  background: var(--vscode-button-secondaryHoverBackground);
  border-color: var(--vscode-focusBorder);
}

.footer-btn .codicon {
  font-size: 12px;
}
</style>
