<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="isVisible" class="image-preview-overlay" @click="handleOverlayClick">
        <div class="image-preview-container" @click.stop>
          <button class="close-button" @click="handleClose" title="Close">
            <span class="codicon codicon-close"></span>
          </button>
          <div class="image-wrapper">
            <img :src="imageSrc" :alt="imageAlt" class="preview-image" />
          </div>
          <div v-if="imageAlt" class="image-info">
            {{ imageAlt }}
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  visible: boolean
  imageSrc?: string
  imageAlt?: string
}

interface Emits {
  (e: 'close'): void
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  imageSrc: '',
  imageAlt: ''
})

const emit = defineEmits<Emits>()

const isVisible = computed(() => props.visible)

function handleClose() {
  emit('close')
}

function handleOverlayClick() {
  handleClose()
}
</script>

<style scoped>
.image-preview-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(4px);
}

.image-preview-container {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.close-button {
  position: absolute;
  top: -40px;
  right: 0;
  width: 32px;
  height: 32px;
  border: none;
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.close-button:hover {
  background: var(--vscode-button-hoverBackground);
}

.close-button .codicon {
  font-size: 16px;
}

.image-wrapper {
  background: var(--vscode-editor-background);
  border-radius: 8px;
  padding: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  max-width: 90vw;
  max-height: 80vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.preview-image {
  max-width: 100%;
  max-height: 75vh;
  object-fit: contain;
  border-radius: 4px;
}

.image-info {
  background: var(--vscode-editor-background);
  color: var(--vscode-foreground);
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 12px;
  max-width: 90vw;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Fade in/out transition effects */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
