<template>
  <div class="dialog-overlay" @click.self="$emit('close')">
    <div class="dialog-container">
      <div class="dialog-header">
        <h3>Edit Provider</h3>
        <button class="close-btn" @click="$emit('close')">
          <span class="codicon codicon-close"></span>
        </button>
      </div>

      <div class="dialog-body">
        <p class="dialog-subtitle">Fixture changes take effect immediately.</p>

        <!-- Form section -->
        <div class="form-section">
          <div class="form-group">
            <label class="form-label">
              Provider name
              <span class="required">*</span>
            </label>
            <input
              v-model="formData.name"
              type="text"
              class="form-input"
              placeholder="Enter provider name"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Website</label>
            <div class="input-with-link">
              <input
                v-model="formData.websiteUrl"
                type="text"
                class="form-input"
                placeholder="https://"
              />
              <a
                v-if="formData.websiteUrl && isValidUrl(formData.websiteUrl)"
                :href="formData.websiteUrl"
                target="_blank"
                class="link-btn"
                title="Visit website"
              >
                <span class="codicon codicon-link-external"></span>
              </a>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">
              API Key
              <span class="required">*</span>
            </label>
            <div class="input-with-visibility">
              <input
                v-model="formData.apiKey"
                :type="showApiKey ? 'text' : 'password'"
                class="form-input"
                placeholder="Enter API key"
              />
              <button
                type="button"
                class="visibility-toggle"
                @click="showApiKey = !showApiKey"
                :title="showApiKey ? 'Hide' : 'Show'"
              >
                <span :class="['codicon', showApiKey ? 'codicon-eye-closed' : 'codicon-eye']"></span>
              </button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">
              Request URL (API Endpoint)
              <span class="required">*</span>
            </label>
            <div class="input-with-actions">
              <input
                v-model="formData.baseUrl"
                type="text"
                class="form-input"
                placeholder="https://api.example.com"
              />
              <!-- Speed test feature hidden for now -->
              <button
                v-if="false"
                class="test-btn"
                @click="showSpeedTestDialog = true"
                title="Test speed"
              >
                <span class="codicon codicon-zap"></span>
                Test speed
              </button>
            </div>
            <p class="field-hint">
              <span class="codicon codicon-info"></span>
              Provide an endpoint URL compatible with the Claude API
            </p>
          </div>

          <!-- Advanced options (collapsible) -->
          <details class="advanced-section">
            <summary class="advanced-toggle">
              <span class="codicon codicon-chevron-right"></span>
              Advanced options
            </summary>
            <div class="form-row">
              <div class="form-group">
                 <label class="form-label">Main model</label>
                <input
                  v-model="formData.mainModel"
                  type="text"
                  class="form-input"
                   placeholder="e.g., claude-3-opus"
                />
              </div>
              <div class="form-group">
                 <label class="form-label">Haiku default model</label>
                <input
                  v-model="formData.haikuModel"
                  type="text"
                  class="form-input"
                   placeholder="e.g., claude-3-haiku"
                />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                 <label class="form-label">Sonnet default model</label>
                <input
                  v-model="formData.sonnetModel"
                  type="text"
                  class="form-input"
                   placeholder="e.g., claude-3-sonnet"
                />
              </div>
              <div class="form-group">
                 <label class="form-label">Opus default model</label>
                <input
                  v-model="formData.opusModel"
                  type="text"
                  class="form-input"
                   placeholder="e.g., claude-3-opus"
                />
              </div>
            </div>
          </details>

          <!-- JSON configuration editor -->
          <details class="advanced-section" open>
            <summary class="advanced-toggle">
              <span class="codicon codicon-chevron-right"></span>
              Configuration JSON
            </summary>
            <div class="json-config-section">
              <div class="json-editor-wrapper">
                <textarea
                  v-model="jsonConfig"
                  class="json-editor"
                  placeholder="{&#10;  &quot;env&quot;: {&#10;    &quot;ANTHROPIC_AUTH_TOKEN&quot;: &quot;&quot;,&#10;    &quot;ANTHROPIC_BASE_URL&quot;: &quot;&quot;&#10;  }&#10;}"
                  @input="handleJsonChange"
                ></textarea>
                <p v-if="jsonError" class="json-error">
                  <span class="codicon codicon-error"></span>
                  {{ jsonError }}
                </p>
              </div>
            </div>
          </details>
        </div>

        <!-- Statistics (optional) -->
        <div class="stats-section" v-if="showStats">
          <h4 class="stats-title">
            <span class="codicon codicon-graph"></span>
            Usage statistics
          </h4>
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-label">Total requests</span>
              <span class="stat-value">{{ stats.totalRequests || 0 }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Success rate</span>
              <span class="stat-value">{{ stats.successRate || '100%' }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Average response time</span>
              <span class="stat-value">{{ stats.avgResponseTime || '0ms' }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Last used</span>
              <span class="stat-value">{{ stats.lastUsed || 'Not used yet' }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="dialog-footer">
        <div class="footer-left">
          <button
            class="danger-btn"
            :disabled="totalProviders === 1"
            :title="totalProviders === 1 ? 'Keep at least one provider' : 'Remove provider'"
            @click="handleDelete"
          >
            <span class="codicon codicon-trash"></span>
            Remove provider
          </button>
        </div>
        <div class="footer-right">
          <button class="cancel-btn" @click="$emit('close')">
            Cancel
          </button>
          <button class="save-btn" :disabled="!isValid" @click="handleSave">
            <span class="codicon codicon-save"></span>
            Save changes
          </button>
        </div>
      </div>
    </div>

    <!-- Endpoint speed test dialog -->
    <EndpointSpeedTestDialog
      v-if="showSpeedTestDialog"
      :initialUrl="formData.baseUrl || ''"
      :initialEndpoints="[]"
      @close="showSpeedTestDialog = false"
      @save="handleSpeedTestSave"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { ProviderConfig } from '../types/provider';
import EndpointSpeedTestDialog from './EndpointSpeedTestDialog.vue';

const props = defineProps<{
  provider: ProviderConfig;
  totalProviders?: number;
}>();

const emit = defineEmits<{
  close: [];
  save: [updates: Partial<ProviderConfig>];
  delete: [id: string];
  test: [];
}>();

const showApiKey = ref(false);
const showStats = ref(false);
const showSpeedTestDialog = ref(false);
const jsonError = ref('');

const formData = ref<Partial<ProviderConfig>>({
  name: props.provider.name,
  websiteUrl: props.provider.websiteUrl,
  apiKey: props.provider.apiKey,
  baseUrl: props.provider.baseUrl,
  mainModel: props.provider.mainModel,
  haikuModel: props.provider.haikuModel,
  sonnetModel: props.provider.sonnetModel,
  opusModel: props.provider.opusModel
});

// JSON configuration
const jsonConfig = ref(JSON.stringify({
  env: {
    ANTHROPIC_AUTH_TOKEN: props.provider.apiKey || '',
    ANTHROPIC_BASE_URL: props.provider.baseUrl || '',
    ANTHROPIC_DEFAULT_MODEL: props.provider.mainModel || '',
    ANTHROPIC_DEFAULT_HAIKU_MODEL: props.provider.haikuModel || '',
    ANTHROPIC_DEFAULT_SONNET_MODEL: props.provider.sonnetModel || '',
    ANTHROPIC_DEFAULT_OPUS_MODEL: props.provider.opusModel || ''
  }
}, null, 2));

const stats = ref({
  totalRequests: 0,
  successRate: '100%',
  avgResponseTime: '0ms',
  lastUsed: 'Not used yet'
});

// Validate form
const isValid = computed(() => {
  return formData.value.name &&
         formData.value.apiKey &&
         formData.value.baseUrl;
});

// Validate URL
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Watch provider changes
watch(
  () => props.provider,
  (newProvider) => {
    formData.value = {
      name: newProvider.name,
      websiteUrl: newProvider.websiteUrl,
      apiKey: newProvider.apiKey,
      baseUrl: newProvider.baseUrl,
      mainModel: newProvider.mainModel,
      haikuModel: newProvider.haikuModel,
      sonnetModel: newProvider.sonnetModel,
      opusModel: newProvider.opusModel
    };

    // Update JSON configuration
    jsonConfig.value = JSON.stringify({
      env: {
        ANTHROPIC_AUTH_TOKEN: newProvider.apiKey || '',
        ANTHROPIC_BASE_URL: newProvider.baseUrl || '',
        ANTHROPIC_DEFAULT_MODEL: newProvider.mainModel || '',
        ANTHROPIC_DEFAULT_HAIKU_MODEL: newProvider.haikuModel || '',
        ANTHROPIC_DEFAULT_SONNET_MODEL: newProvider.sonnetModel || '',
        ANTHROPIC_DEFAULT_OPUS_MODEL: newProvider.opusModel || ''
      }
    }, null, 2);
  }
);

// Watch form fields and sync to JSON
watch(
  () => [formData.value.apiKey, formData.value.baseUrl, formData.value.mainModel, formData.value.haikuModel, formData.value.sonnetModel, formData.value.opusModel],
  ([apiKey, baseUrl, mainModel, haikuModel, sonnetModel, opusModel]) => {
    try {
      const config = JSON.parse(jsonConfig.value);
      if (!config.env) config.env = {};
      config.env.ANTHROPIC_AUTH_TOKEN = apiKey || '';
      config.env.ANTHROPIC_BASE_URL = baseUrl || '';
      config.env.ANTHROPIC_DEFAULT_MODEL = mainModel || '';
      config.env.ANTHROPIC_DEFAULT_HAIKU_MODEL = haikuModel || '';
      config.env.ANTHROPIC_DEFAULT_SONNET_MODEL = sonnetModel || '';
      config.env.ANTHROPIC_DEFAULT_OPUS_MODEL = opusModel || '';
      jsonConfig.value = JSON.stringify(config, null, 2);
    } catch (error) {
      // Ignore parse errors
    }
  }
);

// Handle JSON configuration changes
function handleJsonChange() {
  jsonError.value = '';
  try {
    const config = JSON.parse(jsonConfig.value);
    // Validate JSON format
    if (config.env) {
      // Sync values back to the form fields
      if (config.env.ANTHROPIC_AUTH_TOKEN !== undefined) {
        formData.value.apiKey = config.env.ANTHROPIC_AUTH_TOKEN;
      }
      if (config.env.ANTHROPIC_BASE_URL !== undefined) {
        formData.value.baseUrl = config.env.ANTHROPIC_BASE_URL;
      }
      if (config.env.ANTHROPIC_DEFAULT_MODEL !== undefined) {
        formData.value.mainModel = config.env.ANTHROPIC_DEFAULT_MODEL;
      }
      if (config.env.ANTHROPIC_DEFAULT_HAIKU_MODEL !== undefined) {
        formData.value.haikuModel = config.env.ANTHROPIC_DEFAULT_HAIKU_MODEL;
      }
      if (config.env.ANTHROPIC_DEFAULT_SONNET_MODEL !== undefined) {
        formData.value.sonnetModel = config.env.ANTHROPIC_DEFAULT_SONNET_MODEL;
      }
      if (config.env.ANTHROPIC_DEFAULT_OPUS_MODEL !== undefined) {
        formData.value.opusModel = config.env.ANTHROPIC_DEFAULT_OPUS_MODEL;
      }
    }
  } catch (error) {
    jsonError.value = error instanceof Error ? error.message : 'JSON format error';
  }
}

// Save endpoint speed test result
function handleSpeedTestSave(url: string) {
  formData.value.baseUrl = url;
  // Sync changes back to the JSON configuration
  try {
    const config = JSON.parse(jsonConfig.value);
    if (!config.env) config.env = {};
    config.env.ANTHROPIC_BASE_URL = url;
    jsonConfig.value = JSON.stringify(config, null, 2);
  } catch (error) {
    // Ignore errors
  }
}

// Save changes
function handleSave() {
  if (isValid.value) {
    // Validate the JSON configuration
    if (jsonConfig.value.trim()) {
      try {
        JSON.parse(jsonConfig.value);
      } catch (error) {
        jsonError.value = 'Invalid JSON format. Please check and save again.';
        return;
      }
    }
    emit('save', formData.value);
  }
}

// Delete provider
function handleDelete() {
  // Emit delete event so the parent handles confirmation
  emit('delete', props.provider.id);
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
  max-height: 90vh;
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
  margin: 0 0 20px 0;
}

/* Info section */
.info-section {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  margin-bottom: 20px;
  background: var(--vscode-textBlockQuote-background);
  border-left: 3px solid var(--vscode-textLink-foreground);
  border-radius: 4px;
}

.info-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: var(--vscode-badge-background);
  color: var(--vscode-badge-foreground);
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.info-text {
  margin: 0;
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
}

/* Form section */
.form-section {
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 6px;
  color: var(--vscode-foreground);
}

.form-label .required {
  color: var(--vscode-errorForeground);
}

.form-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--vscode-input-border);
  border-radius: 4px;
  background: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  font-size: 13px;
  font-family: inherit;
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: var(--vscode-focusBorder);
}

.form-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-input::placeholder {
  color: var(--vscode-input-placeholderForeground);
}

.input-with-link,
.input-with-visibility,
.input-with-actions {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
}

.link-btn,
.visibility-toggle {
  padding: 6px;
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

.link-btn:hover,
.visibility-toggle:hover {
  background: var(--vscode-toolbar-hoverBackground);
}

.test-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: 1px solid var(--vscode-input-border);
  border-radius: 4px;
  background: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;
  white-space: nowrap;
}

.test-btn:hover {
  background: var(--vscode-button-secondaryHoverBackground);
}

.field-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

/* Advanced options */
.advanced-section {
  margin-top: 20px;
  border-top: 1px solid var(--vscode-panel-border);
  padding-top: 16px;
}

.advanced-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--vscode-foreground);
  cursor: pointer;
  padding: 4px 0;
  list-style: none;
}

