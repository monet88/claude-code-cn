/**
 * Message - Message Class
 *
 * Core Features:
 * 1. Wraps message data
 * 2. Provides isEmpty getter (dynamically computed)
 * 3. Supports ContentBlockWrapper reactive tool_result association
 */

import type { ContentBlockType } from '../models/ContentBlock';
import { parseMessageContent } from '../models/contentParsers';
import { ContentBlockWrapper } from '../models/ContentBlockWrapper';

/**
 * Message Type
 */
export type MessageRole = 'user' | 'assistant' | 'system' | 'result' | 'tip' | 'slash_command_result';

/**
 * Message Content Data
 */
export interface MessageData {
  role: MessageRole;
  content: string | ContentBlockWrapper[];
}

/**
 * Message Class
 *
 * Corresponds to original logic:
 * - user/assistant messages: content is ContentBlockWrapper[]
 * - system/result messages: content is string
 */
export class Message {
  type: MessageRole;
  message: MessageData;
  timestamp: number;

  // Extra fields (for system and result messages)
  subtype?: string;
  session_id?: string;
  is_error?: boolean;

  constructor(
    type: MessageRole,
    message: MessageData,
    timestamp: number = Date.now(),
    extra?: {
      subtype?: string;
      session_id?: string;
      is_error?: boolean;
    }
  ) {
    this.type = type;
    this.message = message;
    this.timestamp = timestamp;

    if (extra) {
      this.subtype = extra.subtype;
      this.session_id = extra.session_id;
      this.is_error = extra.is_error;
    }
  }

  /**
   * isEmpty getter - Determine if message is "empty"
   *
   * Logic:
   * 1. system messages are never empty
   * 2. user/assistant messages:
   *    - Empty content array → empty
   *    - All content blocks are tool_result → empty
   */
  get isEmpty(): boolean {
    // system messages are never empty
    if (this.type === 'system') {
      return false;
    }

    const content = this.message.content;

    // String content is not empty
    if (typeof content === 'string') {
      return content.length === 0;
    }

    // ContentBlockWrapper array
    if (Array.isArray(content)) {
      // Empty array → empty
      if (content.length === 0) {
        return true;
      }

      // All content blocks are tool_result → empty
      return content.every((wrapper) => wrapper.content.type === 'tool_result');
    }

    return false;
  }

  /**
   * Static factory method - Create Message instance from raw message
   *
   * @param raw Raw message object
   * @returns Message instance or null
   */
  static fromRaw(raw: any): Message | null {
    if (raw.type === 'user' || raw.type === 'assistant') {
      const rawContent = Array.isArray(raw.message?.content)
        ? raw.message.content
        : raw.message?.content !== undefined
          ? [{ type: 'text', text: String(raw.message.content) }]
          : [];

      // Parse raw content
      const contentBlocks = parseMessageContent(rawContent);

      // Wrap as ContentBlockWrapper
      const wrappedContent = contentBlocks.map((block) => new ContentBlockWrapper(block));

      // Determine message type based on contentParsers parsing result
      let messageType: MessageRole = raw.type;

      // Check if it's a special message type
      if (raw.type === 'user') {
        const specialType = getSpecialMessageType(contentBlocks);
        if (specialType) {
          messageType = specialType;
        }
      }

      return new Message(
        messageType,
        {
          role: raw.message?.role ?? raw.type,
          content: wrappedContent,
        },
        raw.timestamp || Date.now()
      );
    }

    // Don't render system messages (only used for state updates)
    if (raw.type === 'system') {
      return null;
    }

    // Don't render result messages (only used for end flags/usage statistics etc state updates)
    if (raw.type === 'result') {
      return null;
    }

    // stream_event etc don't create messages
    return null;
  }
}

/**
 * Type Guards
 */
export function isUserMessage(msg: Message): boolean {
  return msg.type === 'user';
}

export function isAssistantMessage(msg: Message): boolean {
  return msg.type === 'assistant';
}

export function isSystemMessage(msg: Message): boolean {
  return msg.type === 'system';
}

export function isResultMessage(msg: Message): boolean {
  return msg.type === 'result';
}

/**
 * Get special message type
 *
 * Based on contentParsers.ts parsing results
 * Returns specific message type for differentiated rendering
 */
function getSpecialMessageType(contentBlocks: ContentBlockType[]): MessageRole | null {
  if (contentBlocks.length === 1) {
    const blockType = contentBlocks[0].type;

    if (blockType === 'interrupt') {
      return 'tip';
    }

    if (blockType === 'slash_command_result') {
      return 'slash_command_result';
    }
  }

  return null;
}
