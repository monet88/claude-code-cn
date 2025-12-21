/**
 * VSCode Extension Entry Point
 */

import * as vscode from 'vscode';
import { InstantiationServiceBuilder } from './di/instantiationServiceBuilder';
import { registerServices, ILogService, IClaudeAgentService, IWebViewService, IClaudeSettingsService, ICCSwitchSettingsService, IConfigurationService, IMcpService, ISkillService, IAgentConfigService, ICommandConfigService, IOutputStyleConfigService } from './services/serviceRegistry';
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
		logService.info('║      Claude Chat Extension Activated     ║');
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
		const agentConfigService = accessor.get(IAgentConfigService);
		const commandConfigService = accessor.get(ICommandConfigService);
		const outputStyleConfigService = accessor.get(IOutputStyleConfigService);

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
					// Convert format for frontend compatibility
					const formattedProviders = providers.map(p => ({
						id: p.id,
						name: p.name,
						apiKey: p.settingsConfig.env.ANTHROPIC_AUTH_TOKEN || '',
						baseUrl: p.settingsConfig.env.ANTHROPIC_BASE_URL || '',
						websiteUrl: p.websiteUrl,
						isActive: false, // Will be set below
						createdAt: p.createdAt,
						mainModel: p.settingsConfig.env.ANTHROPIC_DEFAULT_MODEL || '',
						haikuModel: p.settingsConfig.env.ANTHROPIC_DEFAULT_HAIKU_MODEL || '',
						sonnetModel: p.settingsConfig.env.ANTHROPIC_DEFAULT_SONNET_MODEL || '',
						opusModel: p.settingsConfig.env.ANTHROPIC_DEFAULT_OPUS_MODEL || ''
					}));

					// Get current active provider
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
					// Build env object, only include fields with values
					const env: Record<string, string> = {
						ANTHROPIC_AUTH_TOKEN: message.payload.apiKey,
						ANTHROPIC_BASE_URL: message.payload.baseUrl
					};
					if (message.payload.mainModel) {
						env.ANTHROPIC_DEFAULT_MODEL = message.payload.mainModel;
					}
					if (message.payload.haikuModel) {
						env.ANTHROPIC_DEFAULT_HAIKU_MODEL = message.payload.haikuModel;
					}
					if (message.payload.sonnetModel) {
						env.ANTHROPIC_DEFAULT_SONNET_MODEL = message.payload.sonnetModel;
					}
					if (message.payload.opusModel) {
						env.ANTHROPIC_DEFAULT_OPUS_MODEL = message.payload.opusModel;
					}

					// Convert frontend format to CC Switch format
					const provider: ClaudeProvider = {
						id: `provider_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
						name: message.payload.name,
						settingsConfig: { env },
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

					// Build env object, only include fields with values
					const env: Record<string, string | undefined> = {
						ANTHROPIC_AUTH_TOKEN: updates.apiKey,
						ANTHROPIC_BASE_URL: updates.baseUrl
					};
					// For model fields, empty string means delete, value means set
					env.ANTHROPIC_DEFAULT_MODEL = updates.mainModel || undefined;
					env.ANTHROPIC_DEFAULT_HAIKU_MODEL = updates.haikuModel || undefined;
					env.ANTHROPIC_DEFAULT_SONNET_MODEL = updates.sonnetModel || undefined;
					env.ANTHROPIC_DEFAULT_OPUS_MODEL = updates.opusModel || undefined;

					// Convert update data to CC Switch format
					const providerUpdates: Partial<ClaudeProvider> = {
						name: updates.name,
						websiteUrl: updates.websiteUrl,
						settingsConfig: { env }
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
					vscode.window.showErrorMessage(`Failed to delete provider: ${error}`);
				}
				return;
			}

			if (message.type === 'getActiveProvider') {
				try {
					const activeProvider = await ccSwitchSettingsService.getActiveClaudeProvider();
					if (activeProvider) {
						// Convert format
						const formatted = {
							id: activeProvider.id,
							name: activeProvider.name,
							apiKey: activeProvider.settingsConfig.env.ANTHROPIC_AUTH_TOKEN || '',
							baseUrl: activeProvider.settingsConfig.env.ANTHROPIC_BASE_URL || '',
							websiteUrl: activeProvider.websiteUrl,
							isActive: true,
							mainModel: activeProvider.settingsConfig.env.ANTHROPIC_DEFAULT_MODEL || '',
							haikuModel: activeProvider.settingsConfig.env.ANTHROPIC_DEFAULT_HAIKU_MODEL || '',
							sonnetModel: activeProvider.settingsConfig.env.ANTHROPIC_DEFAULT_SONNET_MODEL || '',
							opusModel: activeProvider.settingsConfig.env.ANTHROPIC_DEFAULT_OPUS_MODEL || ''
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
					// 1. Switch to new provider (only update cc-switch config, not ~/.claude/settings.json)
					await ccSwitchSettingsService.switchClaudeProvider(id);

					// 2. Close all existing sessions, new sessions will use new provider config via env overlay
					await claudeAgentService.closeAllChannelsWithCredentialChange();
					logService.info('Closed all existing sessions, provider switch complete');

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
					vscode.window.showErrorMessage(`Failed to switch provider: ${error}`);
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

					// Show file/folder selection dialog (supports multi-select)
					const uris = await vscode.window.showOpenDialog({
						canSelectFiles: true,
						canSelectFolders: true,
						canSelectMany: true,
						openLabel: `Import to ${scope === 'global' ? 'Global' : 'Project'} Skills`
					});

					if (!uris || uris.length === 0) {
						webViewService.postMessage({
							type: 'skillImported',
							payload: { success: false, error: 'No file or folder selected' }
						});
						return;
					}

					// Batch import
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

					// Check if it's a folder
					const stats = fs.statSync(skillPath);
					if (stats.isDirectory()) {
						// Prefer skill.md, then skills.md
						const skillMdPath = path.join(skillPath, 'skill.md');
						const skillsMdPath = path.join(skillPath, 'skills.md');

						if (fs.existsSync(skillMdPath)) {
							targetPath = skillMdPath;
						} else if (fs.existsSync(skillsMdPath)) {
							targetPath = skillsMdPath;
						}
						// If neither exists, keep original path (open folder)
					}

					// Open file/folder in editor
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

			// Handle Agents management
			if (message.type === 'getAllAgents') {
				logService.info('[Extension] getAllAgents handler called');
				try {
					const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
					logService.info(`[Extension] workspaceRoot: ${workspaceRoot}`);
					const agents = await agentConfigService.getAllAgents(workspaceRoot);
					logService.info(`[Extension] Agents loaded: global=${Object.keys(agents.global).length}, local=${Object.keys(agents.local).length}`);
					webViewService.postMessage({
						type: 'allAgentsData',
						payload: agents
					});
				} catch (error) {
					logService.error(`Failed to get Agents: ${error}`);
					webViewService.postMessage({
						type: 'allAgentsData',
						payload: { global: {}, local: {} }
					});
				}
				return;
			}

			if (message.type === 'importAgent') {
				try {
					const { scope } = message.payload;
					const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

					const uris = await vscode.window.showOpenDialog({
						canSelectFiles: true,
						canSelectFolders: true,
						canSelectMany: true,
						openLabel: `Import to ${scope === 'global' ? 'Global' : 'Project'} Agents`
					});

					if (!uris || uris.length === 0) {
						webViewService.postMessage({
							type: 'agentImported',
							payload: { success: false, error: 'No file or folder selected' }
						});
						return;
					}

					const importedAgents = [];
					const errors = [];
					for (const uri of uris) {
						try {
							const agent = await agentConfigService.importAgent(uri.fsPath, scope, workspaceRoot);
							importedAgents.push(agent);
						} catch (error) {
							errors.push({ path: uri.fsPath, error: String(error) });
						}
					}

					webViewService.postMessage({
						type: 'agentImported',
						payload: {
							success: importedAgents.length > 0,
							count: importedAgents.length,
							total: uris.length,
							errors: errors.length > 0 ? errors : undefined
						}
					});
				} catch (error) {
					logService.error(`Failed to import Agent: ${error}`);
					webViewService.postMessage({
						type: 'agentImported',
						payload: { success: false, error: String(error) }
					});
				}
				return;
			}

			if (message.type === 'deleteAgent') {
				try {
					const { id, scope } = message.payload;
					const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
					const success = await agentConfigService.deleteAgent(id, scope, workspaceRoot);
					webViewService.postMessage({
						type: 'agentDeleted',
						payload: { success }
					});
				} catch (error) {
					logService.error(`Failed to delete Agent: ${error}`);
					webViewService.postMessage({
						type: 'agentDeleted',
						payload: { success: false, error: String(error) }
					});
				}
				return;
			}

			if (message.type === 'openAgent') {
				try {
					const { agentPath } = message.payload;
					const fs = await import('fs');
					const path = await import('path');

					let targetPath = agentPath;
					const stats = fs.statSync(agentPath);
					if (stats.isDirectory()) {
						const agentMdPath = path.join(agentPath, 'agent.md');
						if (fs.existsSync(agentMdPath)) {
							targetPath = agentMdPath;
						}
					}

					const uri = vscode.Uri.file(targetPath);
					await vscode.commands.executeCommand('vscode.open', uri);
					webViewService.postMessage({
						type: 'agentOpened',
						payload: { success: true }
					});
				} catch (error) {
					logService.error(`Failed to open Agent: ${error}`);
					webViewService.postMessage({
						type: 'agentOpened',
						payload: { success: false, error: String(error) }
					});
				}
				return;
			}

			// Handle Commands management
			if (message.type === 'getAllCommands') {
				logService.info('[Extension] getAllCommands handler called');
				try {
					const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
					const commands = await commandConfigService.getAllCommands(workspaceRoot);
					logService.info(`[Extension] Commands loaded: global=${Object.keys(commands.global).length}, local=${Object.keys(commands.local).length}`);
					webViewService.postMessage({
						type: 'allCommandsData',
						payload: commands
					});
				} catch (error) {
					logService.error(`Failed to get Commands: ${error}`);
					webViewService.postMessage({
						type: 'allCommandsData',
						payload: { global: {}, local: {} }
					});
				}
				return;
			}

			if (message.type === 'importCommand') {
				try {
					const { scope } = message.payload;
					const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

					const uris = await vscode.window.showOpenDialog({
						canSelectFiles: true,
						canSelectFolders: true,
						canSelectMany: true,
						openLabel: `Import to ${scope === 'global' ? 'Global' : 'Local'} Commands`
					});

					if (!uris || uris.length === 0) {
						webViewService.postMessage({
							type: 'commandImported',
							payload: { success: false, error: 'No files or folders selected' }
						});
						return;
					}

					const importedCommands = [];
					const errors = [];
					for (const uri of uris) {
						try {
							const command = await commandConfigService.importCommand(uri.fsPath, scope, workspaceRoot);
							importedCommands.push(command);
						} catch (error) {
							errors.push({ path: uri.fsPath, error: String(error) });
						}
					}

					webViewService.postMessage({
						type: 'commandImported',
						payload: {
							success: importedCommands.length > 0,
							count: importedCommands.length,
							total: uris.length,
							errors: errors.length > 0 ? errors : undefined
						}
					});
				} catch (error) {
					logService.error(`Failed to import Command: ${error}`);
					webViewService.postMessage({
						type: 'commandImported',
						payload: { success: false, error: String(error) }
					});
				}
				return;
			}

			if (message.type === 'deleteCommand') {
				try {
					const { id, scope } = message.payload;
					const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
					const success = await commandConfigService.deleteCommand(id, scope, workspaceRoot);
					webViewService.postMessage({
						type: 'commandDeleted',
						payload: { success }
					});
				} catch (error) {
					logService.error(`Failed to delete Command: ${error}`);
					webViewService.postMessage({
						type: 'commandDeleted',
						payload: { success: false, error: String(error) }
					});
				}
				return;
			}

			if (message.type === 'openCommand') {
				try {
					const { commandPath } = message.payload;
					const fs = await import('fs');
					const path = await import('path');

					let targetPath = commandPath;
					const stats = fs.statSync(commandPath);
					if (stats.isDirectory()) {
						const commandMdPath = path.join(commandPath, 'command.md');
						if (fs.existsSync(commandMdPath)) {
							targetPath = commandMdPath;
						}
					}

					const uri = vscode.Uri.file(targetPath);
					await vscode.commands.executeCommand('vscode.open', uri);
					webViewService.postMessage({
						type: 'commandOpened',
						payload: { success: true }
					});
				} catch (error) {
					logService.error(`Failed to open Command: ${error}`);
					webViewService.postMessage({
						type: 'commandOpened',
						payload: { success: false, error: String(error) }
					});
				}
				return;
			}

			// Handle Output Styles management
			if (message.type === 'getAllOutputStyles') {
				logService.info('[Extension] getAllOutputStyles handler called');
				try {
					const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
					const styles = await outputStyleConfigService.getAllOutputStyles(workspaceRoot);
					logService.info(`[Extension] Output Styles loaded: global=${Object.keys(styles.global).length}, local=${Object.keys(styles.local).length}`);
					webViewService.postMessage({
						type: 'allOutputStylesData',
						payload: styles
					});
				} catch (error) {
					logService.error(`Failed to get Output Styles: ${error}`);
					webViewService.postMessage({
						type: 'allOutputStylesData',
						payload: { global: {}, local: {} }
					});
				}
				return;
			}

			if (message.type === 'importOutputStyle') {
				try {
					const { scope } = message.payload;
					const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

					const uris = await vscode.window.showOpenDialog({
						canSelectFiles: true,
						canSelectFolders: true,
						canSelectMany: true,
						openLabel: `Import to ${scope === 'global' ? 'Global' : 'Local'} Output Styles`
					});

					if (!uris || uris.length === 0) {
						webViewService.postMessage({
							type: 'outputStyleImported',
							payload: { success: false, error: 'No files or folders selected' }
						});
						return;
					}

					const importedStyles = [];
					const errors = [];
					for (const uri of uris) {
						try {
							const style = await outputStyleConfigService.importOutputStyle(uri.fsPath, scope, workspaceRoot);
							importedStyles.push(style);
						} catch (error) {
							errors.push({ path: uri.fsPath, error: String(error) });
						}
					}

					webViewService.postMessage({
						type: 'outputStyleImported',
						payload: {
							success: importedStyles.length > 0,
							count: importedStyles.length,
							total: uris.length,
							errors: errors.length > 0 ? errors : undefined
						}
					});
				} catch (error) {
					logService.error(`Failed to import Output Style: ${error}`);
					webViewService.postMessage({
						type: 'outputStyleImported',
						payload: { success: false, error: String(error) }
					});
				}
				return;
			}

			if (message.type === 'deleteOutputStyle') {
				try {
					const { id, scope } = message.payload;
					const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
					const success = await outputStyleConfigService.deleteOutputStyle(id, scope, workspaceRoot);
					webViewService.postMessage({
						type: 'outputStyleDeleted',
						payload: { success }
					});
				} catch (error) {
					logService.error(`Failed to delete Output Style: ${error}`);
					webViewService.postMessage({
						type: 'outputStyleDeleted',
						payload: { success: false, error: String(error) }
					});
				}
				return;
			}

			if (message.type === 'openOutputStyle') {
				try {
					const { outputStylePath } = message.payload;
					const fs = await import('fs');
					const path = await import('path');

					let targetPath = outputStylePath;
					const stats = fs.statSync(outputStylePath);
					if (stats.isDirectory()) {
						const styleMdPath = path.join(outputStylePath, 'style.md');
						if (fs.existsSync(styleMdPath)) {
							targetPath = styleMdPath;
						}
					}

					const uri = vscode.Uri.file(targetPath);
					await vscode.commands.executeCommand('vscode.open', uri);
					webViewService.postMessage({
						type: 'outputStyleOpened',
						payload: { success: true }
					});
				} catch (error) {
					logService.error(`Failed to open Output Style: ${error}`);
					webViewService.postMessage({
						type: 'outputStyleOpened',
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
						// Get aggregated statistics for all projects
						statistics = await getAllProjectsAggregatedStatistics();
					} else {
						// Get current workspace path
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

		logService.info('✓ Claude Agent Service connected to Transport');
		logService.info('✓ WebView Service registered as View Provider');
	});

	// 6. Register commands
	const showChatCommand = vscode.commands.registerCommand('claudecodecn.showChat', () => {
		vscode.commands.executeCommand('claudecodecn.chatView.focus');
	});

	context.subscriptions.push(showChatCommand);

	// 7. Log completion
	instantiationService.invokeFunction(accessor => {
		const logService = accessor.get(ILogService);
		logService.info('✓ Claude Chat View registered');
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
