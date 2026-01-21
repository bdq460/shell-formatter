/**
 * 消息总线
 *
 * 实现发布-订阅模式（发布者-订阅者模式）
 * 用于插件之间的解耦通信
 *
 * 核心功能：
 * - 订阅消息类型
 * - 发布消息
 * - 取消订阅
 * - 消息过滤和优先级
 */

import { logger } from "../log";
import {
    Message,
    MessageBusConfig,
    MessageBusStats,
    MessageHandler,
    MessagePayload,
    MessageSubscription,
    MessageSubscriptionOptions,
    MessageType,
} from "./types";
/**
 * 消息总线
 *
 * 职责：
 * - 管理消息订阅
 * - 分发消息到订阅者
 * - 处理订阅生命周期
 */
export class MessageBus {
    private subscriptions = new Map<MessageType, MessageSubscription[]>();
    private stats = {
        messagesSent: 0,
        messagesProcessed: 0,
        failures: 0,
    };
    private config: MessageBusConfig;
    private subscriptionIdCounter = 0;

    /**
     * 构造函数
     * @param config 配置选项
     */
    constructor(config: MessageBusConfig = {}) {
        this.config = {
            enableLogging: false,
            enableMetrics: true,
            maxSubscriptions: 0,
            handlerTimeout: 0,
            ...config,
        };
    }

    /**
     * 订阅消息
     *
     * @param type 消息类型
     * @param handler 消息处理器
     * @param options 订阅选项
     * @returns 订阅 ID（用于取消订阅）
     */
    subscribe<T = any>(
        type: MessageType,
        handler: MessageHandler<T>,
        options: MessageSubscriptionOptions = {},
    ): string {
        // 检查订阅数限制
        const currentTotal = Array.from(this.subscriptions.values()).flat().length;
        const maxSubs = this.config.maxSubscriptions ?? 0;
        if (maxSubs > 0 && currentTotal >= maxSubs) {
            throw new Error(`Maximum subscription limit reached: ${maxSubs}`);
        }

        // 生成订阅 ID
        const subscriptionId = `sub_${this.subscriptionIdCounter++}`;

        // 创建订阅
        const subscription: MessageSubscription = {
            id: subscriptionId,
            type,
            handler,
            options: {
                once: false,
                priority: 0,
                ...options,
            },
        };

        // 添加到订阅列表
        if (!this.subscriptions.has(type)) {
            this.subscriptions.set(type, []);
        }
        this.subscriptions.get(type)!.push(subscription);

        if (this.config.enableLogging) {
            logger.debug(
                `[MessageBus] Subscribed to "${type}" (id: ${subscriptionId})`,
            );
        }

        return subscriptionId;
    }

    /**
     * 一次性订阅消息
     *
     * @param type 消息类型
     * @param handler 消息处理器
     * @param options 订阅选项
     * @returns 订阅 ID
     */
    once<T = any>(
        type: MessageType,
        handler: MessageHandler<T>,
        options: MessageSubscriptionOptions = {},
    ): string {
        return this.subscribe(type, handler, {
            ...options,
            once: true,
        });
    }

    /**
     * 取消订阅
     *
     * @param subscriptionId 订阅 ID
     * @returns 是否成功取消
     */
    unsubscribe(subscriptionId: string): boolean {
        for (const [type, subscriptions] of this.subscriptions.entries()) {
            const index = subscriptions.findIndex((sub) => sub.id === subscriptionId);
            if (index !== -1) {
                subscriptions.splice(index, 1);

                // 如果该类型没有订阅了，删除该类型
                if (subscriptions.length === 0) {
                    this.subscriptions.delete(type);
                }

                if (this.config.enableLogging) {
                    logger.debug(
                        `[MessageBus] Unsubscribed from "${type}" (id: ${subscriptionId})`,
                    );
                }

                return true;
            }
        }

        if (this.config.enableLogging) {
            logger.warn(`[MessageBus] Subscription not found: ${subscriptionId}`);
        }

        return false;
    }

    /**
     * 取消指定类型的所有订阅
     *
     * @param type 消息类型
     * @returns 取消的订阅数量
     */
    unsubscribeAll(type: MessageType): number {
        const subscriptions = this.subscriptions.get(type);
        if (!subscriptions) {
            return 0;
        }

        const count = subscriptions.length;
        this.subscriptions.delete(type);

        if (this.config.enableLogging) {
            console.log(
                `[MessageBus] Unsubscribed ${count} subscriptions from "${type}"`,
            );
        }

        return count;
    }

    /**
     * 清除所有订阅
     */
    clear(): void {
        const total = Array.from(this.subscriptions.values()).flat().length;
        this.subscriptions.clear();

        if (this.config.enableLogging) {
            console.log(`[MessageBus] Cleared ${total} subscriptions`);
        }
    }

    /**
     * 发布消息（简化 API）
     *
     * 适用于简单场景，快速发布消息
     *
     * 使用示例：
     * ```typescript
     * await messageBus.publish('config:change', { indent: 4 }, 'settings');
     * ```
     *
     * @param type 消息类型
     * @param payload 消息载荷
     * @param source 消息来源（可选）
     * @returns 处理该消息的订阅者数量
     */
    async publish<T = any>(
        type: MessageType,
        payload: MessagePayload<T>,
        source?: string,
    ): Promise<number> {
        return this.publishMessage({
            type,
            payload,
            source,
        });
    }

