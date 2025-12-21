/**
 * CC Switch 配置文件服务
 * 用于读写 ~/.cc-switch/config.json
 * 与 CC Switch 共享配置格式
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createDecorator } from '../di/instantiation';
import { ILogService } from './logService';
import { IClaudeSettingsService } from './claudeSettingsService';

export const ICCSwitchSettingsService = createDecorator<ICCSwitchSettingsService>('ccSwitchSettingsService');

/**
 * 供应商分类
 */
export type ProviderCategory =
  | 'official'      // 官方
  | 'cn_official'   // 开源官方
  | 'aggregator'    // 聚合网站
  | 'third_party'   // 第三方供应商
  | 'custom';       // 自定义

/**
 * 供应商元数据
 */
export interface ProviderMeta {
  /** 自定义端点 */
  custom_endpoints?: Record<string, {
    url: string;
    addedAt: number;
    lastUsed?: number;
  }>;
  /** 用量查询脚本配置 */
  usage_script?: {
    enabled: boolean;
    language: string;
    code: string;
    timeout?: number;
    apiKey?: string;
    baseUrl?: string;
    accessToken?: string;
    userId?: string;
    autoQueryInterval?: number;
  };
  /** 是否为官方合作伙伴 */
  isPartner?: boolean;
  /** 合作伙伴促销 key */
  partnerPromotionKey?: string;
}

/**
 * Claude 供应商配置
 */
export interface ClaudeProvider {
  /** 供应商唯一 ID */
  id: string;
  /** 供应商名称 */
  name: string;
  /** Claude settings.json 的配置内容 */
  settingsConfig: {
    env: {
      ANTHROPIC_AUTH_TOKEN?: string;
      ANTHROPIC_BASE_URL?: string;
      [key: string]: any;
    };
    permissions?: {
      allow?: string[];
      deny?: string[];
    };
  };
  /** 官网链接 */
  websiteUrl?: string;
  /** 供应商分类 */
  category?: ProviderCategory;
  /** 创建时间戳（毫秒） */
  createdAt?: number;
  /** 排序索引 */
  sortIndex?: number;
  /** 是否为商业合作伙伴 */
  isPartner?: boolean;
  /** 供应商元数据 */
  meta?: ProviderMeta;
}

/**
 * Codex 供应商配置
 */
export interface CodexProvider {
  /** 供应商唯一 ID */
  id: string;
  /** 供应商名称 */
  name: string;
  /** Codex 配置内容 */
  settingsConfig: {
    auth: {
      OPENAI_API_KEY?: string;
      [key: string]: any;
    };
    config: string; // TOML 格式字符串
  };
  /** 官网链接 */
  websiteUrl?: string;
  /** 供应商分类 */
  category?: ProviderCategory;
  /** 创建时间戳（毫秒） */
  createdAt?: number;
  /** 排序索引 */
  sortIndex?: number;
  /** 是否为商业合作伙伴 */
  isPartner?: boolean;
  /** 供应商元数据 */
  meta?: ProviderMeta;
}

/**
 * 应用类型
 */
export type AppType = 'claude' | 'codex' | 'gemini';

/**
 * CC Switch 配置文件结构
 */
export interface CCSwitchConfig {
  /** 配置版本 */
  version: number;
  /** Claude 应用配置 */
  claude?: {
    /** 供应商列表 */
    providers: Record<string, ClaudeProvider>;
    /** 当前激活的供应商 ID */
    current: string;
  };
  /** Codex 应用配置 */
  codex?: {
    /** 供应商列表 */
    providers: Record<string, CodexProvider>;
    /** 当前激活的供应商 ID */
    current: string;
  };
  /** MCP 配置 */
  mcp?: {
    claude?: {
      servers: Record<string, any>;
    };
    codex?: {
      servers: Record<string, any>;
    };
  };
}

/**
 * 默认 Claude 供应商（官方）
 */
const DEFAULT_CLAUDE_PROVIDER: ClaudeProvider = {
  id: 'default',
  name: 'Claude官方',
  settingsConfig: {
    env: {
      ANTHROPIC_AUTH_TOKEN: '',
      ANTHROPIC_BASE_URL: 'https://api.anthropic.com'
    }
  },
  websiteUrl: 'https://www.anthropic.com',
  category: 'official',
  createdAt: Date.now()
};