.advanced-toggle:hover {
  color: var(--vscode-textLink-foreground);
}

.advanced-section[open] .advanced-toggle .codicon {
  transform: rotate(90deg);
}

.advanced-toggle .codicon {
  transition: transform 0.2s;
}

/* JSON configuration section */
.json-config-section {
  margin-top: 12px;
}

.json-editor-wrapper {
  position: relative;
}

.json-editor {
  width: 100%;
  min-height: 200px;
  padding: 12px;
  border: 1px solid var(--vscode-input-border);
  border-radius: 4px;
  background: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  font-size: 13px;
  font-family: 'Monaco', 'Menlo', 'Consolas', 'Courier New', monospace;
  line-height: 1.5;
  resize: vertical;
  transition: border-color 0.2s;
}

.json-editor:focus {
  outline: none;
  border-color: var(--vscode-focusBorder);
}

.json-editor::placeholder {
  color: var(--vscode-input-placeholderForeground);
}

.json-error {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  font-size: 12px;
  color: var(--vscode-errorForeground);
}

/* Statistics section */
.stats-section {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--vscode-panel-border);
}

.stats-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--vscode-foreground);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  background: var(--vscode-input-background);
  border: 1px solid var(--vscode-input-border);
  border-radius: 4px;
}

.stat-label {
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--vscode-foreground);
}

