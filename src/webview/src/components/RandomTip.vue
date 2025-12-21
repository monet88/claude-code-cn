<template>
  <div class="empty-state-content">
    <ClawdIcon class="empty-mascot" />
    <p class="empty-state-message">{{ currentTip }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import ClawdIcon from './ClawdIcon.vue';

interface Props {
  platform: string;
}

const props = defineProps<Props>();

const tips = computed(() => {
  const platformKey = props.platform === 'windows' ? 'Alt' : 'Option';
  return [
    'Welcome to Claude Code – ready to help you code faster.',
    'Press Shift + Tab\nanywhere to open Claude inline.',
    'Use /model in the chat to switch models.',
    'Check CLAUDE.md in your repo to see project-specific notes.',
    'Keep CLAUDE.md updated so Claude understands your project better.',
    'Use Shift + Tab to ask Claude about the current file.',
    `Use ${platformKey} + K to open the Claude sidebar.`,
    'You can trigger Claude with Shift + Tab even inside editors and diffs.',
    'Try asking Claude to explain a piece of code in plain language.',
    'Describe the behavior you want; Claude can draft the code for you.',
    'Experiment freely—Claude works best with quick, iterative prompts.',
    'Claude Code uses MCP under the hood\nto securely connect to your tools and services.'
  ];
});

const currentTip = ref(tips.value[0]);

onMounted(() => {
  // Pick a random tip when the component mounts
  const index = Math.floor(Math.random() * tips.value.length);
  currentTip.value = tips.value[index];
});
</script>

<style scoped>
.empty-state-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 32px 16px;
}

.empty-mascot {
  width: 47px;
  height: 38px;
}

.empty-state-message {
  margin: 0;
  padding: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--vscode-descriptionForeground);
  text-align: center;
  white-space: pre-line;
  max-width: 400px;
}
</style>

