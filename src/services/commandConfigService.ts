/**
 * Commands Service
 *
 * Manages Slash Commands import, deletion, listing, etc.
 *
 * Commands storage locations:
 * - Global: ~/.claude/commands
 * - Local: {workspace}/.claude/commands
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createDecorator } from '../di/instantiation';
import { ILogService } from './logService';
import type { Command, CommandsMap, CommandsConfig, CommandType, CommandScope } from '../shared/types/command';

export const ICommandConfigService = createDecorator<ICommandConfigService>('commandConfigService');

/**
 * Command Service Interface
 */
export interface ICommandConfigService {
  readonly _serviceBrand: undefined;

  getGlobalCommandsDir(): string;
  getLocalCommandsDir(workspaceRoot?: string): string | null;
  getAllCommands(workspaceRoot?: string): Promise<CommandsConfig>;
  getCommandsByScope(scope: CommandScope, workspaceRoot?: string): Promise<CommandsMap>;
  importCommand(sourcePath: string, scope: CommandScope, workspaceRoot?: string): Promise<Command>;
  deleteCommand(id: string, scope: CommandScope, workspaceRoot?: string): Promise<boolean>;
  openCommand(commandPath: string): Promise<void>;
}

/**
 * Commands Service Implementation
 */
export class CommandConfigService implements ICommandConfigService {
  readonly _serviceBrand: undefined;

  constructor(
    @ILogService private readonly logService: ILogService
  ) { }

  getGlobalCommandsDir(): string {
    const homeDir = os.homedir();
    return path.join(homeDir, '.claude', 'commands');
  }

  getLocalCommandsDir(workspaceRoot?: string): string | null {
    if (!workspaceRoot) {
      return null;
    }
    return path.join(workspaceRoot, '.claude', 'commands');
  }

  private async extractMetadata(commandPath: string, isDirectory: boolean): Promise<{ description?: string; argumentHint?: string }> {
    try {
      const mdPath = isDirectory
        ? path.join(commandPath, 'command.md')
        : commandPath.endsWith('.md') ? commandPath : null;

      if (!mdPath || !fs.existsSync(mdPath)) {
        return {};
      }

      const content = await fs.promises.readFile(mdPath, 'utf-8');

      const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
      if (frontmatterMatch) {
        const frontmatter = frontmatterMatch[1];

        const descMatch = frontmatter.match(/description:\s*(.+?)(?:\n[a-z-]+:|$)/s);
        const argHintMatch = frontmatter.match(/argument-hint:\s*(.+?)(?:\n[a-z-]+:|$)/s);

        return {
          description: descMatch ? descMatch[1].trim() : undefined,
          argumentHint: argHintMatch ? argHintMatch[1].trim() : undefined,
        };
      }

      return {};
    } catch (error) {
      this.logService.warn(`[Commands] Failed to extract metadata: ${error}`);
      return {};
    }
  }

  private async scanCommandsDirectory(dir: string, scope: CommandScope): Promise<CommandsMap> {
    const commands: CommandsMap = {};

    this.logService.info(`[Commands] Scanning ${scope} directory: ${dir}`);

    try {
      if (!fs.existsSync(dir)) {
        this.logService.info(`[Commands] ${scope} Commands directory does not exist: ${dir}`);
        return commands;
      }

      this.logService.info(`[Commands] Directory exists, starting reading...`);
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      this.logService.info(`[Commands] Found ${entries.length} items`);

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const stats = await fs.promises.stat(fullPath);

        if (entry.name.startsWith('.')) {
          continue;
        }

        // Skip symlinks that might be broken
        if (entry.isSymbolicLink()) {
          try {
            await fs.promises.access(fullPath);
          } catch {
            this.logService.warn(`[Commands] Skipping invalid symbolic link: ${fullPath}`);
            continue;
          }
        }

        const type: CommandType = entry.isDirectory() ? 'directory' : 'file';
        const baseName = entry.name.replace(/\.md$/, '');
        const id = `${scope}-${baseName}`;

        const metadata = await this.extractMetadata(fullPath, entry.isDirectory());

        commands[id] = {
          id,
          name: baseName,
          type,
          scope,
          path: fullPath,
          description: metadata.description,
          argumentHint: metadata.argumentHint,
          createdAt: stats.birthtime.toISOString(),
          modifiedAt: stats.mtime.toISOString(),
        };
      }

      this.logService.info(`[Commands] Got ${Object.keys(commands).length} Commands from ${scope} directory: ${dir}`);
    } catch (error) {
      this.logService.error(`[Commands] Failed to scan ${scope} Commands directory: ${error}`);
    }

