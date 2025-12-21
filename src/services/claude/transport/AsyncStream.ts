/**
 * AsyncStream - Manually controlled asynchronous iterator
 *
 * Implements producer-consumer pattern for:
 * 1. Extension receiving messages from WebView
 * 2. Extension sending user messages to SDK
 * 3. WebView receiving messages from Extension
 *
 * Features:
 * - Supports asynchronous iteration (for await...of)
 * - Automatic backpressure control (queue buffering)
 * - Manually end the stream
 * - Supports error propagation
 */

export class AsyncStream<T> implements AsyncIterable<T>, AsyncIterator<T> {
    private queue: T[] = [];
    private readResolve?: (value: IteratorResult<T>) => void;
    private readReject?: (error: any) => void;
    private isDone = false;
    private hasError?: any;
    private started = false;
    private returned?: () => void;

    constructor(returned?: () => void) {
        this.returned = returned;
    }

    /**
     * 实现异步迭代器协议
     */
    [Symbol.asyncIterator](): AsyncIterator<T> {
        if (this.started) {
            throw new Error("Stream can only be iterated once");
        }
        this.started = true;
        return this;
    }

    /**
     * 获取下一个值（消费者 API）
     */
    async next(): Promise<IteratorResult<T>> {
        // 1. 如果队列有数据，立即返回
        if (this.queue.length > 0) {
            return { done: false, value: this.queue.shift()! };
        }

        // 2. 如果流已结束，返回完成标志
        if (this.isDone) {
            return { done: true, value: undefined as any };
        }

        // 3. 如果有错误，拒绝 Promise
        if (this.hasError) {
            throw this.hasError;
        }

        // 4. 等待新数据到来
        return new Promise<IteratorResult<T>>((resolve, reject) => {
            this.readResolve = resolve;
            this.readReject = reject;
        });
    }

    /**
     * 生产数据（生产者 API）
     */
    enqueue(value: T): void {
        // 如果有消费者在等待，直接满足
        if (this.readResolve) {
            const resolve = this.readResolve;
            this.readResolve = undefined;
            this.readReject = undefined;
            resolve({ done: false, value });
        } else {
            // 否则加入队列
            this.queue.push(value);
        }
    }

    /**
     * 标记流为完成状态
     */
    done(): void {
        this.isDone = true;

        // 如果有消费者在等待，通知完成
        if (this.readResolve) {
            const resolve = this.readResolve;
            this.readResolve = undefined;
            this.readReject = undefined;
            resolve({ done: true, value: undefined as any });
        }
    }

    /**
     * 设置错误状态
     */
    error(error: any): void {
        this.hasError = error;

        // 如果有消费者在等待，拒绝 Promise
        if (this.readReject) {
            const reject = this.readReject;
            this.readResolve = undefined;
            this.readReject = undefined;
            reject(error);
        }
    }

    /**
     * 清理资源
     */
    async return(): Promise<IteratorResult<T>> {
        this.isDone = true;
        if (this.returned) {
            this.returned();
        }
        return { done: true, value: undefined as any };
    }

    /**
     * 静态工厂方法：从数组创建流
     */
    static from<T>(items: T[]): AsyncStream<T> {
        const stream = new AsyncStream<T>();
        for (const item of items) {
            stream.enqueue(item);
        }
        stream.done();
        return stream;
    }
}

/**
 * 使用示例：
 *
 * // 生产者
 * const stream = new AsyncStream<string>();
 * setTimeout(() => stream.enqueue("msg1"), 100);
 * setTimeout(() => stream.enqueue("msg2"), 200);
 * setTimeout(() => stream.done(), 300);
 *
 * // 消费者
 * for await (const msg of stream) {
 *     console.log(msg);  // "msg1", "msg2"
 * }
 */
