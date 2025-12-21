/**
 * BaseTransport - Transport Layer Abstract Interface
 *
 * Defines the basic contract for Transport to pass messages between Agent and client
 *
 * Implementations:
 * - VSCodeTransport: VSCode WebView transport implementation
 * - NestJSTransport: NestJS WebSocket transport implementation (future)
 * - ElectronTransport: Electron IPC transport implementation (future)
 *
 * Design Principles:
 * - Bidirectional communication: send() to send messages, onMessage() to receive messages
 * - Platform agnostic: does not depend on specific host environment APIs
 * - Simple abstraction: defines only the core transport capabilities
 */

/**
 * Transport 接口
 *
 * 用于在 Claude Agent 和客户端（WebView/WebSocket/IPC）之间传递消息
 */
export interface ITransport {
    /**
     * 发送消息到客户端
     *
     * @param message - 要发送的消息对象
     */
    send(message: any): void;

    /**
     * 监听来自客户端的消息
     *
     * @param callback - 消息接收回调函数
     */
    onMessage(callback: (message: any) => void): void;
}

/**
 * Transport 抽象基类（可选）
 *
 * 提供一些通用功能，具体实现可以继承此类
 */
export abstract class BaseTransport implements ITransport {
    protected messageCallback?: (message: any) => void;

    /**
     * 发送消息（由子类实现）
     */
    abstract send(message: any): void;

    /**
     * 注册消息监听器
     */
    onMessage(callback: (message: any) => void): void {
        this.messageCallback = callback;
    }

    /**
     * 触发消息回调（供子类调用）
     */
    protected triggerMessage(message: any): void {
        if (this.messageCallback) {
            this.messageCallback(message);
        }
    }
}
