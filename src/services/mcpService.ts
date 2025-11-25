/**
 * MCP (Model Context Protocol) 服务
 *
 * 管理 Claude 的 MCP 服务器配置
 *
 * 支持两种配置来源：
 * 1. cc-switch 格式: ~/.cc-switch/config.json (主要，优先读取)
 * 2. Claude 原生格式: ~/.claude.json (兼容，同步写入)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createDecorator } from '../di/instantiation';
import { ILogService } from './logService';
import type {
  McpServer,
  McpServerSpec,
  McpServersMap,
  McpApps,
  CCSwitchConfig,
  ClaudeConfig
} from '../shared/types/mcp';

export const IMcpService = createDecorator<IMcpService>('mcpService');

/**
 * MCP 服务接口
 */
export interface IMcpService {
  readonly _serviceBrand: undefined;

  /**
   * 获取 cc-switch 配置文件路径
   */
  getCCSwitchConfigPath(): string;

  /**
   * 获取 Claude 配置文件路径
   */
  getClaudeConfigPath(): string;

  /**
   * 获取所有 MCP 服务器
   */
  getAllServers(): Promise<McpServersMap>;

  /**
   * 获取单个 MCP 服务器
   */
  getServer(id: string): Promise<McpServer | null>;

  /**
   * 添加或更新 MCP 服务器
   */
  upsertServer(server: McpServer): Promise<void>;

  /**
   * 删除 MCP 服务器
   */
  deleteServer(id: string): Promise<boolean>;

  /**
   * 切换服务器在指定应用的启用状态
   */
  toggleApp(serverId: string, app: keyof McpApps, enabled: boolean): Promise<void>;

  /**
   * 验证 MCP 服务器配置
   */
  validateServer(server: McpServer): { valid: boolean; errors: string[] };

  /**
   * 同步配置到 Claude 原生文件
   */
  syncToClaudeConfig(): Promise<void>;
}

/**
 * MCP 服务实现
 */
export class McpService implements IMcpService {
  readonly _serviceBrand: undefined;

  constructor(
    @ILogService private readonly logService: ILogService
  ) {}

  /**
   * 获取 cc-switch 配置文件路径
   */
  getCCSwitchConfigPath(): string {
    const homeDir = os.homedir();
    return path.join(homeDir, '.cc-switch', 'config.json');
  }

  /**
   * 获取 Claude 配置文件路径
   */
  getClaudeConfigPath(): string {
    const homeDir = os.homedir();
    return path.join(homeDir, '.claude.json');
  }

  /**
   * 读取 cc-switch 配置
   */
  private async readCCSwitchConfig(): Promise<CCSwitchConfig> {
    const configPath = this.getCCSwitchConfigPath();

    try {
      if (!fs.existsSync(configPath)) {
        this.logService.info(`[MCP] cc-switch 配置文件不存在: ${configPath}`);
        return {};
      }

      const content = await fs.promises.readFile(configPath, 'utf-8');
      if (!content.trim()) {
        return {};
      }

      const config = JSON.parse(content) as CCSwitchConfig;
      this.logService.info(`[MCP] 成功读取 cc-switch 配置: ${configPath}`);
      return config;
    } catch (error) {
      this.logService.error(`[MCP] 读取 cc-switch 配置失败: ${error}`);
      return {};
    }
  }

  /**
   * 写入 cc-switch 配置
   */
  private async writeCCSwitchConfig(config: CCSwitchConfig): Promise<void> {
    const configPath = this.getCCSwitchConfigPath();

    try {
      // 确保目录存在
      const configDir = path.dirname(configPath);
      if (!fs.existsSync(configDir)) {
        await fs.promises.mkdir(configDir, { recursive: true });
        this.logService.info(`[MCP] 创建 cc-switch 配置目录: ${configDir}`);
      }

      // 创建备份
      if (fs.existsSync(configPath)) {
        const backupPath = configPath + '.bak';
        await fs.promises.copyFile(configPath, backupPath);
      }

      // 写入文件
      const content = JSON.stringify(config, null, 2);
      await fs.promises.writeFile(configPath, content, 'utf-8');
      this.logService.info(`[MCP] 成功写入 cc-switch 配置: ${configPath}`);
    } catch (error) {
      this.logService.error(`[MCP] 写入 cc-switch 配置失败: ${error}`);
      throw error;
    }
  }

