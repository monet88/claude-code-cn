/**
 * Provider configuration store
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { ProviderConfig } from '../types/provider';
import { PRESET_PROVIDERS } from '../types/provider';
import { getVsCodeApi } from '../utils/vscodeApi';

/**
 * Send message to VSCode extension and wait for response
 */
function sendMessageToExtension(type: string, payload?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const vscodeApi = getVsCodeApi();

    if (!vscodeApi) {
      reject(new Error('VSCode API not available'));
      return;
    }

    // Generate unique message ID
    const messageId = `${type}_${Date.now()}_${Math.random()}`;

    // Listen for response
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (data && data.type === 'from-extension') {
        const message = data.message;
        // Match response type
        const expectedTypes = [
          'providersData',        // getProviders response
          'providerAdded',        // addProvider response
          'providerUpdated',      // updateProvider response
          'providerDeleted',      // deleteProvider response
          'activeProviderData',   // getActiveProvider response
          'providerSwitched'      // switchProvider response
        ];

        if (expectedTypes.some(t => message.type === t)) {
          window.removeEventListener('message', handleMessage);
          resolve(message.payload);
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // Ensure payload is serializable - perform deep clone to remove non-serializable properties
    let serializedPayload = payload;
    if (payload !== undefined && payload !== null) {
      try {
        // Serialize/Deserialize JSON to ensure data is cloneable
        serializedPayload = JSON.parse(JSON.stringify(payload));
      } catch (e) {
        console.error('Failed to serialize payload:', e);
        reject(new Error('Payload is not serializable'));
        return;
      }
    }

    // Send message
    try {
      vscodeApi.postMessage({
        type,
        payload: serializedPayload,
        messageId
      });
    } catch (error) {
      window.removeEventListener('message', handleMessage);
      reject(error);
      return;
    }

    // Timeout handling
    setTimeout(() => {
      window.removeEventListener('message', handleMessage);
      reject(new Error(`Request timeout: ${type}`));
    }, 5000);
  });
}

/**
 * Provider configuration store
 */
export const useProviderStore = defineStore('provider', () => {
  // Provider list
  const providers = ref<ProviderConfig[]>([]);

  // Active provider ID
  const activeProviderId = ref<string | null>(null);

  // Calculate active provider
  const activeProvider = computed(() => {
    return providers.value.find(p => p.id === activeProviderId.value) || null;
  });

  /**
   * Initialize provider list
   */
  async function initialize() {
    // Load providers from configuration file
    await loadProviders();
    // Load active provider
    await loadActiveProvider();
  }

  /**
   * Load providers from configuration file
   */
  async function loadProviders() {
    try {
      const savedProviders = await sendMessageToExtension('getProviders');
      if (savedProviders && Array.isArray(savedProviders)) {
        providers.value = savedProviders;
      } else {
        providers.value = [];
      }
    } catch (error) {
      console.error('Failed to load providers:', error);
      providers.value = [];
    }
  }

  /**
   * Load active provider
   */
  async function loadActiveProvider() {
    try {
      const activeProviderData = await sendMessageToExtension('getActiveProvider');
      if (activeProviderData) {
        activeProviderId.value = activeProviderData.id;

        // Update all providers' active status
        providers.value.forEach(p => {
          p.isActive = p.id === activeProviderData.id;
        });
      }
    } catch (error) {
      console.error('Failed to load active provider:', error);
    }
  }

  /**
   * Add provider
   */
  async function addProvider(provider: ProviderConfig) {
    // Generate unique ID
    provider.id = `provider_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      const result = await sendMessageToExtension('addProvider', provider);
      if (result.success) {
        // Reload provider list
        await loadProviders();
      } else {
        throw new Error(result.error || 'Failed to add provider');
      }
    } catch (error) {
      console.error('Failed to add provider:', error);
      throw error;
    }
  }

  /**
   * Update provider
   */
  async function updateProvider(id: string, updates: Partial<ProviderConfig>) {
    try {
      const result = await sendMessageToExtension('updateProvider', { id, updates });
      if (result.success) {
        // Reload provider list
        await loadProviders();
      } else {
        throw new Error(result.error || 'Failed to update provider');
      }
    } catch (error) {
      console.error('Failed to update provider:', error);
      throw error;
    }
  }

  /**
   * Delete provider
   */
  async function deleteProvider(id: string) {
    try {
      const result = await sendMessageToExtension('deleteProvider', { id });
      if (result.success) {
        // Reload provider list
        await loadProviders();

        // If the deleted provider is the active provider, clear the active state
        if (activeProviderId.value === id) {
          activeProviderId.value = null;
        }
      } else {
        throw new Error(result.error || 'Failed to delete provider');
      }
    } catch (error) {
      console.error('Failed to delete provider:', error);
      throw error;
    }
  }

  /**
   * Switch provider (update configuration file and Claude settings.json)
   */
  async function switchProvider(id: string) {
    const provider = providers.value.find(p => p.id === id);
    if (!provider) {
      throw new Error('Provider not found');
    }

    try {
      const result = await sendMessageToExtension('switchProvider', {
        id: provider.id,
        apiKey: provider.apiKey,
        baseUrl: provider.baseUrl
      });

      if (result.success) {
        // Update active state
        activeProviderId.value = id;

        // Update all providers' active state
        providers.value.forEach(p => {
          p.isActive = p.id === id;
        });

        // Reload provider list to ensure data synchronization
        await loadProviders();
      } else {
        throw new Error(result.error || 'Failed to switch provider');
      }
    } catch (error) {
      console.error('Failed to switch provider:', error);
      throw error;
    }
  }

  /**
   * Get preset provider list
   */
  function getPresetProviders() {
    return PRESET_PROVIDERS;
  }

  return {
    providers,
    activeProviderId,
    activeProvider,
    initialize,
    loadProviders,
    loadActiveProvider,
    addProvider,
    updateProvider,
    deleteProvider,
    switchProvider,
    getPresetProviders
  };
});
