/**
 * MCP (Model Context Protocol) Service
 *
 * Manages Claude's MCP server configuration
 *
 * Supports two configuration sources:
 * 1. cc-switch format: ~/.cc-switch/config.json (Primary, prioritized)
 * 2. Claude native format: ~/.claude.json (Compatible, synchronized writing)
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
 * MCP Service Interface
 */
export interface IMcpService {
  readonly _serviceBrand: undefined;

  /**
   * Get cc-switch config file path
   */
  getCCSwitchConfigPath(): string;

  /**
   * Get Claude config file path
   */
  getClaudeConfigPath(): string;

  /**
   * Get all MCP servers
   */
  getAllServers(): Promise<McpServersMap>;

  /**
   * Get a single MCP server
   */
  getServer(id: string): Promise<McpServer | null>;

  /**
   * Add or update an MCP server
   */
  upsertServer(server: McpServer): Promise<void>;

  /**
   * Delete an MCP server
   */
  deleteServer(id: string): Promise<boolean>;

  /**
   * Toggle server enabled state for a specific app
   */
  toggleApp(serverId: string, app: keyof McpApps, enabled: boolean): Promise<void>;

  /**
   * Validate MCP server configuration
   */
  validateServer(server: McpServer): { valid: boolean; errors: string[] };

  /**
   * Synchronize config to Claude native file
   */
  syncToClaudeConfig(): Promise<void>;
}

/**
 * MCP Service Implementation
 */
export class McpService implements IMcpService {
  readonly _serviceBrand: undefined;

  constructor(
    @ILogService private readonly logService: ILogService
  ) { }

  /**
   * Get cc-switch config file path
   */
  getCCSwitchConfigPath(): string {
    const homeDir = os.homedir();
    return path.join(homeDir, '.cc-switch', 'config.json');
  }

  /**
   * Get Claude config file path
   */
  getClaudeConfigPath(): string {
    const homeDir = os.homedir();
    return path.join(homeDir, '.claude.json');
  }

  /**
   * Read cc-switch configuration
   */
  private async readCCSwitchConfig(): Promise<CCSwitchConfig> {
    const configPath = this.getCCSwitchConfigPath();

    try {
      if (!fs.existsSync(configPath)) {
        this.logService.info(`[MCP] cc-switch configuration file does not exist: ${configPath}`);
        return {};
      }

      const content = await fs.promises.readFile(configPath, 'utf-8');
      if (!content.trim()) {
        return {};
      }

      const config = JSON.parse(content) as CCSwitchConfig;
      this.logService.info(`[MCP] Successfully read cc-switch configuration: ${configPath}`);
      return config;
    } catch (error) {
      this.logService.error(`[MCP] Failed to read cc-switch configuration: ${error}`);
      return {};
    }
  }

  /**
   * Write cc-switch configuration
   */
  private async writeCCSwitchConfig(config: CCSwitchConfig): Promise<void> {
    const configPath = this.getCCSwitchConfigPath();

    try {
      // Ensure directory exists
      const configDir = path.dirname(configPath);
      if (!fs.existsSync(configDir)) {
        await fs.promises.mkdir(configDir, { recursive: true });
        this.logService.info(`[MCP] Created cc-switch configuration directory: ${configDir}`);
      }

      // Create backup
      if (fs.existsSync(configPath)) {
        const backupPath = configPath + '.bak';
        await fs.promises.copyFile(configPath, backupPath);
      }

      // Write file
      const content = JSON.stringify(config, null, 2);
      await fs.promises.writeFile(configPath, content, 'utf-8');
      this.logService.info(`[MCP] Successfully wrote cc-switch configuration: ${configPath}`);
    } catch (error) {
      this.logService.error(`[MCP] Failed to write cc-switch configuration: ${error}`);
      throw error;
    }
  }

  /**
   * Read native Claude configuration
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
      this.logService.error(`[MCP] Failed to read Claude configuration: ${error}`);
      return { mcpServers: {} };
    }
  }

  /**
   * Write native Claude configuration
   */
  private async writeClaudeConfig(config: ClaudeConfig): Promise<void> {
    const configPath = this.getClaudeConfigPath();

    try {
      const content = JSON.stringify(config, null, 2);
      await fs.promises.writeFile(configPath, content, 'utf-8');
      this.logService.info(`[MCP] Successfully wrote Claude configuration: ${configPath}`);
    } catch (error) {
      this.logService.error(`[MCP] Failed to write Claude configuration: ${error}`);
      throw error;
    }
  }

