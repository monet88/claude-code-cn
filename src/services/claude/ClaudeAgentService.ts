/**
 * ClaudeAgentService - Claude Agent Core Orchestration Service
 *
 * Responsibilities:
 * 1. Manage multiple Claude sessions (channels)
 * 2. Receive and distribute messages from Transport
 * 3. Start and control Claude sessions (launchClaude, interruptClaude)
 * 4. Route requests to corresponding handlers
 * 5. RPC request-response management
 *
 * Dependencies:
 * - IClaudeSdkService: SDK calls
 * - IClaudeSessionService: Session history
 * - ILogService: Logging
 * - Other base services
 */

import { createDecorator } from '../../di/instantiation';
import { ILogService } from '../logService';
import { IConfigurationService } from '../configurationService';
import { IWorkspaceService } from '../workspaceService';
import { IFileSystemService } from '../fileSystemService';
import { INotificationService } from '../notificationService';
import { ITerminalService } from '../terminalService';
import { ITabsAndEditorsService } from '../tabsAndEditorsService';
import { IClaudeSdkService } from './ClaudeSdkService';
import { IClaudeSessionService } from './ClaudeSessionService';
import { AsyncStream, ITransport } from './transport';
import { HandlerContext } from './handlers/types';
import { IWebViewService } from '../webViewService';

// Message type imports
import type {
    WebViewToExtensionMessage,
    ExtensionToWebViewMessage,
    RequestMessage,
    ResponseMessage,
    ExtensionRequest,
    ToolPermissionRequest,
    ToolPermissionResponse,
} from '../../shared/messages';

// SDK type imports
import type {
    SDKMessage,
    SDKUserMessage,
    Query,
    PermissionResult,
    PermissionUpdate,
    CanUseTool,
    PermissionMode,
} from '@anthropic-ai/claude-agent-sdk';

// Handlers imports
import {
    handleInit,
    handleGetClaudeState,
    handleGetMcpServers,
    handleGetAssetUris,
    handleOpenFile,
    handleGetCurrentSelection,
    handleShowNotification,
    handleNewConversationTab,
    handleRenameTab,
    handleOpenDiff,
    handleListSessions,
    handleGetSession,
    handleExec,
    handleListFiles,
    handleOpenContent,
    handleOpenURL,
    handleOpenConfigFile,
    // handleOpenClaudeInTerminal,
    // handleGetAuthStatus,
    // handleLogin,
    // handleSubmitOAuthCode,
} from './handlers/handlers';

export const IClaudeAgentService = createDecorator<IClaudeAgentService>('claudeAgentService');

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Channel object: Manages a single Claude session
 */
export interface Channel {
    in: AsyncStream<SDKUserMessage>;  // Input stream: Send user messages to SDK
    query: Query;                      // Query object: Receive responses from SDK
    permissionMode: PermissionMode;    // Current permission mode (used for canUseTool callback)
}

/**
 * Request handler
 */
interface RequestHandler {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
}

/**
 * Claude Agent service interface
 */
export interface IClaudeAgentService {
    readonly _serviceBrand: undefined;

    /**
     * Set Transport
     */
    setTransport(transport: ITransport): void;

    /**
     * Start message loop
     */
    start(): void;

    /**
     * Receive messages from client
     */
    fromClient(message: WebViewToExtensionMessage): Promise<void>;

    /**
     * Launch Claude session
     */
    launchClaude(
        channelId: string,
        resume: string | null,
        cwd: string,
        model: string | null,
        permissionMode: string,
        thinkingLevel: string | null
    ): Promise<void>;

    /**
     * Interrupt Claude session
     */
    interruptClaude(channelId: string): Promise<void>;

    /**
     * Close channel
     */
    closeChannel(channelId: string, sendNotification: boolean, error?: string): void;

    /**
     * Close all channels
     */
    closeAllChannels(): Promise<void>;

    /**
     * Close all channels when credentials change
     */
    closeAllChannelsWithCredentialChange(): Promise<void>;

    /**
     * Process request
     */
    processRequest(request: RequestMessage, signal: AbortSignal): Promise<unknown>;

    /**
     * Set permission mode
     */
    setPermissionMode(channelId: string, mode: PermissionMode): Promise<void>;

