/**
 * VSCode Extension Entry Point
 */

import * as vscode from 'vscode';
import { InstantiationServiceBuilder } from './di/instantiationServiceBuilder';
import { registerServices, ILogService, IClaudeAgentService, IWebViewService, IClaudeSettingsService, ICCSwitchSettingsService, IConfigurationService } from './services/serviceRegistry';
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
