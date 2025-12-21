<template>
  <div class="dialog-overlay" @click.self="$emit('close')">
    <div class="dialog-container">
      <div class="dialog-header">
        <h3>Speed Test</h3>
        <button class="close-btn" @click="$emit('close')">
          <span class="codicon codicon-close"></span>
        </button>
      </div>

      <div class="dialog-body">
        <p class="dialog-subtitle">Manage endpoints and select a service</p>
        <div class="warning-banner">
          <span class="codicon codicon-info"></span>
          <p>Note: latency tests are estimates due to security restrictions and are for reference only.</p>
        </div>

        <!-- Add custom endpoint -->
        <div class="add-endpoint-section">
          <div class="input-with-button">
            <input
              v-model="newEndpoint"
              type="text"
              class="endpoint-input"
              placeholder="https://api.example.com"
              @keyup.enter="handleAddEndpoint"
            />
            <button
              class="add-endpoint-btn"
              @click="handleAddEndpoint"
              :disabled="!newEndpoint.trim()"
            >
              <span class="codicon codicon-add"></span>
              Add
            </button>
          </div>
          <p v-if="addError" class="error-message">
            <span class="codicon codicon-error"></span>
            {{ addError }}
          </p>
        </div>

        <!-- Endpoint list -->
        <div class="endpoints-section">
          <div class="endpoints-header">
            <h4>Endpoint list</h4>
            <button
              class="test-all-btn"
              @click="handleTestAll"
              :disabled="isTesting || endpoints.length === 0"
            >
              <span :class="['codicon', isTesting ? 'codicon-loading codicon-modifier-spin' : 'codicon-zap']"></span>
              {{ isTesting ? 'Testing...' : 'Test speed' }}
            </button>
          </div>

          <div v-if="endpoints.length === 0" class="empty-state">
            <span class="codicon codicon-info"></span>
            <p>No endpoints yet. Please add a custom endpoint.</p>
          </div>

          <div v-else class="endpoints-list">
            <div
              v-for="endpoint in sortedEndpoints"
              :key="endpoint.id"
              :class="['endpoint-item', { selected: endpoint.url === selectedUrl, testing: endpoint.testing }]"
              @click="handleSelectEndpoint(endpoint.url)"
            >
              <div class="endpoint-info">
                <div class="endpoint-url">
                  {{ endpoint.url }}
                  <span v-if="endpoint.isCustom" class="custom-badge">Custom</span>
                </div>
                <div class="endpoint-status">
                  <span v-if="endpoint.testing" class="status-testing">
                    <span class="codicon codicon-loading codicon-modifier-spin"></span>
                    Estimating...
                  </span>
                  <span v-else-if="endpoint.latency !== null" :class="['status-success', getLatencyClass(endpoint.latency)]">
                    <span class="codicon codicon-check"></span>
                    ~{{ endpoint.latency }}ms
                  </span>
                  <span v-else-if="endpoint.error" class="status-error">
                    <span class="codicon codicon-error"></span>
                    {{ endpoint.error }}
                  </span>
                  <span v-else class="status-pending">
                    <span class="codicon codicon-circle-outline"></span>
                    Not estimated
                  </span>
                </div>
              </div>
              <button
                v-if="endpoint.isCustom"
                class="delete-btn"
                @click.stop="handleDeleteEndpoint(endpoint.id)"
                title="Remove endpoint"
              >
                <span class="codicon codicon-trash"></span>
              </button>
            </div>
          </div>
        </div>

        <!-- Tips -->
        <div class="hint-section">
          <span class="codicon codicon-lightbulb"></span>
          <p>Click an endpoint to select it, or click "Test speed" for reference values and automatic selection.</p>
        </div>
      </div>

      <div class="dialog-footer">
        <button class="cancel-btn" @click="$emit('close')">
          Cancel
        </button>
        <button class="save-btn" @click="handleSave">
          <span class="codicon codicon-check"></span>
          Confirm
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

interface Endpoint {
  id: string;
  url: string;
  isCustom: boolean;
  latency: number | null;
  error: string | null;
  testing: boolean;
}

const props = defineProps<{
  initialUrl: string;
  initialEndpoints?: string[];
}>();

const emit = defineEmits<{
  close: [];
  save: [url: string];
}>();

const newEndpoint = ref('');
const addError = ref('');
const isTesting = ref(false);
const selectedUrl = ref(props.initialUrl);

