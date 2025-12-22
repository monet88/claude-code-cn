<template>
  <div class="tool-message-wrapper">
    <!-- Custom layout mode -->
    <template v-if="isCustomLayout">
      <slot name="custom"></slot>
    </template>

    <!-- Standard layout mode -->
    <template v-else>
      <!-- Main info line -->
      <div
        class="main-line"
        :class="{ 'is-expandable': hasExpandableContent }"
        @click="toggleExpand"
        @mouseenter="isHovered = true"
        @mouseleave="isHovered = false"
      >
        <!-- Tool icon -->
        <button class="tool-icon-btn" :title="toolName">
          <span
            v-if="!isHovered || !hasExpandableContent"
            class="codicon"
            :class="toolIcon"
          ></span>
          <span
            v-else-if="isExpanded"
            class="codicon codicon-fold"
          ></span>
          <span
            v-else
            class="codicon codicon-chevron-up-down"
          ></span>
        </button>

        <!-- Main content -->
        <div class="main-content">
          <slot name="main"></slot>
        </div>

        <!-- Status indicator -->
        <ToolStatusIndicator
          v-if="indicatorState"
          :state="indicatorState"
          class="status-indicator-trailing"
        />
      </div>

      <!-- Expandable content -->
      <div v-if="hasExpandableContent && isExpanded" class="expandable-content">
        <slot name="expandable"></slot>
      </div>
    </template>

    <!-- Permission approval buttons -->
    <div v-if="permissionState === 'pending'" class="permission-actions">
      <button @click.stop="$emit('deny')" class="btn-reject">
        <span>Deny</span>
      </button>
      <button @click.stop="$emit('allow')" class="btn-accept">
        <span>Allow</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, useSlots } from 'vue';
import ToolStatusIndicator from './ToolStatusIndicator.vue';

interface Props {
  toolIcon?: string;
  toolName?: string;
  toolResult?: any;
  permissionState?: string;
  defaultExpanded?: boolean;
  isCustomLayout?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  defaultExpanded: false,
  isCustomLayout: false,
  toolIcon: 'codicon-tools',
  toolName: 'Tool',
});

defineEmits<{
  allow: [];
  deny: [];
}>();

const slots = useSlots();

// Check if there is expandable content
const hasExpandableContent = computed(() => {
  return !!slots.expandable || !!props.toolResult?.is_error;
});

// Expand state
const userToggled = ref(false);
const userToggledState = ref(false);

const isExpanded = computed({
  get: () => {
    // Prefer user manually toggled state
    if (userToggled.value) {
      return userToggledState.value;
    }
    // Otherwise use defaultExpanded (no longer auto-expand on error)
    return props.defaultExpanded;
  },
  set: (value) => {
    userToggled.value = true;
    userToggledState.value = value;
  },
});

const isHovered = ref(false);

// State calculation
const indicatorState = computed<'success' | 'error' | 'pending' | null>(() => {
  if (props.toolResult?.is_error) return 'error';
  if (props.permissionState === 'pending') return 'pending';
  if (props.toolResult) return 'success';
  return null;
});

// Toggle expand
function toggleExpand() {
  if (hasExpandableContent.value) {
    isExpanded.value = !isExpanded.value;
  }
}
</script>

<style scoped>
.tool-message-wrapper {
  display: flex;
  flex-direction: column;
  padding: 0px;
}

.main-line {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 0;
  user-select: none;
}

.main-line.is-expandable {
  cursor: pointer;
}

.main-line.is-expandable:hover {
  background-color: color-mix(in srgb, var(--vscode-list-hoverBackground) 30%, transparent);
}

.tool-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  padding: 2px;
  color: var(--vscode-foreground);
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.tool-icon-btn .codicon {
  font-size: 16px;
}

.main-content {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.status-indicator-trailing {
  margin-left: auto;
}

.expandable-content {
  padding: 4px 0 0px 16px;
  margin-left: 10px;
  border-left: 1px solid var(--vscode-panel-border);
}

/* Permission approval buttons */
.permission-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 8px 0 4px;
  margin-left: 26px;
}

.btn-reject,
.btn-accept {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 0.9em;
  cursor: pointer;
  border: 1px solid var(--vscode-button-border);
}

.btn-reject {
  background: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
}

.btn-reject:hover {
  background: var(--vscode-button-secondaryHoverBackground);
}

.btn-accept {
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
}

.btn-accept:hover {
  background: var(--vscode-button-hoverBackground);
}
</style>