  /**
   * 读取 Claude 原生配置
   */
  private async readClaudeConfig(): Promise<ClaudeConfig> {
    const configPath = this.getClaudeConfigPath();

    try {
      if (!fs.existsSync(configPath)) {
        return { mcpServers: {} };
      }

      const content = await fs.promises.readFile(configPath, 'utf-8');
      if (!content.trim()) {
        return { mcpServers: {} };
      }

      return JSON.parse(content) as ClaudeConfig;
    } catch (error) {
      this.logService.error(`[MCP] 读取 Claude 配置失败: ${error}`);
      return { mcpServers: {} };
    }
  }

  /**
   * 写入 Claude 原生配置
   */
  private async writeClaudeConfig(config: ClaudeConfig): Promise<void> {
    const configPath = this.getClaudeConfigPath();

    try {
      const content = JSON.stringify(config, null, 2);
      await fs.promises.writeFile(configPath, content, 'utf-8');
      this.logService.info(`[MCP] 成功写入 Claude 配置: ${configPath}`);
    } catch (error) {
      this.logService.error(`[MCP] 写入 Claude 配置失败: ${error}`);
      throw error;
    }
  }

  /**
   * 获取所有 MCP 服务器
   * 优先从 cc-switch 配置读取，如果不存在则从 Claude 配置读取
   */
  async getAllServers(): Promise<McpServersMap> {
    // 1. 尝试从 cc-switch 配置读取
    const ccSwitchConfig = await this.readCCSwitchConfig();

    if (ccSwitchConfig.mcp?.servers && Object.keys(ccSwitchConfig.mcp.servers).length > 0) {
      const servers = ccSwitchConfig.mcp.servers;
      // 确保每个服务器都有 id 字段
      const serversMap: McpServersMap = {};
      for (const [id, server] of Object.entries(servers)) {
        serversMap[id] = {
          ...server,
          id,
        };
      }
      this.logService.info(`[MCP] 从 cc-switch 配置获取到 ${Object.keys(serversMap).length} 个服务器`);
      return serversMap;
    }

    // 2. 回退到 Claude 原生配置
    const claudeConfig = await this.readClaudeConfig();
    const mcpServers = claudeConfig.mcpServers || {};

    const serversMap: McpServersMap = {};
    for (const [id, spec] of Object.entries(mcpServers)) {
      serversMap[id] = {
        id,
        name: id,
        server: spec,
        apps: {
          claude: true,
          codex: false,
          gemini: false,
        },
        enabled: true,
      };
    }

    this.logService.info(`[MCP] 从 Claude 配置获取到 ${Object.keys(serversMap).length} 个服务器`);
    return serversMap;
  }

  /**
   * 获取单个 MCP 服务器
   */
  async getServer(id: string): Promise<McpServer | null> {
    const servers = await this.getAllServers();
    return servers[id] || null;
  }

  /**
   * 添加或更新 MCP 服务器
   */
  async upsertServer(server: McpServer): Promise<void> {
    // 验证服务器配置
    const validation = this.validateServer(server);
    if (!validation.valid) {
      throw new Error(`服务器配置无效: ${validation.errors.join(', ')}`);
    }

    // 读取当前配置
    const config = await this.readCCSwitchConfig();

    // 初始化 mcp.servers
    if (!config.mcp) {
      config.mcp = {};
    }
    if (!config.mcp.servers) {
      config.mcp.servers = {};
    }

    // 设置默认的 apps 状态
    if (!server.apps) {
      server.apps = {
        claude: true,
        codex: false,
        gemini: false,
      };
    }

    // 添加或更新服务器
    config.mcp.servers[server.id] = server;

    // 写入 cc-switch 配置
    await this.writeCCSwitchConfig(config);

    // 同步到 Claude 原生配置
    await this.syncToClaudeConfig();

    this.logService.info(`[MCP] 成功保存服务器: ${server.id}`);
  }

