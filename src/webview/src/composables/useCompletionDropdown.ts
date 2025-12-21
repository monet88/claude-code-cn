import { ref, computed, watch } from 'vue'
import type {
  CompletionConfig,
  CompletionDropdown,
  DropdownPosition,
  TriggerQuery
} from '../types/completion'
import type { DropdownItemType } from '../types/dropdown'
import { useTriggerDetection } from './useTriggerDetection'
import { useKeyboardNavigation } from './useKeyboardNavigation'

/**
 * Dropdown Composable tự động hoàn thành chung
 *
 * Đóng gói logic dropdown tự động hoàn thành đầy đủ, hỗ trợ hai chế độ:
 * - inline: Kích hoạt bằng nhập liệu (ví dụ: /command, @file)
 * - manual: Kích hoạt thủ công (ví dụ: nhấn nút)
 *
 * @param config Cấu hình tự động hoàn thành
 * @returns Trạng thái và phương thức của dropdown tự động hoàn thành
 *
 * @example
 * // Chế độ inline
 * const slashCompletion = useCompletionDropdown({
 *   mode: 'inline',
 *   trigger: '/',
 *   provider: getSlashCommands,
 *   toDropdownItem: (cmd) => ({ ... }),
 *   onSelect: (cmd, query) => { ... },
 *   anchorElement: inputRef
 * })
 *
 * @example
 * // Chế độ manual
 * const commandMenu = useCompletionDropdown({
 *   mode: 'manual',
 *   provider: getCommands,
 *   toDropdownItem: (cmd) => ({ ... }),
 *   onSelect: (cmd) => { ... }
 * })
 */
