import type { KeyboardNavigationOptions } from '../types/completion'

/**
 * Composable điều hướng bàn phím
 *
 * Đóng gói logic điều hướng bàn phím như phím lên/xuống, Enter, Tab, Escape, PageUp, PageDown
 *
 * @param options Tùy chọn điều hướng
 * @returns Các hàm liên quan đến điều hướng bàn phím
 *
 * @example
 * const { handleKeydown, moveNext, movePrev } = useKeyboardNavigation({
 *   isOpen: ref(true),
 *   items: computed(() => [item1, item2]),
 *   activeIndex: ref(0),
 *   onSelect: (index) => console.log('Selected:', index),
 *   onClose: () => console.log('Closed'),
 *   pageSize: 5
 * })
 */
export function useKeyboardNavigation(options: KeyboardNavigationOptions) {
  const {
    isOpen,
    items,
    activeIndex,
    onSelect,
    onClose,
    supportTab = true,
    supportEscape = true,
    onNavigate,
    pageSize = 5
  } = options

  /**
   * Chuyển đến mục tiếp theo
   */
  function moveNext() {
    if (items.value.length === 0) return
    activeIndex.value = (activeIndex.value + 1) % items.value.length
    onNavigate?.() // Kích hoạt callback điều hướng
  }

  /**
   * Chuyển đến mục trước đó
   */
  function movePrev() {
    if (items.value.length === 0) return
    activeIndex.value =
      (activeIndex.value - 1 + items.value.length) % items.value.length
    onNavigate?.() // Kích hoạt callback điều hướng
  }

  /**
   * Lật trang tiếp theo
   */
  function moveNextPage() {
    if (items.value.length === 0) return
    const newIndex = Math.min(activeIndex.value + pageSize, items.value.length - 1)
    activeIndex.value = newIndex
    onNavigate?.() // Kích hoạt callback điều hướng
  }

  /**
   * Lật trang trước đó
   */
  function movePrevPage() {
    if (items.value.length === 0) return
    const newIndex = Math.max(activeIndex.value - pageSize, 0)
    activeIndex.value = newIndex
    onNavigate?.() // Kích hoạt callback điều hướng
  }

  /**
   * Chọn mục đang được kích hoạt
   */
  function selectActive() {
    if (items.value.length === 0) return
    onSelect(activeIndex.value)
  }

  /**
   * Đặt lại chỉ số về mục đầu tiên
   */
  function reset() {
    activeIndex.value = 0
  }

  /**
   * Xử lý sự kiện bàn phím
   *
   * @param event Sự kiện bàn phím
   * @returns Có xử lý sự kiện này không
   */
  function handleKeydown(event: KeyboardEvent): boolean {
    // Chỉ xử lý khi đang mở và có mục
    if (!isOpen.value || items.value.length === 0) {
      return false
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        moveNext()
        return true

      case 'ArrowUp':
        event.preventDefault()
        movePrev()
        return true

      case 'PageDown':
        event.preventDefault()
        moveNextPage()
        return true

      case 'PageUp':
        event.preventDefault()
        movePrevPage()
        return true

      case 'Enter':
        event.preventDefault()
        selectActive()
        return true

      case 'Tab':
        if (supportTab && !event.shiftKey) {
          event.preventDefault()
          selectActive()
          return true
        }
        break

      case 'Escape':
        if (supportEscape) {
          event.preventDefault()
          onClose()
          return true
        }
        break
    }

    return false
  }

  return {
    handleKeydown,
    moveNext,
    movePrev,
    moveNextPage,
    movePrevPage,
    selectActive,
    reset
  }
}