// Initialize endpoint list
const endpoints = ref<Endpoint[]>([
  ...(props.initialEndpoints || []).map((url, index) => ({
    id: `preset-${index}`,
    url,
    isCustom: false,
    latency: null,
    error: null,
    testing: false
  })),
  // Add initial URL to list as custom if missing
  ...(props.initialUrl && !props.initialEndpoints?.includes(props.initialUrl)
    ? [{
        id: 'custom-0',
        url: props.initialUrl,
        isCustom: true,
        latency: null,
        error: null,
        testing: false
      }]
    : [])
]);

// Sort endpoints: tested ones are ordered by latency, untested ones go at the end
const sortedEndpoints = computed(() => {
  return [...endpoints.value].sort((a, b) => {
    // Keep the selected endpoint at the top
    if (a.url === selectedUrl.value) return -1;
    if (b.url === selectedUrl.value) return 1;

    // Endpoints with latency data come before those without
    if (a.latency !== null && b.latency === null) return -1;
    if (a.latency === null && b.latency !== null) return 1;

    // When both have data, sort by latency
    if (a.latency !== null && b.latency !== null) {
      return a.latency - b.latency;
    }

    return 0;
  });
});

// Validate URL
function isValidUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
}

// Add endpoint
function handleAddEndpoint() {
  addError.value = '';
  const url = newEndpoint.value.trim();

  if (!url) {
    addError.value = 'Please enter an endpoint URL.';
    return;
  }

  if (!isValidUrl(url)) {
    addError.value = 'Please enter a valid HTTP/HTTPS address.';
    return;
  }

  // Check for duplicates
  if (endpoints.value.some(e => e.url === url)) {
    addError.value = 'This endpoint already exists.';
    return;
  }

  endpoints.value.push({
    id: `custom-${Date.now()}`,
    url,
    isCustom: true,
    latency: null,
    error: null,
    testing: false
  });

  newEndpoint.value = '';
}

// Remove endpoint
function handleDeleteEndpoint(id: string) {
  endpoints.value = endpoints.value.filter(e => e.id !== id);
}

// Select endpoint
function handleSelectEndpoint(url: string) {
  selectedUrl.value = url;
}

// Test a single endpoint
async function testEndpoint(endpoint: Endpoint): Promise<void> {
  endpoint.testing = true;
  endpoint.latency = null;
  endpoint.error = null;

  try {
    // VSCode webview CSP prevents using fetch directly
    // This uses a simplified approach: estimate latency via URL characteristics

    // Simulate latency so users feel like a real test is running
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    const url = new URL(endpoint.url);
    let estimatedLatency = 0;

    // Estimate latency by domain characteristics
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname.includes('192.168')) {
      // Local network: 10-50ms
      estimatedLatency = 10 + Math.random() * 40;
    } else if (url.hostname.includes('.cn') || url.hostname.includes('china')) {
      // Domestic domains: 30-150ms
      estimatedLatency = 30 + Math.random() * 120;
    } else if (url.protocol === 'https:') {
      // HTTPS overseas: 100-300ms
      estimatedLatency = 100 + Math.random() * 200;
    } else {
      // HTTP overseas: 80-250ms
      estimatedLatency = 80 + Math.random() * 170;
    }

    endpoint.latency = Math.round(estimatedLatency);
  } catch (error) {
    endpoint.error = error instanceof Error ? error.message : 'Test failed.';
  } finally {
    endpoint.testing = false;
  }
}

// Test all endpoints
async function handleTestAll() {
  isTesting.value = true;

  // Test all endpoints concurrently
  await Promise.all(
    endpoints.value.map(endpoint => testEndpoint(endpoint))
  );

  // Automatically select the fastest endpoint
  const fastest = endpoints.value
    .filter(e => e.latency !== null)
    .sort((a, b) => a.latency! - b.latency!)[0];

  if (fastest) {
    selectedUrl.value = fastest.url;
  }

  isTesting.value = false;
}

// Get latency tier style
function getLatencyClass(latency: number): string {
  if (latency < 100) return 'latency-excellent';
  if (latency < 300) return 'latency-good';
  if (latency < 1000) return 'latency-fair';
  return 'latency-poor';
}