export function useCompletionDropdown<T>(
  config: CompletionConfig<T>
): CompletionDropdown {
  const {
    mode,
    trigger,
    provider,
    toDropdownItem,
    onSelect,
    anchorElement,
    showSectionHeaders = false,
    searchFields = ['label', 'detail'],
    sectionOrder = []
  } = config

  // Xác thực cấu hình
  if (mode === 'inline' && !trigger) {
    throw new Error('[useCompletionDropdown] chế độ inline bắt buộc phải cung cấp tham số trigger')
  }

  // === Quản lý trạng thái ===
  const isOpen = ref(false)
  const activeIndex = ref(0)
  const query = ref('')
  const triggerQuery = ref<TriggerQuery | undefined>(undefined)
  const rawItems = ref<T[]>([])
  const navigationMode = ref<'keyboard' | 'mouse'>('keyboard') // Chế độ điều hướng

  // === Phát hiện kích hoạt (chế độ inline) ===
  const triggerDetection = mode === 'inline' && trigger
    ? useTriggerDetection({ trigger })
    : null

  // === Tải dữ liệu (tuần tự hóa + bảo vệ đua) ===
  const requestSeq = ref(0)
  const isLoading = ref(false)
  let debounceTimerId: number | undefined
  let currentAbortController: AbortController | undefined

  async function loadItems(searchQuery: string, signal?: AbortSignal) {
    try {
      // Tự tăng số yêu cầu, chỉ cho phép yêu cầu mới nhất ghi vào
      const seq = ++requestSeq.value
      isLoading.value = true

      const result = provider(searchQuery, signal)
      const data = result instanceof Promise ? await result : result

      // Chỉ chấp nhận yêu cầu mới nhất
      if (seq === requestSeq.value) {
        rawItems.value = (data ?? []) as T[]
      }
    } catch (error) {
      // Nếu là AbortError, xử lý âm thầm
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }
      console.error('[useCompletionDropdown] Tải dữ liệu thất bại:', error)
      rawItems.value = []
    } finally {
      isLoading.value = false
    }
  }

  // Tải với chống giật (dành riêng cho chế độ inline, 200ms độ trễ + hỗ trợ AbortController)
  function loadItemsDebounced(searchQuery: string, delay = 200) {
    if (debounceTimerId !== undefined) {
      window.clearTimeout(debounceTimerId)
    }

    if (currentAbortController) {
      currentAbortController.abort()
      currentAbortController = undefined
    }

    debounceTimerId = window.setTimeout(() => {
      currentAbortController = new AbortController()
      void loadItems(searchQuery, currentAbortController.signal)
    }, delay)
  }

  // === Xử lý danh sách mục ===
  const items = computed<DropdownItemType[]>(() => {
    if (rawItems.value.length === 0) return []

    // Chuyển đổi sang định dạng DropdownItem
    const source = (rawItems.value as unknown as T[]) || []
    let dropdownItems = source.map((it) => toDropdownItem(it as T))

    // Chế độ manual: xử lý nhóm
    if (mode === 'manual' && showSectionHeaders) {
      dropdownItems = organizeItemsWithSections(dropdownItems)
    }

    return dropdownItems
  })

  // Tổ chức mục theo định dạng nhóm
  function organizeItemsWithSections(items: DropdownItemType[]): DropdownItemType[] {
    if (!showSectionHeaders) return items

    const result: DropdownItemType[] = []
    const grouped = new Map<string, DropdownItemType[]>()

    // Nhóm theo section
    for (const item of items) {
      const section = (item as any).section || 'Other'
      if (!grouped.has(section)) {
        grouped.set(section, [])
      }
      grouped.get(section)!.push(item)
    }

    // Xuất theo thứ tự được chỉ định
    const sections = sectionOrder.length > 0
      ? sectionOrder
      : Array.from(grouped.keys())

    for (const section of sections) {
      const sectionItems = grouped.get(section)
      if (!sectionItems || sectionItems.length === 0) continue

      // Thêm dấu phân cách (trừ mục đầu tiên)
      if (result.length > 0) {
        result.push({
          id: `separator-${section}`,
          type: 'separator'
        } as DropdownItemType)
      }

      // Thêm tiêu đề nhóm
      result.push({
        id: `section-${section}`,
        type: 'section-header',
        text: section
      } as DropdownItemType)

      // Thêm mục
      result.push(...sectionItems)
    }

    return result
  }

  // Các mục có thể điều hướng (loại trừ dấu phân cách và tiêu đề)
  const navigableItems = computed<T[]>(() => rawItems.value as unknown as T[])

  // === Tính toán vị trí ===
  const positionRef = ref<DropdownPosition>({ top: 0, left: 0, width: 0, height: 0 })
  const position = computed<DropdownPosition>(() => positionRef.value)

  // Cập nhật vị trí (có thể được gọi từ bên ngoài)
  function updatePosition(pos: DropdownPosition) {
    positionRef.value = pos
  }

  // Cập nhật vị trí mặc định (dựa trên anchorElement)
  function updateDefaultPosition() {
    if (!anchorElement?.value) {
      positionRef.value = { top: 0, left: 0, width: 0, height: 0 }
      return
    }

    const rect = anchorElement.value.getBoundingClientRect()
    positionRef.value = {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height
    }
  }

  // === Điều hướng bàn phím ===
  const navigation = useKeyboardNavigation({
    isOpen,
    items: computed(() => navigableItems.value),
    activeIndex,
    onSelect: (index) => {
      const item = navigableItems.value[index] as unknown as T
      if (item != null) {
        onSelect(item as T, triggerQuery.value)
        close()
      }
    },
    onClose: close,
    supportTab: true,
    supportEscape: mode === 'inline', // Chế độ inline hỗ trợ Escape
    onNavigate: () => {
      // Chuyển sang chế độ keyboard khi điều hướng bằng bàn phím
      navigationMode.value = 'keyboard'
    }
  })

  // === Chế độ inline: Đánh giá truy vấn ===
  function evaluateQuery(text: string, caretOffset?: number) {
    if (mode !== 'inline' || !triggerDetection) return

    // Lấy vị trí con trỏ
    const caret = caretOffset ?? triggerDetection.getCaretOffset(anchorElement?.value || null)
    if (caret === undefined) {
      triggerQuery.value = undefined
      isOpen.value = false
      return
    }

    // Tìm truy vấn kích hoạt
    const foundQuery = triggerDetection.findQuery(text, caret)
    triggerQuery.value = foundQuery

    if (foundQuery) {
      query.value = foundQuery.query
      isOpen.value = true
      activeIndex.value = 0
      loadItemsDebounced(foundQuery.query)
    } else {
      isOpen.value = false
    }
  }

  // === Chế độ inline: Thay thế văn bản ===
  function replaceText(text: string, replacement: string): string {
    if (mode !== 'inline' || !triggerDetection || !triggerQuery.value) {
      return text
    }

    return triggerDetection.replaceRange(text, triggerQuery.value, replacement)
  }

  // === Chế độ manual: Mở/Đóng ===
  function open() {
    isOpen.value = true
    activeIndex.value = 0
    query.value = ''
    void loadItems('')
  }

  function close() {
    isOpen.value = false
    activeIndex.value = -1 // Đặt lại thành -1 khi đóng
    query.value = ''
    triggerQuery.value = undefined
    rawItems.value = []
    navigationMode.value = 'keyboard' // Đặt lại chế độ điều hướng
  }

  // === Tương tác chuột ===
  function handleMouseEnter(index: number) {
    navigationMode.value = 'mouse'
    activeIndex.value = index
  }

  function handleMouseLeave() {
    // Đặt lại chỉ số thành -1 khi chuột rời đi (không có mục nào được chọn)
    activeIndex.value = -1
  }

  // === Chế độ manual: Tìm kiếm (chống giật) ===
  let debounceTimer: number | undefined
  function handleSearch(term: string) {
    query.value = term
    activeIndex.value = 0
    if (debounceTimer) window.clearTimeout(debounceTimer)
    debounceTimer = window.setTimeout(() => {
      void loadItems(term)
    }, 120)
  }

  // === Xử lý sự kiện bàn phím ===
  function handleKeydown(event: KeyboardEvent) {
    navigation.handleKeydown(event)
  }

  // === Chọn trực tiếp hiện tại/chỉ định (dùng cho các trường hợp như nhấp chuột) ===
  function selectActive() {
    // Tái sử dụng logic chọn điều hướng
    navigation.selectActive()
  }

  function selectIndex(index: number) {
    if (index < 0 || index >= navigableItems.value.length) return
    activeIndex.value = index
    const item = navigableItems.value[index] as unknown as T
    if (item != null) {
      onSelect(item as T, triggerQuery.value)
      close()
    }
  }

  // === Tải lại khi truy vấn thay đổi (chỉ các chế độ không phải inline/manual) ===
  watch(query, (newQuery) => {
    // Chế độ inline đã được kích hoạt qua evaluateQuery + chống giật, tránh gọi lại lặp lại
    if (mode === 'inline') return
    // Chế độ manual được kiểm soát bởi handleSearch
    if (mode === 'manual') return

    if (isOpen.value) void loadItems(newQuery)
  })

  // === Thu hẹp chỉ số chọn khi danh sách thay đổi, tránh vượt quá giới hạn ===
  watch(items, (list) => {
    const len = list.length
    if (len === 0) {
      activeIndex.value = -1
      return
    }
    if (activeIndex.value < 0) activeIndex.value = 0
    if (activeIndex.value >= len) activeIndex.value = len - 1
  })

  return {
    isOpen,
    items,
    activeIndex,
    position,
    query,
    triggerQuery,
    navigationMode,
    // Hiển thị loading (tùy chọn sử dụng)
    // @ts-expect-error: Trạng thái hiển thị thêm, tương thích ngược
    loading: isLoading,
    open,
    close,
    handleKeydown,
    selectActive,
    selectIndex,
    handleSearch,
    evaluateQuery,
    replaceText,
    handleMouseEnter,
    handleMouseLeave,
    updatePosition
  }
}
