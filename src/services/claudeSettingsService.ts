/**
 * Claude Configuration File Service
 * Used to read and write ~/.claude/settings.json
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createDecorator } from '../di/instantiation';
import { ILogService } from './logService';

export const IClaudeSettingsService = createDecorator<IClaudeSettingsService>('claudeSettingsService');

/**
 * Claude Configuration Structure (Dynamic ~/.claude/settings.json)
 * Entirely dynamic, does not hardcode any fields
 */
export interface ClaudeSettings {
  /** Environment Variables - only field needing special handling */
  env?: Record<string, string | undefined>;
  /** Any other configuration - dynamically read from settings.json */
  [key: string]: any;
}

/**
 * Claude Configuration File Service Interface
 */
export interface IClaudeSettingsService {
  readonly _serviceBrand: undefined;

  /**
   * Get Claude configuration file path
   */
  getSettingsPath(): string;

  /**
   * Read Claude configuration
   */
  readSettings(): Promise<ClaudeSettings>;

  /**
   * Write Claude configuration
   */
  writeSettings(settings: ClaudeSettings): Promise<void>;

  /**
   * Update provider configuration
   * @param env Environment variable configuration object
   */
  updateProvider(env: Record<string, string | undefined>): Promise<void>;

  /**
   * Get current provider configuration
   */
  getCurrentProvider(): Promise<{ apiKey: string; baseUrl: string }>;
}

/**
 * Claude Configuration File Service Implementation
 */
export class ClaudeSettingsService implements IClaudeSettingsService {
  readonly _serviceBrand: undefined;

  constructor(
    @ILogService private readonly logService: ILogService
  ) { }

  /**
   * Get Claude configuration file path
   */
  getSettingsPath(): string {
    const homeDir = os.homedir();
    return path.join(homeDir, '.claude', 'settings.json');
  }

  /**
   * Read Claude configuration
   */
  async readSettings(): Promise<ClaudeSettings> {
    const settingsPath = this.getSettingsPath();

    try {
      // Check if file exists
      if (!fs.existsSync(settingsPath)) {
        this.logService.warn(`Claude settings file not found: ${settingsPath}`);
        return { env: {} };
      }

      // Read file content (preserving all fields)
      const content = await fs.promises.readFile(settingsPath, 'utf-8');
      const settings = JSON.parse(content) as ClaudeSettings;

      // Ensure env object exists
      if (!settings.env) {
        settings.env = {};
      }

      this.logService.info(`Successfully read Claude settings from: ${settingsPath}`);
      return settings;
    } catch (error) {
      this.logService.error(`Failed to read Claude settings: ${error}`);
      return { env: {} };
    }
  }

  /**
   * Write Claude configuration
   */
  async writeSettings(settings: ClaudeSettings): Promise<void> {
    const settingsPath = this.getSettingsPath();

    try {
      // Ensure directory exists
      const settingsDir = path.dirname(settingsPath);
      if (!fs.existsSync(settingsDir)) {
        await fs.promises.mkdir(settingsDir, { recursive: true });
        this.logService.info(`Created Claude settings directory: ${settingsDir}`);
      }

      // Write file (formatted JSON)
      const content = JSON.stringify(settings, null, 2);
      await fs.promises.writeFile(settingsPath, content, 'utf-8');

      this.logService.info(`Successfully wrote Claude settings to: ${settingsPath}`);
    } catch (error) {
      this.logService.error(`Failed to write Claude settings: ${error}`);
      throw error;
    }
  }

  /**
   * Update provider configuration
   */
  async updateProvider(env: Record<string, string | undefined>): Promise<void> {
    try {
      // Read current configuration
      const settings = await this.readSettings();

      // Update environment variables - merge new env into existing configuration
      settings.env = settings.env || {};

      // Iterate over new env object, update or delete values
      for (const [key, value] of Object.entries(env)) {
        if (value !== undefined && value !== '') {
          settings.env[key] = value;
        } else {
          // If value is empty or undefined, delete the key
          delete settings.env[key];
        }
      }

      // Save back to configuration file
      await this.writeSettings(settings);

      this.logService.info(`Successfully updated Claude provider settings`);
    } catch (error) {
      this.logService.error(`Failed to update Claude provider: ${error}`);
      throw error;
    }
  }

  /**
   * Get current provider configuration
   */
  async getCurrentProvider(): Promise<{ apiKey: string; baseUrl: string }> {
    try {
      const settings = await this.readSettings();
      return {
        apiKey: settings.env?.ANTHROPIC_AUTH_TOKEN || '',
        baseUrl: settings.env?.ANTHROPIC_BASE_URL || ''
      };
    } catch (error) {
      this.logService.error(`Failed to get current provider: ${error}`);
      return { apiKey: '', baseUrl: '' };
    }
  }
}