    /**
     * Set Thinking Level
     */
    setThinkingLevel(channelId: string, level: string): Promise<void>;

    /**
     * Set model
     */
    setModel(channelId: string, model: string): Promise<void>;

    /**
     * Get Channel
     */
    getChannel(channelId: string): Channel | undefined;

    /**
     * Get MCP server status
     */
    getMcpServerStatus(channelId: string): Promise<any[]>;

    /**
     * Shutdown
     */
    shutdown(): Promise<void>;
}

// ============================================================================
// ClaudeAgentService Implementation
// ============================================================================

/**
 * Claude Agent service implementation
 */
export class ClaudeAgentService implements IClaudeAgentService {
    readonly _serviceBrand: undefined;

    // Transport adapter
    private transport?: ITransport;

    // Session management
    private channels = new Map<string, Channel>();

    // Receive message stream from client
    private fromClientStream = new AsyncStream<WebViewToExtensionMessage>();

    // Pending requests awaiting response
    private outstandingRequests = new Map<string, RequestHandler>();

    // Abort controllers
    private abortControllers = new Map<string, AbortController>();

    // Handler context (cached)
    private handlerContext: HandlerContext;

    // Thinking Level configuration
    private thinkingLevel: string = 'default_on';

    constructor(
        @ILogService private readonly logService: ILogService,
        @IConfigurationService private readonly configService: IConfigurationService,
        @IWorkspaceService private readonly workspaceService: IWorkspaceService,
        @IFileSystemService private readonly fileSystemService: IFileSystemService,
        @INotificationService private readonly notificationService: INotificationService,
        @ITerminalService private readonly terminalService: ITerminalService,
        @ITabsAndEditorsService private readonly tabsAndEditorsService: ITabsAndEditorsService,
        @IClaudeSdkService private readonly sdkService: IClaudeSdkService,
        @IClaudeSessionService private readonly sessionService: IClaudeSessionService,
        @IWebViewService private readonly webViewService: IWebViewService
    ) {
        // Build Handler context
        this.handlerContext = {
            logService: this.logService,
            configService: this.configService,
            workspaceService: this.workspaceService,
            fileSystemService: this.fileSystemService,
            notificationService: this.notificationService,
            terminalService: this.terminalService,
            tabsAndEditorsService: this.tabsAndEditorsService,
            sessionService: this.sessionService,
            sdkService: this.sdkService,
            agentService: this,  // Self reference
            webViewService: this.webViewService,
        };
    }

    /**
     * Set Transport
     */
    setTransport(transport: ITransport): void {
        this.transport = transport;

        // Listen for messages from client and push to queue
        transport.onMessage(async (message) => {
            await this.fromClient(message);
        });

        this.logService.info('[ClaudeAgentService] Transport connected');
    }

    /**
     * Start message loop
     */
    start(): void {
        // Start message loop
        this.readFromClient();

        this.logService.info('[ClaudeAgentService] Message loop started');
    }

    /**
     * Receive messages from client
     */
    async fromClient(message: WebViewToExtensionMessage): Promise<void> {
        this.fromClientStream.enqueue(message);
    }

    /**
     * Read and dispatch messages from client
     */
    private async readFromClient(): Promise<void> {
        try {
            for await (const message of this.fromClientStream) {
                switch (message.type) {
                    case "launch_claude":
                        await this.launchClaude(
                            message.channelId,
                            message.resume || null,
                            message.cwd || this.getCwd(),
                            message.model || null,
                            message.permissionMode || "acceptEdits",
                            message.thinkingLevel || null
                        );
                        break;

                    case "close_channel":
                        this.closeChannel(message.channelId, false);
                        break;

                    case "interrupt_claude":
                        await this.interruptClaude(message.channelId);
                        break;

                    case "io_message":
                        this.transportMessage(
                            message.channelId,
                            message.message,
                            message.done
                        );
                        break;

                    case "request":
                        this.handleRequest(message);
                        break;

                    case "response":
                        this.handleResponse(message);
                        break;

                    case "cancel_request":
                        this.handleCancellation(message.targetRequestId);
                        break;

                    default:
                        this.logService.error(`Unknown message type: ${(message as { type: string }).type}`);
                }
            }
        } catch (error) {
            this.logService.error(`[ClaudeAgentService] Error in readFromClient: ${error}`);
        }
    }

