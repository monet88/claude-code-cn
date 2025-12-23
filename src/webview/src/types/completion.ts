import type { Ref, ComputedRef } from 'vue'
import type { DropdownItemType } from './dropdown'

/**
 * Trigger query information
 * Records trigger symbol, query text, and position range
 */
export interface TriggerQuery {
  /** Query text (does not include trigger symbol) */
  query: string
  /** Start position of trigger symbol in text */
  start: number
  /** End position of query */
  end: number
  /** Trigger symbol (e.g. '/' or '@') */
  trigger: string
}

/**
 * Dropdown position information
 */
export interface DropdownPosition {
  top: number
  left: number
  width: number
  height: number
}

/**
 * Completion mode
 * - inline: Input trigger (e.g. /command, @file)
 * - manual: Manual trigger (e.g. button click)
 */
export type CompletionMode = 'inline' | 'manual'

/**
 * Completion configuration options
 */
export interface CompletionConfig<T> {
  /** Completion mode */
  mode: CompletionMode

  /** Trigger symbol (required for inline mode, e.g. '/' or '@') */
  trigger?: string

  /** Data provider function (supports optional AbortSignal for request cancellation) */
  provider: (query: string, signal?: AbortSignal) => Promise<T[]> | T[]

  /** Convert data item to DropdownItem format */
  toDropdownItem: (item: T) => DropdownItemType

  /** Callback for selecting an item */
  onSelect: (item: T, query?: TriggerQuery) => void

  /** Anchor element for positioning dropdown */
  anchorElement?: Ref<HTMLElement | null>

  /** Whether to show section headers (manual mode) */
  showSectionHeaders?: boolean

  /** Search fields list (for filtering, manual mode) */
  searchFields?: string[]

  /** Command group order (manual mode, optional) */
  sectionOrder?: readonly string[]
}

/**
 * Completion Dropdown return value
 */
export interface CompletionDropdown {
  /** Whether dropdown is open */
  isOpen: Ref<boolean>

  /** Dropdown item list */
  items: ComputedRef<DropdownItemType[]>

  /** Current active index */
  activeIndex: Ref<number>

  /** Dropdown position */
  position: ComputedRef<DropdownPosition>

  /** Current query text */
  query: Ref<string>

  /** Current trigger query information (inline mode) */
  triggerQuery: Ref<TriggerQuery | undefined>

  /** Navigation mode */
  navigationMode: Ref<'keyboard' | 'mouse'>

  /** Open dropdown */
  open: () => void

  /** Close dropdown */
  close: () => void

  /** Keyboard event handler */
  handleKeydown: (event: KeyboardEvent) => void

  /** Select current active item (for click triggers, etc.) */
  selectActive: () => void

  /** Select item by index (for click triggers, etc.) */
  selectIndex: (index: number) => void

  /** Search handler (manual mode) */
  handleSearch: (term: string) => void

  /** Evaluate query (internal use in inline mode) */
  evaluateQuery: (text: string, caretOffset?: number) => void

  /** Text replacement (inline mode) */
  replaceText: (text: string, replacement: string) => string

  /** Mouse enter item (switch to mouse mode) */
  handleMouseEnter: (index: number) => void

  /** Mouse leave menu (reset index) */
  handleMouseLeave: () => void

  /** Manually update position */
  updatePosition: (pos: DropdownPosition) => void
}

/**
 * Keyboard navigation options
 */
export interface KeyboardNavigationOptions {
  /** Whether dropdown is open */
  isOpen: Ref<boolean>

  /** Item list */
  items: ComputedRef<any[]>

  /** Current active index */
  activeIndex: Ref<number>

  /** Select current item callback */
  onSelect: (index: number) => void

  /** Close callback */
  onClose: () => void

  /** Whether to support Tab key selection */
  supportTab?: boolean

  /** Whether to support Escape key to close */
  supportEscape?: boolean

  /** Navigation callback (for switching navigation mode) */
  onNavigate?: () => void

  /** Page size (default 5) */
  pageSize?: number
}

/**
 * Trigger detection options
 */
export interface TriggerDetectionOptions {
  /** Trigger symbol */
  trigger: string

  /** Custom regex (optional) */
  customRegex?: RegExp
}
