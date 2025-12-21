/**
 * ContentBlockWrapper - Content Block Wrapper
 *
 * Uses alien-signals to manage reactive association of tool_result
 *
 * Core Features:
 * 1. Wraps each content block
 * 2. Uses Signal to manage toolResult (reactive)
 * 3. Provides setToolResult method for async association
 *
 * Why is this wrapper needed?
 * - tool_use and tool_result are not in the same message
 * - Async association is required (when tool_result is received, lookup tool_use in reverse)
 * - Using signal enables reactive UI updates
 */

import { signal } from 'alien-signals';
import type { ContentBlockType, ToolResultBlock } from './ContentBlock';

export class ContentBlockWrapper {
  /**
   * Original content block
   */
  public readonly content: ContentBlockType;

  /**
   * Tool Result Signal (reactive)
   * Used for tool_result in real-time conversations
   */
  private readonly toolResultSignal = signal<ToolResultBlock | undefined>(undefined);

  /**
   * Tool Use Result (plain property)
   * Used for toolUseResult when loading session (no reactivity needed)
   */
  public toolUseResult?: any;

  constructor(content: ContentBlockType) {
    this.content = content;
  }

  /**
   * Get toolResult signal
   *
   * @returns Alien signal function
   */
  get toolResult() {
    return this.toolResultSignal;
  }

  /**
   * Set tool result
   *
   * Uses alien-signals function call API
   *
   * @param result Tool execution result
   */
  setToolResult(result: ToolResultBlock): void {
    this.toolResultSignal(result);
  }

  /**
   * Check if tool_result exists
   */
  hasToolResult(): boolean {
    return this.toolResultSignal() !== undefined;
  }

  /**
   * Get tool_result value (non-reactive)
   */
  getToolResultValue(): ToolResultBlock | undefined {
    return this.toolResultSignal();
  }
}
