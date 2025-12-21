<template>
  <div class="dialog-overlay" @click.self="$emit('close')">
    <div class="dialog-container">
      <div class="dialog-header">
        <h3>Add Claude Code Provider</h3>
        <button class="close-btn" @click="$emit('close')">
          <span class="codicon codicon-close"></span>
        </button>
      </div>

      <div class="dialog-body">
        <p class="dialog-subtitle">Configure API key, model selection, proxy, and other foundational settings</p>

        <!-- Preset provider selector - temporarily hidden -->
        <!-- <div class="preset-section">
          <h4 class="preset-title">Choose a preset template</h4>

          <button
            :class="['preset-btn', 'preset-btn-custom', { selected: selectedPreset === 'custom' }]"
            @click="handleSelectCustom"
          >
            <span class="codicon codicon-settings-gear"></span>
            Custom configuration
          </button>

          <div v-if="selectedCategory" class="category-hint">
            <span class="codicon codicon-info"></span>
            <span>{{ getCategoryHint(selectedCategory) }}</span>
          </div>

          <div class="preset-categories">
            <div v-if="groupedProviders.official?.length" class="category-group">
              <h5 class="category-label">
                <span class="codicon codicon-verified-filled"></span>
                Official providers
              </h5>
              <div class="preset-grid">
                <button
                  v-for="preset in groupedProviders.official"
                  :key="preset.id"
                  :class="['preset-btn', { selected: selectedPreset === preset.id }]"
                  :style="getPresetStyle(preset, selectedPreset === preset.id)"
                  @click="handleSelectPreset(preset)"
                >
                  <span v-if="preset.theme?.icon === 'sparkle'" class="codicon codicon-sparkle"></span>
                  {{ preset.name }}
                </button>
              </div>
            </div>

            <div v-if="groupedProviders.cn_official?.length" class="category-group">
              <h5 class="category-label">
                <span class="codicon codicon-globe"></span>
                Domestic official
              </h5>
              <div class="preset-grid">
                <button
                  v-for="preset in groupedProviders.cn_official"
                  :key="preset.id"
                  :class="['preset-btn', { selected: selectedPreset === preset.id }]"
                  :style="getPresetStyle(preset, selectedPreset === preset.id)"
                  @click="handleSelectPreset(preset)"
                  :title="preset.description"
                >
                  {{ preset.name }}
                  <span v-if="preset.isRecommended" class="codicon codicon-star-full recommended"></span>
                </button>
              </div>
            </div>

            <div v-if="groupedProviders.aggregator?.length" class="category-group">
              <h5 class="category-label">
                <span class="codicon codicon-layers"></span>
                Aggregator services
              </h5>
              <div class="preset-grid">
                <button
                  v-for="preset in groupedProviders.aggregator"
                  :key="preset.id"
                  :class="['preset-btn', { selected: selectedPreset === preset.id, partner: preset.isPartner }]"
                  :style="getPresetStyle(preset, selectedPreset === preset.id)"
                  @click="handleSelectPreset(preset)"
                  :title="preset.description"
                >
                  {{ preset.name }}
                  <span v-if="preset.isRecommended" class="codicon codicon-star-full recommended"></span>
                  <span v-if="preset.isPartner" class="partner-badge">
                    <span class="codicon codicon-star-full"></span>
                  </span>
                </button>
              </div>
            </div>

            <div v-if="groupedProviders.third_party?.length" class="category-group">
              <h5 class="category-label">
                <span class="codicon codicon-plug"></span>
                Third-party providers
              </h5>
              <div class="preset-grid">
                <button
                  v-for="preset in groupedProviders.third_party"
                  :key="preset.id"
                  :class="['preset-btn', { selected: selectedPreset === preset.id }]"
                  :style="getPresetStyle(preset, selectedPreset === preset.id)"
                  @click="handleSelectPreset(preset)"
                  :title="preset.description"
                >
                  {{ preset.name }}
                </button>
              </div>
            </div>
          </div>
        </div> -->

        <!-- Form -->
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
              placeholder="e.g., Claude Official"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Official website</label>
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
            <p v-if="apiKeyHint" class="field-hint">
              <span class="codicon codicon-info"></span>
              {{ apiKeyHint }}
            </p>
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
                type="button"
                @click="showSpeedTestDialog = true"
                title="Test speed"
              >
                <span class="codicon codicon-zap"></span>
                Test speed
              </button>
            </div>
            <p v-if="baseUrlHint" class="field-hint">
              <span class="codicon codicon-info"></span>
              {{ baseUrlHint }}
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
      </div>

      <div class="dialog-footer">
        <button class="cancel-btn" @click="$emit('close')">
          Cancel
        </button>
        <button class="add-btn" :disabled="!isValid" @click="handleAdd">
          <span class="codicon codicon-add"></span>
          Add provider
        </button>
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
import type { ProviderConfig, PresetProvider, ProviderCategory } from '../types/provider';
import { PRESET_PROVIDERS } from '../types/provider';
import EndpointSpeedTestDialog from './EndpointSpeedTestDialog.vue';

