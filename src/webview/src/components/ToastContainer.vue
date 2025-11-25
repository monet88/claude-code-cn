<template>
  <Teleport to="body">
    <div class="toast-container">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toastStore.toasts"
          :key="toast.id"
          :class="['toast', `toast-${toast.type}`]"
          @click="toastStore.remove(toast.id)"
        >
          <span :class="['toast-icon', 'codicon', iconClass(toast.type)]"></span>
          <span class="toast-message">{{ toast.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useToastStore } from '../stores/toastStore';

const toastStore = useToastStore();

function iconClass(type: string): string {
  switch (type) {
    case 'success':
      return 'codicon-check';
    case 'error':
      return 'codicon-error';
    case 'warning':
      return 'codicon-warning';
    default:
      return 'codicon-info';
  }
}
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10000;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 8px;
  background: var(--vscode-notifications-background, #252526);
  color: var(--vscode-notifications-foreground, #cccccc);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  font-size: 13px;
  cursor: pointer;
  pointer-events: auto;
  max-width: 360px;
}

.toast-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.toast-message {
  flex: 1;
  line-height: 1.4;
}

.toast-success {
  background: rgba(34, 197, 94, 0.15);
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.toast-success .toast-icon {
  color: #22c55e;
}

.toast-error {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.toast-error .toast-icon {
  color: #ef4444;
}

.toast-warning {
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.toast-warning .toast-icon {
  color: #f59e0b;
}

.toast-info {
  background: rgba(59, 130, 246, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.toast-info .toast-icon {
  color: #3b82f6;
}

/* 过渡动画 */
.toast-enter-active {
  animation: toast-in 0.3s ease-out;
}

.toast-leave-active {
  animation: toast-out 0.2s ease-in forwards;
}

.toast-move {
  transition: transform 0.3s ease;
}

@keyframes toast-in {
  from {
    opacity: 0;
    transform: translateY(-12px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes toast-out {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(-8px) scale(0.95);
  }
}
</style>
