/**
 * Skills 服务
 *
 * 管理 Skills 的导入、删除、列表等功能
 *
 * Skills 存储位置:
 * - 全局: ~/.claude/skills
 * - 本地: {workspace}/.claude/skills
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createDecorator } from '../di/instantiation';
import { ILogService } from './logService';
import type { Skill, SkillsMap, SkillsConfig, SkillType, SkillScope } from '../shared/types/skill';

export const ISkillService = createDecorator<ISkillService>('skillService');

/**
 * Skill 服务接口
 */
export interface ISkillService {
  readonly _serviceBrand: undefined;

  /**
   * 获取全局 Skills 目录
   */
  getGlobalSkillsDir(): string;

  /**
   * 获取本地 Skills 目录
   * @param workspaceRoot 工作区根目录
   */
  getLocalSkillsDir(workspaceRoot?: string): string | null;

  /**
   * 获取所有 Skills (全局 + 本地)
   * @param workspaceRoot 工作区根目录
   */
  getAllSkills(workspaceRoot?: string): Promise<SkillsConfig>;

  /**
   * 获取指定作用域的 Skills
   * @param scope 作用域
   * @param workspaceRoot 工作区根目录 (scope 为 local 时必需)
   */
  getSkillsByScope(scope: SkillScope, workspaceRoot?: string): Promise<SkillsMap>;

  /**
   * 导入 Skill (复制文件/文件夹到 Skills 目录)
   * @param sourcePath 源文件/文件夹路径
   * @param scope 作用域
   * @param workspaceRoot 工作区根目录 (scope 为 local 时必需)
   */
  importSkill(sourcePath: string, scope: SkillScope, workspaceRoot?: string): Promise<Skill>;

  /**
   * 删除 Skill
   * @param id Skill ID
   * @param scope 作用域
   * @param workspaceRoot 工作区根目录 (scope 为 local 时必需)
   */
  deleteSkill(id: string, scope: SkillScope, workspaceRoot?: string): Promise<boolean>;

  /**
   * 在编辑器中打开 Skill
   * @param skillPath Skill 路径
   */
  openSkillInEditor(skillPath: string): Promise<void>;
}

/**
 * Skills 服务实现
 */
export class SkillService implements ISkillService {
  readonly _serviceBrand: undefined;

  constructor(
    @ILogService private readonly logService: ILogService
  ) {}

  /**
   * 获取全局 Skills 目录
   */
  getGlobalSkillsDir(): string {
    const homeDir = os.homedir();
    return path.join(homeDir, '.claude', 'skills');
  }

  /**
   * 获取本地 Skills 目录
   */
  getLocalSkillsDir(workspaceRoot?: string): string | null {
    if (!workspaceRoot) {
      return null;
    }
    return path.join(workspaceRoot, '.claude', 'skills');
  }

  /**
   * 从 skill.md 文件中提取 description
   */
  private async extractDescription(skillPath: string, isDirectory: boolean): Promise<string | undefined> {
    try {
      // 如果是目录，查找 skill.md 文件
      const mdPath = isDirectory
        ? path.join(skillPath, 'skill.md')
        : skillPath.endsWith('.md') ? skillPath : null;

      if (!mdPath || !fs.existsSync(mdPath)) {
        return undefined;
      }

      const content = await fs.promises.readFile(mdPath, 'utf-8');

      // 提取 YAML frontmatter 中的 description
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
      this.logService.warn(`[Skills] 提取 description 失败: ${error}`);
      return undefined;
    }
  }

  /**
   * 扫描目录获取 Skills
   */
  private async scanSkillsDirectory(dir: string, scope: SkillScope): Promise<SkillsMap> {
    const skills: SkillsMap = {};

    try {
      // 确保目录存在
      if (!fs.existsSync(dir)) {
        this.logService.info(`[Skills] ${scope} Skills 目录不存在: ${dir}`);
        return skills;
      }

      const entries = await fs.promises.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const stats = await fs.promises.stat(fullPath);

        // 跳过隐藏文件/文件夹
        if (entry.name.startsWith('.')) {
          continue;
        }

        const type: SkillType = entry.isDirectory() ? 'directory' : 'file';
        const id = `${scope}-${entry.name}`;

        // 提取 description
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

      this.logService.info(`[Skills] 从 ${scope} 目录获取到 ${Object.keys(skills).length} 个 Skills: ${dir}`);
    } catch (error) {
      this.logService.error(`[Skills] 扫描 ${scope} Skills 目录失败: ${error}`);
    }

    return skills;
  }

