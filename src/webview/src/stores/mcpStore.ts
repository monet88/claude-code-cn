/**
 * MCP 服务器配置 Store
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { McpServer, McpServersMap, McpPreset } from '../types/mcp';
import { getVsCodeApi } from '../utils/vscodeApi';

/**
 * MCP 预设服务器配置
 */
export const MCP_PRESETS: McpPreset[] = [
  {
    id: 'fetch',
    name: 'mcp-server-fetch',
    description: 'Web 内容获取工具，可以抓取网页内容',
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
    description: '时间和时区工具',
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
    description: '知识图谱和记忆存储工具',
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
    description: '顺序思考和推理工具',
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
    description: '文档搜索和上下文检索工具',
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
 * 向 VSCode 扩展发送消息并等待响应
 */
function sendMessageToExtension(type: string, payload?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const vscodeApi = getVsCodeApi();

    if (!vscodeApi) {
      reject(new Error('VSCode API not available'));
      return;
    }

    // 生成唯一消息 ID
    const messageId = `${type}_${Date.now()}_${Math.random()}`;

    // 监听响应
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (data && data.type === 'from-extension') {
        const message = data.message;
        // 根据不同的响应类型匹配
        const expectedTypes = [
          'allMcpServersData',    // getAllMcpServers 的响应
          'mcpServerUpserted',    // upsertMcpServer 的响应
          'mcpServerDeleted',     // deleteMcpServer 的响应
          'mcpServerValidated'    // validateMcpServer 的响应
        ];

        if (expectedTypes.some(t => message.type === t)) {
          window.removeEventListener('message', handleMessage);
          resolve(message.payload);
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // 确保 payload 是可序列化的 - 进行深度克隆以去除不可序列化的属性
    let serializedPayload = payload;
    if (payload !== undefined && payload !== null) {
      try {
        // 通过 JSON 序列化/反序列化来确保数据可克隆
        serializedPayload = JSON.parse(JSON.stringify(payload));
      } catch (e) {
        console.error('Failed to serialize payload:', e);
        reject(new Error('Payload is not serializable'));
        return;
      }
    }

    // 发送消息
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

    // 超时处理
    setTimeout(() => {
      window.removeEventListener('message', handleMessage);
      reject(new Error(`Request timeout: ${type}`));
    }, 10000);
  });
}

/**
 * MCP 服务器配置 Store
 */
export const useMcpStore = defineStore('mcp', () => {
  // 服务器列表
  const servers = ref<McpServersMap>({});

  // 加载状态
  const loading = ref(false);

  // 错误信息
  const error = ref<string | null>(null);

  // 计算服务器数量
  const serverCount = computed(() => Object.keys(servers.value).length);

  // 计算服务器数组
  const serverList = computed(() =>
    Object.entries(servers.value).map(([id, server]) => ({
      ...server,
      id,
    }))
  );

  /**
   * 初始化，加载服务器列表
   */
  async function initialize() {
    await loadServers();
  }

  /**
   * 加载所有 MCP 服务器
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
   * 添加或更新服务器
   */
  async function upsertServer(server: McpServer): Promise<{ success: boolean; error?: string }> {
    loading.value = true;
    error.value = null;

    try {
      const result = await sendMessageToExtension('upsertMcpServer', { server });
      if (result.success) {
        // 重新加载服务器列表
        await loadServers();
        return { success: true };
      } else {
        error.value = result.error || '添加服务器失败';
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
   * 删除服务器
   */
  async function deleteServer(id: string): Promise<{ success: boolean; error?: string }> {
    loading.value = true;
    error.value = null;

    try {
      const result = await sendMessageToExtension('deleteMcpServer', { id });
      if (result.success) {
        // 重新加载服务器列表
        await loadServers();
        return { success: true };
      } else {
        error.value = result.error || '删除服务器失败';
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
   * 验证服务器配置
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
   * 获取预设服务器列表
   */
  function getPresets(): McpPreset[] {
    return MCP_PRESETS;
  }

  /**
   * 从预设创建服务器
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
   * 检查服务器 ID 是否已存在
   */
  function isIdExists(id: string): boolean {
    return id in servers.value;
  }

  /**
   * 生成唯一的服务器 ID
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