const emit = defineEmits<{
  close: [];
  add: [provider: ProviderConfig];
}>();

// Group preset providers
const groupedProviders = computed(() => {
  const grouped: Record<string, PresetProvider[]> = {};
  PRESET_PROVIDERS.forEach(preset => {
    const category = preset.category || 'custom';
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(preset);
  });
  return grouped;
});

const selectedPreset = ref<string>('custom');
const selectedCategory = ref<ProviderCategory | null>(null);
const showApiKey = ref(false);
const showSpeedTestDialog = ref(false);
const jsonError = ref('');

const formData = ref<Partial<ProviderConfig>>({
  name: '',
  websiteUrl: '',
  apiKey: '',
  baseUrl: '',
  mainModel: '',
  haikuModel: '',
  sonnetModel: '',
  opusModel: ''
});

// JSON configuration
const jsonConfig = ref(JSON.stringify({
  env: {
    ANTHROPIC_AUTH_TOKEN: '',
    ANTHROPIC_BASE_URL: '',
    ANTHROPIC_DEFAULT_MODEL: '',
    ANTHROPIC_DEFAULT_HAIKU_MODEL: '',
    ANTHROPIC_DEFAULT_SONNET_MODEL: '',
    ANTHROPIC_DEFAULT_OPUS_MODEL: ''
  }
}, null, 2));

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

// Get category hints
function getCategoryHint(category: ProviderCategory): string {
  switch (category) {
    case 'official':
      return 'Official providers use the official API and may require an international credit card.';
    case 'cn_official':
      return 'Domestic official providers only need to enter the API key; the endpoint is preconfigured.';
    case 'aggregator':
      return 'Aggregator services work with just an API key.';
    case 'third_party':
      return 'Third-party providers require both an API key and an endpoint URL.';
    case 'custom':
    default:
      return 'Custom configurations require manually filling in every required field.';
  }
}

// API key hints
const apiKeyHint = computed(() => {
  if (selectedCategory.value === 'official') {
    return 'Requires an API key from the Anthropic website.';
  }
  if (selectedCategory.value === 'cn_official') {
    return "Apply for an API key on the provider's website.";
  }
  if (selectedCategory.value === 'aggregator') {
    return 'Obtain an API key from the aggregator platform.';
  }
  return '';
});

// Base URL hints
const baseUrlHint = computed(() => {
  if (selectedCategory.value === 'official') {
    return 'Use the official API endpoint.';
  }
  if (selectedCategory.value === 'third_party') {
    return 'Contact the provider for the API endpoint.';
  }
  return '';
});

// Determine preset button styles
function getPresetStyle(preset: PresetProvider, isSelected: boolean) {
  if (!isSelected || !preset.theme?.backgroundColor) {
    return undefined;
  }
  return {
    backgroundColor: preset.theme.backgroundColor,
    color: preset.theme.textColor || '#FFFFFF',
    borderColor: preset.theme.backgroundColor
  };
}

// Watch form fields and sync changes back to JSON
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
      // Ignore parsing errors
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
      // Sync updated values back to the form fields
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
  // Sync back to the JSON configuration
  try {
    const config = JSON.parse(jsonConfig.value);
    if (!config.env) config.env = {};
    config.env.ANTHROPIC_BASE_URL = url;
    jsonConfig.value = JSON.stringify(config, null, 2);
  } catch (error) {
    // Ignore errors
  }
}

// Select custom configuration
function handleSelectCustom() {
  selectedPreset.value = 'custom';
  selectedCategory.value = 'custom';
  formData.value = {
    name: '',
    websiteUrl: '',
    apiKey: '',
    baseUrl: '',
    mainModel: '',
    haikuModel: '',
    sonnetModel: '',
    opusModel: ''
  };
  // Reset JSON configuration
  jsonConfig.value = JSON.stringify({
    env: {
      ANTHROPIC_AUTH_TOKEN: '',
      ANTHROPIC_BASE_URL: '',
      ANTHROPIC_DEFAULT_MODEL: '',
      ANTHROPIC_DEFAULT_HAIKU_MODEL: '',
      ANTHROPIC_DEFAULT_SONNET_MODEL: '',
      ANTHROPIC_DEFAULT_OPUS_MODEL: ''
    }
  }, null, 2);
}

