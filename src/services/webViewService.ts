/**
 * WebView Service
 *
 * Responsibilities:
 * 1. Implement vscode.WebviewViewProvider interface
 * 2. Manage WebView instances and lifecycle
 * 3. Generate WebView HTML content
 * 4. Provide message sending and receiving interface
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { createDecorator } from '../di/instantiation';
import { ILogService } from './logService';

export const IWebViewService = createDecorator<IWebViewService>('webViewService');

export interface IWebViewService extends vscode.WebviewViewProvider {
	readonly _serviceBrand: undefined;

	/**
	 * Get current WebView instance
	 */
	getWebView(): vscode.Webview | undefined;

	/**
	 * Send message to WebView
	 */
	postMessage(message: any): void;

	/**
	 * Set message reception handler
	 */
	setMessageHandler(handler: (message: any) => void): void;
}

/**
 * WebView Service Implementation
 */
export class WebViewService implements IWebViewService {
	readonly _serviceBrand: undefined;

	private webview?: vscode.Webview;
	private messageHandler?: (message: any) => void;

	constructor(
		private readonly context: vscode.ExtensionContext,
		@ILogService private readonly logService: ILogService
	) { }

	/**
	 * Implement WebviewViewProvider.resolveWebviewView
	 */
	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken
	): void | Thenable<void> {
		this.logService.info('Starting to resolve WebView view');

		// Configure WebView options
		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [
				vscode.Uri.file(path.join(this.context.extensionPath, 'dist')),
				vscode.Uri.file(path.join(this.context.extensionPath, 'resources'))
			]
		};

		// Save WebView instance
		this.webview = webviewView.webview;

		// Connect message handler
		webviewView.webview.onDidReceiveMessage(
			message => {
				this.logService.info(`[WebView → Extension] Received message: ${message.type}`);
				if (this.messageHandler) {
					this.messageHandler(message);
				}
			},
			undefined,
			this.context.subscriptions
		);

		// Set WebView HTML (switch based on dev/prod mode)
		webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

		this.logService.info('WebView view resolution completed');
	}

	/**
	 * Get the current WebView instance
	 */
	getWebView(): vscode.Webview | undefined {
		return this.webview;
	}

	/**
	 * Send message to WebView
	 */
	postMessage(message: any): void {
		if (!this.webview) {
			throw new Error('WebView not initialized');
		}
		this.webview.postMessage({
			type: 'from-extension',
			message: message
		});
	}

	/**
	 * Set message reception handler
	 */
	setMessageHandler(handler: (message: any) => void): void {
		this.messageHandler = handler;
	}

	/**
	 * Generate WebView HTML
	 */
	private getHtmlForWebview(webview: vscode.Webview): string {
		const isDev = this.context.extensionMode === vscode.ExtensionMode.Development;
		const nonce = this.getNonce();

		if (isDev) {
			return this.getDevHtml(webview, nonce);
		}

		const extensionUri = vscode.Uri.file(this.context.extensionPath);
		const scriptUri = webview.asWebviewUri(
			vscode.Uri.joinPath(extensionUri, 'dist', 'media', 'main.js')
		);
		const styleUri = webview.asWebviewUri(
			vscode.Uri.joinPath(extensionUri, 'dist', 'media', 'style.css')
		);

		const csp = [
			`default-src 'none';`,
			`img-src ${webview.cspSource} https: data:;`,
			`style-src ${webview.cspSource} 'unsafe-inline' https://*.vscode-cdn.net;`,
			`font-src ${webview.cspSource} data:;`,
			`script-src ${webview.cspSource} 'nonce-${nonce}';`,
			`connect-src ${webview.cspSource} https:;`,
			`worker-src ${webview.cspSource} blob:;`,
		].join(' ');

		return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Claudex Chat</title>
    <link href="${styleUri}" rel="stylesheet" />
</head>
<body>
    <div id="app"></div>
    <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
	}

	private getDevHtml(webview: vscode.Webview, nonce: string): string {
		// Read dev server address (can be overridden by environment variables)
		const devServer = process.env.VITE_DEV_SERVER_URL
			|| process.env.WEBVIEW_DEV_SERVER_URL
			|| `http://localhost:${process.env.VITE_DEV_PORT || 5173}`;

		let origin = '';
		let wsUrl = '';
		try {
			const u = new URL(devServer);
			origin = `${u.protocol}//${u.hostname}${u.port ? `:${u.port}` : ''}`;
			const wsProtocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
			wsUrl = `${wsProtocol}//${u.hostname}${u.port ? `:${u.port}` : ''}`;
		} catch {
			origin = devServer; // Fallback (try to allow)
			wsUrl = 'ws://localhost:5173';
		}

		// CSP for Vite development scenario: allow connection to devServer and HMR websocket
		const csp = [
			`default-src 'none';`,
			`img-src ${webview.cspSource} https: data:;`,
			`style-src ${webview.cspSource} 'unsafe-inline' ${origin} https://*.vscode-cdn.net;`,
			`font-src ${webview.cspSource} data: ${origin};`,
			`script-src ${webview.cspSource} 'nonce-${nonce}' 'unsafe-eval' ${origin};`,
			`connect-src ${webview.cspSource} ${origin} ${wsUrl} https:;`,
			`worker-src ${webview.cspSource} blob:;`,
		].join(' ');

		const client = `${origin}/@vite/client`;
		const entry = `${origin}/src/main.ts`;

		return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <base href="${origin}/" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Claudex Chat (Dev)</title>
</head>
<body>
    <div id="app"></div>
    <script type="module" nonce="${nonce}" src="${client}"></script>
    <script type="module" nonce="${nonce}" src="${entry}"></script>
</body>
</html>`;
	}

	/**
	 * Generate random nonce
	 */
	private getNonce(): string {
		let text = '';
		const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		for (let i = 0; i < 32; i++) {
			text += possible.charAt(Math.floor(Math.random() * possible.length));
		}
		return text;
	}
}
