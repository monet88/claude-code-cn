<template>
  <div class="dialog-overlay" @click.self="$emit('close')">
    <div class="dialog">
      <div class="dialog-header">
        <h3>Manual Configuration</h3>
        <div class="header-actions">
          <button class="mode-btn" :class="{ active: true }">
            Raw configuration (JSON)
          </button>
          <button class="close-btn" @click="$emit('close')">
            <span class="codicon codicon-close"></span>
          </button>
        </div>
      </div>

      <div class="dialog-body">
        <p class="dialog-desc">
          Enter MCP Servers configuration JSON (prefer NPX or UVX setups)
        </p>

        <div class="json-editor">
          <div class="line-numbers">
            <div v-for="n in lineCount" :key="n" class="line-num">{{ n }}</div>
          </div>
          <textarea
            ref="editorRef"
            v-model="jsonContent"
            class="json-textarea"
            :placeholder="placeholder"
            spellcheck="false"
            @input="handleInput"
            @keydown.tab.prevent="handleTab"
          ></textarea>
        </div>

        <div v-if="parseError" class="error-message">
          <span class="codicon codicon-error"></span>
          {{ parseError }}
        </div>
      </div>

      <div class="dialog-footer">
        <div class="footer-hint">
          <span class="codicon codicon-info"></span>
          Verify the source and assess risks before applying the configuration
        </div>
        <div class="footer-actions">
          <button class="btn btn-secondary" @click="$emit('close')">Cancel</button>
          <button class="btn btn-primary" @click="handleConfirm" :disabled="!isValid || saving">
            <span v-if="saving" class="codicon codicon-loading codicon-modifier-spin"></span>
            {{ saving ? 'Saving...' : 'Confirm' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import type { McpServer, McpServerSpec } from '../types/mcp';

const props = defineProps<{
  server?: McpServer | null;
  existingIds?: string[];
}>();

const emit = defineEmits<{
  close: [];
  save: [server: McpServer];
}>();

// Status
const saving = ref(false);
const jsonContent = ref('');
const parseError = ref('');
const editorRef = ref<HTMLTextAreaElement | null>(null);

// Placeholder example
const placeholder = `// Example:
// {
//   "mcpServers": {
//     "example-server": {
//       "command": "npx",
//       "args": [
//         "-y",
//         "mcp-server-example"
//       ]
//     }
//   }
// }`;

// Count lines
const lineCount = computed(() => {
  const content = jsonContent.value || placeholder;
  return Math.max(content.split('\n').length, 12);
});

// Validate JSON
const isValid = computed(() => {
  if (!jsonContent.value.trim()) return false;
  // Remove comment lines
  const cleanedContent = jsonContent.value
    .split('\n')
    .filter(line => !line.trim().startsWith('//'))
    .join('\n');
  if (!cleanedContent.trim()) return false;
  try {
    const parsed = JSON.parse(cleanedContent);
    // Validate the structure
    if (parsed.mcpServers && typeof parsed.mcpServers === 'object') {
      return Object.keys(parsed.mcpServers).length > 0;
    }
    // Direct server configuration (has command or url)
    if (parsed.command || parsed.url) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
});

// Process input
function handleInput() {
  parseError.value = '';
}

// Handle Tab key
function handleTab(e: KeyboardEvent) {
  const textarea = editorRef.value;
  if (!textarea) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;

  jsonContent.value = value.substring(0, start) + '  ' + value.substring(end);

  nextTick(() => {
    textarea.selectionStart = textarea.selectionEnd = start + 2;
  });
}

// Parse JSON configuration
function parseConfig(): McpServer[] | null {
  try {
    // Remove comment lines
    const cleanedContent = jsonContent.value
      .split('\n')
      .filter(line => !line.trim().startsWith('//'))
      .join('\n');

    const parsed = JSON.parse(cleanedContent);
    const servers: McpServer[] = [];

    // mcpServers format
    if (parsed.mcpServers && typeof parsed.mcpServers === 'object') {
      for (const [id, config] of Object.entries(parsed.mcpServers)) {
        // Check if the ID already exists (except in edit mode)
        if (!props.server && props.existingIds?.includes(id)) {
          parseError.value = `Server ID "${id}" already exists`;
          return null;
        }

        const serverConfig = config as any;
        const server: McpServer = {
          id,
          name: serverConfig.name || id,
          server: {
            type: serverConfig.type || (serverConfig.command ? 'stdio' : serverConfig.url ? 'http' : 'stdio'),
            command: serverConfig.command,
            args: serverConfig.args,
            env: serverConfig.env,
            cwd: serverConfig.cwd,
            url: serverConfig.url,
            headers: serverConfig.headers,
          } as McpServerSpec,
          apps: {
            claude: true,
            codex: false,
            gemini: false,
          },
          enabled: true,
        };
        servers.push(server);
      }
    }
    // Direct server configuration format
    else if (parsed.command || parsed.url) {
      const id = `server-${Date.now()}`;
      const server: McpServer = {
        id,
        name: parsed.name || id,
        server: {
          type: parsed.type || (parsed.command ? 'stdio' : 'http'),
          command: parsed.command,
          args: parsed.args,
          env: parsed.env,
          cwd: parsed.cwd,
          url: parsed.url,
          headers: parsed.headers,
        } as McpServerSpec,
        apps: {
          claude: true,
          codex: false,
          gemini: false,
        },
        enabled: true,
      };
      servers.push(server);
    }

    if (servers.length === 0) {
      parseError.value = 'Unrecognized configuration format.';
      return null;
    }

    return servers;
  } catch (e) {
    parseError.value = `JSON parse error: ${(e as Error).message}`;
    return null;
  }
}

// Confirm save
async function handleConfirm() {
  const servers = parseConfig();
  if (!servers) return;

  saving.value = true;
  try {
    // Save servers one by one
    for (const server of servers) {
      emit('save', server);
    }
  } finally {
    saving.value = false;
  }
}

// Initialize edit mode
onMounted(() => {
  if (props.server) {
    // Edit mode: convert to JSON format
    const config: any = {
      mcpServers: {
        [props.server.id]: {
          ...props.server.server,
        },
      },
    };
    jsonContent.value = JSON.stringify(config, null, 2);
  }
});
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: var(--vscode-editor-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 8px;
  width: 90%;
  max-width: 700px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--vscode-panel-border);
}

.dialog-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.mode-btn {
  padding: 6px 12px;
  border: 1px solid var(--vscode-panel-border);
  border-radius: 4px;
  background: var(--vscode-input-background);
  color: var(--vscode-foreground);
  font-size: 12px;
  cursor: default;
}

.mode-btn.active {
  background: var(--vscode-button-secondaryBackground);
  border-color: var(--vscode-button-secondaryBackground);
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--vscode-foreground);
  cursor: pointer;
}

.close-btn:hover {
  background: var(--vscode-toolbar-hoverBackground);
}

.dialog-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.dialog-desc {
  margin: 0 0 16px 0;
  font-size: 13px;
  color: var(--vscode-descriptionForeground);
  line-height: 1.5;
}

.json-editor {
  display: flex;
  border: 1px solid var(--vscode-input-border, var(--vscode-panel-border));
  border-radius: 6px;
  background: var(--vscode-input-background);
  overflow: hidden;
  min-height: 300px;
  max-height: 400px;
}

.line-numbers {
  padding: 12px 8px;
  background: var(--vscode-editorLineNumber-foreground);
  background: rgba(128, 128, 128, 0.1);
  border-right: 1px solid var(--vscode-panel-border);
  user-select: none;
  overflow-y: hidden;
}

.line-num {
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace;
  font-size: 12px;
  line-height: 1.6;
  color: var(--vscode-editorLineNumber-foreground);
  text-align: right;
  min-width: 24px;
  padding-right: 4px;
}

.json-textarea {
  flex: 1;
  padding: 12px;
  border: none;
  background: transparent;
  color: var(--vscode-input-foreground);
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace;
  font-size: 12px;
  line-height: 1.6;
  resize: none;
  overflow-y: auto;
}

.json-textarea:focus {
  outline: none;
}

.json-textarea::placeholder {
  color: var(--vscode-input-placeholderForeground);
}

.error-message {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  padding: 8px 12px;
  border-radius: 4px;
  background: var(--vscode-inputValidation-errorBackground);
  color: var(--vscode-inputValidation-errorForeground);
  font-size: 12px;
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-top: 1px solid var(--vscode-panel-border);
}

.footer-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
}

.footer-actions {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-primary {
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
}

.btn-primary:hover:not(:disabled) {
  background: var(--vscode-button-hoverBackground);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: transparent;
  color: var(--vscode-foreground);
  border: 1px solid var(--vscode-button-border, var(--vscode-panel-border));
}

.btn-secondary:hover {
  background: var(--vscode-list-hoverBackground);
}

/* Loading animation */
.codicon-modifier-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Responsive tweaks */
@media (max-width: 480px) {
  .dialog {
    width: 95%;
    max-height: 95vh;
  }

  .dialog-header,
  .dialog-body,
  .dialog-footer {
    padding: 12px 16px;
  }

  .dialog-footer {
    flex-direction: column;
    gap: 12px;
  }

  .footer-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
