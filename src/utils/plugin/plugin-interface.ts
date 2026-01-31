/**
 * 通用插件接口
 *
 * 定义不依赖任何外部框架的通用插件机制
 * 可用于各种场景：CLI、Web、桌面应用等
 *
 * 设计原则：
 * 1. 不依赖外部框架（VSCode、浏览器等）
 * 2. 提供通用的插件生命周期管理
 * 3. 支持消息订阅者模式
 * 4. 易于扩展和实现
 */

import {
    MessageHandler,
    MessageSubscriptionOptions,
    MessageType,
} from "./types";

/**
 * 插件依赖声明
 */
export interface PluginDependency {
    /** 依赖的插件名称 */
    name: string;

    /** 版本范围（可选，例如 "^1.0.0"） */
    version?: string;

    /** 是否为必需依赖 */
    required: boolean;
}

/**
 * 插件接口
 *
 * 通用插件的基础接口，定义插件的核心行为
 */
export interface IPlugin {
    /**
     * 插件名称（唯一标识符）
     */
    name: string;

    /**
     * 插件显示名称
     */
    displayName: string;

    /**
     * 插件版本
     */
    version: string;

    /**
     * 插件描述
     */
    description: string;

    /**
     * 检查插件是否可用
     * @returns 是否可用
     */
    isAvailable(): Promise<boolean>;

    /**
     * 设置消息总线实例（可选）
     *
     * 由 PluginManager 在注册插件时调用
     * 插件通过这个 MessageBus 实例进行消息订阅和发布
     *
     * @param messageBus 消息总线实例
     */
    setMessageBus?(messageBus: any): void;

    /**
     * 获取插件依赖声明（可选）
     *
     * 返回此插件所依赖的其他插件列表
     * PluginManager 会在激活前检查依赖是否可用
     *
     * @returns 插件依赖数组
     */
    getDependencies?(): PluginDependency[];

    /**
     * 获取插件提供的能力列表（可选）
     *
     * 返回此插件提供的能力或服务列表
     * 其他插件可以通过 ACTIVATED 消息获取这些信息
     *
     * @returns 能力列表
     */
    getCapabilities?(): string[];

    /**
     * 订阅消息
     *
     * 插件可以订阅感兴趣的消息类型
     * 收到消息时自行解释和执行任务
     *
     * 使用示例：
     * ```typescript
     * async onActivate() {
     *     this.messageBus = getMessageBus();
     *
     *     // 订阅配置变更消息
     *     this.configSubId = this.messageBus.subscribe('config:change', (msg) => {
     *         const config = msg.payload;
     *         this.updateConfig(config);
     *     });
     *
     *     // 订阅文件变更消息
     *     this.fileSubId = this.messageBus.subscribe('file:change', (msg) => {
     *         const filePath = msg.payload.filePath;
     *         this.handleFileChange(filePath);
     *     });
     * }
     *
     * async onDeactivate() {
     *     // 取消所有订阅
     *     this.messageBus.unsubscribe(this.configSubId);
     *     this.messageBus.unsubscribe(this.fileSubId);
     * }
     * ```
     *
     * @param type 消息类型
     * @param handler 消息处理器
     * @param options 订阅选项
     * @returns 订阅 ID（用于取消订阅）
     */
    subscribe?(
        type: MessageType,
        handler: MessageHandler,
        options?: MessageSubscriptionOptions,
    ): string;

    /**
     * 插件激活时调用（可选）
     *
     * 用于初始化资源、注册事件监听器等
     *
     * 生命周期：
     * 1. PluginManager 发送 `plugin:before-activate` 消息
     * 2. PluginManager 调用 onActivate()
     * 3. onActivate() 成功后，发送 `plugin:activated` 消息
     * 4. 如果失败，发送 `plugin:activation-failed` 消息
     */
    onActivate?(): void | Promise<void>;

    /**
     * 插件停用时调用（可选）
     *
     * 用于清理资源、取消事件监听器、取消消息订阅等
     *
     * 生命周期：
     * 1. PluginManager 发送 `plugin:before-deactivate` 消息
     * 2. PluginManager 调用 onDeactivate()
     * 3. onDeactivate() 成功后，发送 `plugin:deactivated` 消息
     * 4. 如果失败，发送 `plugin:deactivation-failed` 消息
     *
     * 注意：即使停用失败，插件也会被标记为非活动状态
     */
    onDeactivate?(): void | Promise<void>;
}
