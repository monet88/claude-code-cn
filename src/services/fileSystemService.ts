/**
 * 文件系统服务 / FileSystem Service
 * 文件操作封装 + 文件搜索功能
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { execFile } from 'child_process';
import Fuse from 'fuse.js';
import { createDecorator } from '../di/instantiation';

export const IFileSystemService = createDecorator<IFileSystemService>('fileSystemService');

/**
 * 文件搜索结果项
 */
export interface FileSearchResult {
	path: string;      // 相对路径
	name: string;      // 文件名
	type: 'file' | 'directory';
}

export interface IFileSystemService {
	readonly _serviceBrand: undefined;

	readFile(uri: vscode.Uri): Thenable<Uint8Array>;
	writeFile(uri: vscode.Uri, content: Uint8Array): Thenable<void>;
	delete(uri: vscode.Uri, options?: { recursive?: boolean; useTrash?: boolean }): Thenable<void>;
	rename(source: vscode.Uri, target: vscode.Uri, options?: { overwrite?: boolean }): Thenable<void>;
	createDirectory(uri: vscode.Uri): Thenable<void>;
	readDirectory(uri: vscode.Uri): Thenable<[string, vscode.FileType][]>;
	stat(uri: vscode.Uri): Thenable<vscode.FileStat>;

	/**
	 * 使用 Ripgrep 列出文件（不搜索,返回原始列表）
	 * @param cwd 工作目录
	 * @returns 文件路径数组（相对路径）
	 */
	listFilesWithRipgrep(cwd: string): Promise<string[]>;

	/**
	 * 搜索文件（完整流程：Ripgrep + 目录提取 + Fuse.js）
	 * @param pattern 搜索模式
	 * @param cwd 工作目录
	 * @returns 文件搜索结果数组
	 */
	searchFiles(pattern: string, cwd: string): Promise<FileSearchResult[]>;

	/**
	 * 使用 VSCode API 搜索文件（Ripgrep 降级方案）
	 * @param pattern 搜索模式
	 * @param cwd 工作目录
	 * @returns 文件搜索结果数组
	 */
	searchFilesWithWorkspace(pattern: string, cwd: string): Promise<FileSearchResult[]>;

	/**
	 * 从文件路径列表提取所有父目录（对齐官方实现）
	 * @param filePaths 文件路径数组（相对路径）
	 * @returns 去重的目录路径数组（相对路径,带 / 后缀）
	 */
	extractParentDirectories(filePaths: string[]): string[];

	/**
	 * 获取工作区顶层目录（用于空查询）
	 * @param cwd 工作目录
	 * @returns 顶层目录数组
	 */
	getTopLevelDirectories(cwd: string): Promise<FileSearchResult[]>;

	/**
	 * 规范化为绝对路径
	 * @param filePath 文件路径（绝对或相对）
	 * @param cwd 工作目录
	 * @returns 规范化的绝对路径
	 */
	normalizeAbsolutePath(filePath: string, cwd: string): string;

	/**
	 * 转换为工作区相对路径
	 * @param absolutePath 绝对路径
	 * @param cwd 工作目录
	 * @returns 相对路径
	 */
	toWorkspaceRelative(absolutePath: string, cwd: string): string;

	/**
	 * 解析文件路径（支持 ~ 展开和相对路径）
	 * @param filePath 文件路径
	 * @param cwd 工作目录
	 * @returns 规范化的绝对路径
	 */
	resolveFilePath(filePath: string, cwd: string): string;

	/**
	 * 检查路径是否存在
	 * @param target 目标路径
	 * @returns 是否存在
	 */
	pathExists(target: string): Promise<boolean>;

	/**
	 * 清理文件名（移除非法字符）
	 * @param fileName 原始文件名
	 * @returns 清理后的文件名
	 */
	sanitizeFileName(fileName: string): string;

	/**
	 * 创建临时文件
	 * @param fileName 文件名
	 * @param content 文件内容
	 * @returns 临时文件路径
	 */
	createTempFile(fileName: string, content: string): Promise<string>;

	/**
	 * 解析并查找存在的路径（含模糊搜索）
	 * @param filePath 文件路径
	 * @param cwd 工作目录
	 * @param searchResults 可选的搜索结果（如果提供,则使用模糊匹配）
	 * @returns 存在的绝对路径
	 */
	resolveExistingPath(filePath: string, cwd: string, searchResults?: FileSearchResult[]): Promise<string>;