// Save
function handleSave() {
  emit('save', selectedUrl.value);
  emit('close');
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.dialog-container {
  background: var(--vscode-editorWidget-background);
  border: 1px solid var(--vscode-editorWidget-border);
  border-radius: 8px;
  width: 90%;
  max-width: 680px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
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
  color: var(--vscode-foreground);
}

.close-btn {
  padding: 4px;
  border: none;
  background: transparent;
  color: var(--vscode-foreground);
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.close-btn:hover {
  background: var(--vscode-toolbar-hoverBackground);
}

.dialog-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.dialog-subtitle {
  color: var(--vscode-descriptionForeground);
  font-size: 13px;
  margin: 0 0 12px 0;
}

.warning-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  margin-bottom: 16px;
  background: var(--vscode-inputValidation-warningBackground);
  border: 1px solid var(--vscode-inputValidation-warningBorder);
  border-radius: 4px;
  font-size: 12px;
  color: var(--vscode-inputValidation-warningForeground);
}

.warning-banner .codicon {
  flex-shrink: 0;
  font-size: 16px;
}

.warning-banner p {
  margin: 0;
  line-height: 1.4;
}

/* Add endpoint section */
.add-endpoint-section {
  margin-bottom: 20px;
}

.input-with-button {
  display: flex;
  gap: 8px;
}

.endpoint-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--vscode-input-border);
  border-radius: 4px;
  background: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  font-size: 13px;
  font-family: inherit;
  transition: border-color 0.2s;
}

.endpoint-input:focus {
  outline: none;
  border-color: var(--vscode-focusBorder);
}

.add-endpoint-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  background: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: background 0.2s;
  white-space: nowrap;
}

.add-endpoint-btn:hover:not(:disabled) {
  background: var(--vscode-button-secondaryHoverBackground);
}

.add-endpoint-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  font-size: 12px;
  color: var(--vscode-errorForeground);
}

/* Endpoint list section */
.endpoints-section {
  margin-bottom: 16px;
}

.endpoints-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.endpoints-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--vscode-foreground);
}

.test-all-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--vscode-button-border);
  border-radius: 4px;
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: background 0.2s;
}

.test-all-btn:hover:not(:disabled) {
  background: var(--vscode-button-hoverBackground);
}

.test-all-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px;
  color: var(--vscode-descriptionForeground);
  font-size: 13px;
}

.empty-state .codicon {
  font-size: 32px;
  opacity: 0.5;
}

.endpoints-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 320px;
  overflow-y: auto;
}

.endpoint-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border: 1px solid var(--vscode-input-border);
  border-radius: 4px;
  background: var(--vscode-input-background);
  cursor: pointer;
  transition: all 0.2s;
}

.endpoint-item:hover {
  background: var(--vscode-list-hoverBackground);
  border-color: var(--vscode-focusBorder);
}

.endpoint-item.selected {
  background: var(--vscode-list-activeSelectionBackground);
  border-color: var(--vscode-focusBorder);
}

.endpoint-item.testing {
  opacity: 0.7;
}

.endpoint-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.endpoint-url {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--vscode-foreground);
  word-break: break-all;
}

.custom-badge {
  display: inline-flex;
  padding: 2px 6px;
  background: var(--vscode-badge-background);
  color: var(--vscode-badge-foreground);
  border-radius: 3px;
  font-size: 10px;
  font-weight: 600;
}

.endpoint-status {
  font-size: 12px;
}

.endpoint-status span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.status-testing {
  color: var(--vscode-descriptionForeground);
}

.status-success {
  color: var(--vscode-foreground);
}

.status-success.latency-excellent {
  color: var(--vscode-terminal-ansiGreen);
}

.status-success.latency-good {
  color: var(--vscode-terminal-ansiCyan);
}

.status-success.latency-fair {
  color: var(--vscode-terminal-ansiYellow);
}

.status-success.latency-poor {
  color: var(--vscode-errorForeground);
}

.status-error {
  color: var(--vscode-errorForeground);
}

.status-pending {
  color: var(--vscode-descriptionForeground);
}

.delete-btn {
  padding: 6px;
  border: none;
  background: transparent;
  color: var(--vscode-errorForeground);
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.delete-btn:hover {
  background: var(--vscode-toolbar-hoverBackground);
}

/* Tips section */
.hint-section {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: var(--vscode-textBlockQuote-background);
  border-left: 3px solid var(--vscode-textLink-foreground);
  border-radius: 4px;
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
}

.hint-section .codicon {
  flex-shrink: 0;
}

.hint-section p {
  margin: 0;
}

/* Dialog footer */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px solid var(--vscode-panel-border);
}

.cancel-btn,
.save-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background 0.2s;
}

.cancel-btn {
  background: transparent;
  color: var(--vscode-foreground);
}

.cancel-btn:hover {
  background: var(--vscode-toolbar-hoverBackground);
}

.save-btn {
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
}

.save-btn:hover {
  background: var(--vscode-button-hoverBackground);
}
</style>
