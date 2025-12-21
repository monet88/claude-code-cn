/**
 * CC Switch Configuration File Service
 * Used for reading/writing ~/.cc-switch/config.json
 * Shares configuration format with CC Switch
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createDecorator } from '../di/instantiation';
import { ILogService } from './logService';
import { IClaudeSettingsService } from './claudeSettingsService';

export const ICCSwitchSettingsService = createDecorator<ICCSwitchSettingsService>('ccSwitchSettingsService');

/**
 * Provider Category
 */
export type ProviderCategory =
  | 'official'      // Official
  | 'cn_official'   // Open Source Official
  | 'aggregator'    // Aggregator Website
  | 'third_party'   // Third-party Provider
  | 'custom';       // Custom

/**
 * Provider Metadata
 */
export interface ProviderMeta {
  /** Custom endpoints */
  custom_endpoints?: Record<string, {
    url: string;
    addedAt: number;
    lastUsed?: number;
  }>;
  /** Usage query script configuration */
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
  /** Whether this is an official partner */
  isPartner?: boolean;
  /** Partner promotion key */
  partnerPromotionKey?: string;
}

/**
 * Claude Provider Configuration
 */
export interface ClaudeProvider {
  /** Provider unique ID */
  id: string;
  /** Provider name */
  name: string;
  /** 
   * Full Claude settings.json configuration content (dynamic)
   * Directly copies user's ~/.claude/settings.json, no hardcoded structure
   */
  settingsConfig: {
    /** Environment variables - only needs special handling for overlay */
    env?: Record<string, any>;
    /** Other arbitrary configuration - dynamically read from settings.json */
    [key: string]: any;
  };
  /** Website URL */
  websiteUrl?: string;
  /** Provider category */
  category?: ProviderCategory;
  /** Creation timestamp (milliseconds) */
  createdAt?: number;
  /** Sort index */
  sortIndex?: number;
  /** Whether this is a commercial partner */
  isPartner?: boolean;
  /** Provider metadata */
  meta?: ProviderMeta;
}

/**
 * Codex Provider Configuration
 */
export interface CodexProvider {
  /** Provider unique ID */
  id: string;
  /** Provider name */
  name: string;
  /** Codex configuration content */
  settingsConfig: {
    auth: {
      OPENAI_API_KEY?: string;
      [key: string]: any;
    };
    config: string; // TOML format string
  };
  /** Website URL */
  websiteUrl?: string;
  /** Provider category */
  category?: ProviderCategory;
  /** Creation timestamp (milliseconds) */
  createdAt?: number;
  /** Sort index */
  sortIndex?: number;
  /** Whether this is a commercial partner */
  isPartner?: boolean;
  /** Provider metadata */
  meta?: ProviderMeta;
}

/**
 * Application Type
 */
export type AppType = 'claude' | 'codex' | 'gemini';

/**
 * CC Switch Configuration File Structure
 */
