/**
 * Claude 配置文件服务
 * 用于读写 ~/.claude/settings.json
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createDecorator } from '../di/instantiation';
import { ILogService } from './logService';

export const IClaudeSettingsService = createDecorator<IClaudeSettingsService>('claudeSettingsService');

/**
 * Claude 配置结构
 */
export interface ClaudeSettings {
  env: {
    ANTHROPIC_AUTH_TOKEN?: string;
    ANTHROPIC_BASE_URL?: string;
    [key: string]: string | undefined;
  };
}

/**
 * Claude 配置文件服务接口
 */
export interface IClaudeSettingsService {
  readonly _serviceBrand: undefined;

  /**
   * 获取 Claude 配置文件路径
   */
  getSettingsPath(): string;

  /**
   * 读取 Claude 配置
   */
  readSettings(): Promise<ClaudeSettings>;

  /**
   * 写入 Claude 配置
   */
  writeSettings(settings: ClaudeSettings): Promise<void>;

  /**
   * 更新供应商配置
   * @param env 环境变量配置对象
   */
  updateProvider(env: Record<string, string | undefined>): Promise<void>;

  /**
   * 获取当前供应商配置
   */
  getCurrentProvider(): Promise<{ apiKey: string; baseUrl: string }>;
}

/**
 * Claude 配置文件服务实现
 */
export class ClaudeSettingsService implements IClaudeSettingsService {
  readonly _serviceBrand: undefined;

  constructor(
    @ILogService private readonly logService: ILogService
  ) {}

  /**
   * 获取 Claude 配置文件路径
   */
  getSettingsPath(): string {
    const homeDir = os.homedir();
    return path.join(homeDir, '.claude', 'settings.json');
  }

  /**
   * 读取 Claude 配置
   */
  async readSettings(): Promise<ClaudeSettings> {
    const settingsPath = this.getSettingsPath();

    try {
      // 检查文件是否存在
      if (!fs.existsSync(settingsPath)) {
        this.logService.warn(`Claude settings file not found: ${settingsPath}`);
        return { env: {} };
      }

      // 读取文件内容
      const content = await fs.promises.readFile(settingsPath, 'utf-8');
      const settings = JSON.parse(content) as ClaudeSettings;

      this.logService.info(`Successfully read Claude settings from: ${settingsPath}`);
      return settings;
    } catch (error) {
      this.logService.error(`Failed to read Claude settings: ${error}`);
      return { env: {} };
    }
  }

  /**
   * 写入 Claude 配置
   */
  async writeSettings(settings: ClaudeSettings): Promise<void> {
    const settingsPath = this.getSettingsPath();

    try {
      // 确保目录存在
      const settingsDir = path.dirname(settingsPath);
      if (!fs.existsSync(settingsDir)) {
        await fs.promises.mkdir(settingsDir, { recursive: true });
        this.logService.info(`Created Claude settings directory: ${settingsDir}`);
      }

      // 写入文件（格式化 JSON）
      const content = JSON.stringify(settings, null, 2);
      await fs.promises.writeFile(settingsPath, content, 'utf-8');

      this.logService.info(`Successfully wrote Claude settings to: ${settingsPath}`);
    } catch (error) {
      this.logService.error(`Failed to write Claude settings: ${error}`);
      throw error;
    }
  }

  /**
   * 更新供应商配置
   */
  async updateProvider(env: Record<string, string | undefined>): Promise<void> {
    try {
      // 读取当前配置
      const settings = await this.readSettings();

      // 更新环境变量 - 合并新的 env 到现有配置
      settings.env = settings.env || {};
      
      // 遍历新的 env 对象，更新或删除值
      for (const [key, value] of Object.entries(env)) {
        if (value !== undefined && value !== '') {
          settings.env[key] = value;
        } else {
          // 如果值为空或 undefined，删除该 key
          delete settings.env[key];
        }
      }

      // 写回配置文件
      await this.writeSettings(settings);

      this.logService.info(`Successfully updated Claude provider settings`);
    } catch (error) {
      this.logService.error(`Failed to update Claude provider: ${error}`);
      throw error;
    }
  }

  /**
   * 获取当前供应商配置
   */
  async getCurrentProvider(): Promise<{ apiKey: string; baseUrl: string }> {
    try {
      const settings = await this.readSettings();
      return {
        apiKey: settings.env.ANTHROPIC_AUTH_TOKEN || '',
        baseUrl: settings.env.ANTHROPIC_BASE_URL || ''
      };
    } catch (error) {
      this.logService.error(`Failed to get current provider: ${error}`);
      return { apiKey: '', baseUrl: '' };
    }
  }
}
