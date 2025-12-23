<template>
  <div class="assistant-message">
    <template v-if="typeof message.message.content === 'string'">
      <ContentBlock :block="{ type: 'text', text: message.message.content }" :context="context" />
    </template>
    <template v-else>
      <template v-for="(item, index) in groupedContent" :key="index">
        <!-- Grouped Read calls -->
        <ReadToolGroup
          v-if="item.type === 'read-group'"
          :items="item.items"
          :context="context"
        />
        <!-- Regular content blocks -->
        <ContentBlock
          v-else
          :block="item.wrapper.content"
          :wrapper="item.wrapper"
          :context="context"
        />
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Message } from '../../models/Message';
import type { ToolContext } from '../../types/tool';
import type { ContentBlockWrapper } from '../../models/ContentBlockWrapper';
import ContentBlock from './ContentBlock.vue';
import ReadToolGroup from './blocks/tools/ReadToolGroup.vue';

// Minimum consecutive Read calls to group (threshold)
const READ_GROUP_THRESHOLD = 3;

// Types for grouped content
type GroupedItem =
  | { type: 'read-group'; items: ContentBlockWrapper[] }
  | { type: 'single'; wrapper: ContentBlockWrapper };

interface Props {
  message: Message;
  context: ToolContext;
}

const props = defineProps<Props>();

// Filter duplicate text blocks that match Task tool prompts
const filteredContent = computed(() => {
  const content = props.message.message.content;
  if (!Array.isArray(content)) return [];

  // Collect all Task tool prompts for deduplication
  const taskPrompts = new Set<string>();
  for (const wrapper of content) {
    if (wrapper.content.type === 'tool_use' && wrapper.content.name === 'Task') {
      const prompt = wrapper.content.input?.prompt;
      if (prompt && typeof prompt === 'string') {
        taskPrompts.add(prompt.trim());
      }
    }
  }

  // Filter out text blocks that duplicate Task prompts
  if (taskPrompts.size === 0) return content;

  return content.filter(wrapper => {
    if (wrapper.content.type !== 'text') return true;
    const text = wrapper.content.text?.trim();
    if (!text) return true;
    // Check if this text matches any Task prompt
    return !taskPrompts.has(text);
  });
});

// Helper: check if wrapper is a Read tool_use
function isReadTool(wrapper: ContentBlockWrapper): boolean {
  return wrapper.content.type === 'tool_use' && wrapper.content.name === 'Read';
}

// Group consecutive Read calls when there are >= READ_GROUP_THRESHOLD
const groupedContent = computed<GroupedItem[]>(() => {
  const items = filteredContent.value;
  if (items.length === 0) return [];

  const result: GroupedItem[] = [];
  let readBuffer: ContentBlockWrapper[] = [];

  function flushReadBuffer() {
    if (readBuffer.length >= READ_GROUP_THRESHOLD) {
      // Group them
      result.push({ type: 'read-group', items: readBuffer });
    } else {
      // Too few, render individually
      for (const wrapper of readBuffer) {
        result.push({ type: 'single', wrapper });
      }
    }
    readBuffer = [];
  }

  for (const wrapper of items) {
    if (isReadTool(wrapper)) {
      readBuffer.push(wrapper);
    } else {
      // Flush any pending Read items before adding non-Read
      if (readBuffer.length > 0) {
        flushReadBuffer();
      }
      result.push({ type: 'single', wrapper });
    }
  }

  // Flush remaining Read items at end
  if (readBuffer.length > 0) {
    flushReadBuffer();
  }

  return result;
});
</script>

<style scoped>
.assistant-message {
  display: block;
  outline: none;
  padding: 8px 16px;
  margin: 4px 12px;
  background-color: transparent;
  border: none;
  border-radius: 0;
  opacity: 1;
  font-size: 13px;
  line-height: 1.6;
  color: var(--vscode-editor-foreground);
  word-wrap: break-word;
}
</style>
