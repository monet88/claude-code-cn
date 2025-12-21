/**
 * Agents Service
 *
 * Manages Agents import, deletion, listing, etc.
 *
 * Agents storage locations:
 * - Global: ~/.claude/agents
 * - Local: {workspace}/.claude/agents
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createDecorator } from '../di/instantiation';
import { ILogService } from './logService';
import type { Agent, AgentsMap, AgentsConfig, AgentType, AgentScope } from '../shared/types/agent';

export const IAgentConfigService = createDecorator<IAgentConfigService>('agentConfigService');

/**
 * Agent Service Interface
 */
export interface IAgentConfigService {
  readonly _serviceBrand: undefined;

  /**
   * Get global Agents directory
   */
  getGlobalAgentsDir(): string;

  /**
   * Get local Agents directory
   * @param workspaceRoot Workspace root directory
   */
  getLocalAgentsDir(workspaceRoot?: string): string | null;

  /**
   * Get all Agents (global + local)
   * @param workspaceRoot Workspace root directory
   */
  getAllAgents(workspaceRoot?: string): Promise<AgentsConfig>;

  /**
   * Get Agents by specified scope
   * @param scope Scope
   * @param workspaceRoot Workspace root directory (required when scope is local)
   */
  getAgentsByScope(scope: AgentScope, workspaceRoot?: string): Promise<AgentsMap>;

  /**
   * Import Agent (copy files/folders to Agents directory)
   * @param sourcePath Source file/folder path
   * @param scope Scope
   * @param workspaceRoot Workspace root directory (required when scope is local)
   */
  importAgent(sourcePath: string, scope: AgentScope, workspaceRoot?: string): Promise<Agent>;

  /**
   * Delete Agent
   * @param id Agent ID
   * @param scope Scope
   * @param workspaceRoot Workspace root directory (required when scope is local)
   */
  deleteAgent(id: string, scope: AgentScope, workspaceRoot?: string): Promise<boolean>;

  /**
   * Open Agent in editor
   * @param agentPath Agent path
   */
  openAgentInEditor(agentPath: string): Promise<void>;
}

/**
 * Agents Service Implementation
 */
export class AgentConfigService implements IAgentConfigService {
  readonly _serviceBrand: undefined;

  constructor(
    @ILogService private readonly logService: ILogService
  ) { }

  /**
   * Get global Agents directory
   */
  getGlobalAgentsDir(): string {
    const homeDir = os.homedir();
    return path.join(homeDir, '.claude', 'agents');
  }

  /**
   * Get local Agents directory
   */
  getLocalAgentsDir(workspaceRoot?: string): string | null {
    if (!workspaceRoot) {
      return null;
    }
    return path.join(workspaceRoot, '.claude', 'agents');
  }

  /**
   * Extract description from agent.md file
   */
  private async extractDescription(agentPath: string, isDirectory: boolean): Promise<string | undefined> {
    try {
      // If directory, search for agent.md file
      const mdPath = isDirectory
        ? path.join(agentPath, 'agent.md')
        : agentPath.endsWith('.md') ? agentPath : null;

      if (!mdPath || !fs.existsSync(mdPath)) {
        return undefined;
      }

      const content = await fs.promises.readFile(mdPath, 'utf-8');

      // Extract description from YAML frontmatter
      const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
      if (frontmatterMatch) {
        const frontmatter = frontmatterMatch[1];
        const descMatch = frontmatter.match(/description:\s*(.+?)(?:\n[a-z-]+:|$)/s);
        if (descMatch) {
          return descMatch[1].trim();
        }
      }

      return undefined;
    } catch (error) {
      this.logService.warn(`[Agents] Failed to extract description: ${error}`);
      return undefined;
    }
  }

  /**
   * Scan directory to get Agents
   */
  private async scanAgentsDirectory(dir: string, scope: AgentScope): Promise<AgentsMap> {
    const agents: AgentsMap = {};

    this.logService.info(`[Agents] Scanning ${scope} directory: ${dir}`);

    try {
      // Ensure directory exists
      if (!fs.existsSync(dir)) {
        this.logService.info(`[Agents] ${scope} Agents directory does not exist: ${dir}`);
        return agents;
      }

      this.logService.info(`[Agents] Directory exists, starting reading...`);
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      this.logService.info(`[Agents] Found ${entries.length} items`);

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const stats = await fs.promises.stat(fullPath);

        // Skip hidden files/folders
        if (entry.name.startsWith('.')) {
          continue;
        }

        const type: AgentType = entry.isDirectory() ? 'directory' : 'file';
        const id = `${scope}-${entry.name}`;

        // Extract description
        const description = await this.extractDescription(fullPath, entry.isDirectory());

        agents[id] = {
          id,
          name: entry.name,
          type,
          scope,
          path: fullPath,
          description,
          createdAt: stats.birthtime.toISOString(),
          modifiedAt: stats.mtime.toISOString(),
        };
      }

      this.logService.info(`[Agents] Got ${Object.keys(agents).length} Agents from ${scope} directory: ${dir}`);
    } catch (error) {
      this.logService.error(`[Agents] Failed to scan ${scope} Agents directory: ${error}`);
    }

