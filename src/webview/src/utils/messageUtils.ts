/**
 * MessageUtils - Message processing utility functions
 *
 * Corresponding to the original code's rZe and LSe functions
 */

import { Message } from '../models/Message';
import { ContentBlockWrapper } from '../models/ContentBlockWrapper';
import type { ToolResultBlock, ToolUseContentBlock, ContentBlockType } from '../models/ContentBlock';

/**
 * Reverse lookup tool_use block
 *
 * Corresponding to the original code:
 * function rZe(n, e) {
 *   for (let t = n.length - 1; t >= 0; t--) {
 *     let i = n[t];
 *     if (i.type === "assistant") {
 *       for (let o of i.content) {
 *         if (o.content.type === "tool_use" && o.content.id === e) {
 *           return o;
 *         }
 *       }
 *     }
 *   }
 * }
 *
 * @param messages Message array
 * @param toolUseId tool_use id
 * @returns Found ContentBlockWrapper (contains tool_use)
 */
export function findToolUseBlock(
    messages: Message[],
    toolUseId: string
): ContentBlockWrapper | undefined {
    // From the end of the message array
    for (let i = messages.length - 1; i >= 0; i--) {
        const message = messages[i];

        // Only look for assistant messages
        if (message.type === 'assistant') {
            const content = message.message.content;

            // content should be ContentBlockWrapper[]
            if (Array.isArray(content)) {
                for (const wrapper of content) {
                    // Check if it is tool_use and id matches
                    if (
                        wrapper.content.type === 'tool_use' &&
                        (wrapper.content as ToolUseContentBlock).id === toolUseId
                    ) {
                        return wrapper;
                    }
                }
            }
        }
    }

    return undefined;
}

/**
 * Associate tool_result to the corresponding tool_use
 *
 * Corresponding to the original code:
 * function LSe(n, e) {
 *   if (e.type === "user" && Array.isArray(e.message.content)) {
 *     for (let i of e.message.content) {
 *       if (i.type === "tool_result") {
 *         let o = rZe(n, i.tool_use_id);
 *         if (o) {
 *           o.setToolResult(i);
 *         }
 *       }
 *     }
 *   }
 *   let t = LJ(e);
 *   if (t) {
 *     n.push(t);
 *   }
 * }
 *
 * Note:
 * - This function is called every time a new message is received
 * - It checks for tool_result blocks in the new message
 * - And looks up the corresponding tool_use in the history messages, associating it through Signal
 *
 * @param messages Current message array (will be modified)
 * @param newMessage New received message
 */
export function attachToolResults(messages: Message[], newMessage: Message): void {
    // Only process tool_result in user messages
    if (newMessage.type === 'user') {
        const content = newMessage.message.content;

        if (Array.isArray(content)) {
            for (const wrapper of content) {
                // Check if it is tool_result
                if (wrapper.content.type === 'tool_result') {
                    const toolResult = wrapper.content as ToolResultBlock;
                    const toolUseId = toolResult.tool_use_id;

                    // Look up the corresponding tool_use in the message history
                    const toolUseWrapper = findToolUseBlock(messages, toolUseId);

                    if (toolUseWrapper) {
                        // Associate tool_result through Signal (triggering reactive updates!)
                        toolUseWrapper.setToolResult(toolResult);
                    }
                }
            }
        }
    }
}

/**
 * Process and attach message
 *
 * Corresponding to the complete LSe logic of the original code
 *
 * @param messages Current message array
 * @param rawEvent Original message event
 */
export function processAndAttachMessage(messages: Message[], rawEvent: any): void {
    // 1. First associate tool_result and toolUseResult (if any)
    // Note: This step must be done before adding the new message, because tool_use should already be in the message array
    if (rawEvent.type === 'user' && Array.isArray(rawEvent.message?.content)) {
        for (const block of rawEvent.message.content) {
            if (block.type === 'tool_result') {
                const toolUseWrapper = findToolUseBlock(messages, block.tool_use_id);
                if (toolUseWrapper) {
                    // Associate tool_result (real-time conversation)
                    toolUseWrapper.setToolResult(block);

                    // Associate toolUseResult (additional data when loading the session)
                    if (rawEvent.toolUseResult) {
                        toolUseWrapper.toolUseResult = rawEvent.toolUseResult;
                    }
                }
            }
        }
    }

    // 2. Convert the original event to Message and add to array
    const message = Message.fromRaw(rawEvent);
    if (message) {
        messages.push(message);
    }
}

/**
 * Merge consecutive Read tool messages into ReadCoalesced (aligning original IJ/ySe/CSe/iZe behavior)
 *
 * Rules:
 * - Continuous assistant messages, each containing a tool_use with name === 'Read'
 * - And each corresponding tool_use has a non-error tool_result (success)
 * - Then merge into a new assistant message:
 *   - content is a single tool_use (name: 'ReadCoalesced', input: { fileReads: [...] })
 *   - Inject a successful tool_result ("Successfully read N files")
 */
export function mergeConsecutiveReadMessages(messages: Message[]): Message[] {
    const result: Message[] = [];
    let i = 0;

    while (i < messages.length) {
        const current = messages[i];
        if (isAssistantRead(current) && hasNonErrorToolResult(current)) {
            const group: Message[] = [current];
            let j = i + 1;
            while (j < messages.length) {
                const next = messages[j];
                if (isAssistantRead(next) && hasNonErrorToolResult(next)) {
                    group.push(next);
                    j++;
                } else {
                    break;
                }
            }

            if (group.length > 1) {
                result.push(buildReadCoalescedMessage(group));
                i = j;
                continue;
            }
        }

        result.push(current);
        i++;
    }

    return result;
}