/**
 * CC Switch 配置文件服务接口
 */
export interface ICCSwitchSettingsService {
  readonly _serviceBrand: undefined;

  /**
   * 获取 CC Switch 配置文件路径
   */
  getConfigPath(): string;

  /**
   * 读取完整配置
   */
  readConfig(): Promise<CCSwitchConfig>;

  /**
   * 写入完整配置
   */
  writeConfig(config: CCSwitchConfig): Promise<void>;

  /**
   * 获取 Claude 供应商列表
   */
  getClaudeProviders(): Promise<ClaudeProvider[]>;

  /**
   * 添加 Claude 供应商
   * @param provider 供应商配置
   */
  addClaudeProvider(provider: ClaudeProvider): Promise<void>;

  /**
   * 更新 Claude 供应商
   * @param id 供应商 ID
   * @param updates 更新的字段
   */
  updateClaudeProvider(id: string, updates: Partial<ClaudeProvider>): Promise<void>;

  /**
   * 删除 Claude 供应商
   * @param id 供应商 ID
   * @throws 如果供应商不存在
   */
  deleteClaudeProvider(id: string): Promise<void>;

  /**
   * 切换 Claude 供应商
   * @param id 供应商 ID
   */
  switchClaudeProvider(id: string): Promise<void>;

  /**
   * 获取当前激活的 Claude 供应商
   */
  getActiveClaudeProvider(): Promise<ClaudeProvider | null>;

  /**
   * 初始化配置（确保默认供应商存在）
   */
  initialize(): Promise<void>;

  /**
   * 备份配置文件
   */
  backupConfig(): Promise<void>;
}

/**
 * CC Switch 配置文件服务实现
 */
export class CCSwitchSettingsService implements ICCSwitchSettingsService {
  readonly _serviceBrand: undefined;

  constructor(
    @ILogService private readonly logService: ILogService,
    @IClaudeSettingsService private readonly claudeSettingsService: IClaudeSettingsService
  ) {}

  /**
   * 获取 CC Switch 配置文件路径
   */
  getConfigPath(): string {
    const homeDir = os.homedir();
    return path.join(homeDir, '.cc-switch', 'config.json');
  }

  /**
   * 获取备份文件路径
   */
  private getBackupPath(): string {
    const homeDir = os.homedir();
    return path.join(homeDir, '.cc-switch', 'config.json.bak');
  }

  /**
   * 从 ~/.claude/settings.json 创建默认供应商配置
   * 如果 settings.json 不存在或读取失败，返回硬编码的默认配置
   */
  private async createDefaultProviderFromClaudeSettings(): Promise<ClaudeProvider> {
    try {
      // 尝试读取 Claude settings
      const settings = await this.claudeSettingsService.readSettings();

      // 检查是否有有效的配置
      if (settings.env && (settings.env.ANTHROPIC_AUTH_TOKEN || settings.env.ANTHROPIC_BASE_URL)) {
        this.logService.info('Loading default provider config from ~/.claude/settings.json');

        const baseUrl = settings.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com';

        return {
          id: 'default',
          name: 'default',
          settingsConfig: {
            env: {
              ANTHROPIC_AUTH_TOKEN: settings.env.ANTHROPIC_AUTH_TOKEN || '',
              ANTHROPIC_BASE_URL: baseUrl
            }
          },
          websiteUrl: baseUrl,
          category: 'official',
          createdAt: Date.now()
        };
      }

      // 如果没有有效配置，返回硬编码的默认值
      this.logService.info('No valid config in ~/.claude/settings.json, using hardcoded defaults');
      return DEFAULT_CLAUDE_PROVIDER;
    } catch (error) {
      // 读取失败，返回硬编码的默认值
      this.logService.warn(`Failed to read Claude settings for default provider: ${error}`);
      return DEFAULT_CLAUDE_PROVIDER;
    }
  }