    /**
     * Launch Claude session
     */
    async launchClaude(
        channelId: string,
        resume: string | null,
        cwd: string,
        model: string | null,
        permissionMode: string,
        thinkingLevel: string | null
    ): Promise<void> {
        // Save thinkingLevel
        if (thinkingLevel) {
            this.thinkingLevel = thinkingLevel;
        }

        // Calculate maxThinkingTokens
        const maxThinkingTokens = this.getMaxThinkingTokens(this.thinkingLevel);

        this.logService.info('');
        this.logService.info('╔════════════════════════════════════════╗');
        this.logService.info('║  Starting Claude Session                ║');
        this.logService.info('╚════════════════════════════════════════╝');
        this.logService.info(`  Channel ID: ${channelId}`);
        this.logService.info(`  Resume: ${resume || 'null'}`);
        this.logService.info(`  CWD: ${cwd}`);
        this.logService.info(`  Model: ${model || 'null'}`);
        this.logService.info(`  Permission: ${permissionMode}`);
        this.logService.info(`  Thinking Level: ${this.thinkingLevel}`);
        this.logService.info(`  Max Thinking Tokens: ${maxThinkingTokens}`);
        this.logService.info('');

        // Check if already exists
        if (this.channels.has(channelId)) {
            this.logService.error(`❌ Channel already exists: ${channelId}`);
            throw new Error(`Channel already exists: ${channelId}`);
        }

        try {
            // 1. Create input stream
            this.logService.info('📝 Step 1: Create input stream');
            const inputStream = new AsyncStream<SDKUserMessage>();
            this.logService.info('  ✓ Input stream created');

            // 2. Call spawnClaude
            this.logService.info('');
            this.logService.info('📝 Step 2: Call spawnClaude()');
            // Create channel object first (permissionMode can be updated at runtime)
            const channel: Channel = {
                in: inputStream,
                query: null as any,  // Set later
                permissionMode: permissionMode as PermissionMode
            };

            // Store in channels Map (store early so canUseTool callback can access it)
            this.channels.set(channelId, channel);

            const query = await this.spawnClaude(
                inputStream,
                resume,
                async (toolName, input, options) => {
                    // Read current permissionMode from channel (supports runtime updates)
                    const currentMode = this.channels.get(channelId)?.permissionMode;

                    // Agent mode (acceptEdits): Auto-allow all tools, similar to --dangerously-skip-permissions
                    if (currentMode === 'acceptEdits') {
                        this.logService.info(`🔧 [Agent Mode] Auto-allowed tool: ${toolName}`);
                        return { behavior: 'allow' as const };
                    }

                    // Other modes: Request WebView confirmation via RPC
                    this.logService.info(`🔧 Tool permission request: ${toolName} (mode: ${currentMode})`);
                    return this.requestToolPermission(
                        channelId,
                        toolName,
                        input,
                        options.suggestions || []
                    );
                },
                model,
                cwd,
                permissionMode,
                maxThinkingTokens
            );

            // Update channel's query
            channel.query = query;
            this.logService.info('  ✓ spawnClaude() completed, Query object created');

            // 3. Channel registered
            this.logService.info('');
            this.logService.info('📝 Step 3: Channel registered');
            this.logService.info(`  ✓ Channel registered, currently ${this.channels.size} active sessions`);

            // 4. Start listening task: Forward SDK output to client
            this.logService.info('');
            this.logService.info('📝 Step 4: Start message forwarding loop');
            (async () => {
                try {
                    this.logService.info(`  → Start listening to Query output...`);
                    let messageCount = 0;

                    for await (const message of query) {
                        messageCount++;
                        this.logService.info(`  ← Received message #${messageCount}: ${message.type}`);

                        this.transport!.send({
                            type: "io_message",
                            channelId,
                            message,
                            done: false
                        });
                    }

                    // Normal end
                    this.logService.info(`  ✓ Query output completed, total ${messageCount} messages`);
                    this.closeChannel(channelId, true);
                } catch (error) {
                    // Error
                    this.logService.error(`  ❌ Query output error: ${error}`);
                    if (error instanceof Error) {
                        this.logService.error(`     Stack: ${error.stack}`);
                    }
                    this.closeChannel(channelId, true, String(error));
                }
            })();

            this.logService.info('');
            this.logService.info('✓ Claude session started successfully');
            this.logService.info('════════════════════════════════════════');
            this.logService.info('');
        } catch (error) {
            this.logService.error('');
            this.logService.error('❌❌❌ Claude session launch failed ❌❌❌');
            this.logService.error(`Channel: ${channelId}`);
            this.logService.error(`Error: ${error}`);
            if (error instanceof Error) {
                this.logService.error(`Stack: ${error.stack}`);
            }
            this.logService.error('════════════════════════════════════════');
            this.logService.error('');

            this.closeChannel(channelId, true, String(error));
            throw error;
        }
    }

