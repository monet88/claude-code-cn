/**
 * Output Styles 服务
 *
 * 管理 Output Styles 的导入、删除、列表等功能
 *
 * Output Styles 存储位置:
 * - 全局: ~/.claude/output-styles
 * - 本地: {workspace}/.claude/output-styles
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createDecorator } from '../di/instantiation';
import { ILogService } from './logService';
import type { OutputStyle, OutputStylesMap, OutputStylesConfig, OutputStyleType, OutputStyleScope } from '../shared/types/outputStyle';

export const IOutputStyleConfigService = createDecorator<IOutputStyleConfigService>('outputStyleConfigService');

export interface IOutputStyleConfigService {
  readonly _serviceBrand: undefined;

  getGlobalOutputStylesDir(): string;
  getLocalOutputStylesDir(workspaceRoot?: string): string | null;
  getAllOutputStyles(workspaceRoot?: string): Promise<OutputStylesConfig>;
  getOutputStylesByScope(scope: OutputStyleScope, workspaceRoot?: string): Promise<OutputStylesMap>;
  importOutputStyle(sourcePath: string, scope: OutputStyleScope, workspaceRoot?: string): Promise<OutputStyle>;
  deleteOutputStyle(id: string, scope: OutputStyleScope, workspaceRoot?: string): Promise<boolean>;
  openOutputStyle(outputStylePath: string): Promise<void>;
}

export class OutputStyleConfigService implements IOutputStyleConfigService {
  readonly _serviceBrand: undefined;

  constructor(
    @ILogService private readonly logService: ILogService
  ) {}

  getGlobalOutputStylesDir(): string {
    const homeDir = os.homedir();
    return path.join(homeDir, '.claude', 'output-styles');
  }

  getLocalOutputStylesDir(workspaceRoot?: string): string | null {
    if (!workspaceRoot) {
      return null;
    }
    return path.join(workspaceRoot, '.claude', 'output-styles');
  }

  private async extractMetadata(stylePath: string, isDirectory: boolean): Promise<{ description?: string; name?: string }> {
    try {
      const mdPath = isDirectory
        ? path.join(stylePath, 'style.md')
        : stylePath.endsWith('.md') ? stylePath : null;

      if (!mdPath || !fs.existsSync(mdPath)) {
        return {};
      }

      const content = await fs.promises.readFile(mdPath, 'utf-8');

      const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
      if (frontmatterMatch) {
        const frontmatter = frontmatterMatch[1];
        
        const descMatch = frontmatter.match(/description:\s*(.+?)(?:\n[a-z-]+:|$)/s);
        const nameMatch = frontmatter.match(/name:\s*(.+?)(?:\n|$)/);
        
        return {
          description: descMatch ? descMatch[1].trim() : undefined,
          name: nameMatch ? nameMatch[1].trim() : undefined,
        };
      }

      return {};
    } catch (error) {
      this.logService.warn(`[OutputStyles] 提取 metadata 失败: ${error}`);
      return {};
    }
  }

  private async scanOutputStylesDirectory(dir: string, scope: OutputStyleScope): Promise<OutputStylesMap> {
    const styles: OutputStylesMap = {};

    this.logService.info(`[OutputStyles] 开始扫描 ${scope} 目录: ${dir}`);

    try {
      if (!fs.existsSync(dir)) {
        this.logService.info(`[OutputStyles] ${scope} Output Styles 目录不存在: ${dir}`);
        return styles;
      }

      this.logService.info(`[OutputStyles] 目录存在，开始读取...`);
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      this.logService.info(`[OutputStyles] 找到 ${entries.length} 个条目`);

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const stats = await fs.promises.stat(fullPath);

        if (entry.name.startsWith('.')) {
          continue;
        }

        if (entry.isSymbolicLink()) {
          try {
            await fs.promises.access(fullPath);
          } catch {
            this.logService.warn(`[OutputStyles] 跳过无效的符号链接: ${fullPath}`);
            continue;
          }
        }

        const type: OutputStyleType = entry.isDirectory() ? 'directory' : 'file';
        const baseName = entry.name.replace(/\.md$/, '');
        const id = `${scope}-${baseName}`;

        const metadata = await this.extractMetadata(fullPath, entry.isDirectory());

        styles[id] = {
          id,
          name: metadata.name || baseName,
          type,
          scope,
          path: fullPath,
          description: metadata.description,
          createdAt: stats.birthtime.toISOString(),
          modifiedAt: stats.mtime.toISOString(),
        };
      }

      this.logService.info(`[OutputStyles] 从 ${scope} 目录获取到 ${Object.keys(styles).length} 个 Output Styles: ${dir}`);
    } catch (error) {
      this.logService.error(`[OutputStyles] 扫描 ${scope} Output Styles 目录失败: ${error}`);
    }

    return styles;
  }

  async getAllOutputStyles(workspaceRoot?: string): Promise<OutputStylesConfig> {
    this.logService.info(`[OutputStyles] getAllOutputStyles called, workspaceRoot: ${workspaceRoot}`);
    this.logService.info(`[OutputStyles] Global output styles dir: ${this.getGlobalOutputStylesDir()}`);
    
    const global = await this.getOutputStylesByScope('global');
    this.logService.info(`[OutputStyles] Global output styles count: ${Object.keys(global).length}`);
    
    const local = await this.getOutputStylesByScope('local', workspaceRoot);
    this.logService.info(`[OutputStyles] Local output styles count: ${Object.keys(local).length}`);

    return { global, local };
  }

  async getOutputStylesByScope(scope: OutputStyleScope, workspaceRoot?: string): Promise<OutputStylesMap> {
    const dir = scope === 'global'
      ? this.getGlobalOutputStylesDir()
      : this.getLocalOutputStylesDir(workspaceRoot);

    if (!dir) {
      this.logService.warn(`[OutputStyles] 无法获取 ${scope} Output Styles 目录`);
      return {};
    }

    return await this.scanOutputStylesDirectory(dir, scope);
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

  async importOutputStyle(sourcePath: string, scope: OutputStyleScope, workspaceRoot?: string): Promise<OutputStyle> {
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`源路径不存在: ${sourcePath}`);
    }

    const targetDir = scope === 'global'
      ? this.getGlobalOutputStylesDir()
      : this.getLocalOutputStylesDir(workspaceRoot);

    if (!targetDir) {
      throw new Error(`无法获取 ${scope} Output Styles 目录`);
    }

    if (!fs.existsSync(targetDir)) {
      await fs.promises.mkdir(targetDir, { recursive: true });
    }

    const name = path.basename(sourcePath);
    const targetPath = path.join(targetDir, name);

    if (fs.existsSync(targetPath)) {
      throw new Error(`Output Style 已存在: ${name}`);
    }

    try {
      await this.copyRecursive(sourcePath, targetPath);
      this.logService.info(`[OutputStyles] 成功导入 ${scope} Output Style: ${name}`);
    } catch (error) {
      this.logService.error(`[OutputStyles] 导入 Output Style 失败: ${error}`);
      throw new Error(`导入失败: ${error}`);
    }

    const stats = await fs.promises.stat(targetPath);
    const type: OutputStyleType = stats.isDirectory() ? 'directory' : 'file';
    const baseName = name.replace(/\.md$/, '');
    const id = `${scope}-${baseName}`;
    const metadata = await this.extractMetadata(targetPath, stats.isDirectory());

    return {
      id,
      name: metadata.name || baseName,
      type,
      scope,
      path: targetPath,
      description: metadata.description,
      createdAt: stats.birthtime.toISOString(),
      modifiedAt: stats.mtime.toISOString(),
    };
  }

  async deleteOutputStyle(id: string, scope: OutputStyleScope, workspaceRoot?: string): Promise<boolean> {
    const dir = scope === 'global'
      ? this.getGlobalOutputStylesDir()
      : this.getLocalOutputStylesDir(workspaceRoot);

    if (!dir) {
      this.logService.warn(`[OutputStyles] 无法获取 ${scope} Output Styles 目录`);
      return false;
    }

    const styles = await this.scanOutputStylesDirectory(dir, scope);
    const style = styles[id];

    if (!style) {
      this.logService.warn(`[OutputStyles] 找不到 Output Style: ${id}`);
      return false;
    }

    try {
      await this.removeRecursive(style.path);
      this.logService.info(`[OutputStyles] 成功删除 ${scope} Output Style: ${style.name}`);
      return true;
    } catch (error) {
      this.logService.error(`[OutputStyles] 删除 Output Style 失败: ${error}`);
      return false;
    }
  }

  async openOutputStyle(outputStylePath: string): Promise<void> {
    this.logService.info(`[OutputStyles] 打开 Output Style: ${outputStylePath}`);
  }
}
