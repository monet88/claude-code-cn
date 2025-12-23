/**
 * Agents Store
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Agent, AgentsMap, AgentsConfig, AgentScope } from '../types/agent';
import { getVsCodeApi } from '../utils/vscodeApi';

/**
 * Send message to extension and wait for response
 */
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
          'allAgentsData',
          'agentImported',
          'agentDeleted',
          'agentOpened'
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

/**
 * Agents Store
 */
export const useAgentStore = defineStore('agent', () => {
  const agents = ref<AgentsConfig>({
    global: {},
    local: {}
  });

  const loading = ref(false);
  const error = ref<string | null>(null);

  const totalCount = computed(() => {
    return Object.keys(agents.value.global).length + Object.keys(agents.value.local).length;
  });

  const globalCount = computed(() => Object.keys(agents.value.global).length);
  const localCount = computed(() => Object.keys(agents.value.local).length);

  const agentList = computed(() => {
    const global = Object.values(agents.value.global);
    const local = Object.values(agents.value.local);
    return [...global, ...local];
  });

  const globalAgentList = computed(() => Object.values(agents.value.global));
  const localAgentList = computed(() => Object.values(agents.value.local));

  async function initialize() {
    await loadAgents();
  }

  async function loadAgents() {
    loading.value = true;
    error.value = null;

    try {
      const result = await sendMessageToExtension('getAllAgents');
      if (result) {
        agents.value = result;
      } else {
        agents.value = { global: {}, local: {} };
      }
    } catch (e) {
      console.error('Failed to load Agents:', e);
      error.value = String(e);
      agents.value = { global: {}, local: {} };
    } finally {
      loading.value = false;
    }
  }

  async function importAgent(scope: AgentScope): Promise<{ success: boolean; count?: number; total?: number; error?: string; errors?: any[] }> {
    error.value = null;

    try {
      const result = await sendMessageToExtension('importAgent', { scope });

      if (result.success) {
        await loadAgents();
        return {
          success: true,
          count: result.count,
          total: result.total,
          errors: result.errors
        };
      } else {
        error.value = result.error || 'Import Agent failed';
        return { success: false, error: error.value ?? undefined };
      }
    } catch (e) {
      console.error('Failed to import Agent:', e);
      error.value = String(e);
      return { success: false, error: error.value ?? undefined };
    }
  }

  async function deleteAgent(id: string, scope: AgentScope): Promise<{ success: boolean; error?: string }> {
    loading.value = true;
    error.value = null;

    try {
      const result = await sendMessageToExtension('deleteAgent', { id, scope });
      if (result.success) {
        await loadAgents();
        return { success: true };
      } else {
        error.value = result.error || 'Delete Agent failed';
        return { success: false, error: error.value ?? undefined };
      }
    } catch (e) {
      console.error('Failed to delete Agent:', e);
      error.value = String(e);
      return { success: false, error: error.value ?? undefined };
    } finally {
      loading.value = false;
    }
  }

  async function openAgent(agentPath: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await sendMessageToExtension('openAgent', { agentPath });
      if (result.success) {
        return { success: true };
      } else {
        error.value = result.error || 'Open Agent failed';
        return { success: false, error: error.value ?? undefined };
      }
    } catch (e) {
      console.error('Failed to open Agent:', e);
      error.value = String(e);
      return { success: false, error: error.value ?? undefined };
    }
  }

  return {
    agents,
    loading,
    error,
    totalCount,
    globalCount,
    localCount,
    agentList,
    globalAgentList,
    localAgentList,
    initialize,
    loadAgents,
    importAgent,
    deleteAgent,
    openAgent,
  };
});