export interface CCSwitchConfig {
  /** Configuration version */
  version: number;
  /** Claude application configuration */
  claude?: {
    /** Provider list */
    providers: Record<string, ClaudeProvider>;
    /** Currently active provider ID */
    current: string;
  };
  /** Codex application configuration */
  codex?: {
    /** Provider list */
    providers: Record<string, CodexProvider>;
    /** Currently active provider ID */
    current: string;
  };
  /** MCP configuration */
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
 * Default Claude Provider (Official)
 */
const DEFAULT_CLAUDE_PROVIDER: ClaudeProvider = {
  id: 'default',
  name: 'Claude Official',
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
 * CC Switch Configuration File Service Interface
 */
export interface ICCSwitchSettingsService {
  readonly _serviceBrand: undefined;

  /**
   * Get CC Switch configuration file path
   */
  getConfigPath(): string;

  /**
   * Read full configuration
   */
  readConfig(): Promise<CCSwitchConfig>;

  /**
   * Write full configuration
   */
  writeConfig(config: CCSwitchConfig): Promise<void>;

  /**
   * Get Claude provider list
   */
  getClaudeProviders(): Promise<ClaudeProvider[]>;

  /**
   * Add Claude provider
   * @param provider Provider configuration
   */
  addClaudeProvider(provider: ClaudeProvider): Promise<void>;

  /**
   * Update Claude provider
   * @param id Provider ID
   * @param updates Fields to update
   */
  updateClaudeProvider(id: string, updates: Partial<ClaudeProvider>): Promise<void>;

  /**
   * Delete Claude provider
   * @param id Provider ID
   * @throws If provider does not exist
   */
  deleteClaudeProvider(id: string): Promise<void>;

  /**
   * Switch Claude provider
   * @param id Provider ID
   */
  switchClaudeProvider(id: string): Promise<void>;

  /**
   * Get currently active Claude provider
   */
  getActiveClaudeProvider(): Promise<ClaudeProvider | null>;

  /**
   * Initialize configuration (ensure default provider exists)
   */
  initialize(): Promise<void>;

  /**
   * Backup configuration file
   */
  backupConfig(): Promise<void>;
}

/**
 * CC Switch Configuration File Service Implementation
 */
export class CCSwitchSettingsService implements ICCSwitchSettingsService {
  readonly _serviceBrand: undefined;

  constructor(
    @ILogService private readonly logService: ILogService,
    @IClaudeSettingsService private readonly claudeSettingsService: IClaudeSettingsService
  ) {}

  /**
   * Get CC Switch configuration file path
   */
  getConfigPath(): string {
    const homeDir = os.homedir();
    return path.join(homeDir, '.cc-switch', 'config.json');
  }

  /**
   * Get backup file path
   */
  private getBackupPath(): string {
    const homeDir = os.homedir();
    return path.join(homeDir, '.cc-switch', 'config.json.bak');
  }

  /**
   * Create default provider configuration from ~/.claude/settings.json
   * If settings.json doesn't exist or fails to read, returns hardcoded default configuration
   */
  private async createDefaultProviderFromClaudeSettings(): Promise<ClaudeProvider> {
    try {
      // Try to read Claude settings (full settings.json)
      const settings = await this.claudeSettingsService.readSettings();

      // Check if there's valid configuration
      if (settings.env && (settings.env.ANTHROPIC_AUTH_TOKEN || settings.env.ANTHROPIC_BASE_URL)) {
        this.logService.info('Loading FULL config from ~/.claude/settings.json into provider');

        const baseUrl = settings.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com';

        // Copy all settings.json content to settingsConfig
        return {
          id: 'default',
          name: 'default',
          settingsConfig: { ...settings },  // Copy all settings
          websiteUrl: baseUrl,
          category: 'official',
          createdAt: Date.now()
        };
      }

      // If no valid configuration, return hardcoded defaults
      this.logService.info('No valid config in ~/.claude/settings.json, using hardcoded defaults');
      return DEFAULT_CLAUDE_PROVIDER;
    } catch (error) {
      // Read failed, return hardcoded defaults
      this.logService.warn(`Failed to read Claude settings for default provider: ${error}`);
      return DEFAULT_CLAUDE_PROVIDER;
    }
  }

  /**
   * Read full configuration
   */
  async readConfig(): Promise<CCSwitchConfig> {
    const configPath = this.getConfigPath();

    try {
      // Check if file exists
      if (!fs.existsSync(configPath)) {
        this.logService.warn(`CC Switch config file not found: ${configPath}`);

        // Try to read configuration from ~/.claude/settings.json as default
        const defaultProvider = await this.createDefaultProviderFromClaudeSettings();

        // Return default configuration
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

      // Read file content
      const content = await fs.promises.readFile(configPath, 'utf-8');
      const config = JSON.parse(content) as CCSwitchConfig;

      // Ensure Claude configuration exists
      if (!config.claude) {
        config.claude = {
          providers: {},
          current: ''
        };
      }

      // Ensure providers object exists
      if (!config.claude.providers) {
        config.claude.providers = {};
      }

      this.logService.info(`Successfully read CC Switch config from: ${configPath}`);
      return config;
    } catch (error) {
      this.logService.error(`Failed to read CC Switch config: ${error}`);

      // Try to read configuration from ~/.claude/settings.json as default
      const defaultProvider = await this.createDefaultProviderFromClaudeSettings();

      // Return default configuration
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
   * Write full configuration
   */
  async writeConfig(config: CCSwitchConfig): Promise<void> {
    const configPath = this.getConfigPath();

    try {
      // Ensure directory exists
      const configDir = path.dirname(configPath);
      if (!fs.existsSync(configDir)) {
        await fs.promises.mkdir(configDir, { recursive: true });
        this.logService.info(`Created CC Switch config directory: ${configDir}`);
      }

      // Write file (formatted JSON)
      const content = JSON.stringify(config, null, 2);
      await fs.promises.writeFile(configPath, content, 'utf-8');

      this.logService.info(`Successfully wrote CC Switch config to: ${configPath}`);
    } catch (error) {
      this.logService.error(`Failed to write CC Switch config: ${error}`);
      throw error;
    }
  }

  /**
   * Get Claude provider list
   */
  async getClaudeProviders(): Promise<ClaudeProvider[]> {
    const config = await this.readConfig();
    if (!config.claude || !config.claude.providers) {
      return [];
    }
    return Object.values(config.claude.providers);
  }

  /**
   * Add Claude provider
   */
  async addClaudeProvider(provider: ClaudeProvider): Promise<void> {
    try {
      const config = await this.readConfig();

      // Ensure Claude configuration exists
      if (!config.claude) {
        config.claude = {
          providers: {},
          current: ''
        };
      }

      // Check if ID already exists
      if (config.claude.providers[provider.id]) {
        throw new Error(`Provider with id '${provider.id}' already exists`);
      }

      // Add creation time
      if (!provider.createdAt) {
        provider.createdAt = Date.now();
      }

      // Add provider
      config.claude.providers[provider.id] = provider;

      // If no current provider, set to the newly added one
      if (!config.claude.current) {
        config.claude.current = provider.id;
      }

      // Backup and write configuration
      await this.backupConfig();
      await this.writeConfig(config);

      this.logService.info(`Successfully added Claude provider: ${provider.name} (${provider.id})`);
    } catch (error) {
      this.logService.error(`Failed to add Claude provider: ${error}`);
      throw error;
    }
  }

  /**
   * Update Claude provider
   */
  async updateClaudeProvider(id: string, updates: Partial<ClaudeProvider>): Promise<void> {
    try {
      const config = await this.readConfig();

      if (!config.claude || !config.claude.providers[id]) {
        throw new Error(`Provider with id '${id}' not found`);
      }

      // Don't allow modifying certain fields of the default provider
      if (id === 'default') {
        delete updates.id;
        delete updates.category;
      }

      const existingProvider = config.claude.providers[id];

      // Deep merge settingsConfig to preserve nested properties like permissions
      let mergedSettingsConfig = existingProvider.settingsConfig;
      if (updates.settingsConfig) {
        // Merge env, handle undefined values (delete corresponding key)
        const mergedEnv = { ...existingProvider.settingsConfig?.env };
        if (updates.settingsConfig?.env) {
          for (const [key, value] of Object.entries(updates.settingsConfig.env)) {
            if (value === undefined || value === '') {
              // Delete empty or undefined keys
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

      // Update provider
      config.claude.providers[id] = {
        ...existingProvider,
        ...updates,
        settingsConfig: mergedSettingsConfig,
        id // Keep ID unchanged
      };

      // Backup and write configuration
      await this.backupConfig();
      await this.writeConfig(config);

      this.logService.info(`Successfully updated Claude provider: ${id}`);
    } catch (error) {
      this.logService.error(`Failed to update Claude provider: ${error}`);
      throw error;
    }
  }

  /**
   * Delete Claude provider
   */
  async deleteClaudeProvider(id: string): Promise<void> {
    try {
      const config = await this.readConfig();

      if (!config.claude || !config.claude.providers[id]) {
        throw new Error(`Provider with id '${id}' not found`);
      }

      // Delete provider
      delete config.claude.providers[id];

      // If deleted provider was the currently active one, switch to the first available provider
      if (config.claude.current === id) {
        const remainingProviders = Object.keys(config.claude.providers);
        if (remainingProviders.length > 0) {
          // Switch to the first available provider
          config.claude.current = remainingProviders[0];
          this.logService.info(`Switched to provider: ${config.claude.current}`);
        } else {
          // No remaining providers, set to empty
          config.claude.current = '';
          this.logService.warn('No remaining providers after deletion');
        }
      }

      // Backup and write configuration
      await this.backupConfig();
      await this.writeConfig(config);

      this.logService.info(`Successfully deleted Claude provider: ${id}`);
    } catch (error) {
      this.logService.error(`Failed to delete Claude provider: ${error}`);
      throw error;
    }
  }

  /**
   * Switch Claude provider
   */
  async switchClaudeProvider(id: string): Promise<void> {
    try {
      const config = await this.readConfig();

      if (!config.claude || !config.claude.providers[id]) {
        throw new Error(`Provider with id '${id}' not found`);
      }

      // Update current provider
      config.claude.current = id;

      // Backup and write configuration
      await this.backupConfig();
      await this.writeConfig(config);

      this.logService.info(`Successfully switched to Claude provider: ${id}`);
    } catch (error) {
      this.logService.error(`Failed to switch Claude provider: ${error}`);
      throw error;
    }
  }

  /**
   * Get currently active Claude provider
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
   * Initialize configuration (ensure default provider exists)
   */
  async initialize(): Promise<void> {
    try {
      const config = await this.readConfig();

      let needsSave = false;

      // Ensure version number
      if (!config.version) {
        config.version = 2;
        needsSave = true;
      }

      // Ensure Claude configuration exists
      if (!config.claude) {
        config.claude = {
          providers: {},
          current: ''
        };
        needsSave = true;
      }

      // Ensure providers object exists
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
   * Backup configuration file
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
      // Backup failure should not affect the main flow
    }
  }
}
