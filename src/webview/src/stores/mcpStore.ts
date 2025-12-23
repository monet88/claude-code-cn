/**
 * MCP Server Store
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { McpServer, McpServersMap, McpPreset } from '../types/mcp';
import { getVsCodeApi } from '../utils/vscodeApi';

/**
 * MCP Preset Servers
 */
export const MCP_PRESETS: McpPreset[] = [
  {
    id: 'fetch',
    name: 'mcp-server-fetch',
    description: 'Web content fetching tool, can crawl web content',
    tags: ['stdio', 'http', 'web'],
    server: {
      type: 'stdio',
      command: 'uvx',
      args: ['mcp-server-fetch'],
    },
    homepage: 'https://github.com/modelcontextprotocol/servers',
    docs: 'https://github.com/modelcontextprotocol/servers/tree/main/src/fetch',
  },
  {
    id: 'time',
    name: '@modelcontextprotocol/server-time',
    description: 'Time and timezone tool',
    tags: ['stdio', 'time', 'utility'],
    server: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-time'],
    },
    homepage: 'https://github.com/modelcontextprotocol/servers',
    docs: 'https://github.com/modelcontextprotocol/servers/tree/main/src/time',
  },
  {
    id: 'memory',
    name: '@modelcontextprotocol/server-memory',
    description: 'Knowledge graph and memory storage tool',
    tags: ['stdio', 'memory', 'graph'],
    server: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-memory'],
    },
    homepage: 'https://github.com/modelcontextprotocol/servers',
    docs: 'https://github.com/modelcontextprotocol/servers/tree/main/src/memory',
  },
  {
    id: 'sequential-thinking',
    name: '@modelcontextprotocol/server-sequential-thinking',
    description: 'Sequential thinking and reasoning tool',
    tags: ['stdio', 'thinking', 'reasoning'],
    server: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
    },
    homepage: 'https://github.com/modelcontextprotocol/servers',
    docs: 'https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking',
  },
  {
    id: 'context7',
    name: '@upstash/context7-mcp',
    description: 'Document search and context retrieval tool',
    tags: ['stdio', 'docs', 'search'],
    server: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@upstash/context7-mcp'],
    },
    homepage: 'https://context7.com',
    docs: 'https://github.com/upstash/context7/blob/master/README.md',
  },
];

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

    // Generate unique message ID
    const messageId = `${type}_${Date.now()}_${Math.random()}`;

    // Listen for response
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (data && data.type === 'from-extension') {
        const message = data.message;
        // Match response type
        const expectedTypes = [
          'allMcpServersData',    // getAllMcpServers response
          'mcpServerUpserted',    // upsertMcpServer response
          'mcpServerDeleted',     // deleteMcpServer response
          'mcpServerValidated'    // validateMcpServer response
        ];

        if (expectedTypes.some(t => message.type === t)) {
          window.removeEventListener('message', handleMessage);
          resolve(message.payload);
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // Ensure payload is serializable - perform deep cloning to remove non-serializable properties
    let serializedPayload = payload;
    if (payload !== undefined && payload !== null) {
      try {
        // Serialize/Deserialize through JSON to ensure data is cloneable
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
    }, 10000);
  });
}

/**
 * MCP Server Store
 */
export const useMcpStore = defineStore('mcp', () => {
  // Server list
  const servers = ref<McpServersMap>({});

  // Loading state
  const loading = ref(false);

  // Error message
  const error = ref<string | null>(null);

  // Calculate server count
  const serverCount = computed(() => Object.keys(servers.value).length);

  // Calculate server list
  const serverList = computed(() =>
    Object.entries(servers.value).map(([id, server]) => ({
      ...server,
      id,
    }))
  );

  /**
   * Initialize, load server list
   */
  async function initialize() {
    await loadServers();
  }

  /**
   * Load all MCP servers
   */
  async function loadServers() {
    loading.value = true;
    error.value = null;

    try {
      const result = await sendMessageToExtension('getAllMcpServers');
      if (result) {
        servers.value = result;
      } else {
        servers.value = {};
      }
    } catch (e) {
      console.error('Failed to load MCP servers:', e);
      error.value = String(e);
      servers.value = {};
    } finally {
      loading.value = false;
    }
  }

  /**
   * Add or update server
   */
  async function upsertServer(server: McpServer): Promise<{ success: boolean; error?: string }> {
    loading.value = true;
    error.value = null;

    try {
      const result = await sendMessageToExtension('upsertMcpServer', { server });
      if (result.success) {
        // Reload server list
        await loadServers();
        return { success: true };
      } else {
        error.value = result.error || 'Failed to add server';
        return { success: false, error: error.value ?? undefined };
      }
    } catch (e) {
      console.error('Failed to upsert MCP server:', e);
      error.value = String(e);
      return { success: false, error: error.value ?? undefined };
    } finally {
      loading.value = false;
    }
  }

  /**
   * Delete server
   */
  async function deleteServer(id: string): Promise<{ success: boolean; error?: string }> {
    loading.value = true;
    error.value = null;

    try {
      const result = await sendMessageToExtension('deleteMcpServer', { id });
      if (result.success) {
        // Reload server list
        await loadServers();
        return { success: true };
      } else {
        error.value = result.error || 'Failed to delete server';
        return { success: false, error: error.value ?? undefined };
      }
    } catch (e) {
      console.error('Failed to delete MCP server:', e);
      error.value = String(e);
      return { success: false, error: error.value ?? undefined };
    } finally {
      loading.value = false;
    }
  }

  /**
   * Validate server configuration
   */
  async function validateServer(server: McpServer): Promise<{ valid: boolean; errors: string[] }> {
    try {
      const result = await sendMessageToExtension('validateMcpServer', { server });
      return result;
    } catch (e) {
      console.error('Failed to validate MCP server:', e);
      return { valid: false, errors: [String(e)] };
    }
  }

  /**
   * Get presets
   */
  function getPresets(): McpPreset[] {
    return MCP_PRESETS;
  }

  /**
   * Create server from preset
   */
  function createFromPreset(preset: McpPreset): McpServer {
    return {
      id: preset.id,
      name: preset.name,
      description: preset.description,
      tags: preset.tags,
      server: { ...preset.server },
      apps: {
        claude: true,
        codex: false,
        gemini: false,
      },
      homepage: preset.homepage,
      docs: preset.docs,
      enabled: true,
    };
  }

  /**
   * Check if server ID exists
   */
  function isIdExists(id: string): boolean {
    return id in servers.value;
  }

  /**
   * Generate unique server ID
   */
  function generateUniqueId(baseId: string): string {
    if (!isIdExists(baseId)) {
      return baseId;
    }

    let index = 1;
    while (isIdExists(`${baseId}-${index}`)) {
      index++;
    }
    return `${baseId}-${index}`;
  }

  return {
    servers,
    loading,
    error,
    serverCount,
    serverList,
    initialize,
    loadServers,
    upsertServer,
    deleteServer,
    validateServer,
    getPresets,
    createFromPreset,
    isIdExists,
    generateUniqueId,
  };
});