  /**
   * Get all MCP servers
   * Prioritize reading from cc-switch configuration, fall back to Claude configuration if it doesn't exist
   */
  async getAllServers(): Promise<McpServersMap> {
    // 1. Try reading from cc-switch configuration
    const ccSwitchConfig = await this.readCCSwitchConfig();

    if (ccSwitchConfig.mcp?.servers && Object.keys(ccSwitchConfig.mcp.servers).length > 0) {
      const servers = ccSwitchConfig.mcp.servers;
      // Ensure each server has an id field
      const serversMap: McpServersMap = {};
      for (const [id, server] of Object.entries(servers)) {
        serversMap[id] = {
          ...server,
          id,
        };
      }
      this.logService.info(`[MCP] Obtained ${Object.keys(serversMap).length} servers from cc-switch configuration`);
      return serversMap;
    }

    // 2. Fall back to native Claude configuration
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

    this.logService.info(`[MCP] Obtained ${Object.keys(serversMap).length} servers from Claude configuration`);
    return serversMap;
  }

  /**
   * Get a single MCP server
   */
  async getServer(id: string): Promise<McpServer | null> {
    const servers = await this.getAllServers();
    return servers[id] || null;
  }

  /**
   * Add or update an MCP server
   */
  async upsertServer(server: McpServer): Promise<void> {
    // Validate server configuration
    const validation = this.validateServer(server);
    if (!validation.valid) {
      throw new Error(`Invalid server configuration: ${validation.errors.join(', ')}`);
    }

    // Read current configuration
    const config = await this.readCCSwitchConfig();

    // Initialize mcp.servers
    if (!config.mcp) {
      config.mcp = {};
    }
    if (!config.mcp.servers) {
      config.mcp.servers = {};
    }

    // Set default apps state
    if (!server.apps) {
      server.apps = {
        claude: true,
        codex: false,
        gemini: false,
      };
    }

    // Add or update server
    config.mcp.servers[server.id] = server;

    // Write cc-switch configuration
    await this.writeCCSwitchConfig(config);

    // Sync to native Claude configuration
    await this.syncToClaudeConfig();

    this.logService.info(`[MCP] Successfully saved server: ${server.id}`);
  }

  /**
   * Delete an MCP server
   */
  async deleteServer(id: string): Promise<boolean> {
    const config = await this.readCCSwitchConfig();

    if (!config.mcp?.servers || !config.mcp.servers[id]) {
      this.logService.warn(`[MCP] Server does not exist, cannot delete: ${id}`);
      return false;
    }

    delete config.mcp.servers[id];
    await this.writeCCSwitchConfig(config);

    // Sync to native Claude configuration
    await this.syncToClaudeConfig();

    this.logService.info(`[MCP] Successfully deleted server: ${id}`);
    return true;
  }

  /**
   * Toggle server enabled state for a specific app
   */
  async toggleApp(serverId: string, app: keyof McpApps, enabled: boolean): Promise<void> {
    const config = await this.readCCSwitchConfig();

    if (!config.mcp?.servers || !config.mcp.servers[serverId]) {
      throw new Error(`Server does not exist: ${serverId}`);
    }

    const server = config.mcp.servers[serverId];

    // Initialize apps
    if (!server.apps) {
      server.apps = {
        claude: false,
        codex: false,
        gemini: false,
      };
    }

    server.apps[app] = enabled;

    await this.writeCCSwitchConfig(config);

    // Sync to native Claude configuration
    await this.syncToClaudeConfig();

    this.logService.info(`[MCP] App ${app} status for server ${serverId} updated to ${enabled}`);
  }

  /**
   * Synchronize config to native Claude file
   * Only sync servers with 'claude' enabled
   */
  async syncToClaudeConfig(): Promise<void> {
    try {
      const ccSwitchConfig = await this.readCCSwitchConfig();
      const claudeConfig = await this.readClaudeConfig();

      // Get all servers with 'claude' enabled
      const mcpServers: Record<string, McpServerSpec> = {};

      if (ccSwitchConfig.mcp?.servers) {
        for (const [id, server] of Object.entries(ccSwitchConfig.mcp.servers)) {
          // Only sync servers with 'claude' enabled
          if (server.apps?.claude !== false) {
            mcpServers[id] = server.server;
          }
        }
      }

      claudeConfig.mcpServers = mcpServers;
      await this.writeClaudeConfig(claudeConfig);

      this.logService.info(`[MCP] Synchronized ${Object.keys(mcpServers).length} servers to Claude configuration`);
    } catch (error) {
      this.logService.error(`[MCP] Failed to synchronize to Claude configuration: ${error}`);
    }
  }

  /**
   * Validate MCP server configuration
   */
  validateServer(server: McpServer): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate ID
    if (!server.id || !server.id.trim()) {
      errors.push('Server ID cannot be empty');
    }

    // Validate server spec
    if (!server.server) {
      errors.push('Server configuration cannot be empty');
    } else {
      const spec = server.server;
      const type = spec.type || 'stdio';

      if (type === 'stdio') {
        if (!spec.command || !spec.command.trim()) {
          errors.push('command is required for stdio type');
        }
      } else if (type === 'http' || type === 'sse') {
        if (!spec.url || !spec.url.trim()) {
          errors.push(`url is required for ${type} type`);
        }
        if (spec.url) {
          try {
            new URL(spec.url);
          } catch {
            errors.push('Invalid URL format');
          }
        }
      } else {
        errors.push(`Unsupported connection type: ${type}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
