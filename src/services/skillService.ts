/**
 * Skills Service
 *
 * Manages importing, deleting, and listing Skills
 *
 * Skill storage locations:
 * - Global: ~/.claude/skills
 * - Local: {workspace}/.claude/skills
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createDecorator } from '../di/instantiation';
import { ILogService } from './logService';
import type { Skill, SkillsMap, SkillsConfig, SkillType, SkillScope } from '../shared/types/skill';

export const ISkillService = createDecorator<ISkillService>('skillService');

/**
 * Skill Service Interface
 */
export interface ISkillService {
  readonly _serviceBrand: undefined;

  /**
   * Get global Skills directory
   */
  getGlobalSkillsDir(): string;

  /**
   * Get local Skills directory
   * @param workspaceRoot Workspace root directory
   */
  getLocalSkillsDir(workspaceRoot?: string): string | null;

  /**
   * Get all Skills (Global + Local)
   * @param workspaceRoot Workspace root directory
   */
  getAllSkills(workspaceRoot?: string): Promise<SkillsConfig>;

  /**
   * Get Skills by scope
   * @param scope Scope
   * @param workspaceRoot Workspace root directory (required when scope is 'local')
   */
  getSkillsByScope(scope: SkillScope, workspaceRoot?: string): Promise<SkillsMap>;

  /**
   * Import Skill (copy file/folder to Skills directory)
   * @param sourcePath Source file/folder path
   * @param scope Scope
   * @param workspaceRoot Workspace root directory (required when scope is 'local')
   */
  importSkill(sourcePath: string, scope: SkillScope, workspaceRoot?: string): Promise<Skill>;

  /**
   * Delete Skill
   * @param id Skill ID
   * @param scope Scope
   * @param workspaceRoot Workspace root directory (required when scope is 'local')
   */
  deleteSkill(id: string, scope: SkillScope, workspaceRoot?: string): Promise<boolean>;

  /**
   * Open Skill in editor
   * @param skillPath Skill path
   */
  openSkillInEditor(skillPath: string): Promise<void>;
}

/**
 * Skill Service Implementation
 */
export class SkillService implements ISkillService {
  readonly _serviceBrand: undefined;

  constructor(
    @ILogService private readonly logService: ILogService
  ) { }

  /**
   * Get global Skills directory
   */
  getGlobalSkillsDir(): string {
    const homeDir = os.homedir();
    return path.join(homeDir, '.claude', 'skills');
  }

  /**
   * Get local Skills directory
   */
  getLocalSkillsDir(workspaceRoot?: string): string | null {
    if (!workspaceRoot) {
      return null;
    }
    return path.join(workspaceRoot, '.claude', 'skills');
  }

  /**
   * Extract description from skill.md file
   */
  private async extractDescription(skillPath: string, isDirectory: boolean): Promise<string | undefined> {
    try {
      // If a directory, look for skill.md file
      const mdPath = isDirectory
        ? path.join(skillPath, 'skill.md')
        : skillPath.endsWith('.md') ? skillPath : null;

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
      this.logService.warn(`[Skills] Failed to extract description: ${error}`);
      return undefined;
    }
  }