    /**
     * Interrupt Claude session
     */
    async interruptClaude(channelId: string): Promise<void> {
        const channel = this.channels.get(channelId);
        if (!channel) {
            this.logService.warn(`[ClaudeAgentService] Channel does not exist: ${channelId}`);
            return;
        }

        try {
            await this.sdkService.interrupt(channel.query);
            this.logService.info(`[ClaudeAgentService] Interrupted Channel: ${channelId}`);
        } catch (error) {
            this.logService.error(`[ClaudeAgentService] Interrupt failed:`, error);
        }
    }

    /**
     * Close channel
     */
    closeChannel(channelId: string, sendNotification: boolean, error?: string): void {
        this.logService.info(`[ClaudeAgentService] Closing Channel: ${channelId}`);

        // 1. Send close notification
        if (sendNotification && this.transport) {
            this.transport.send({
                type: "close_channel",
                channelId,
                error
            });
        }

        // 2. Clean up channel
        const channel = this.channels.get(channelId);
        if (channel) {
            channel.in.done();
            try {
                channel.query.return?.();
            } catch (e) {
                this.logService.warn(`Error cleaning up channel: ${e}`);
            }
            this.channels.delete(channelId);
        }

        this.logService.info(`  ✓ Channel closed, remaining ${this.channels.size} active sessions`);
    }

    /**
     * Launch Claude SDK
     *
     * @param inputStream Input stream for sending user messages
     * @param resume Resume session ID
     * @param canUseTool Tool permission callback
     * @param model Model name
     * @param cwd Working directory
     * @param permissionMode Permission mode
     * @param maxThinkingTokens Maximum thinking tokens
     * @returns SDK Query object
     */
    protected async spawnClaude(
        inputStream: AsyncStream<SDKUserMessage>,
        resume: string | null,
        canUseTool: CanUseTool,
        model: string | null,
        cwd: string,
        permissionMode: string,
        maxThinkingTokens: number
    ): Promise<Query> {
        return this.sdkService.query({
            inputStream,
            resume,
            canUseTool,
            model,
            cwd,
            permissionMode,
            maxThinkingTokens
        });
    }

    /**
     * Close all sessions
     */
    async closeAllChannels(): Promise<void> {
        const promises = Array.from(this.channels.keys()).map(channelId =>
            this.closeChannel(channelId, false)
        );
        await Promise.all(promises);
        this.channels.clear();
    }

    /**
     * Close all channels when credentials change
     */
    async closeAllChannelsWithCredentialChange(): Promise<void> {
        const promises = Array.from(this.channels.keys()).map(channelId =>
            this.closeChannel(channelId, true)
        );
        await Promise.all(promises);
        this.channels.clear();
    }

    /**
     * Transport message to Channel
     */
    private transportMessage(
        channelId: string,
        message: SDKMessage | SDKUserMessage,
        done: boolean
    ): void {
        const channel = this.channels.get(channelId);
        if (!channel) {
            throw new Error(`Channel not found: ${channelId}`);
        }

        // Add user message to input stream
        if (message.type === "user") {
            channel.in.enqueue(message as SDKUserMessage);
        }

        // If marked as done, close input stream
        if (done) {
            channel.in.done();
        }
    }

    /**
     * Handle request from client
     */
    private async handleRequest(message: RequestMessage): Promise<void> {
        const abortController = new AbortController();
        this.abortControllers.set(message.requestId, abortController);

        try {
            const response = await this.processRequest(message, abortController.signal);
            this.transport!.send({
                type: "response",
                requestId: message.requestId,
                response
            });
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            this.transport!.send({
                type: "response",
                requestId: message.requestId,
                response: {
                    type: "error",
                    error: errorMsg
                }
            });
        } finally {
            this.abortControllers.delete(message.requestId);
        }
    }