  /**
   * 读取完整配置
   */
  async readConfig(): Promise<CCSwitchConfig> {
    const configPath = this.getConfigPath();

    try {
      // 检查文件是否存在
      if (!fs.existsSync(configPath)) {
        this.logService.warn(`CC Switch config file not found: ${configPath}`);

        // 尝试从 ~/.claude/settings.json 读取配置作为默认值
        const defaultProvider = await this.createDefaultProviderFromClaudeSettings();

        // 返回默认配置
        return {
          version: 2,
          claude: {
            providers: {
              'default': defaultProvider
            },
            current: 'default'
          }
        };
      }

      // 读取文件内容
      const content = await fs.promises.readFile(configPath, 'utf-8');
      const config = JSON.parse(content) as CCSwitchConfig;

      // 确保 Claude 配置存在
      if (!config.claude) {
        config.claude = {
          providers: {},
          current: ''
        };
      }

      // 确保 providers 对象存在
      if (!config.claude.providers) {
        config.claude.providers = {};
      }

      this.logService.info(`Successfully read CC Switch config from: ${configPath}`);
      return config;
    } catch (error) {
      this.logService.error(`Failed to read CC Switch config: ${error}`);

      // 尝试从 ~/.claude/settings.json 读取配置作为默认值
      const defaultProvider = await this.createDefaultProviderFromClaudeSettings();

      // 返回默认配置
      return {
        version: 2,
        claude: {
          providers: {
            'default': defaultProvider
          },
          current: 'default'
        }
      };
    }
  }

  /**
   * 写入完整配置
   */
  async writeConfig(config: CCSwitchConfig): Promise<void> {
    const configPath = this.getConfigPath();

    try {
      // 确保目录存在
      const configDir = path.dirname(configPath);
      if (!fs.existsSync(configDir)) {
        await fs.promises.mkdir(configDir, { recursive: true });
        this.logService.info(`Created CC Switch config directory: ${configDir}`);
      }

      // 写入文件（格式化 JSON）
      const content = JSON.stringify(config, null, 2);
      await fs.promises.writeFile(configPath, content, 'utf-8');

      this.logService.info(`Successfully wrote CC Switch config to: ${configPath}`);
    } catch (error) {
      this.logService.error(`Failed to write CC Switch config: ${error}`);
      throw error;
    }
  }

  /**
   * 获取 Claude 供应商列表
   */
  async getClaudeProviders(): Promise<ClaudeProvider[]> {
    const config = await this.readConfig();
    if (!config.claude || !config.claude.providers) {
      return [];
    }
    return Object.values(config.claude.providers);
  }

  /**
   * 添加 Claude 供应商
   */
  async addClaudeProvider(provider: ClaudeProvider): Promise<void> {
    try {
      const config = await this.readConfig();

      // 确保 Claude 配置存在
      if (!config.claude) {
        config.claude = {
          providers: {},
          current: ''
        };
      }

      // 检查 ID 是否已存在
      if (config.claude.providers[provider.id]) {
        throw new Error(`Provider with id '${provider.id}' already exists`);
      }

      // 添加创建时间
      if (!provider.createdAt) {
        provider.createdAt = Date.now();
      }

      // 添加供应商
      config.claude.providers[provider.id] = provider;

      // 如果没有当前供应商，设置为新添加的
      if (!config.claude.current) {
        config.claude.current = provider.id;
      }

      // 备份并写入配置
      await this.backupConfig();
      await this.writeConfig(config);

      this.logService.info(`Successfully added Claude provider: ${provider.name} (${provider.id})`);
    } catch (error) {
      this.logService.error(`Failed to add Claude provider: ${error}`);
      throw error;
    }
  }

  /**
   * 更新 Claude 供应商
   */
  async updateClaudeProvider(id: string, updates: Partial<ClaudeProvider>): Promise<void> {
    try {
      const config = await this.readConfig();

      if (!config.claude || !config.claude.providers[id]) {
        throw new Error(`Provider with id '${id}' not found`);
      }

      // 不允许修改默认供应商的某些字段
      if (id === 'default') {
        delete updates.id;
        delete updates.category;
      }

      const existingProvider = config.claude.providers[id];

      // Deep merge settingsConfig to preserve nested properties like permissions
      let mergedSettingsConfig = existingProvider.settingsConfig;
      if (updates.settingsConfig) {
        // 合并 env，处理 undefined 值（删除对应 key）
        const mergedEnv = { ...existingProvider.settingsConfig?.env };
        if (updates.settingsConfig?.env) {
          for (const [key, value] of Object.entries(updates.settingsConfig.env)) {
            if (value === undefined || value === '') {
              // 删除空值或 undefined 的 key
              delete mergedEnv[key];
            } else {
              mergedEnv[key] = value;
            }
          }
        }

        mergedSettingsConfig = {
          ...existingProvider.settingsConfig,
          ...updates.settingsConfig,
          env: mergedEnv
        };
        // Preserve permissions if they exist
        if (existingProvider.settingsConfig?.permissions) {
          mergedSettingsConfig.permissions = {
            ...existingProvider.settingsConfig.permissions,
            ...updates.settingsConfig?.permissions
          };
        }
      }

      // 更新供应商
      config.claude.providers[id] = {
        ...existingProvider,
        ...updates,
        settingsConfig: mergedSettingsConfig,
        id // 保持 ID 不变
      };

      // 备份并写入配置
      await this.backupConfig();
      await this.writeConfig(config);

      this.logService.info(`Successfully updated Claude provider: ${id}`);
    } catch (error) {
      this.logService.error(`Failed to update Claude provider: ${error}`);
      throw error;
    }
  }

