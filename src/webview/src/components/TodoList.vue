<template>
  <div v-if="visible && todos.length > 0" class="sticky-todo-list">
    <!-- Todo header -->
    <div class="todo-header" @click="toggleExpanded">
      <div class="todo-header-left">
        <span
          class="codicon"
          :class="expanded ? 'codicon-chevron-down' : 'codicon-chevron-right'"
        />
        <span class="codicon codicon-checklist header-icon"></span>
        <span class="header-title">Task List</span>
        <span class="header-count">{{ todos.length }}</span>
        <span v-if="inProgressTask" class="current-task">
          {{ inProgressTask.activeForm || inProgressTask.content }}
        </span>
      </div>
      <div class="todo-header-right">
        <span class="progress-text">{{ completedCount }}/{{ todos.length }}</span>
      </div>
    </div>

    <!-- Todo list - expandable -->
    <div v-if="expanded" class="todo-content">
      <div class="todo-scroll">
        <ul class="todo-list">
          <li
            v-for="(todo, index) in todos"
            :key="index"
            class="todo-item"
            :class="todo.status"
          >
            <div class="todo-item-icon-container">
              <div v-if="todo.status === 'in_progress'" class="todo-in-progress-circle">
                <span class="codicon codicon-arrow-small-right" />
              </div>
              <div
                v-else
                class="todo-item-indicator"
                :class="{ 'has-icon': todo.status === 'completed' }"
              >
                <div
                  v-if="todo.status === 'completed'"
                  class="codicon codicon-check-two"
                  style="font-size: 6px; margin-left: -1px"
                />
              </div>
            </div>
            <div class="todo-item-content">
              <span
                class="todo-item-text"
                :class="{
                  'todo-in-progress': todo.status === 'in_progress',
                  'todo-completed': todo.status === 'completed'
                }"
              >
                {{ todo.content }}
              </span>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Todo } from '../types/toolbar'

interface Props {
  todos?: Todo[]
  visible?: boolean
  initialExpanded?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  todos: () => [],
  visible: false,
  initialExpanded: true
})

const expanded = ref(props.initialExpanded)

const inProgressTask = computed(() => {
  return props.todos.find(t => t.status === 'in_progress')
})

const completedCount = computed(() => {
  return props.todos.filter(t => t.status === 'completed').length
})

function toggleExpanded() {
  expanded.value = !expanded.value
}
</script>

<style scoped>
.sticky-todo-list {
  background: color-mix(in srgb, var(--vscode-editor-background) 95%, transparent);
  border: 1px solid color-mix(in srgb, var(--vscode-panel-border) 60%, transparent);
  border-radius: 6px;
  margin-bottom: 8px;
  overflow: hidden;
}

/* Header */
.todo-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  cursor: pointer;
  background: color-mix(in srgb, var(--vscode-list-hoverBackground) 30%, transparent);
  transition: background-color 0.15s;
}

.todo-header:hover {
  background: color-mix(in srgb, var(--vscode-list-hoverBackground) 50%, transparent);
}

.todo-header-left {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.todo-header-left > .codicon:first-child {
  font-size: 10px;
  opacity: 0.6;
  flex-shrink: 0;
}

.header-icon {
  font-size: 12px;
  opacity: 0.8;
  flex-shrink: 0;
}

.header-title {
  font-size: 0.85em;
  font-weight: 600;
  color: var(--vscode-foreground);
  flex-shrink: 0;
}

.header-count {
  font-size: 0.8em;
  opacity: 0.6;
  flex-shrink: 0;
}

.current-task {
  font-size: 0.8em;
  color: var(--vscode-charts-blue);
  font-style: italic;
  margin-left: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.todo-header-right {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.progress-text {
  font-size: 0.75em;
  color: var(--vscode-foreground);
  opacity: 0.6;
  padding: 2px 6px;
  background: color-mix(in srgb, var(--vscode-badge-background) 40%, transparent);
  border-radius: 8px;
}

/* Content */
.todo-content {
  border-top: 1px solid color-mix(in srgb, var(--vscode-panel-border) 40%, transparent);
}

.todo-scroll {
  max-height: 180px;
  overflow-y: auto;
  overflow-x: hidden;
}

.todo-list {
  list-style: none;
  margin: 0;
  padding: 4px 0;
}

.todo-item {
  display: flex;
  align-items: flex-start;
  padding: 4px 10px;
  gap: 8px;
  transition: background-color 0.15s;
}

.todo-item:hover {
  background: color-mix(in srgb, var(--vscode-list-hoverBackground) 30%, transparent);
}

/* Icon container */
.todo-item-icon-container {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 1px;
}

.todo-in-progress-circle {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--vscode-charts-blue);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pulse 1.5s ease-in-out infinite;
}

.todo-in-progress-circle .codicon {
  font-size: 10px;
  color: #fff;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(0.95); }
}

.todo-item-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--vscode-foreground) 40%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
}

.todo-item-indicator.has-icon {
  background: var(--vscode-charts-green);
  border-color: var(--vscode-charts-green);
}

.todo-item-indicator .codicon {
  color: #fff;
}

/* Content */
.todo-item-content {
  flex: 1;
  min-width: 0;
}

.todo-item-text {
  font-size: 0.85em;
  line-height: 1.4;
  color: var(--vscode-foreground);
  opacity: 0.85;
}

.todo-item-text.todo-in-progress {
  color: var(--vscode-charts-blue);
  font-weight: 500;
  opacity: 1;
}

.todo-item-text.todo-completed {
  opacity: 0.5;
  text-decoration: line-through;
}

/* Scrollbar */
.todo-scroll::-webkit-scrollbar {
  width: 6px;
}

.todo-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.todo-scroll::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 3px;
}

.todo-scroll:hover::-webkit-scrollbar-thumb {
  background: var(--vscode-scrollbarSlider-background);
}

.todo-scroll::-webkit-scrollbar-thumb:hover {
  background: var(--vscode-scrollbarSlider-hoverBackground);
}
</style>
