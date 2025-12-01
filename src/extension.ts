/**
 * VSCode Extension Entry Point
 */

import * as vscode from 'vscode';
import { InstantiationServiceBuilder } from './di/instantiationServiceBuilder';
import { registerServices, ILogService, IClaudeAgentService, IWebViewService, IClaudeSettingsService, ICCSwitchSettingsService, IConfigurationService, IMcpService, ISkillService } from './services/serviceRegistry';
import { VSCodeTransport } from './services/claude/transport/VSCodeTransport';
import type { ClaudeProvider } from './services/ccSwitchSettingsService';
import { getCurrentProjectStatistics, getAllProjectsAggregatedStatistics } from './services/usageStatisticsService';

/**
 * Extension Activation
 */
export function activate(context: vscode.ExtensionContext) {
	// 1. Create service builder
	const builder = new InstantiationServiceBuilder();

	// 2. Register all services
	registerServices(builder, context);

	// 3. Seal the builder and create DI container
	const instantiationService = builder.seal();

	// 4. Log activation
	instantiationService.invokeFunction(accessor => {
		const logService = accessor.get(ILogService);
		logService.info('');
		logService.info('╔════════════════════════════════════════╗');
		logService.info('║         Claude Chat 扩展已激活           ║');
		logService.info('╚════════════════════════════════════════╝');
		logService.info('');
	});

	// 5. Connect services
	instantiationService.invokeFunction(async accessor => {
		const logService = accessor.get(ILogService);
		const webViewService = accessor.get(IWebViewService);
		const claudeAgentService = accessor.get(IClaudeAgentService);
		const claudeSettingsService = accessor.get(IClaudeSettingsService);
		const ccSwitchSettingsService = accessor.get(ICCSwitchSettingsService);
		const configurationService = accessor.get(IConfigurationService);
		const mcpService = accessor.get(IMcpService);
		const skillService = accessor.get(ISkillService);

		// Initialize CC Switch settings (ensure default provider exists)
		await ccSwitchSettingsService.initialize();

		// Register WebView View Provider
		const webviewProvider = vscode.window.registerWebviewViewProvider(
			'claudecodecn.chatView',
			webViewService,
			{
				webviewOptions: {
					retainContextWhenHidden: true
				}
			}
		);

		// Connect WebView messages to handle both Claude Agent and Provider management
		webViewService.setMessageHandler(async (message) => {
			// Handle provider management messages
			if (message.type === 'getProviders') {
				try {
					const providers = await ccSwitchSettingsService.getClaudeProviders();
					// 转换格式以兼容前端
					const formattedProviders = providers.map(p => ({
						id: p.id,
						name: p.name,
						apiKey: p.settingsConfig.env.ANTHROPIC_AUTH_TOKEN || '',
						baseUrl: p.settingsConfig.env.ANTHROPIC_BASE_URL || '',
						websiteUrl: p.websiteUrl,
						isActive: false, // 将在下面设置
						createdAt: p.createdAt
					}));

					// 获取当前激活的供应商
					const activeProvider = await ccSwitchSettingsService.getActiveClaudeProvider();
					if (activeProvider) {
						formattedProviders.forEach(p => {
							p.isActive = p.id === activeProvider.id;
						});
					}

					webViewService.postMessage({
						type: 'providersData',
						payload: formattedProviders
					});
				} catch (error) {
					logService.error(`Failed to get providers: ${error}`);
				}
				return;
			}

			if (message.type === 'addProvider') {
				try {
					// 转换前端格式到 CC Switch 格式
					const provider: ClaudeProvider = {
						id: `provider_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
						name: message.payload.name,
						settingsConfig: {
							env: {
								ANTHROPIC_AUTH_TOKEN: message.payload.apiKey,
								ANTHROPIC_BASE_URL: message.payload.baseUrl
							}
						},
						websiteUrl: message.payload.websiteUrl,
						category: 'custom',
						createdAt: Date.now()
					};

					await ccSwitchSettingsService.addClaudeProvider(provider);
					webViewService.postMessage({
						type: 'providerAdded',
						payload: { success: true }
					});
				} catch (error) {
					logService.error(`Failed to add provider: ${error}`);
					webViewService.postMessage({
						type: 'providerAdded',
						payload: { success: false, error: String(error) }
					});
				}
				return;
			}

			if (message.type === 'updateProvider') {
				try {
					const { id, updates } = message.payload;
					// 转换更新数据到 CC Switch 格式
					const providerUpdates: Partial<ClaudeProvider> = {
						name: updates.name,
						websiteUrl: updates.websiteUrl,
						settingsConfig: {
							env: {
								ANTHROPIC_AUTH_TOKEN: updates.apiKey,
								ANTHROPIC_BASE_URL: updates.baseUrl
							}
						}
					};

					await ccSwitchSettingsService.updateClaudeProvider(id, providerUpdates);
					webViewService.postMessage({
						type: 'providerUpdated',
						payload: { success: true }
					});
				} catch (error) {
					logService.error(`Failed to update provider: ${error}`);
					webViewService.postMessage({
						type: 'providerUpdated',
						payload: { success: false, error: String(error) }
					});
				}
				return;
			}

			if (message.type === 'deleteProvider') {
				try {
					await ccSwitchSettingsService.deleteClaudeProvider(message.payload.id);
					webViewService.postMessage({
						type: 'providerDeleted',
						payload: { success: true }
					});
				} catch (error) {
					logService.error(`Failed to delete provider: ${error}`);
					webViewService.postMessage({
						type: 'providerDeleted',
						payload: { success: false, error: String(error) }
					});
					vscode.window.showErrorMessage(`删除供应商失败: ${error}`);
				}
				return;
			}

			if (message.type === 'getActiveProvider') {
				try {
					const activeProvider = await ccSwitchSettingsService.getActiveClaudeProvider();
					if (activeProvider) {
						// 转换格式
						const formatted = {
							id: activeProvider.id,
							name: activeProvider.name,
							apiKey: activeProvider.settingsConfig.env.ANTHROPIC_AUTH_TOKEN || '',
							baseUrl: activeProvider.settingsConfig.env.ANTHROPIC_BASE_URL || '',
							websiteUrl: activeProvider.websiteUrl,
							isActive: true
						};
						webViewService.postMessage({
							type: 'activeProviderData',
							payload: formatted
						});
					} else {
						webViewService.postMessage({
							type: 'activeProviderData',
							payload: null
						});
					}
				} catch (error) {
					logService.error(`Failed to get active provider: ${error}`);
				}
				return;
			}

			if (message.type === 'switchProvider') {
				try {
					const { id } = message.payload;
					// 1. 切换到新的供应商
					await ccSwitchSettingsService.switchClaudeProvider(id);

					// 2. 获取新供应商的配置
					const provider = await ccSwitchSettingsService.getActiveClaudeProvider();
					if (provider) {
						// 3. 更新 Claude settings.json
						const apiKey = provider.settingsConfig.env.ANTHROPIC_AUTH_TOKEN || '';
						const baseUrl = provider.settingsConfig.env.ANTHROPIC_BASE_URL || '';
						await claudeSettingsService.updateProvider(apiKey, baseUrl);
					}

					// 4. 关闭所有现有会话，以便使用新的供应商配置
					await claudeAgentService.closeAllChannelsWithCredentialChange();
					logService.info('已关闭所有现有会话，供应商切换完成');

					webViewService.postMessage({
						type: 'providerSwitched',
						payload: { success: true, needsRestart: true }
					});
				} catch (error) {
					logService.error(`Failed to switch provider: ${error}`);
					webViewService.postMessage({
						type: 'providerSwitched',
						payload: { success: false, error: String(error) }
					});
					vscode.window.showErrorMessage(`切换供应商失败: ${error}`);
				}
				return;
			}

			// Handle MCP server management
			if (message.type === 'getAllMcpServers') {
				try {
					const servers = await mcpService.getAllServers();
					webViewService.postMessage({
						type: 'allMcpServersData',
						payload: servers
					});
				} catch (error) {
					logService.error(`Failed to get MCP servers: ${error}`);
					webViewService.postMessage({
						type: 'allMcpServersData',
						payload: {}
					});
				}
				return;
			}

			if (message.type === 'upsertMcpServer') {
				try {
					const { server } = message.payload;
					await mcpService.upsertServer(server);
					webViewService.postMessage({
						type: 'mcpServerUpserted',
						payload: { success: true }
					});
				} catch (error) {
					logService.error(`Failed to upsert MCP server: ${error}`);
					webViewService.postMessage({
						type: 'mcpServerUpserted',
						payload: { success: false, error: String(error) }
					});
				}
				return;
			}

			if (message.type === 'deleteMcpServer') {
				try {
					const { id } = message.payload;
					const success = await mcpService.deleteServer(id);
					webViewService.postMessage({
						type: 'mcpServerDeleted',
						payload: { success }
					});
				} catch (error) {
					logService.error(`Failed to delete MCP server: ${error}`);
					webViewService.postMessage({
						type: 'mcpServerDeleted',
						payload: { success: false, error: String(error) }
					});
				}
				return;
			}

			if (message.type === 'validateMcpServer') {
				try {
					const { server } = message.payload;
					const result = mcpService.validateServer(server);
					webViewService.postMessage({
						type: 'mcpServerValidated',
						payload: result
					});
				} catch (error) {
					logService.error(`Failed to validate MCP server: ${error}`);
					webViewService.postMessage({
						type: 'mcpServerValidated',
						payload: { valid: false, errors: [String(error)] }
					});
				}
				return;
			}

			// Handle Skills management
			if (message.type === 'getAllSkills') {
				try {
					const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
					const skills = await skillService.getAllSkills(workspaceRoot);
					webViewService.postMessage({
						type: 'allSkillsData',
						payload: skills
					});
				} catch (error) {
					logService.error(`Failed to get Skills: ${error}`);
					webViewService.postMessage({
						type: 'allSkillsData',
						payload: { global: {}, local: {} }
					});
				}
				return;
			}

			if (message.type === 'importSkill') {
				try {
					const { scope } = message.payload;
					const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

					// 显示文件/文件夹选择对话框（支持多选）
					const uris = await vscode.window.showOpenDialog({
						canSelectFiles: true,
						canSelectFolders: true,
						canSelectMany: true,
						openLabel: `导入到${scope === 'global' ? '全局' : '本项目'} Skills`
					});

					if (!uris || uris.length === 0) {
						webViewService.postMessage({
							type: 'skillImported',
							payload: { success: false, error: '未选择文件或文件夹' }
						});
						return;
					}

					// 批量导入
					const importedSkills = [];
					const errors = [];

					for (const uri of uris) {
						try {
							const skill = await skillService.importSkill(uri.fsPath, scope, workspaceRoot);
							importedSkills.push(skill);
						} catch (error) {
							errors.push({ path: uri.fsPath, error: String(error) });
						}
					}

					webViewService.postMessage({
						type: 'skillImported',
						payload: {
							success: importedSkills.length > 0,
							count: importedSkills.length,
							total: uris.length,
							errors: errors.length > 0 ? errors : undefined
						}
					});
				} catch (error) {
					logService.error(`Failed to import Skill: ${error}`);
					webViewService.postMessage({
						type: 'skillImported',
						payload: { success: false, error: String(error) }
					});
				}
				return;
			}

			if (message.type === 'deleteSkill') {
				try {
					const { id, scope } = message.payload;
					const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
					const success = await skillService.deleteSkill(id, scope, workspaceRoot);
					webViewService.postMessage({
						type: 'skillDeleted',
						payload: { success }
					});
				} catch (error) {
					logService.error(`Failed to delete Skill: ${error}`);
					webViewService.postMessage({
						type: 'skillDeleted',
						payload: { success: false, error: String(error) }
					});
				}
				return;
			}

			if (message.type === 'openSkill') {
				try {
					const { skillPath } = message.payload;
					const fs = await import('fs');
					const path = await import('path');

					let targetPath = skillPath;

					// 检查是否是文件夹
					const stats = fs.statSync(skillPath);
					if (stats.isDirectory()) {
						// 优先查找 skill.md，然后是 skills.md
						const skillMdPath = path.join(skillPath, 'skill.md');
						const skillsMdPath = path.join(skillPath, 'skills.md');

						if (fs.existsSync(skillMdPath)) {
							targetPath = skillMdPath;
						} else if (fs.existsSync(skillsMdPath)) {
							targetPath = skillsMdPath;
						}
						// 如果都不存在，保持原路径（打开文件夹）
					}

					// 在编辑器中打开文件/文件夹
					const uri = vscode.Uri.file(targetPath);
					await vscode.commands.executeCommand('vscode.open', uri);
					webViewService.postMessage({
						type: 'skillOpened',
						payload: { success: true }
					});
				} catch (error) {
					logService.error(`Failed to open Skill: ${error}`);
					webViewService.postMessage({
						type: 'skillOpened',
						payload: { success: false, error: String(error) }
					});
				}
				return;
			}

			// Handle usage statistics
			if (message.type === 'getUsageStatistics') {
				try {
					const { scope } = message.payload || { scope: 'current' };
					let statistics = null;

					if (scope === 'all') {
						// 获取所有项目的聚合统计
						statistics = await getAllProjectsAggregatedStatistics();
					} else {
						// 获取当前工作区路径
						const workspaceFolders = vscode.workspace.workspaceFolders;
						if (!workspaceFolders || workspaceFolders.length === 0) {
							webViewService.postMessage({
								type: 'usageStatistics',
								payload: null
							});
							return;
						}

						const projectPath = workspaceFolders[0].uri.fsPath;
						statistics = await getCurrentProjectStatistics(projectPath);
					}

					webViewService.postMessage({
						type: 'usageStatistics',
						payload: statistics
					});
				} catch (error) {
					logService.error(`Failed to get usage statistics: ${error}`);
					webViewService.postMessage({
						type: 'usageStatistics',
						payload: null
					});
				}
				return;
			}

			// Pass other messages to Claude Agent Service
			claudeAgentService.fromClient(message);
		});

		// Create VSCode Transport
		const transport = instantiationService.createInstance(VSCodeTransport);

		// Set transport on Claude Agent Service
		claudeAgentService.setTransport(transport);

		// Start message loop
		claudeAgentService.start();

		// Register disposables
		context.subscriptions.push(webviewProvider);

		logService.info('✓ Claude Agent Service 已连接 Transport');
		logService.info('✓ WebView Service 已注册为 View Provider');
	});

	// 6. Register commands
	const showChatCommand = vscode.commands.registerCommand('claudecodecn.showChat', () => {
		vscode.commands.executeCommand('claudecodecn.chatView.focus');
	});

	context.subscriptions.push(showChatCommand);

	// 7. Log completion
	instantiationService.invokeFunction(accessor => {
		const logService = accessor.get(ILogService);
		logService.info('✓ Claude Chat 视图已注册');
		logService.info('');
	});

	// Return extension API (if needed to expose to other extensions)
	return {
		getInstantiationService: () => instantiationService
	};
}

/**
 * Extension Deactivation
 */
export function deactivate() {
	// Clean up resources
}