	/**
	 * 查找文件（完整业务逻辑）
	 * - 空查询返回顶层内容（目录 + 顶层文件）
	 * - 非空查询: Ripgrep + 目录提取 + Fuse.js
	 * - 自动降级到 VSCode API
	 * @param pattern 搜索模式（可选,空查询返回顶层内容）
	 * @param cwd 工作目录
	 * @returns 文件搜索结果数组
	 */
	findFiles(pattern: string | undefined, cwd: string): Promise<FileSearchResult[]>;
}

export class FileSystemService implements IFileSystemService {
	readonly _serviceBrand: undefined;

	// Ripgrep 命令缓存
	private ripgrepCommandCache: { command: string; args: string[] } | null = null;

	// ===== 基础文件操作 =====

	readFile(uri: vscode.Uri): Thenable<Uint8Array> {
		return vscode.workspace.fs.readFile(uri);
	}

	writeFile(uri: vscode.Uri, content: Uint8Array): Thenable<void> {
		return vscode.workspace.fs.writeFile(uri, content);
	}

	delete(uri: vscode.Uri, options?: { recursive?: boolean; useTrash?: boolean }): Thenable<void> {
		return vscode.workspace.fs.delete(uri, options);
	}

	rename(source: vscode.Uri, target: vscode.Uri, options?: { overwrite?: boolean }): Thenable<void> {
		return vscode.workspace.fs.rename(source, target, options);
	}

	createDirectory(uri: vscode.Uri): Thenable<void> {
		return vscode.workspace.fs.createDirectory(uri);
	}

	readDirectory(uri: vscode.Uri): Thenable<[string, vscode.FileType][]> {
		return vscode.workspace.fs.readDirectory(uri);
	}

	stat(uri: vscode.Uri): Thenable<vscode.FileStat> {
		return vscode.workspace.fs.stat(uri);
	}

	// ===== 文件搜索功能（完全对齐官方实现）=====