  /**
   * 删除 Claude 供应商
   */
  async deleteClaudeProvider(id: string): Promise<void> {
    try {
      const config = await this.readConfig();

      if (!config.claude || !config.claude.providers[id]) {
        throw new Error(`Provider with id '${id}' not found`);
      }

      // 删除供应商
      delete config.claude.providers[id];

      // 如果删除的是当前激活的供应商，切换到第一个可用的供应商
      if (config.claude.current === id) {
        const remainingProviders = Object.keys(config.claude.providers);
        if (remainingProviders.length > 0) {
          // 切换到第一个可用的供应商
          config.claude.current = remainingProviders[0];
          this.logService.info(`Switched to provider: ${config.claude.current}`);
        } else {
          // 没有剩余供应商，设置为空
          config.claude.current = '';
          this.logService.warn('No remaining providers after deletion');
        }
      }

      // 备份并写入配置
      await this.backupConfig();
      await this.writeConfig(config);

      this.logService.info(`Successfully deleted Claude provider: ${id}`);
    } catch (error) {
      this.logService.error(`Failed to delete Claude provider: ${error}`);
      throw error;
    }
  }

  /**
   * 切换 Claude 供应商
   */
  async switchClaudeProvider(id: string): Promise<void> {
    try {
      const config = await this.readConfig();

      if (!config.claude || !config.claude.providers[id]) {
        throw new Error(`Provider with id '${id}' not found`);
      }

      // 更新当前供应商
      config.claude.current = id;

      // 备份并写入配置
      await this.backupConfig();
      await this.writeConfig(config);

      this.logService.info(`Successfully switched to Claude provider: ${id}`);
    } catch (error) {
      this.logService.error(`Failed to switch Claude provider: ${error}`);
      throw error;
    }
  }

  /**
   * 获取当前激活的 Claude 供应商
   */
  async getActiveClaudeProvider(): Promise<ClaudeProvider | null> {
    try {
      const config = await this.readConfig();

      if (!config.claude || !config.claude.current) {
        return null;
      }

      const provider = config.claude.providers[config.claude.current];
      return provider || null;
    } catch (error) {
      this.logService.error(`Failed to get active Claude provider: ${error}`);
      return null;
    }
  }

  /**
   * 初始化配置（确保默认供应商存在）
   */
  async initialize(): Promise<void> {
    try {
      const config = await this.readConfig();

      let needsSave = false;

      // 确保版本号
      if (!config.version) {
        config.version = 2;
        needsSave = true;
      }

      // 确保 Claude 配置存在
      if (!config.claude) {
        config.claude = {
          providers: {},
          current: ''
        };
        needsSave = true;
      }

      // 确保 providers 对象存在
      if (!config.claude.providers) {
        config.claude.providers = {};
        needsSave = true;
      }

      if (needsSave) {
        await this.writeConfig(config);
        this.logService.info('Initialized CC Switch config');
      }
    } catch (error) {
      this.logService.error(`Failed to initialize CC Switch config: ${error}`);
      throw error;
    }
  }

  /**
   * 备份配置文件
   */
  async backupConfig(): Promise<void> {
    try {
      const configPath = this.getConfigPath();
      const backupPath = this.getBackupPath();

      if (fs.existsSync(configPath)) {
        await fs.promises.copyFile(configPath, backupPath);
        this.logService.info(`Backed up config to: ${backupPath}`);
      }
    } catch (error) {
      this.logService.warn(`Failed to backup config: ${error}`);
      // 备份失败不应该影响主流程
    }
  }
}