    return commands;
  }

  async getAllCommands(workspaceRoot?: string): Promise<CommandsConfig> {
    this.logService.info(`[Commands] getAllCommands called, workspaceRoot: ${workspaceRoot}`);
    this.logService.info(`[Commands] Global commands dir: ${this.getGlobalCommandsDir()}`);

    const global = await this.getCommandsByScope('global');
    this.logService.info(`[Commands] Global commands count: ${Object.keys(global).length}`);

    const local = await this.getCommandsByScope('local', workspaceRoot);
    this.logService.info(`[Commands] Local commands count: ${Object.keys(local).length}`);

    return { global, local };
  }

  async getCommandsByScope(scope: CommandScope, workspaceRoot?: string): Promise<CommandsMap> {
    const dir = scope === 'global'
      ? this.getGlobalCommandsDir()
      : this.getLocalCommandsDir(workspaceRoot);

    if (!dir) {
      this.logService.warn(`[Commands] Unable to get ${scope} Commands directory`);
      return {};
    }

    return await this.scanCommandsDirectory(dir, scope);
  }

  private async copyRecursive(src: string, dest: string): Promise<void> {
    const stats = await fs.promises.stat(src);

    if (stats.isDirectory()) {
      await fs.promises.mkdir(dest, { recursive: true });
      const entries = await fs.promises.readdir(src, { withFileTypes: true });
      for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        await this.copyRecursive(srcPath, destPath);
      }
    } else {
      await fs.promises.copyFile(src, dest);
    }
  }

  private async removeRecursive(targetPath: string): Promise<void> {
    const stats = await fs.promises.stat(targetPath);

    if (stats.isDirectory()) {
      const entries = await fs.promises.readdir(targetPath);
      for (const entry of entries) {
        await this.removeRecursive(path.join(targetPath, entry));
      }
      await fs.promises.rmdir(targetPath);
    } else {
      await fs.promises.unlink(targetPath);
    }
  }

  async importCommand(sourcePath: string, scope: CommandScope, workspaceRoot?: string): Promise<Command> {
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Source path does not exist: ${sourcePath}`);
    }

    const targetDir = scope === 'global'
      ? this.getGlobalCommandsDir()
      : this.getLocalCommandsDir(workspaceRoot);

    if (!targetDir) {
      throw new Error(`Unable to get ${scope} Commands directory`);
    }

    if (!fs.existsSync(targetDir)) {
      await fs.promises.mkdir(targetDir, { recursive: true });
    }

    const name = path.basename(sourcePath);
    const targetPath = path.join(targetDir, name);

    if (fs.existsSync(targetPath)) {
      throw new Error(`Command already exists: ${name}`);
    }

    try {
      await this.copyRecursive(sourcePath, targetPath);
      this.logService.info(`[Commands] Successfully imported ${scope} Command: ${name}`);
    } catch (error) {
      this.logService.error(`[Commands] Failed to import Command: ${error}`);
      throw new Error(`Import failed: ${error}`);
    }

    const stats = await fs.promises.stat(targetPath);
    const type: CommandType = stats.isDirectory() ? 'directory' : 'file';
    const baseName = name.replace(/\.md$/, '');
    const id = `${scope}-${baseName}`;
    const metadata = await this.extractMetadata(targetPath, stats.isDirectory());

    return {
      id,
      name: baseName,
      type,
      scope,
      path: targetPath,
      description: metadata.description,
      argumentHint: metadata.argumentHint,
      createdAt: stats.birthtime.toISOString(),
      modifiedAt: stats.mtime.toISOString(),
    };
  }

  async deleteCommand(id: string, scope: CommandScope, workspaceRoot?: string): Promise<boolean> {
    const dir = scope === 'global'
      ? this.getGlobalCommandsDir()
      : this.getLocalCommandsDir(workspaceRoot);

    if (!dir) {
      this.logService.warn(`[Commands] Unable to get ${scope} Commands directory`);
      return false;
    }

    const commands = await this.scanCommandsDirectory(dir, scope);
    const command = commands[id];

    if (!command) {
      this.logService.warn(`[Commands] Command not found: ${id}`);
      return false;
    }

    try {
      await this.removeRecursive(command.path);
      this.logService.info(`[Commands] Successfully deleted ${scope} Command: ${command.name}`);
      return true;
    } catch (error) {
      this.logService.error(`[Commands] Failed to delete Command: ${error}`);
      return false;
    }
  }

  async openCommand(commandPath: string): Promise<void> {
    this.logService.info(`[Commands] Open Command: ${commandPath}`);
  }
}