    /**
     * Process request
     */
    async processRequest(message: RequestMessage, signal: AbortSignal): Promise<unknown> {
        const request = message.request;
        const channelId = message.channelId;

        if (!request || typeof request !== 'object' || !('type' in request)) {
            throw new Error('Invalid request format');
        }

        this.logService.info(`[ClaudeAgentService] Processing request: ${request.type}`);

        // Route table: Map request types to handlers
        switch (request.type) {
            // Initialization and state
            case "init":
                return handleInit(request, this.handlerContext);

            case "get_claude_state":
                return handleGetClaudeState(request, this.handlerContext);

            case "get_mcp_servers":
                return handleGetMcpServers(request, this.handlerContext, channelId);

            case "get_asset_uris":
                return handleGetAssetUris(request, this.handlerContext);

            // Editor operations
            case "open_file":
                return handleOpenFile(request, this.handlerContext);

            case "get_current_selection":
                return handleGetCurrentSelection(this.handlerContext);

            case "open_diff":
                return handleOpenDiff(request, this.handlerContext, signal);

            case "open_content":
                return handleOpenContent(request, this.handlerContext, signal);

            // UI operations
            case "show_notification":
                return handleShowNotification(request, this.handlerContext);

            case "new_conversation_tab":
                return handleNewConversationTab(request, this.handlerContext);

            case "rename_tab":
                return handleRenameTab(request, this.handlerContext);

            case "open_url":
                return handleOpenURL(request, this.handlerContext);

            // Settings
            case "set_permission_mode": {
                if (!channelId) {
                    throw new Error('channelId is required for set_permission_mode');
                }
                const permReq = request as any;
                await this.setPermissionMode(channelId, permReq.mode);
                return {
                    type: "set_permission_mode_response",
                    success: true
                };
            }

            case "set_model": {
                if (!channelId) {
                    throw new Error('channelId is required for set_model');
                }
                const modelReq = request as any;
                const targetModel = modelReq.model?.value ?? "";
                if (!targetModel) {
                    throw new Error("Invalid model selection");
                }
                await this.setModel(channelId, targetModel);
                return {
                    type: "set_model_response",
                    success: true
                };
            }

            case "set_thinking_level": {
                if (!channelId) {
                    throw new Error('channelId is required for set_thinking_level');
                }
                const thinkReq = request as any;
                await this.setThinkingLevel(channelId, thinkReq.thinkingLevel);
                return {
                    type: "set_thinking_level_response"
                };
            }

            case "open_config_file":
                return handleOpenConfigFile(request, this.handlerContext);

            // Session management
            case "list_sessions_request":
                return handleListSessions(request, this.handlerContext);

            case "get_session_request":
                return handleGetSession(request, this.handlerContext);

            // File operations
            case "list_files_request":
                return handleListFiles(request, this.handlerContext);

            // Process operations
            case "exec":
                return handleExec(request, this.handlerContext);

            // case "open_claude_in_terminal":
            //     return handleOpenClaudeInTerminal(request, this.handlerContext);

            // Authentication
            // case "get_auth_status":
            //     return handleGetAuthStatus(request, this.handlerContext);

            // case "login":
            //     return handleLogin(request, this.handlerContext);

            // case "submit_oauth_code":
            //     return handleSubmitOAuthCode(request, this.handlerContext);

            default:
                throw new Error(`Unknown request type: ${request.type}`);
        }
    }

    /**
     * Handle response
     */
    private handleResponse(message: ResponseMessage): void {
        const handler = this.outstandingRequests.get(message.requestId);
        if (handler) {
            const response = message.response;
            if (typeof response === 'object' && response !== null && 'type' in response && response.type === "error") {
                handler.reject(new Error((response as { error: string }).error));
            } else {
                handler.resolve(response);
            }
            this.outstandingRequests.delete(message.requestId);
        } else {
            this.logService.warn(`[ClaudeAgentService] Request handler not found: ${message.requestId}`);
        }
    }

    /**
     * Handle cancellation
     */
    private handleCancellation(requestId: string): void {
        const abortController = this.abortControllers.get(requestId);
        if (abortController) {
            abortController.abort();
            this.abortControllers.delete(requestId);
        }
    }