  /**
   * 删除 MCP 服务器
   */
  async deleteServer(id: string): Promise<boolean> {
    const config = await this.readCCSwitchConfig();

    if (!config.mcp?.servers || !config.mcp.servers[id]) {
      this.logService.warn(`[MCP] 服务器不存在，无法删除: ${id}`);
      return false;
    }

    delete config.mcp.servers[id];
    await this.writeCCSwitchConfig(config);

    // 同步到 Claude 原生配置
    await this.syncToClaudeConfig();

    this.logService.info(`[MCP] 成功删除服务器: ${id}`);
    return true;
  }

  /**
   * 切换服务器在指定应用的启用状态
   */
  async toggleApp(serverId: string, app: keyof McpApps, enabled: boolean): Promise<void> {
    const config = await this.readCCSwitchConfig();

    if (!config.mcp?.servers || !config.mcp.servers[serverId]) {
      throw new Error(`服务器不存在: ${serverId}`);
    }

    const server = config.mcp.servers[serverId];

    // 初始化 apps
    if (!server.apps) {
      server.apps = {
        claude: false,
        codex: false,
        gemini: false,
      };
    }

    server.apps[app] = enabled;

    await this.writeCCSwitchConfig(config);

    // 同步到 Claude 原生配置
    await this.syncToClaudeConfig();

    this.logService.info(`[MCP] 服务器 ${serverId} 的 ${app} 状态已更新为 ${enabled}`);
  }

  /**
   * 同步配置到 Claude 原生文件
   * 只同步启用了 claude 的服务器
   */
  async syncToClaudeConfig(): Promise<void> {
    try {
      const ccSwitchConfig = await this.readCCSwitchConfig();
      const claudeConfig = await this.readClaudeConfig();

      // 获取所有启用了 claude 的服务器
      const mcpServers: Record<string, McpServerSpec> = {};

      if (ccSwitchConfig.mcp?.servers) {
        for (const [id, server] of Object.entries(ccSwitchConfig.mcp.servers)) {
          // 只同步启用了 claude 的服务器
          if (server.apps?.claude !== false) {
            mcpServers[id] = server.server;
          }
        }
      }

      claudeConfig.mcpServers = mcpServers;
      await this.writeClaudeConfig(claudeConfig);

      this.logService.info(`[MCP] 已同步 ${Object.keys(mcpServers).length} 个服务器到 Claude 配置`);
    } catch (error) {
      this.logService.error(`[MCP] 同步到 Claude 配置失败: ${error}`);
    }
  }

  /**
   * 验证 MCP 服务器配置
   */
  validateServer(server: McpServer): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证 ID
    if (!server.id || !server.id.trim()) {
      errors.push('服务器 ID 不能为空');
    }

    // 验证服务器规格
    if (!server.server) {
      errors.push('服务器配置不能为空');
    } else {
      const spec = server.server;
      const type = spec.type || 'stdio';

      if (type === 'stdio') {
        if (!spec.command || !spec.command.trim()) {
          errors.push('stdio 类型需要指定 command');
        }
      } else if (type === 'http' || type === 'sse') {
        if (!spec.url || !spec.url.trim()) {
          errors.push(`${type} 类型需要指定 url`);
        }
        if (spec.url) {
          try {
            new URL(spec.url);
          } catch {
            errors.push('URL 格式无效');
          }
        }
      } else {
        errors.push(`不支持的连接类型: ${type}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