    return agents;
  }

  /**
   * Get all Agents
   */
  async getAllAgents(workspaceRoot?: string): Promise<AgentsConfig> {
    this.logService.info(`[Agents] getAllAgents called, workspaceRoot: ${workspaceRoot}`);
    this.logService.info(`[Agents] Global agents dir: ${this.getGlobalAgentsDir()}`);

    const global = await this.getAgentsByScope('global');
    this.logService.info(`[Agents] Global agents count: ${Object.keys(global).length}`);

    const local = await this.getAgentsByScope('local', workspaceRoot);
    this.logService.info(`[Agents] Local agents count: ${Object.keys(local).length}`);

    return { global, local };
  }

  /**
   * Get Agents by specified scope
   */
  async getAgentsByScope(scope: AgentScope, workspaceRoot?: string): Promise<AgentsMap> {
    const dir = scope === 'global'
      ? this.getGlobalAgentsDir()
      : this.getLocalAgentsDir(workspaceRoot);

    if (!dir) {
      this.logService.warn(`[Agents] Unable to get ${scope} Agents directory`);
      return {};
    }

    return await this.scanAgentsDirectory(dir, scope);
  }

  /**
   * Copy file or directory
   */
  private async copyRecursive(src: string, dest: string): Promise<void> {
    const stats = await fs.promises.stat(src);

    if (stats.isDirectory()) {
      // Create destination directory
      await fs.promises.mkdir(dest, { recursive: true });

      // Copy directory contents
      const entries = await fs.promises.readdir(src, { withFileTypes: true });
      for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        await this.copyRecursive(srcPath, destPath);
      }
    } else {
      // Copy file
      await fs.promises.copyFile(src, dest);
    }
  }

  /**
   * Delete file or directory
   */
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

  /**
   * Import Agent
   */
  async importAgent(sourcePath: string, scope: AgentScope, workspaceRoot?: string): Promise<Agent> {
    // Validate source path
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Source path does not exist: ${sourcePath}`);
    }

    // Get target directory
    const targetDir = scope === 'global'
      ? this.getGlobalAgentsDir()
      : this.getLocalAgentsDir(workspaceRoot);

    if (!targetDir) {
      throw new Error(`Unable to get ${scope} Agents directory`);
    }

    // Ensure target directory exists
    if (!fs.existsSync(targetDir)) {
      await fs.promises.mkdir(targetDir, { recursive: true });
      this.logService.info(`[Agents] Created ${scope} Agents directory: ${targetDir}`);
    }

    // Get file/folder name
    const name = path.basename(sourcePath);
    const targetPath = path.join(targetDir, name);

    // Check if Agent with the same name already exists
    if (fs.existsSync(targetPath)) {
      throw new Error(`Agent with the same name already exists: ${name}`);
    }

    // Copy file/folder
    try {
      await this.copyRecursive(sourcePath, targetPath);
      this.logService.info(`[Agents] Successfully imported ${scope} Agent: ${name}`);
    } catch (error) {
      this.logService.error(`[Agents] Failed to import Agent: ${error}`);
      throw new Error(`Import failed: ${error}`);
    }

    // Get file information
    const stats = await fs.promises.stat(targetPath);
    const type: AgentType = stats.isDirectory() ? 'directory' : 'file';
    const id = `${scope}-${name}`;

    // Extract description
    const description = await this.extractDescription(targetPath, stats.isDirectory());

    return {
      id,
      name,
      type,
      scope,
      path: targetPath,
      description,
      createdAt: stats.birthtime.toISOString(),
      modifiedAt: stats.mtime.toISOString(),
    };
  }

  /**
   * Delete Agent
   */
  async deleteAgent(id: string, scope: AgentScope, workspaceRoot?: string): Promise<boolean> {
    // Get target directory
    const dir = scope === 'global'
      ? this.getGlobalAgentsDir()
      : this.getLocalAgentsDir(workspaceRoot);

    if (!dir) {
      this.logService.warn(`[Agents] Unable to get ${scope} Agents directory`);
      return false;
    }

    // Extract name from ID (format: {scope}-{name})
    const name = id.replace(`${scope}-`, '');
    const targetPath = path.join(dir, name);

    // Validate path exists
    if (!fs.existsSync(targetPath)) {
      this.logService.warn(`[Agents] Agent does not exist: ${targetPath}`);
      return false;
    }

    // Delete file/folder
    try {
      await this.removeRecursive(targetPath);
      this.logService.info(`[Agents] Successfully deleted ${scope} Agent: ${name}`);
      return true;
    } catch (error) {
      this.logService.error(`[Agents] Failed to delete Agent: ${error}`);
      throw new Error(`Deletion failed: ${error}`);
    }
  }

  /**
   * Open Agent in editor
   */
  async openAgentInEditor(agentPath: string): Promise<void> {
    this.logService.info(`[Agents] Requested to open in editor: ${agentPath}`);
  }
}