	/**
	 * 使用 Ripgrep 列出所有文件（不搜索,返回原始列表）
	 */
	async listFilesWithRipgrep(cwd: string): Promise<string[]> {
		const args = ['--files', '--follow', '--hidden'];
		const excludeGlobs = this.buildExcludePatterns();
		for (const glob of excludeGlobs) {
			args.push('--glob', `!${glob}`);
		}

		const rawPaths = await this.execRipgrep(args, cwd);

		return rawPaths.map(rawPath => {
			const absolute = this.normalizeAbsolutePath(rawPath.replace(/^\.\//, ''), cwd);
			return this.toWorkspaceRelative(absolute, cwd);
		});
	}

	/**
	 * 搜索文件（完整流程：对齐官方实现）
	 */
	async searchFiles(pattern: string, cwd: string): Promise<FileSearchResult[]> {
		const files = await this.listFilesWithRipgrep(cwd);
		const directories = this.extractParentDirectories(files);
		const allPaths = [...directories, ...files];
		return this.fuseSearchPaths(allPaths, pattern);
	}

	/**
	 * 使用 VSCode API 搜索文件（降级方案）
	 */
	async searchFilesWithWorkspace(pattern: string, cwd: string): Promise<FileSearchResult[]> {
		const include = pattern.includes('*') || pattern.includes('?')
			? pattern
			: `**/*${pattern}*`;

		const excludePatterns = this.buildExcludePatterns();
		const excludeGlob = this.toExcludeGlob(excludePatterns);

		const uris = await vscode.workspace.findFiles(include, excludeGlob, 100);

		return uris.map(uri => {
			const fsPath = uri.fsPath;
			const relative = this.toWorkspaceRelative(fsPath, cwd);
			return {
				path: relative,
				name: path.basename(fsPath),
				type: 'file' as const
			};
		});
	}

	/**
	 * 从文件路径列表提取所有父目录（完全对齐官方实现）
	 */
	extractParentDirectories(filePaths: string[]): string[] {
		const dirSet = new Set<string>();

		filePaths.forEach(filePath => {
			let current = path.dirname(filePath);

			while (current !== '.' && current !== path.parse(current).root) {
				dirSet.add(current);
				current = path.dirname(current);
			}
		});

		return Array.from(dirSet).map(dir => dir + path.sep);
	}

	/**
	 * 获取工作区顶层目录（用于空查询）
	 */
	async getTopLevelDirectories(cwd: string): Promise<FileSearchResult[]> {
		const workspaceUri = vscode.Uri.file(cwd);

		try {
			const entries = await vscode.workspace.fs.readDirectory(workspaceUri);
			const results: FileSearchResult[] = [];

			for (const [name, type] of entries) {
				if (type === vscode.FileType.Directory) {
					results.push({
						path: name,
						name: name,
						type: 'directory'
					});
				}
			}

			return results.sort((a, b) => a.name.localeCompare(b.name));
		} catch {
			return [];
		}
	}

	/**
	 * 获取工作区顶层内容（目录 + 顶层文件,用于空查询）
	 */
	async getTopLevelContents(cwd: string): Promise<FileSearchResult[]> {
		try {
			const files = await this.listFilesWithRipgrep(cwd);
			const directories = this.extractParentDirectories(files);
			const allPaths = [...directories, ...files];

			return this.extractTopLevelItems(allPaths);
		} catch (error) {
			console.warn('[FileSystemService] Ripgrep failed in getTopLevelContents, falling back to readDirectory:', error);

			try {
				const workspaceUri = vscode.Uri.file(cwd);
				const entries = await vscode.workspace.fs.readDirectory(workspaceUri);
				const results: FileSearchResult[] = [];

				for (const [name, type] of entries) {
					if (type === vscode.FileType.Directory) {
						results.push({ path: name, name: name, type: 'directory' });
					} else if (type === vscode.FileType.File) {
						results.push({ path: name, name: name, type: 'file' });
					}
				}

				return results.sort((a, b) => {
					if (a.type === 'directory' && b.type === 'file') return -1;
					if (a.type === 'file' && b.type === 'directory') return 1;
					return a.name.localeCompare(b.name);
				});
			} catch (fallbackError) {
				console.error('[FileSystemService] getTopLevelContents fallback also failed:', fallbackError);
				return [];
			}
		}
	}

	extractTopLevelItems(allPaths: string[]): FileSearchResult[] {
		const topLevelSet = new Set<string>();
		const maxItems = 200;

		for (const filePath of allPaths) {
			const firstLevel = filePath.split(path.sep)[0];
			if (firstLevel) {
				topLevelSet.add(firstLevel);
				if (topLevelSet.size >= maxItems) break;
			}
		}

		return Array.from(topLevelSet).sort().map(topLevel => {
			const hasChildren = allPaths.some(p => p.startsWith(topLevel + path.sep));

			return {
				path: hasChildren ? topLevel + path.sep : topLevel,
				name: path.basename(topLevel),
				type: hasChildren ? 'directory' as const : 'file' as const
			};
		});
	}

	// ===== 私有辅助方法 =====

	private execRipgrep(args: string[], cwd: string): Promise<string[]> {
		const { command, args: defaultArgs } = this.getRipgrepCommand();

		return new Promise((resolve, reject) => {
			execFile(command, [...defaultArgs, ...args], {
				cwd,
				maxBuffer: 20 * 1024 * 1024,
				timeout: 10_000
			}, (error, stdout) => {
				if (!error) {
					resolve(stdout.split(/\r?\n/).filter(Boolean));
					return;
				}

				const code = (error as any)?.code;
				if (code === 1) {
					resolve([]);
					return;
				}

				const signal = (error as any)?.signal;
				const hasOutput = stdout && stdout.trim().length > 0;

				if ((signal === 'SIGTERM' || code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER') && hasOutput) {
					const lines = stdout.split(/\r?\n/).filter(Boolean);
					resolve(lines.length > 0 ? lines.slice(0, -1) : []);
					return;
				}

				reject(error);
			});
		});
	}

	private getRipgrepCommand(): { command: string; args: string[] } {
		if (this.ripgrepCommandCache) {
			return this.ripgrepCommandCache;
		}

		const rootDir = path.resolve(__dirname, '..', '..', '..');
		const vendorDir = path.join(rootDir, 'vendor', 'ripgrep');

		let command: string;
		if (process.platform === 'win32') {
			command = path.join(vendorDir, 'x64-win32', 'rg.exe');
		} else {
			const platformKey = `${process.arch}-${process.platform}`;
			command = path.join(vendorDir, platformKey, 'rg');
		}

		try {
			require('fs').accessSync(command, require('fs').constants.X_OK);
		} catch {
			command = 'rg';
		}

		this.ripgrepCommandCache = { command, args: [] };
		return this.ripgrepCommandCache;
	}

	private fuseSearchPaths(paths: string[], pattern: string): FileSearchResult[] {
		const items = paths.map(filePath => {
			const isDirectory = filePath.endsWith(path.sep);
			const cleanPath = isDirectory ? filePath.slice(0, -1) : filePath;

			return {
				path: filePath,
				filename: path.basename(cleanPath),
				testPenalty: cleanPath.includes('test') || cleanPath.includes('spec') ? 1 : 0,
				isDirectory
			};
		});

		const lastSep = pattern.lastIndexOf(path.sep);
		let filteredItems = items;

		if (lastSep > 2) {
			const dirPrefix = pattern.substring(0, lastSep);
			filteredItems = items.filter(item =>
				item.path.substring(0, lastSep).startsWith(dirPrefix)
			);
		}

		const fuse = new Fuse(filteredItems, {
			includeScore: true,
			threshold: 0.5,
			keys: [
				{ name: 'path', weight: 1 },
				{ name: 'filename', weight: 2 }
			]
		});

		const results = fuse.search(pattern, { limit: 100 });

		const sorted = results.sort((a, b) => {
			const scoreA = a.score ?? 0;
			const scoreB = b.score ?? 0;

			if (Math.abs(scoreA - scoreB) > 0.05) {
				return scoreA - scoreB;
			}
			return a.item.testPenalty - b.item.testPenalty;
		});

		return sorted.slice(0, 100).map(r => {
			const cleanPath = r.item.isDirectory ? r.item.path.slice(0, -1) : r.item.path;

			return {
				path: cleanPath,
				name: r.item.filename,
				type: r.item.isDirectory ? 'directory' : 'file'
			};
		});
	}

	normalizeAbsolutePath(filePath: string, cwd: string): string {
		return path.isAbsolute(filePath)
			? path.normalize(filePath)
			: path.normalize(path.join(cwd, filePath));
	}

	toWorkspaceRelative(absolutePath: string, cwd: string): string {
		const normalized = path.normalize(absolutePath);
		const normalizedCwd = path.normalize(cwd);

		if (normalized.startsWith(normalizedCwd)) {
			return normalized.substring(normalizedCwd.length + 1);
		}

		return normalized;
	}

	resolveFilePath(filePath: string, cwd: string): string {
		if (!filePath) {
			return cwd;
		}

		const expanded = filePath.startsWith('~')
			? path.join(require('os').homedir(), filePath.slice(1))
			: filePath;

		const absolute = path.isAbsolute(expanded)
			? expanded
			: path.join(cwd, expanded);

		return path.normalize(absolute);
	}

	async pathExists(target: string): Promise<boolean> {
		try {
			await require('fs').promises.access(target, require('fs').constants.F_OK);
			return true;
		} catch {
			return false;
		}
	}

	sanitizeFileName(fileName: string): string {
		const fallback = fileName && fileName.trim() ? fileName.trim() : 'claude.txt';
		return fallback.replace(/[<>:"\\/|?*\x00-\x1F]/g, '_');
	}

	async createTempFile(fileName: string, content: string): Promise<string> {
		const tempDir = await require('fs').promises.mkdtemp(
			path.join(require('os').tmpdir(), 'claude-')
		);
		const sanitized = this.sanitizeFileName(fileName);
		const filePath = path.join(tempDir, sanitized);
		await require('fs').promises.writeFile(filePath, content, 'utf8');
		return filePath;
	}

	async resolveExistingPath(filePath: string, cwd: string, searchResults?: FileSearchResult[]): Promise<string> {
		const absoluteCandidate = this.resolveFilePath(filePath, cwd);
		if (await this.pathExists(absoluteCandidate)) {
			return absoluteCandidate;
		}

		if (searchResults && searchResults.length > 0) {
			const candidate = searchResults[0].path;
			const absolute = this.resolveFilePath(candidate, cwd);
			if (await this.pathExists(absolute)) {
				return absolute;
			}
		}

		return absoluteCandidate;
	}

	async findFiles(pattern: string | undefined, cwd: string): Promise<FileSearchResult[]> {
		if (!pattern || !pattern.trim()) {
			return await this.getTopLevelContents(cwd);
		}

		try {
			return await this.searchFiles(pattern, cwd);
		} catch (error) {
			console.warn(`[FileSystemService] Ripgrep search failed, falling back to VSCode API:`, error);

			try {
				return await this.searchFilesWithWorkspace(pattern, cwd);
			} catch (fallbackError) {
				console.error(`[FileSystemService] Fallback search also failed:`, fallbackError);
				return [];
			}
		}
	}

	private buildExcludePatterns(): string[] {
		const patterns = new Set<string>([
			'**/node_modules/**',
			'**/.git/**',
			'**/dist/**',
			'**/build/**',
			'**/.next/**',
			'**/.nuxt/**',
			'**/.DS_Store',
			'**/Thumbs.db',
			'**/*.log',
			'**/.env',
			'**/.env.*'
		]);

		try {
			const searchConfig = vscode.workspace.getConfiguration('search');
			const filesConfig = vscode.workspace.getConfiguration('files');
			const searchExclude = searchConfig.get<Record<string, boolean>>('exclude') ?? {};
			const filesExclude = filesConfig.get<Record<string, boolean>>('exclude') ?? {};

			for (const [glob, enabled] of Object.entries(searchExclude)) {
				if (enabled && typeof glob === 'string' && glob.length > 0) {
					patterns.add(glob);
				}
			}

			for (const [glob, enabled] of Object.entries(filesExclude)) {
				if (enabled && typeof glob === 'string' && glob.length > 0) {
					patterns.add(glob);
				}
			}

			const useIgnoreFiles = searchConfig.get<boolean>('useIgnoreFiles', true);
			if (useIgnoreFiles) {
				const folders = vscode.workspace.workspaceFolders;
				if (folders) {
					for (const folder of folders) {
						const gitignorePatterns = this.readGitignorePatterns(folder.uri.fsPath);
						gitignorePatterns.forEach(p => patterns.add(p));
					}
				}
				const globalPatterns = this.readGlobalGitignorePatterns();
				globalPatterns.forEach(p => patterns.add(p));
			}
		} catch {
			// ignore errors
		}

		return Array.from(patterns);
	}

	private readGitignorePatterns(root: string): string[] {
		const entries: string[] = [];
		const localGitignore = path.join(root, '.gitignore');

		try {
			if (require('fs').existsSync(localGitignore)) {
				const content = require('fs').readFileSync(localGitignore, 'utf8');
				entries.push(...this.parseGitignore(content));
			}
		} catch {
			// ignore errors
		}

		return entries;
	}

	private readGlobalGitignorePatterns(): string[] {
		const entries: string[] = [];
		const globalGitIgnore = path.join(require('os').homedir(), '.config', 'git', 'ignore');

		try {
			if (require('fs').existsSync(globalGitIgnore)) {
				const content = require('fs').readFileSync(globalGitIgnore, 'utf8');
				entries.push(...this.parseGitignore(content));
			}
		} catch {
			// ignore errors
		}

		return entries;
	}

	private parseGitignore(content: string): string[] {
		const results: string[] = [];

		for (const rawLine of content.split(/\r?\n/)) {
			const line = rawLine.trim();
			if (!line || line.startsWith('#') || line.startsWith('!')) {
				continue;
			}

			let transformed = line;
			if (transformed.endsWith('/')) {
				transformed = `${transformed.slice(0, -1)}/**`;
			}
			if (transformed.startsWith('/')) {
				transformed = transformed.slice(1);
			} else {
				transformed = `**/${transformed}`;
			}
			results.push(transformed);
		}

		return results;
	}

	private toExcludeGlob(patterns: string[]): string | undefined {
		if (patterns.length === 0) {
			return undefined;
		}
		if (patterns.length === 1) {
			return patterns[0];
		}
		return `{${patterns.join(',')}}`;
	}
}
