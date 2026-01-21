/**
 * 通用插件基类
 *
 * 提供插件的通用实现和工具方法
 * 子类只需实现业务逻辑，生命周期和错误处理由基类提供
 *
 * 设计模式：
 * - 模板方法模式：定义算法骨架，子类实现具体步骤
 * - 策略模式：通过钩子方法让子类自定义行为
 * - 观察者模式：通过消息总线实现解耦通信
 */

import { logger } from "../log";
import {
    MessageBus,
    MessageHandler,
    MessageSubscriptionOptions,
    MessageType,
    PluginDependency,
    PluginLifecyclePayload,
} from "./";
import { IPlugin } from "./IPlugin";
/**
 * 通用插件基类
 *
 * 职责：
 * - 实现插件的基本元数据管理
 * - 提供生命周期钩子的默认实现
 * - 提供消息订阅的辅助方法
 * - 提供通用的错误处理机制
 * - 简化子类实现
 */
export abstract class BasePlugin implements IPlugin {
    /**
     * 消息总线实例（由 PluginManager 注入）
     */
    protected messageBus?: MessageBus;

    /**
     * 订阅 ID 集合（用于自动取消订阅）
     */
    private subscriptionIds = new Set<string>();

    /**
     * 获取插件名称（唯一标识符）
     * 用于插件管理和日志记录
     */
    abstract get name(): string;

    /**
     * 获取插件显示名称
     * 用于 UI 展示（用户友好的名称）
     */
    abstract get displayName(): string;

    /**
     * 获取插件版本
     * 用于诊断和日志追踪
     */
    abstract get version(): string;

    /**
     * 获取插件描述
     * 用于 UI 帮助和文档
     */
    abstract get description(): string;

    /**
     * 检查插件是否可用
     * 通常检查依赖的工具是否已安装
     */
    abstract isAvailable(): Promise<boolean>;

    /**
     * 设置消息总线实例
     *
     * 由 PluginManager 在注册插件时调用
     * 插件通过这个 MessageBus 实例进行消息订阅和发布
     *
     * @param messageBus 消息总线实例
     */
    setMessageBus(messageBus: MessageBus): void {
        this.messageBus = messageBus;
        logger.debug(`[Plugin ${this.name}] MessageBus injected`);
    }

    /**
     * 订阅消息
     *
     * 子类可以通过此方法订阅消息，订阅会在插件停用时自动取消
     *
     * 使用示例：
     * ```typescript
     * async onActivate() {
     *     // 订阅配置变更
     *     this.subscribeMessage('config:change', (msg) => {
     *         const config = msg.payload;
     *         this.updateConfig(config);
     *     });
     *
     *     // 订阅文件变更
     *     this.subscribeMessage('file:change', (msg) => {
     *         const filePath = msg.payload.filePath;
     *         this.handleFileChange(filePath);
     *     });
     * }
     * ```
     *
     * @param type 消息类型
     * @param handler 消息处理器
     * @param options 订阅选项
     * @returns 订阅 ID
     */
    protected subscribeMessage<T = any>(
        type: MessageType,
        handler: MessageHandler<T>,
        options?: MessageSubscriptionOptions,
    ): string {
        if (!this.messageBus) {
            throw new Error(
                `[Plugin ${this.name}] MessageBus not initialized. Call setMessageBus() first.`,
            );
        }

        const subscriptionId = this.messageBus.subscribe(type, handler, options);
        this.subscriptionIds.add(subscriptionId);

        logger.debug(`[Plugin ${this.name}] Subscribed to message type "${type}"`);
        return subscriptionId;
    }

    /**
     * 取消消息订阅
     *
     * 使用示例：
     * ```typescript
     * async onDeactivate() {
     *     this.unsubscribeMessage(this.configSubId);
     *     this.unsubscribeMessage(this.fileSubId);
     * }
     * ```
     *
     * @param subscriptionId 订阅 ID
     * @returns 是否成功取消
     */
    protected unsubscribeMessage(subscriptionId: string): boolean {
        if (!this.messageBus) {
            logger.warn(
                `[Plugin ${this.name}] Message bus not available, cannot unsubscribe`,
            );
            return false;
        }

        const success = this.messageBus.unsubscribe(subscriptionId);
        if (success) {
            this.subscriptionIds.delete(subscriptionId);
            logger.debug(
                `[Plugin ${this.name}] Unsubscribed message ${subscriptionId}`,
            );
        }

        return success;
    }

    /**
     * 发布消息（简化 API）
     *
     * 快速发布消息到消息总线
     *
     * 使用示例：
     * ```typescript
     * await this.publish('task:complete', {
     *     taskId: '123',
     *     result: 'success',
     *     data: { // ... }
     * });
     * ```
     *
     * @param type 消息类型
     * @param payload 消息载荷
     * @param source 消息来源（可选）
     * @returns 处理该消息的订阅者数量
     */
    protected publish<T = any>(
        type: MessageType,
        payload: T,
        source?: string,
    ): Promise<number> {
        if (!this.messageBus) {
            throw new Error(
                `[Plugin ${this.name}] MessageBus not initialized. Call setMessageBus() first.`,
            );
        }

        const count = this.messageBus.publish(type, payload, source || this.name);
        logger.debug(
            "[Plugin " +
            this.name +
            '] Published message type "' +
            type +
            '" to ' +
            count +
            " subscribers",
        );

        return count;
    }