  /**
   * 获取所有 Skills
   */
  async getAllSkills(workspaceRoot?: string): Promise<SkillsConfig> {
    const global = await this.getSkillsByScope('global');
    const local = await this.getSkillsByScope('local', workspaceRoot);

    return { global, local };
  }

  /**
   * 获取指定作用域的 Skills
   */
  async getSkillsByScope(scope: SkillScope, workspaceRoot?: string): Promise<SkillsMap> {
    const dir = scope === 'global'
      ? this.getGlobalSkillsDir()
      : this.getLocalSkillsDir(workspaceRoot);

    if (!dir) {
      this.logService.warn(`[Skills] 无法获取 ${scope} Skills 目录`);
      return {};
    }

    return await this.scanSkillsDirectory(dir, scope);
  }

  /**
   * 复制文件或目录
   */
  private async copyRecursive(src: string, dest: string): Promise<void> {
    const stats = await fs.promises.stat(src);

    if (stats.isDirectory()) {
      // 创建目标目录
      await fs.promises.mkdir(dest, { recursive: true });

      // 复制目录内容
      const entries = await fs.promises.readdir(src, { withFileTypes: true });
      for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        await this.copyRecursive(srcPath, destPath);
      }
    } else {
      // 复制文件
      await fs.promises.copyFile(src, dest);
    }
  }

  /**
   * 删除文件或目录
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
   * 导入 Skill
   */
  async importSkill(sourcePath: string, scope: SkillScope, workspaceRoot?: string): Promise<Skill> {
    // 验证源路径
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`源路径不存在: ${sourcePath}`);
    }

    // 获取目标目录
    const targetDir = scope === 'global'
      ? this.getGlobalSkillsDir()
      : this.getLocalSkillsDir(workspaceRoot);

    if (!targetDir) {
      throw new Error(`无法获取 ${scope} Skills 目录`);
    }

    // 确保目标目录存在
    if (!fs.existsSync(targetDir)) {
      await fs.promises.mkdir(targetDir, { recursive: true });
      this.logService.info(`[Skills] 创建 ${scope} Skills 目录: ${targetDir}`);
    }

    // 获取文件/文件夹名称
    const name = path.basename(sourcePath);
    const targetPath = path.join(targetDir, name);

    // 检查是否已存在同名 Skill
    if (fs.existsSync(targetPath)) {
      throw new Error(`已存在同名 Skill: ${name}`);
    }

    // 复制文件/文件夹
    try {
      await this.copyRecursive(sourcePath, targetPath);
      this.logService.info(`[Skills] 成功导入 ${scope} Skill: ${name}`);
    } catch (error) {
      this.logService.error(`[Skills] 导入 Skill 失败: ${error}`);
      throw new Error(`导入失败: ${error}`);
    }

    // 获取文件信息
    const stats = await fs.promises.stat(targetPath);
    const type: SkillType = stats.isDirectory() ? 'directory' : 'file';
    const id = `${scope}-${name}`;

    // 提取 description
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
   * 删除 Skill
   */
  async deleteSkill(id: string, scope: SkillScope, workspaceRoot?: string): Promise<boolean> {
    // 获取目标目录
    const dir = scope === 'global'
      ? this.getGlobalSkillsDir()
      : this.getLocalSkillsDir(workspaceRoot);

    if (!dir) {
      this.logService.warn(`[Skills] 无法获取 ${scope} Skills 目录`);
      return false;
    }

    // 从 ID 中提取名称 (格式: {scope}-{name})
    const name = id.replace(`${scope}-`, '');
    const targetPath = path.join(dir, name);

    // 验证路径存在
    if (!fs.existsSync(targetPath)) {
      this.logService.warn(`[Skills] Skill 不存在: ${targetPath}`);
      return false;
    }

    // 删除文件/文件夹
    try {
      await this.removeRecursive(targetPath);
      this.logService.info(`[Skills] 成功删除 ${scope} Skill: ${name}`);
      return true;
    } catch (error) {
      this.logService.error(`[Skills] 删除 Skill 失败: ${error}`);
      throw new Error(`删除失败: ${error}`);
    }
  }

  /**
   * 在编辑器中打开 Skill
   */
  async openSkillInEditor(skillPath: string): Promise<void> {
    // 这个方法需要在调用时通过 VSCode API 打开文件
    // 实际实现将在调用侧完成
    this.logService.info(`[Skills] 请求在编辑器中打开: ${skillPath}`);
  }
}
