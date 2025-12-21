<template>
  <div
    v-if="isVisible"
    class="dropdown-popover fade-in-fast"
    :style="{ ...dropdownStyle, ...popoverStyle }"
    :data-nav="dataNav"
  >
    <div
      ref="containerRef"
      tabindex="0"
      class="dropdown-container"
      :style="containerStyle"
      @keydown.escape="close"
    >
      <!-- Built-in search box (optional) -->
      <div v-if="showSearch" class="search-input-section">
        <input
          ref="searchInput"
          v-model="searchTerm"
          class="context-search-input"
          :placeholder="searchPlaceholder"
          @input="onSearchInput"
        />
      </div>

      <!-- Top slot area (optional) -->
      <slot name="header" />

      <!-- Scrollable middle area using ScrollableElement -->
      <ScrollableElement ref="scrollableRef">
        <div class="menu-content">
          <slot
            name="content"
            :search-term="searchTerm"
            :selected-index="selectedIndex"
          />
        </div>
      </ScrollableElement>

      <!-- Bottom slot area -->
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import ScrollableElement from '../ScrollableElement.vue'

export interface DropdownItem {
  id: string
  type: string
  [key: string]: any
}

interface Props {
  isVisible: boolean
  position: { top: number; left: number; width?: number; height?: number }
  width?: number
  contentHeight?: number
  containerStyle?: Record<string, any>
  popoverStyle?: Record<string, any>
  contentStyle?: Record<string, any>
  showSearch?: boolean
  searchPlaceholder?: string
  shouldAutoFocus?: boolean
  closeOnClickOutside?: boolean
  closeSelectors?: string[]
  align?: 'left' | 'right' | 'center'
  dataNav?: 'keyboard' | 'mouse' // Navigation mode
  offsetY?: number // Vertical offset (positive=away from trigger, negative=overlay)
  offsetX?: number // Horizontal offset (positive=right, negative=left)
  preferPlacement?: 'auto' | 'above' | 'below' // Placement preference
  selectedIndex?: number // Currently selected index (for aligning visible items)
  scrollPadding?: number // Minimum padding between selected item and container edge
}

interface Emits {
  (e: 'close'): void
  (e: 'select', item: DropdownItem): void
  (e: 'search', term: string): void
}

const props = withDefaults(defineProps<Props>(), {
  containerStyle: () => ({}),
  popoverStyle: () => ({}),
  contentStyle: () => ({}),
  showSearch: false,
  searchPlaceholder: 'Search...',
  shouldAutoFocus: true,
  closeOnClickOutside: true,
  closeSelectors: () => [],
  align: 'left',
  offsetY: 4,
  offsetX: 0,
  preferPlacement: 'auto',
  selectedIndex: -1,
  scrollPadding: 6
})

const emit = defineEmits<Emits>()

const searchInput = ref<HTMLInputElement>()
const searchTerm = ref('')
const selectedIndex = ref(0)
const scrollableRef = ref<any>()
const containerRef = ref<HTMLElement>()

// Computed properties
const dropdownStyle = computed(() => {
  const style: any = {
    position: 'fixed',
    minWidth: '140px',
    maxWidth: '240px',
    width: props.width ? `${props.width}px` : 'auto',
    zIndex: 2548
  }

  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const triggerRect = props.position

  // Calculate the dropdown total height
  const searchHeight = props.showSearch ? 32 : 0  // Search box height
  const footerHeight = 25 // Footer height
  const dropdownTotalHeight = searchHeight + 240 + footerHeight // Use max height of 240px

  // Compute available space above and below
  const spaceAbove = triggerRect.top
  const spaceBelow = viewportHeight - triggerRect.top - (triggerRect.height || 0)

  // Choose display position based on preferPlacement
  let showBelow: boolean
  if (props.preferPlacement === 'below') {
    showBelow = true
  } else if (props.preferPlacement === 'above') {
    showBelow = false
  } else {
    // auto mode: prefer below, fall back to above when space is tight
    showBelow = spaceBelow >= dropdownTotalHeight || spaceBelow > spaceAbove
  }

  // Vertical positioning (offsetY: positive=move away, negative=overlay) 
  if (showBelow) {
    // Show below the trigger
    style.top = `${triggerRect.top + (triggerRect.height || 0) + props.offsetY}px`
  } else {
    // Show above the trigger (negative offsetY overlaps the trigger) 
    style.bottom = `${viewportHeight - triggerRect.top + props.offsetY}px`
  }

  // Horizontal positioning (left, right, center) 
  const triggerWidth = triggerRect.width || 0
  // Use provided width or default max width 240px
  const dropdownWidth = props.width || 240

  // Compute initial left position based on alignment
  let leftPosition = 0
  switch (props.align) {
    case 'right':
      // Right align: dropdown right edge matches trigger right edge
      leftPosition = triggerRect.left + triggerWidth - dropdownWidth
      break
    case 'center':
      // Center align: dropdown center matches trigger center
      leftPosition = triggerRect.left + triggerWidth / 2 - dropdownWidth / 2
      break
    case 'left':
    default:
      // Left align: dropdown left edge matches trigger left edge
      leftPosition = triggerRect.left
      break
  }

  // Apply horizontal offset
  leftPosition += props.offsetX

  // Keep within screen boundaries
  const leftBoundary = 8  // Minimum left padding
  const rightPadding = 24 // Right safe margin
  const rightBoundary = viewportWidth - rightPadding

  if (leftPosition < leftBoundary) {
    leftPosition = leftBoundary
  } else if (leftPosition + dropdownWidth > rightBoundary) {
    // Menu would overflow right boundary, shift left and add spacing
    leftPosition = rightBoundary - dropdownWidth
  }

  style.left = `${leftPosition}px`

  return style
})