    /**
     * 发布消息（高级 API）
     *
     * 发布完整的 Message 对象，支持元数据
     *
     * 使用示例：
     * ```typescript
     * await this.publishMessage({
     *     type: 'task:complete',
     *     payload: {
     *         taskId: '123',
     *         result: 'success'
     *     },
     *     metadata: {
     *         duration: 1500,
     *         priority: 'high'
     *     }
     * });
     * ```
     *
     * @param message 消息对象（包含 type 和 payload 为必需）
     * @returns 处理该消息的订阅者数量
     */
    protected publishMessage<T = any>(
        message: Omit<Parameters<MessageBus["publishMessage"]>[0], "source"> & {
            source?: string;
        },
    ): Promise<number> {
        if (!this.messageBus) {
            throw new Error(
                `[Plugin ${this.name}] MessageBus not initialized. Call setMessageBus() first.`,
            );
        }

        const count = this.messageBus.publishMessage({
            ...message,
            source: message.source || this.name,
        });
        logger.debug(
            "[Plugin " +
            this.name +
            '] Published message type "' +
            message.type +
            '"',
        );

        return count;
    }

    /**
     * 发布生命周期事件
     *
     * 用于在特定的生命周期阶段发送通知
     * 通常由 PluginManager 调用，插件一般不需要直接使用
     *
     * @param eventType 事件类型（来自 PluginLifecycleEvents）
     * @param payload 事件载荷
     * @returns 处理该事件的订阅者数量
     */
    protected publishLifecycleEvent(
        eventType: string,
        payload: Partial<PluginLifecyclePayload>,
    ): Promise<number> {
        return this.publishMessage({
            type: eventType,
            payload: {
                pluginName: this.name,
                timestamp: Date.now(),
                ...payload,
            },
        });
    }

    /**
     * 获取插件依赖声明
     *
     * 默认实现：无依赖
     * 子类可以重写此方法以声明依赖
     *
     * @returns 插件依赖数组
     */
    getDependencies?(): PluginDependency[] {
        return [];
    }

    /**
     * 获取插件提供的能力列表
     *
     * 默认实现：空列表
     * 子类可以重写此方法以声明能力
     *
     * @returns 能力列表
     */
    getCapabilities?(): string[] {
        return [];
    }

    /**
     * 插件激活时的钩子（可选）
     *
     * 子类可以重写此方法以执行初始化逻辑：
     * - 初始化资源
     * - 注册事件监听器
     * - 连接外部服务
     * - 订阅消息
     *
     * 默认实现：什么都不做
     */
    onActivate?(): void | Promise<void>;

    /**
     * 插件停用时的钩子（可选）
     *
     * 子类可以重写此方法以执行清理逻辑：
     * - 清理资源
     * - 取消事件监听器
     * - 断开外部服务
     * - 取消消息订阅
     *
     * 默认实现：取消所有消息订阅
     */
    async onDeactivate(): Promise<void> {
        // 自动取消所有消息订阅
        for (const subscriptionId of this.subscriptionIds) {
            if (this.messageBus) {
                this.messageBus.unsubscribe(subscriptionId);
            }
        }
        this.subscriptionIds.clear();
    }

    /**
     * 获取插件元数据
     * @returns 插件元数据对象
     */
    getMetadata(): {
        name: string;
        displayName: string;
        version: string;
        description: string;
    } {
        return {
            name: this.name,
            displayName: this.displayName,
            version: this.version,
            description: this.description,
        };
    }

    /**
     * 执行异步操作并捕获异常
     *
     * 辅助方法，用于简化异步操作的错误处理
     *
     * @param operation 要执行的异步操作
     * @param context 操作上下文（用于日志）
     * @returns 操作结果或 undefined（如果失败）
     */
    protected async safeExecute<T>(
        operation: () => Promise<T>,
        context: string,
    ): Promise<T | undefined> {
        try {
            return await operation();
        } catch (error) {
            logger.error(`${this.name}: ${context} failed: ${String(error)}`);
            return undefined;
        }
    }

    /**
     * 执行异步操作并返回默认值
     *
     * 辅助方法，用于简化异步操作的错误处理
     *
     * @param operation 要执行的异步操作
     * @param defaultValue 默认值（操作失败时返回）
     * @param context 操作上下文（用于日志）
     * @returns 操作结果或默认值
     */
    protected async safeExecuteWithDefault<T>(
        operation: () => Promise<T>,
        defaultValue: T,
        context: string,
    ): Promise<T> {
        try {
            return await operation();
        } catch (error) {
            logger.error(
                `${this.name}: ${context} failed, using default: ${String(error)}`,
            );
            return defaultValue;
        }
    }
}