// Select preset provider
function handleSelectPreset(preset: PresetProvider) {
  selectedPreset.value = preset.id;
  selectedCategory.value = preset.category || 'custom';

  formData.value = {
    name: preset.name,
    websiteUrl: preset.websiteUrl || '',
    apiKey: '',
    baseUrl: preset.baseUrl || '',
    mainModel: '',
    haikuModel: ''
  };

  // Update JSON configuration
  jsonConfig.value = JSON.stringify({
    env: {
      ANTHROPIC_AUTH_TOKEN: '',
      ANTHROPIC_BASE_URL: preset.baseUrl || '',
      ANTHROPIC_DEFAULT_MODEL: '',
      ANTHROPIC_DEFAULT_HAIKU_MODEL: '',
      ANTHROPIC_DEFAULT_SONNET_MODEL: '',
      ANTHROPIC_DEFAULT_OPUS_MODEL: ''
    }
  }, null, 2);
}

// Add provider
function handleAdd() {
  if (isValid.value) {
    // Validate the JSON configuration
    if (jsonConfig.value.trim()) {
      try {
        JSON.parse(jsonConfig.value);
      } catch (error) {
        jsonError.value = 'Invalid JSON format. Please check before adding.';
        return;
      }
    }

    emit('add', {
      id: '', // Will be generated in store
      name: formData.value.name!,
      websiteUrl: formData.value.websiteUrl,
      apiKey: formData.value.apiKey!,
      baseUrl: formData.value.baseUrl!,
      mainModel: formData.value.mainModel,
      haikuModel: formData.value.haikuModel,
      sonnetModel: formData.value.sonnetModel,
      opusModel: formData.value.opusModel,
      isPreset: selectedPreset.value !== 'custom'
    });
  }
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
  max-width: 780px;
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

/* Preset selector section */
.preset-section {
  margin-bottom: 24px;
}

.preset-title {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 12px 0;
  color: var(--vscode-foreground);
}

.preset-btn-custom {
  margin-bottom: 12px;
}

.category-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  margin-bottom: 16px;
  background: var(--vscode-textBlockQuote-background);
  border-left: 3px solid var(--vscode-textLink-foreground);
  border-radius: 4px;
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
}

.preset-categories {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.category-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.category-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--vscode-descriptionForeground);
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 8px;
}

.preset-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 10px 12px;
  border: 1px solid var(--vscode-input-border);
  border-radius: 6px;
  background: var(--vscode-input-background);
  color: var(--vscode-foreground);
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;
  position: relative;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preset-btn:hover {
  background: var(--vscode-list-hoverBackground);
  border-color: var(--vscode-focusBorder);
  transform: translateY(-1px);
}

.preset-btn.selected {
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border-color: var(--vscode-button-background);
}

.preset-btn .recommended {
  color: #ffd700;
  font-size: 11px;
}

.preset-btn.partner {
  position: relative;
  overflow: visible;
}

.partner-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.partner-badge .codicon {
  font-size: 10px;
  color: white;
}

/* Form section */
.form-section {
  margin-top: 24px;
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

/* Dialog footer */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px solid var(--vscode-panel-border);
}

.cancel-btn,
.add-btn {
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

.add-btn {
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
}

.add-btn:hover:not(:disabled) {
  background: var(--vscode-button-hoverBackground);
}

.add-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Responsive tweaks for 360px viewports */
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
    margin-bottom: 16px;
  }

  .preset-title {
    font-size: 13px;
  }

  .preset-btn,
  .preset-btn-custom {
    padding: 10px 12px;
    font-size: 12px;
  }

  .preset-badge {
    font-size: 9px;
    padding: 2px 6px;
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
  .add-btn {
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

  .preset-title {
    font-size: 12px;
    margin-bottom: 8px;
  }

  .category-group {
    margin-bottom: 12px;
  }

  .category-title {
    font-size: 11px;
    padding: 6px 0;
  }

  .preset-btn,
  .preset-btn-custom {
    padding: 8px 10px;
    font-size: 11px;
    gap: 6px;
  }

  .preset-badge {
    font-size: 8px;
    padding: 1px 4px;
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

  .advanced-toggle {
    font-size: 11px;
    padding: 8px 0;
  }

  .cancel-btn,
  .add-btn {
    padding: 5px 10px;
    font-size: 11px;
    gap: 4px;
  }

  .dialog-footer {
    gap: 6px;
  }
}
</style>