    /**
     * Send request to client
     */
    protected sendRequest<TRequest extends ExtensionRequest, TResponse>(
        channelId: string,
        request: TRequest
    ): Promise<TResponse> {
        const requestId = this.generateId();

        return new Promise<TResponse>((resolve, reject) => {
            // Register Promise handlers
            this.outstandingRequests.set(requestId, { resolve, reject });

            // Send request
            this.transport!.send({
                type: "request",
                channelId,
                requestId,
                request
            } as RequestMessage);
        }).finally(() => {
            // Cleanup
            this.outstandingRequests.delete(requestId);
        });
    }

    /**
     * Request tool permission
     */
    protected async requestToolPermission(
        channelId: string,
        toolName: string,
        inputs: Record<string, unknown>,
        suggestions: PermissionUpdate[]
    ): Promise<PermissionResult> {
        const request: ToolPermissionRequest = {
            type: "tool_permission_request",
            toolName,
            inputs,
            suggestions
        };

        const response = await this.sendRequest<ToolPermissionRequest, ToolPermissionResponse>(
            channelId,
            request
        );

        return response.result;
    }

    /**
     * Shutdown service
     */
    async shutdown(): Promise<void> {
        await this.closeAllChannels();
        this.fromClientStream.done();
    }

    // ========================================================================
    // Utility Methods
    // ========================================================================

    /**
     * Generate unique ID
     */
    private generateId(): string {
        return Math.random().toString(36).substring(2, 15);
    }

    /**
     * Get current working directory
     */
    private getCwd(): string {
        return this.workspaceService.getDefaultWorkspaceFolder()?.uri.fsPath || process.cwd();
    }

    /**
     * Get maxThinkingTokens (based on thinking level)
     */
    private getMaxThinkingTokens(level: string): number {
        return level === 'off' ? 0 : 31999;
    }

    /**
     * Set thinking level
     */
    async setThinkingLevel(channelId: string, level: string): Promise<void> {
        this.thinkingLevel = level;

        // Update running channel
        const channel = this.channels.get(channelId);
        if (channel?.query) {
            const maxTokens = this.getMaxThinkingTokens(level);
            await channel.query.setMaxThinkingTokens(maxTokens);
            this.logService.info(`[setThinkingLevel] Updated channel ${channelId} to ${level} (${maxTokens} tokens)`);
        }
    }

    /**
     * Set permission mode
     */
    async setPermissionMode(channelId: string, mode: PermissionMode): Promise<void> {
        const channel = this.channels.get(channelId);
        if (!channel) {
            this.logService.warn(`[setPermissionMode] Channel ${channelId} not found`);
            throw new Error(`Channel ${channelId} not found`);
        }

        // Update channel's permissionMode (canUseTool callback will read this value)
        channel.permissionMode = mode;

        // Also update SDK's permissionMode
        await channel.query.setPermissionMode(mode);
        this.logService.info(`[setPermissionMode] Set channel ${channelId} to mode: ${mode}`);
    }

    /**
     * Set model
     */
    async setModel(channelId: string, model: string): Promise<void> {
        const channel = this.channels.get(channelId);
        if (!channel) {
            this.logService.warn(`[setModel] Channel ${channelId} not found`);
            throw new Error(`Channel ${channelId} not found`);
        }

        // Set model to channel
        await channel.query.setModel(model);

        // Save to configuration
        await this.configService.updateValue('claudecodecn.selectedModel', model);

        this.logService.info(`[setModel] Set channel ${channelId} to model: ${model}`);
    }

    /**
     * Get Channel
     */
    getChannel(channelId: string): Channel | undefined {
        return this.channels.get(channelId);
    }

    /**
     * Get MCP server status
     */
    async getMcpServerStatus(channelId: string): Promise<any[]> {
        const channel = this.channels.get(channelId);
        if (!channel) {
            this.logService.warn(`[getMcpServerStatus] Channel ${channelId} not found`);
            return [];
        }

        try {
            const status = await channel.query.mcpServerStatus?.();
            this.logService.info(`[getMcpServerStatus] Got ${status?.length || 0} MCP servers`);
            return status || [];
        } catch (error) {
            this.logService.error(`[getMcpServerStatus] Error: ${error}`);
            return [];
        }
    }
}