    /**
     * 发布消息（高级 API）
     *
     * 支持完整的 Message 对象，包含所有元数据
     * 适用于需要更多控制和信息的场景
     *
     * 使用示例：
     * ```typescript
     * await messageBus.publishMessage({
     *     type: 'task:complete',
     *     payload: { taskId: '123', result: 'success' },
     *     source: 'scheduler',
     *     metadata: { duration: 1500, priority: 'high' }
     * });
     * ```
     *
     * @param messageOrPartial 完整的 Message 对象或部分 Message 对象
     *        必须包含 type 和 payload，其他字段可选
     * @returns 处理该消息的订阅者数量
     */
    async publishMessage<T = any>(
        messageOrPartial: Omit<Message<T>, "id" | "timestamp"> & {
            type: MessageType;
            payload: T;
            source?: string;
            metadata?: Record<string, any>;
        },
    ): Promise<number> {
        // 补全 Message 对象的必需字段
        const message: Message<T> = {
            id:
                "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9),
            timestamp: Date.now(),
            ...messageOrPartial,
        };

        this.stats.messagesSent++;

        if (this.config.enableLogging) {
            console.log(
                `[MessageBus] Publishing message type "${message.type}" (id: ${message.id})`,
            );
        }

        const subscriptions = this.subscriptions.get(message.type);
        if (!subscriptions || subscriptions.length === 0) {
            if (this.config.enableLogging) {
                console.log(
                    `[MessageBus] No subscribers for message type "${message.type}"`,
                );
            }
            return 0;
        }

        // 按优先级排序
        const sortedSubscriptions = [...subscriptions].sort(
            (a, b) => (b.options.priority || 0) - (a.options.priority || 0),
        );

        // 过滤订阅
        const filteredSubscriptions = sortedSubscriptions.filter((sub) => {
            if (!sub.options.filter) {
                return true;
            }
            try {
                return sub.options.filter(message);
            } catch (error) {
                console.error(
                    `[MessageBus] Filter error for subscription ${sub.id}:`,
                    error,
                );
                return false;
            }
        });

        // 处理消息
        let processedCount = 0;
        const unsubscribeIds: string[] = [];

        for (const subscription of filteredSubscriptions) {
            try {
                // 处理超时
                let result: unknown;
                const timeoutMs = this.config.handlerTimeout ?? 0;
                if (timeoutMs > 0) {
                    result = await Promise.race([
                        subscription.handler(message),
                        new Promise((_, reject) =>
                            setTimeout(
                                () =>
                                    reject(
                                        new Error("Handler timeout after " + timeoutMs + "ms"),
                                    ),
                                timeoutMs,
                            ),
                        ),
                    ]);
                } else {
                    result = subscription.handler(message);
                }

                // 等待异步处理器
                if (result instanceof Promise) {
                    await result;
                }

                processedCount++;
                this.stats.messagesProcessed++;

                // 如果是一次性订阅，记录取消
                if (subscription.options.once) {
                    unsubscribeIds.push(subscription.id);
                }
            } catch (error) {
                this.stats.failures++;
                const errorObj = error as Error;

                if (subscription.options.errorHandler) {
                    try {
                        subscription.options.errorHandler(errorObj, message);
                    } catch (handlerError) {
                        console.error(
                            `[MessageBus] Error handler failed for subscription ${subscription.id}:`,
                            handlerError,
                        );
                    }
                } else {
                    console.error(
                        `[MessageBus] Handler error for subscription ${subscription.id}:`,
                        errorObj,
                    );
                }
            }
        }

        // 取消一次性订阅
        for (const id of unsubscribeIds) {
            this.unsubscribe(id);
        }

        if (this.config.enableLogging) {
            console.log(
                `[MessageBus] Message "${message.id}" processed by ${processedCount}/${filteredSubscriptions.length} subscribers`,
            );
        }

        return processedCount;
    }

    /**
     * 获取消息类型的订阅者数量
     *
     * @param type 消息类型
     * @returns 订阅者数量
     */
    getSubscriberCount(type: MessageType): number {
        const subscriptions = this.subscriptions.get(type);
        return subscriptions ? subscriptions.length : 0;
    }

    /**
     * 检查是否有订阅者
     *
     * @param type 消息类型
     * @returns 是否有订阅者
     */
    hasSubscribers(type: MessageType): boolean {
        return this.getSubscriberCount(type) > 0;
    }

    /**
     * 获取统计信息
     *
     * @returns 统计信息
     */
    getStats(): MessageBusStats {
        const totalSubscriptions = Array.from(this.subscriptions.values()).flat()
            .length;
        const messageTypeCount = this.subscriptions.size;

        return {
            totalSubscriptions,
            messageTypeCount,
            messagesSent: this.stats.messagesSent,
            messagesProcessed: this.stats.messagesProcessed,
            failures: this.stats.failures,
        };
    }

    /**
     * 重置统计信息
     */
    resetStats(): void {
        this.stats = {
            messagesSent: 0,
            messagesProcessed: 0,
            failures: 0,
        };
    }

    /**
     * 获取所有订阅的消息类型
     *
     * @returns 消息类型数组
     */
    getMessageTypes(): MessageType[] {
        return Array.from(this.subscriptions.keys());
    }
}
