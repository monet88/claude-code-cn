import type { TriggerQuery, TriggerDetectionOptions } from '../types/completion'

/**
 * Composable phát hiện ký tự kích hoạt
 *
 * Dùng để phát hiện ký tự kích hoạt trong văn bản nhập vào (ví dụ: '/' hoặc '@') và phân tích thông tin truy vấn
 *
 * @param options Tùy chọn phát hiện
 * @returns Các hàm liên quan đến phát hiện kích hoạt
 *
 * @example
 * const { findQuery, getCaretOffset } = useTriggerDetection({ trigger: '/' })
 * const caret = getCaretOffset(inputElement)
 * const query = findQuery('hello /command world', caret)
 */
export function useTriggerDetection(options: TriggerDetectionOptions) {
  const { trigger, customRegex } = options

  /**
   * Lấy vị trí con trỏ trong văn bản
   *
   * @param element phần tử contenteditable
   * @returns Vị trí con trỏ, trả về undefined nếu thất bại
   */
  function getCaretOffset(element: HTMLElement | null): number | undefined {
    if (!element) return undefined

    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return undefined

    const range = selection.getRangeAt(0)
    if (!element.contains(range.startContainer)) return undefined

    // Tạo một phạm vi từ phần tử bắt đầu đến vị trí con trỏ
    const preCaretRange = range.cloneRange()
    preCaretRange.selectNodeContents(element)
    preCaretRange.setEnd(range.endContainer, range.endOffset)

    return preCaretRange.toString().length
  }

  /**
   * Tìm truy vấn kích hoạt trong văn bản
   *
   * @param text Văn bản đầu vào
   * @param caret Vị trí con trỏ
   * @returns Thông tin truy vấn kích hoạt, trả về undefined nếu không tìm thấy
   */
  function findQuery(text: string, caret: number): TriggerQuery | undefined {
    // Xây dựng biểu thức chính quy
    // Khớp: ký tự kích hoạt ở đầu dòng hoặc sau khoảng trắng, theo sau là các ký tự không phải khoảng trắng và không phải ký tự kích hoạt
    const escapedTrigger = trigger.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = customRegex || new RegExp(
      `(?:^|\\s)${escapedTrigger}[^\\s${escapedTrigger}]*`,
      'g'
    )

    const matches = Array.from(text.matchAll(regex))

    for (const match of matches) {
      const matchIndex = match.index ?? 0
      // Tìm vị trí thực của ký tự kích hoạt (có thể sau khoảng trắng)
      const start = text.indexOf(trigger, matchIndex)
      const end = start + match[0].trim().length

      // Kiểm tra con trỏ có nằm trong phạm vi kích hoạt không
      if (caret > start && caret <= end) {
        return {
          query: text.substring(start + trigger.length, end),
          start,
          end,
          trigger
        }
      }
    }

    return undefined
  }

  /**
   * Thay thế phạm vi kích hoạt trong văn bản
   *
   * @param text Văn bản gốc
   * @param query Thông tin truy vấn kích hoạt
   * @param replacement Văn bản thay thế
   * @returns Văn bản sau khi thay thế
   */
  function replaceRange(
    text: string,
    query: TriggerQuery,
    replacement: string
  ): string {
    const before = text.substring(0, query.start)
    const after = text.substring(query.end)
    // Nếu sau đó không có khoảng trắng, tự động thêm một
    const suffix = after.startsWith(' ') ? '' : ' '
    return `${before}${replacement}${suffix}${after}`
  }

  return {
    findQuery,
    getCaretOffset,
    replaceRange
  }
}
