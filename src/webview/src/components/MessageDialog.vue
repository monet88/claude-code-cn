<template>
  <div v-if="visible" class="dialog-overlay" @click.self="handleCancel">
    <div class="dialog">
      <div class="dialog-header">
        <h3>{{ title }}</h3>
      </div>
      <div class="dialog-body">
        <p>{{ message }}</p>
      </div>
      <div class="dialog-footer">
        <button v-if="type === 'confirm'" class="btn-secondary" @click="handleCancel">
          {{ cancelText }}
        </button>
        <button class="btn-primary" @click="handleConfirm">
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

interface Props {
  visible: boolean;
  type?: 'confirm' | 'alert';
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'confirm',
  title: 'Message',
  confirmText: 'Confirm',
  cancelText: 'Cancel'
});

const emit = defineEmits<{
  'confirm': [];
  'cancel': [];
  'update:visible': [value: boolean];
}>();

function handleConfirm() {
  emit('confirm');
  emit('update:visible', false);
}

function handleCancel() {
  if (props.type === 'confirm') {
    emit('cancel');
    emit('update:visible', false);
  }
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.dialog {
  background: var(--vscode-editorWidget-background);
  border: 1px solid var(--theme-border-subtle, rgba(255, 255, 255, 0.03));
  border-radius: var(--theme-radius-md, 8px);
  min-width: 400px;
  max-width: 500px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.dialog-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--vscode-editorWidget-border);
}

.dialog-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: var(--vscode-editor-foreground);
}

.dialog-body {
  padding: 20px;
}

.dialog-body p {
  margin: 0;
  color: var(--vscode-editor-foreground);
  line-height: 1.5;
  white-space: pre-wrap;
}

.dialog-footer {
  padding: 16px 20px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  border-top: 1px solid var(--vscode-editorWidget-border);
}

.btn-primary,
.btn-secondary {
  padding: 6px 16px;
  border-radius: var(--theme-radius-sm, 4px);
  font-size: 13px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.btn-primary {
  background-color: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
}

.btn-primary:hover {
  background-color: var(--vscode-button-hoverBackground);
}

.btn-secondary {
  background-color: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
}

.btn-secondary:hover {
  background-color: var(--vscode-button-secondaryHoverBackground);
}
</style>
