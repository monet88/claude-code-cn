/**
 * Output Styles configuration store
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { OutputStyle, OutputStylesMap, OutputStylesConfig, OutputStyleScope } from '../types/outputStyle';
import { getVsCodeApi } from '../utils/vscodeApi';

function sendMessageToExtension(type: string, payload?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const vscodeApi = getVsCodeApi();

    if (!vscodeApi) {
      reject(new Error('VSCode API not available'));
      return;
    }

    const messageId = `${type}_${Date.now()}_${Math.random()}`;

    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (data && data.type === 'from-extension') {
        const message = data.message;
        const expectedTypes = [
          'allOutputStylesData',
          'outputStyleImported',
          'outputStyleDeleted',
          'outputStyleOpened'
        ];

        if (expectedTypes.some(t => message.type === t)) {
          window.removeEventListener('message', handleMessage);
          resolve(message.payload);
        }
      }
    };

    window.addEventListener('message', handleMessage);

    let serializedPayload = payload;
    if (payload !== undefined && payload !== null) {
      try {
        serializedPayload = JSON.parse(JSON.stringify(payload));
      } catch (e) {
        console.error('Failed to serialize payload:', e);
        reject(new Error('Payload is not serializable'));
        return;
      }
    }

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

    setTimeout(() => {
      window.removeEventListener('message', handleMessage);
      reject(new Error(`Request timeout: ${type}`));
    }, 10000);
  });
}

export const useOutputStyleStore = defineStore('outputStyle', () => {
  const outputStyles = ref<OutputStylesConfig>({
    global: {},
    local: {}
  });

  const loading = ref(false);
  const error = ref<string | null>(null);

  const totalCount = computed(() => {
    return Object.keys(outputStyles.value.global).length + Object.keys(outputStyles.value.local).length;
  });

  const globalCount = computed(() => Object.keys(outputStyles.value.global).length);
  const localCount = computed(() => Object.keys(outputStyles.value.local).length);

  const outputStyleList = computed(() => {
    const global = Object.values(outputStyles.value.global);
    const local = Object.values(outputStyles.value.local);
    return [...global, ...local];
  });

  const globalOutputStyleList = computed(() => Object.values(outputStyles.value.global));
  const localOutputStyleList = computed(() => Object.values(outputStyles.value.local));

  async function initialize() {
    await loadOutputStyles();
  }

  async function loadOutputStyles() {
    loading.value = true;
    error.value = null;

    try {
      const result = await sendMessageToExtension('getAllOutputStyles');
      if (result) {
        outputStyles.value = result;
      } else {
        outputStyles.value = { global: {}, local: {} };
      }
    } catch (e) {
      console.error('Failed to load Output Styles:', e);
      error.value = String(e);
      outputStyles.value = { global: {}, local: {} };
    } finally {
      loading.value = false;
    }
  }

  async function importOutputStyle(scope: OutputStyleScope): Promise<{ success: boolean; count?: number; total?: number; error?: string; errors?: any[] }> {
    error.value = null;

    try {
      const result = await sendMessageToExtension('importOutputStyle', { scope });

      if (result.success) {
        await loadOutputStyles();
        return {
          success: true,
          count: result.count,
          total: result.total,
          errors: result.errors
        };
      } else {
        error.value = result.error || 'Import Output Style failed';
        return { success: false, error: error.value ?? undefined };
      }
    } catch (e) {
      console.error('Failed to import Output Style:', e);
      error.value = String(e);
      return { success: false, error: error.value ?? undefined };
    }
  }

  async function deleteOutputStyle(id: string, scope: OutputStyleScope): Promise<{ success: boolean; error?: string }> {
    loading.value = true;
    error.value = null;

    try {
      const result = await sendMessageToExtension('deleteOutputStyle', { id, scope });
      if (result.success) {
        await loadOutputStyles();
        return { success: true };
      } else {
        error.value = result.error || 'Delete Output Style failed';
        return { success: false, error: error.value ?? undefined };
      }
    } catch (e) {
      console.error('Failed to delete Output Style:', e);
      error.value = String(e);
      return { success: false, error: error.value ?? undefined };
    } finally {
      loading.value = false;
    }
  }

  async function openOutputStyle(outputStylePath: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await sendMessageToExtension('openOutputStyle', { outputStylePath });
      if (result.success) {
        return { success: true };
      } else {
        error.value = result.error || 'Open Output Style failed';
        return { success: false, error: error.value ?? undefined };
      }
    } catch (e) {
      console.error('Failed to open Output Style:', e);
      error.value = String(e);
      return { success: false, error: error.value ?? undefined };
    }
  }

  return {
    outputStyles,
    loading,
    error,
    totalCount,
    globalCount,
    localCount,
    outputStyleList,
    globalOutputStyleList,
    localOutputStyleList,
    initialize,
    loadOutputStyles,
    importOutputStyle,
    deleteOutputStyle,
    openOutputStyle,
  };
});
