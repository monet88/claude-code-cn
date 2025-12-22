<template>
  <div
    class="progress-container"
    :style="containerStyle"
  >
    <span class="progress-text">{{ formattedDisplay }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  percentage: number
  contextWindow?: number
  size?: number
}

const props = withDefaults(defineProps<Props>(), {
  percentage: 0,
  contextWindow: 200000,
  size: 14
})

const formattedPercentage = computed(() => {
  const value = props.percentage
  // If integer, do not display decimal point; otherwise display one decimal place
  return value % 1 === 0 ? Math.round(value) : value.toFixed(1)
})

const formattedContextWindow = computed(() => {
  const window = props.contextWindow
  if (window >= 1000000) {
    return `${(window / 1000000).toFixed(1)}M`
  } else if (window >= 1000) {
    return `${Math.round(window / 1000)}k`
  }
  return String(window)
})

// Format: "30% of 168k"
const formattedDisplay = computed(() => {
  return `${formattedPercentage.value}% of ${formattedContextWindow.value}`
})

const containerStyle = computed(() => ({
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  cursor: 'default'
}))
</script>

<style scoped>
.progress-container {
  position: relative;
  z-index: 100;
}

.progress-text {
  font-size: 12px;
  color: color-mix(in srgb, var(--vscode-foreground) 48%, transparent);
  line-height: 1;
}
</style>