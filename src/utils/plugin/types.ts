/**
 * 插件消息系统类型定义
 *
 * 定义消息订阅者模式的核心类型
 */

/**
 * 消息类型
 * 使用字符串标识符，支持任意类型的数据载荷
 */
export type MessageType = string;

/**
 * 消息载荷
 * 可以是任意类型，由消息类型决定
 */
export type MessagePayload<T = any> = T;

/**
 * 消息对象
 * @template T 载荷类型
 */
export interface Message<T = any> {
    /** 消息类型 */
    type: MessageType;

    /** 消息载荷 */
    payload: T;

    /** 消息时间戳 */
    timestamp: number;

    /** 消息来源（可选） */
    source?: string;

    /** 消息 ID（可选，用于追踪） */
    id?: string;
}

/**
 * 消息处理器
 * @param T 载荷类型
 *
 * 设计原则：
 * - 泛型 T 确保 Message 载荷类型完整
 * - 返回类型明确：void | Promise<void>（不使用 any）
 * - 处理器可同步或异步，类型系统清晰反映
 */
export type MessageHandler<T = any> = (
    message: Message<T>, // Message 的载荷类型与 T 一致
) => void | Promise<void>; // 明确的返回类型

/**
 * 消息订阅配置
 * @template T 载荷类型
 */
export interface MessageSubscriptionOptions<T = any> {
    /** 是否只订阅一次 */
    once?: boolean;

    /** 优先级（数字越大，优先级越高） */
    priority?: number;

    /** 过滤器函数（返回 true 才处理此消息） */
    filter?: (message: Message<T>) => boolean;

    /** 错误处理器 */
    errorHandler?: (error: Error, message: Message<T>) => void;
}

/**
 * 消息订阅信息
 * @template T 载荷类型
 */
export interface MessageSubscription<T = any> {
    /** 订阅 ID */
    id: string;

    /** 消息类型 */
    type: MessageType;

    /** 处理器 */
    handler: MessageHandler<T>;

    /** 订阅选项 */
    options: MessageSubscriptionOptions<T>;
}

/**
 * 消息总线统计信息
 */
export interface MessageBusStats {
    /** 总订阅数 */
    totalSubscriptions: number;

    /** 消息类型数量 */
    messageTypeCount: number;

    /** 已发送消息数 */
    messagesSent: number;

    /** 已处理消息数 */
    messagesProcessed: number;

    /** 失败处理数 */
    failures: number;
}

/**
 * 消息总线配置
 */
export interface MessageBusConfig {
    /** 是否启用日志 */
    enableLogging?: boolean;

    /** 是否启用性能监控 */
    enableMetrics?: boolean;

    /** 最大订阅数（0 表示无限制） */
    maxSubscriptions?: number;

    /** 消息处理超时时间（毫秒，0 表示无限制） */
    handlerTimeout?: number;
}

/**
 * 插件生命周期事件消息类型
 *
 * 用于插件激活和停用过程中的消息通信
 * 允许插件感知其他插件的生命周期变化
 */
export const PluginLifecycleEvents = {
    /** 插件开始激活前（其他插件可以准备） */
    BEFORE_ACTIVATE: "plugin:before-activate",

    /** 插件激活成功后（其他插件可以响应） */
    ACTIVATED: "plugin:activated",

    /** 插件激活失败时 */
    ACTIVATION_FAILED: "plugin:activation-failed",

    /** 插件开始停用前（其他插件可以准备） */
    BEFORE_DEACTIVATE: "plugin:before-deactivate",

    /** 插件停用完成后 */
    DEACTIVATED: "plugin:deactivated",

    /** 插件停用失败时 */
    DEACTIVATION_FAILED: "plugin:deactivation-failed",
} as const;

/**
 * 插件生命周期事件载荷
 */
export interface PluginLifecyclePayload {
    /** 插件名称 */
    pluginName: string;

    /** 事件时间戳 */
    timestamp: number;

    /** 错误信息（如果有） */
    error?: string;

    /** 插件能力列表（激活成功时） */
    capabilities?: string[];

    /** 其他元数据 */
    metadata?: Record<string, any>;
}