  /**
   * Scan directory for Skills
   */
  private async scanSkillsDirectory(dir: string, scope: SkillScope): Promise<SkillsMap> {
    const skills: SkillsMap = {};

    try {
      // Ensure directory exists
      if (!fs.existsSync(dir)) {
        this.logService.info(`[Skills] ${scope} Skills directory does not exist: ${dir}`);
        return skills;
      }

      const entries = await fs.promises.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const stats = await fs.promises.stat(fullPath);

        // Skip hidden files/folders
        if (entry.name.startsWith('.')) {
          continue;
        }

        const type: SkillType = entry.isDirectory() ? 'directory' : 'file';
        const id = `${scope}-${entry.name}`;

        // Extract description
        const description = await this.extractDescription(fullPath, entry.isDirectory());

        skills[id] = {
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

      this.logService.info(`[Skills] Obtained ${Object.keys(skills).length} Skills from ${scope} directory: ${dir}`);
    } catch (error) {
      this.logService.error(`[Skills] Failed to scan ${scope} Skills directory: ${error}`);
    }

    return skills;
  }

  /**
   * Get all Skills
   */
  async getAllSkills(workspaceRoot?: string): Promise<SkillsConfig> {
    const global = await this.getSkillsByScope('global');
    const local = await this.getSkillsByScope('local', workspaceRoot);

    return { global, local };
  }

  /**
   * Get Skills by scope
   */
  async getSkillsByScope(scope: SkillScope, workspaceRoot?: string): Promise<SkillsMap> {
    const dir = scope === 'global'
      ? this.getGlobalSkillsDir()
      : this.getLocalSkillsDir(workspaceRoot);

    if (!dir) {
      this.logService.warn(`[Skills] Unable to get ${scope} Skills directory`);
      return {};
    }

    return await this.scanSkillsDirectory(dir, scope);
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
   * Import Skill
   */
  async importSkill(sourcePath: string, scope: SkillScope, workspaceRoot?: string): Promise<Skill> {
    // Validate source path
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Source path does not exist: ${sourcePath}`);
    }

    // Get target directory
    const targetDir = scope === 'global'
      ? this.getGlobalSkillsDir()
      : this.getLocalSkillsDir(workspaceRoot);

    if (!targetDir) {
      throw new Error(`Unable to get ${scope} Skills directory`);
    }

    // Ensure target directory exists
    if (!fs.existsSync(targetDir)) {
      await fs.promises.mkdir(targetDir, { recursive: true });
      this.logService.info(`[Skills] Created ${scope} Skills directory: ${targetDir}`);
    }

    // Get file/folder name
    const name = path.basename(sourcePath);
    const targetPath = path.join(targetDir, name);

    // Check if Skill with same name already exists
    if (fs.existsSync(targetPath)) {
      throw new Error(`Skill with the same name already exists: ${name}`);
    }

    // Copy file/folder
    try {
      await this.copyRecursive(sourcePath, targetPath);
      this.logService.info(`[Skills] Successfully imported ${scope} Skill: ${name}`);
    } catch (error) {
      this.logService.error(`[Skills] Failed to import Skill: ${error}`);
      throw new Error(`Import failed: ${error}`);
    }

    // Get file info
    const stats = await fs.promises.stat(targetPath);
    const type: SkillType = stats.isDirectory() ? 'directory' : 'file';
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
   * Delete Skill
   */
  async deleteSkill(id: string, scope: SkillScope, workspaceRoot?: string): Promise<boolean> {
    // Get target directory
    const dir = scope === 'global'
      ? this.getGlobalSkillsDir()
      : this.getLocalSkillsDir(workspaceRoot);

    if (!dir) {
      this.logService.warn(`[Skills] Unable to get ${scope} Skills directory`);
      return false;
    }

    // Extract name from ID (format: {scope}-{name})
    const name = id.replace(`${scope}-`, '');
    const targetPath = path.join(dir, name);

    // Validate path existence
    if (!fs.existsSync(targetPath)) {
      this.logService.warn(`[Skills] Skill does not exist: ${targetPath}`);
      return false;
    }

    // Delete file/folder
    try {
      await this.removeRecursive(targetPath);
      this.logService.info(`[Skills] Successfully deleted ${scope} Skill: ${name}`);
      return true;
    } catch (error) {
      this.logService.error(`[Skills] Failed to delete Skill: ${error}`);
      throw new Error(`Delete failed: ${error}`);
    }
  }

  /**
   * Open Skill in editor
   */
  async openSkillInEditor(skillPath: string): Promise<void> {
    // This method needs to open the file via VSCode API at the call site
    // Actual implementation will be completed at the call site
    this.logService.info(`[Skills] Request to open in editor: ${skillPath}`);
  }
}