function isAssistantRead(msg: Message): boolean {
    if (msg.type !== 'assistant') return false;
    const content = msg.message.content;
    if (typeof content === 'string' || !Array.isArray(content)) return false;
    return content.some(w => w.content.type === 'tool_use' && (w.content as ToolUseContentBlock).name === 'Read');
}

function firstReadToolUseWrapper(msg: Message): ContentBlockWrapper | undefined {
    const content = msg.message.content;
    if (typeof content === 'string' || !Array.isArray(content)) return undefined;
    return content.find(w => w.content.type === 'tool_use' && (w.content as ToolUseContentBlock).name === 'Read');
}

function hasNonErrorToolResult(msg: Message): boolean {
    const wrapper = firstReadToolUseWrapper(msg);
    if (!wrapper) return false;

    // 🔥 Use alien-signals API: toolResult is signal, need function call
    const tr = wrapper.getToolResultValue();
    if (!tr) return false;
    return !tr.is_error;
}

function buildReadCoalescedMessage(group: Message[]): Message {
    // Collect Read inputs from each message
    const fileReads = group.map(g => {
        const w = firstReadToolUseWrapper(g);
        const block = w?.content as ToolUseContentBlock | undefined;
        // With the same logic as the original version, fault tolerance: if the object cannot be retrieved, then release a null object.
        return block?.input ?? {};
    });

    const id = 'coalesced_' + Math.random().toString(36).slice(2);
    const toolUse: ToolUseContentBlock = {
        type: 'tool_use',
        id,
        name: 'ReadCoalesced',
        input: { fileReads }
    } as any; // Allow minimal intrusion

    const wrapper = new ContentBlockWrapper(toolUse as unknown as ContentBlockType);
    const toolResult: ToolResultBlock = {
        type: 'tool_result',
        tool_use_id: id,
        content: `Successfully read ${group.length} files`,
        is_error: false
    } as any;
    wrapper.setToolResult(toolResult);

    return new Message(
        'assistant',
        {
            role: 'assistant',
            content: [wrapper]
        }
    );
}

/**
 * Detect if the message is a Read tool call
 * @param message SDK message
 * @returns boolean
 */
export function isReadToolMessage(message: any): boolean {
    if (message.type !== 'assistant') {
        return false;
    }

    return message.message.content.some(
        (block: any) =>
            block.type === 'tool_use' &&
            block.name === 'Read'
    );
}

/**
 * Detect if the message is visible (non-empty)
 * @param message SDK message
 * @returns boolean
 */
export function isVisibleMessage(message: any): boolean {
    if (message.type !== 'assistant') {
        return true; // Non-assistant messages are always visible
    }

    return message.message.content.some((block: any) => {
        if (block.type === 'text') {
            return block.text.trim() !== '';
        }
        return true; // tool_use is always visible
    });
}

/**
 * Merge consecutive Read tool calls
 * Optimize UI display, reduce redundant Read tool messages
 *
 * @param messages SDK message array
 * @returns Optimized message array
 */
export function mergeConsecutiveReads(messages: any[]): any[] {
    const result: any[] = [];
    let i = 0;

    while (i < messages.length) {
        const current = messages[i];

        // Detect if it is a consecutive Read tool call
        if (isReadToolMessage(current) && isVisibleMessage(current)) {
            const readMessages: any[] = [current];

            // Collect consecutive Read messages
            let j = i + 1;
            while (j < messages.length) {
                const next = messages[j];
                if (isReadToolMessage(next) && isVisibleMessage(next)) {
                    readMessages.push(next);
                    j++;
                } else {
                    break;
                }
            }

            // If there are multiple consecutive Read, merge them
            if (readMessages.length > 1) {
                const merged = mergeReadToolMessages(readMessages);
                result.push(merged);
                i = j;
            } else {
                result.push(current);
                i++;
            }
        } else {
            result.push(current);
            i++;
        }
    }

    return result;
}

/**
 * Merge multiple Read tool messages
 * @param messages Read tool message array
 * @returns Merged single message
 */
function mergeReadToolMessages(messages: any[]): any {
    if (messages.length === 0) {
        throw new Error('Cannot merge empty messages array');
    }

    if (messages.length === 1) {
        return messages[0];
    }

    // Collect all tool_use blocks
    const toolUseBlocks = messages.flatMap((msg) =>
        msg.message.content.filter((block: any) => block.type === 'tool_use')
    );

    // Use the first message as the base
    const base = messages[0];

    return {
        ...base,
        message: {
            ...base.message,
            content: [
                {
                    type: 'text',
                    text: `[Merged ${toolUseBlocks.length} Read operations]`,
                    citations: null
                },
                ...toolUseBlocks
            ]
        }
    };
}

/**
 * Extract message text content
 * @param message SDK message
 * @returns Text content
 */
export function extractMessageText(message: any): string {
    if (message.type === 'user') {
        const content = message.message.content;
        if (Array.isArray(content)) {
            return content
                .map((block: any) => {
                    if (typeof block === 'string') {
                        return block;
                    } else if (block.type === 'text') {
                        return block.text;
                    }
                    return '';
                })
                .join('\n');
        }
        return '';
    }

    if (message.type === 'assistant') {
        return message.message.content
            .map((block: any) => {
                if (block.type === 'text') {
                    return block.text;
                }
                return '';
            })
            .filter((text: string) => text.trim() !== '')
            .join('\n');
    }

    return '';
}

/**
 * Detect if the message contains an error
 * @param message SDK message
 * @returns boolean
 */
export function hasError(message: any): boolean {
    if (message.type === 'result') {
        return message.is_error === true;
    }
    return false;
}

/**
 * Calculate the number of tokens in the message (estimation)
 * @param message SDK message
 * @returns Token count
 */
export function estimateTokenCount(message: any): number {
    const text = extractMessageText(message);
    // Simple estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
}
