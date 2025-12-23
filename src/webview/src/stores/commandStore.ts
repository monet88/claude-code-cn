/**
 * Commands Store
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Command, CommandsMap, CommandsConfig, CommandScope } from '../types/command';
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
          'allCommandsData',
          'commandImported',
          'commandDeleted',
          'commandOpened'
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

export const useCommandStore = defineStore('command', () => {
  const commands = ref<CommandsConfig>({
    global: {},
    local: {}
  });

  const loading = ref(false);
  const error = ref<string | null>(null);

  const totalCount = computed(() => {
    return Object.keys(commands.value.global).length + Object.keys(commands.value.local).length;
  });

  const globalCount = computed(() => Object.keys(commands.value.global).length);
  const localCount = computed(() => Object.keys(commands.value.local).length);

  const commandList = computed(() => {
    const global = Object.values(commands.value.global);
    const local = Object.values(commands.value.local);
    return [...global, ...local];
  });

  const globalCommandList = computed(() => Object.values(commands.value.global));
  const localCommandList = computed(() => Object.values(commands.value.local));

  async function initialize() {
    await loadCommands();
  }

  async function loadCommands() {
    loading.value = true;
    error.value = null;

    try {
      const result = await sendMessageToExtension('getAllCommands');
      if (result) {
        commands.value = result;
      } else {
        commands.value = { global: {}, local: {} };
      }
    } catch (e) {
      console.error('Failed to load Commands:', e);
      error.value = String(e);
      commands.value = { global: {}, local: {} };
    } finally {
      loading.value = false;
    }
  }

  async function importCommand(scope: CommandScope): Promise<{ success: boolean; count?: number; total?: number; error?: string; errors?: any[] }> {
    error.value = null;

    try {
      const result = await sendMessageToExtension('importCommand', { scope });

      if (result.success) {
        await loadCommands();
        return {
          success: true,
          count: result.count,
          total: result.total,
          errors: result.errors
        };
      } else {
        error.value = result.error || 'Import Command failed';
        return { success: false, error: error.value ?? undefined };
      }
    } catch (e) {
      console.error('Failed to import Command:', e);
      error.value = String(e);
      return { success: false, error: error.value ?? undefined };
    }
  }

  async function deleteCommand(id: string, scope: CommandScope): Promise<{ success: boolean; error?: string }> {
    loading.value = true;
    error.value = null;

    try {
      const result = await sendMessageToExtension('deleteCommand', { id, scope });
      if (result.success) {
        await loadCommands();
        return { success: true };
      } else {
        error.value = result.error || 'Delete Command failed';
        return { success: false, error: error.value ?? undefined };
      }
    } catch (e) {
      console.error('Failed to delete Command:', e);
      error.value = String(e);
      return { success: false, error: error.value ?? undefined };
    } finally {
      loading.value = false;
    }
  }

  async function openCommand(commandPath: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await sendMessageToExtension('openCommand', { commandPath });
      if (result.success) {
        return { success: true };
      } else {
        error.value = result.error || 'Open Command failed';
        return { success: false, error: error.value ?? undefined };
      }
    } catch (e) {
      console.error('Failed to open Command:', e);
      error.value = String(e);
      return { success: false, error: error.value ?? undefined };
    }
  }

  return {
    commands,
    loading,
    error,
    totalCount,
    globalCount,
    localCount,
    commandList,
    globalCommandList,
    localCommandList,
    initialize,
    loadCommands,
    importCommand,
    deleteCommand,
    openCommand,
  };
});