// Methods
function close() {
  emit('close')
}

function onSearchInput() {
  emit('search', searchTerm.value)
}

// Keyboard navigation
function handleKeydown(event: KeyboardEvent) {
  if (!props.isVisible) return

  switch (event.key) {
    case 'Escape':
      event.preventDefault()
      close()
      break
  }
}

// Close on outside click
function handleClickOutside(event: MouseEvent) {
  if (!props.isVisible || !props.closeOnClickOutside) return

  const target = event.target as HTMLElement

  // Check if the click was inside the dropdown
  if (target.closest('.dropdown-popover')) return

  // Check if trigger element was clicked
  const excludeSelectors = [
    '.premium-pill',
    '.dropdown-trigger',
    ...props.closeSelectors
  ]

  for (const selector of excludeSelectors) {
    if (target.closest(selector)) return
  }

  close()
}

// Lifecycle
watch(() => props.isVisible, (visible) => {
  if (visible && props.shouldAutoFocus) {
    nextTick(() => {
      searchInput.value?.focus()
    })
  }
})

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('click', handleClickOutside)
})

// Minimum offset to keep the selected item visible
function ensureSelectedVisible() {
  if (!props.isVisible) return
  if (props.selectedIndex == null || props.selectedIndex < 0) return

  const root = containerRef.value
  const scrollable = scrollableRef.value
  if (!root || !scrollable) return

  const wrapper = root.querySelector('.scrollable-content-wrapper') as HTMLElement | null
  const content = root.querySelector('.scrollable-content-container') as HTMLElement | null
  const selectedEl = root.querySelector('.dropdown-menu-item[data-is-selected="true"]') as HTMLElement | null
  if (!wrapper || !content || !selectedEl) return

  const padding = props.scrollPadding ?? 6
  const wrapperH = wrapper.clientHeight
  const contentH = content.scrollHeight

  // Skip if content is not scrollable to avoid empty spacing
  if (contentH <= wrapperH + 1) return

  // Current scroll amount (derived from transform)
  const contentRect = content.getBoundingClientRect()
  const wrapperRect = wrapper.getBoundingClientRect()
  const currentTop = wrapperRect.top - contentRect.top

  // Selected item offset from the top of the content
  let offsetTop = 0
  let el: HTMLElement | null = selectedEl
  while (el && el !== content) {
    offsetTop += el.offsetTop
    el = el.offsetParent as HTMLElement | null
  }
  const itemTop = offsetTop
  const itemBottom = itemTop + selectedEl.offsetHeight

  // Target visible window boundaries
  const visibleTop = currentTop + padding
  const visibleBottom = currentTop + wrapperH - padding

  let newTop = currentTop
  if (itemTop < visibleTop) {
    newTop = itemTop - padding
  } else if (itemBottom > visibleBottom) {
    newTop = itemBottom - wrapperH + padding
  } else {
    return
  }

  // Clamp the scroll range to prevent overscrolling
  const maxTop = Math.max(0, contentH - wrapperH)
  newTop = Math.max(0, Math.min(maxTop, newTop))

  try {
    scrollable.scrollTo(newTop, 0, { behavior: 'auto' })
  } catch {}
}

watch(() => props.selectedIndex, () => {
  // Use double requestAnimationFrame to ensure DOM & layout are ready
  requestAnimationFrame(() => {
    requestAnimationFrame(() => ensureSelectedVisible())
  })
})

watch(() => props.isVisible, (visible) => {
  if (visible) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => ensureSelectedVisible())
    })
  }
})

// Expose methods to parent component
defineExpose({
  focusSearch: () => searchInput.value?.focus(),
  setSearchTerm: (term: string) => { searchTerm.value = term },
  getSearchTerm: () => searchTerm.value
})
</script>

<style scoped>
.dropdown-popover {
  box-sizing: border-box;
  padding: 0;
  border-radius: 6px;
  background: transparent;
  border: none;
  align-items: stretch;
  font-size: 10px;
  display: flex;
  flex-direction: column;
  gap: 0;
  visibility: visible;
  transform-origin: left top;
  box-shadow: 0 0 8px 2px color-mix(in srgb, var(--vscode-widget-shadow) 30%, transparent);
  min-width: 140px;
  max-width: 240px;
  width: auto;
}

.dropdown-container {
  box-sizing: border-box;
  border-radius: 6px;
  background-color: var(--vscode-dropdown-background);
  border: 1px solid var(--vscode-commandCenter-inactiveBorder, var(--vscode-widget-border));
  align-items: stretch;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0;
  contain: paint;
  outline: none;
  pointer-events: auto;
}

.search-input-container {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 0 6px;
  border: none;
  box-sizing: border-box;
  outline: none;
  margin: 2px;
}

.search-input {
  font-size: 12px;
  line-height: 15px;
  border-radius: 3px;
  background: transparent;
  color: var(--vscode-input-foreground);
  padding: 3px 0;
  flex: 1;
  min-width: 0;
  border: none !important;
  outline: none !important;
  box-sizing: border-box;
}

.search-input::placeholder {
  opacity: 0.5;
}

.menu-content {
  padding: 0.125rem;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.menu-sections {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 2px;
}

.dropdown-footer {
  flex-shrink: 0;
  background-color: var(--vscode-dropdown-background);
  border-top: 1px solid var(--vscode-commandCenter-inactiveBorder, var(--vscode-widget-border));
}

/* Fade-in animation */
.fade-in-fast {
  animation: fadein 0.1s linear;
}

@keyframes fadein {
  0% {
    opacity: 0;
    visibility: visible;
  }
  to {
    opacity: 1;
  }
}
</style>