/* Dialog footer */
.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-top: 1px solid var(--vscode-panel-border);
}

.footer-left,
.footer-right {
  display: flex;
  gap: 8px;
}

.cancel-btn,
.save-btn,
.danger-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
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

.save-btn:hover:not(:disabled) {
  background: var(--vscode-button-hoverBackground);
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.danger-btn {
  background: transparent;
  color: var(--vscode-errorForeground);
  border: 1px solid var(--vscode-errorForeground);
}

.danger-btn:hover:not(:disabled) {
  background: var(--vscode-errorForeground);
  color: white;
}

.danger-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Responsive - 360px screens */
@media (max-width: 480px) {
  .dialog-container {
    width: 95%;
    max-width: none;
    max-height: 95vh;
  }

  .dialog-header,
  .dialog-footer {
    padding: 12px 16px;
  }

  .dialog-header h3 {
    font-size: 14px;
  }

  .dialog-body {
    padding: 16px;
  }

  .dialog-subtitle {
    font-size: 12px;
  }

  .protection-badge {
    font-size: 10px;
    padding: 3px 8px;
  }

  .form-group label {
    font-size: 12px;
  }

  .form-input,
  .form-textarea {
    font-size: 12px;
    padding: 6px 10px;
  }

  .cancel-btn,
  .save-btn,
  .danger-btn {
    padding: 6px 12px;
    font-size: 12px;
  }
}

@media (max-width: 360px) {
  .dialog-container {
    width: 98%;
    border-radius: 6px;
  }

  .dialog-header,
  .dialog-footer {
    padding: 10px 12px;
  }

  .dialog-header h3 {
    font-size: 13px;
  }

  .dialog-body {
    padding: 12px;
  }

  .dialog-subtitle {
    font-size: 11px;
  }

  .protection-banner {
    padding: 10px 12px;
    margin-bottom: 16px;
  }

  .protection-banner .codicon {
    font-size: 14px;
  }

  .protection-banner strong {
    font-size: 12px;
  }

  .protection-banner p {
    font-size: 10px;
  }

  .protection-badge {
    font-size: 9px;
    padding: 2px 6px;
  }

  .form-group {
    margin-bottom: 12px;
  }

  .form-group label {
    font-size: 11px;
    margin-bottom: 4px;
  }

  .form-hint {
    font-size: 10px;
  }

  .form-input,
  .form-textarea {
    font-size: 11px;
    padding: 5px 8px;
  }

  .toggle-visibility {
    font-size: 10px;
    padding: 3px 6px;
  }

  .stats-placeholder {
    padding: 16px 12px;
  }

  .stats-placeholder .codicon {
    font-size: 32px;
  }

  .stats-placeholder p {
    font-size: 11px;
  }

  .cancel-btn,
  .save-btn,
  .danger-btn {
    padding: 5px 10px;
    font-size: 11px;
    gap: 4px;
  }

  .dialog-footer {
    flex-direction: column-reverse;
    gap: 8px;
  }

  .footer-left,
  .footer-right {
    width: 100%;
    justify-content: stretch;
  }

  .footer-left {
    justify-content: center;
  }

  .footer-right {
    gap: 6px;
  }

  .cancel-btn,
  .save-btn,
  .danger-btn {
    flex: 1;
    justify-content: center;
  }
}
</style>
