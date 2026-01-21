/**
 * 通用插件管理器
 *
 * 管理插件的注册、激活、停用和生命周期
 * 不依赖任何外部框架（VSCode、浏览器等）
 *
 * 核心职责：
 * - 管理插件的注册、激活、停用
 * - 通过消息总线通知生命周期事件
 * - 检查和验证插件依赖
 * - 提供插件统计信息
 *
 * 生命周期流程：
 * 激活: plugin:before-activate -> onActivate() -> plugin:activated (或 plugin:activation-failed)
 * 停用: plugin:before-deactivate -> onDeactivate() -> plugin:deactivated (或 plugin:deactivation-failed)
 *
 * 设计模式：
 * - 单例模式：全局唯一的插件管理器实例
 * - 观察者模式：通过消息总线通知插件生命周期事件
 * - 发布-订阅模式：通过 MessageBus 实现插件间解耦通信
 */

import { logger } from "../log";
import { IPlugin } from "./IPlugin";
import { MessageBus } from "./MessageBus";
import { Message, MessageBusConfig, PluginLifecycleEvents } from "./types";

/**
 * 插件统计信息
 */
export interface PluginStats {
    /** 总插件数 */
    total: number;

    /** 活动插件数 */
    active: number;

    /** 插件详情列表 */
    plugins: Array<{
        name: string;
        displayName: string;
        version: string;
        active: boolean;
    }>;
}

/**
 * 插件管理器配置
 */
export interface PluginManagerConfig {
    /** 是否在激活失败时抛出异常 */
    throwOnActivationError?: boolean;

    /** 是否在停用失败时抛出异常 */
    throwOnDeactivationError?: boolean;

    /** 消息总线配置 */
    messageBusConfig?: MessageBusConfig;
}

/**
 * 通用插件管理器
 *
 * 职责：
 * - 管理插件的注册和注销
 * - 控制插件的激活和停用
 * - 调用插件的生命周期钩子
 * - 提供插件统计信息
 */
export class PluginManager<TPlugin extends IPlugin = IPlugin> {
    private plugins = new Map<string, TPlugin>();
    private activePlugins = new Set<string>();
    private config: PluginManagerConfig;
    private messageBus: MessageBus;

    /**
     * 构造函数
     * @param config 配置选项
     */
    constructor(config: PluginManagerConfig = {}) {
        this.config = {
            throwOnActivationError: false,
            throwOnDeactivationError: false,
            ...config,
        };
        // 创建消息总线实例
        this.messageBus = new MessageBus(config.messageBusConfig);
        logger.info("[PluginManager] MessageBus initialized");
    }

    /**
     * 注册插件
     * @param plugin 插件实例
     */
    register(plugin: TPlugin): void {
        const existingPlugin = this.plugins.get(plugin.name);

        if (existingPlugin) {
            logger.warn(
                `Plugin "${plugin.name}" is already registered, will be overwritten`,
            );
        }

        // 注入 MessageBus 实例
        if (plugin.setMessageBus) {
            plugin.setMessageBus(this.messageBus);
        }

        this.plugins.set(plugin.name, plugin);
        logger.info(
            `Registered plugin: ${plugin.name} v${plugin.version} (${plugin.displayName})`,
        );
        logger.debug(
            `Total plugins registered: ${this.plugins.size}, Active plugins: ${this.activePlugins.size}`,
        );
    }

    /**
     * 注销插件
     * @param name 插件名称
     */
    async unregister(name: string): Promise<void> {
        const plugin = this.plugins.get(name);

        if (!plugin) {
            console.warn(`Plugin "${name}" is not registered`);
            return;
        }

        // 调用插件停用钩子
        if (plugin.onDeactivate) {
            try {
                const result = plugin.onDeactivate();
                if (result instanceof Promise) {
                    await result;
                }
                console.debug(`Plugin "${name}" onDeactivate hook executed`);
            } catch (error) {
                console.error(
                    `Plugin "${name}" onDeactivate hook failed: ${String(error)}`,
                );
                if (this.config.throwOnDeactivationError) {
                    throw error;
                }
            }
        }

        this.plugins.delete(name);
        this.activePlugins.delete(name);
        logger.info(`Unregistered plugin: ${name}`);
        console.debug(
            `Total plugins registered: ${this.plugins.size}, Active plugins: ${this.activePlugins.size}`,
        );
    }

    /**
     * 获取插件
     * @param name 插件名称
     * @returns 插件实例，如果不存在则返回 undefined
     */
    get(name: string): TPlugin | undefined {
        return this.plugins.get(name);
    }

    /**
     * 检查插件是否已注册
     * @param name 插件名称
     * @returns 是否已注册
     */
    has(name: string): boolean {
        return this.plugins.has(name);
    }

    /**
     * 获取所有已注册的插件
     * @returns 插件实例数组
     */
    getAll(): TPlugin[] {
        return Array.from(this.plugins.values());
    }

    /**
     * 获取可用的插件
     * @returns 可用的插件数组
     */
    async getAvailablePlugins(): Promise<TPlugin[]> {
        console.log(`Checking availability of ${this.plugins.size} plugins`);

        const plugins = Array.from(this.plugins.values());
        const availablePlugins: TPlugin[] = [];
        const errors: string[] = [];

        await Promise.all(
            plugins.map(async (plugin) => {
                try {
                    logger.debug(`Checking plugin: ${plugin.name}`);
                    const isAvailable = await plugin.isAvailable();
                    if (isAvailable) {
                        availablePlugins.push(plugin);
                        console.debug(`Plugin "${plugin.name}" is available`);
                    } else {
                        logger.warn(`Plugin "${plugin.name}" is not available`);
                    }
                } catch (error) {
                    const msg = `Error checking availability of plugin "${plugin.name}": ${String(error)}`;
                    console.error(msg);
                    errors.push(msg);
                }
            }),
        );

        console.log(
            `Available plugins: ${availablePlugins.length}/${plugins.length}`,
        );
        if (errors.length > 0) {
            logger.warn(`Plugin availability errors: \n${errors.join("\n")}`);
        }
        return availablePlugins;
    }

    /**
     * 激活插件
     *
     * 生命周期流程：
     * 1. 发送 plugin:before-activate 消息
     * 2. 检查依赖是否可用
     * 3. 调用 onActivate() 钩子
     * 4. 成功后发送 plugin:activated 消息
     * 5. 失败时发送 plugin:activation-failed 消息
     *
     * @param name 插件名称
     * @returns 是否激活成功
     */
    async activate(name: string): Promise<boolean> {
        const plugin = this.plugins.get(name);
        if (!plugin) {
            console.error(`Plugin "${name}" is not registered`);
            return false;
        }

        // Step 1: 发送激活前消息
        await this.messageBus.publishMessage({
            type: PluginLifecycleEvents.BEFORE_ACTIVATE,
            payload: {
                pluginName: name,
                timestamp: Date.now(),
            },
            source: "plugin-manager",
        });

        // 如果已经激活，先调用停用钩子再激活
        if (this.activePlugins.has(name) && plugin.onDeactivate) {
            try {
                const result = plugin.onDeactivate();
                if (result instanceof Promise) {
                    await result;
                }
                console.debug(
                    `Plugin "${name}" onDeactivate hook executed before reactivation`,
                );
            } catch (error) {
                console.error(
                    `Plugin "${name}" onDeactivate hook failed: ${String(error)}`,
                );
            }
        }

        // Step 2: 检查依赖
        const dependencies = plugin.getDependencies?.() || [];
        const missingDependencies: string[] = [];
        for (const dep of dependencies) {
            if (!this.activePlugins.has(dep.name)) {
                const msg = `Dependency "${dep.name}" is not activated`;
                if (dep.required) {
                    missingDependencies.push(msg);
                } else {
                    console.warn(`Plugin "${name}": ${msg}`);
                }
            }
        }

        if (missingDependencies.length > 0) {
            const errorMsg = missingDependencies.join("; ");
            console.error(`Plugin "${name}" activation failed: ${errorMsg}`);

            // 发送激活失败消息
            await this.messageBus.publishMessage({
                type: PluginLifecycleEvents.ACTIVATION_FAILED,
                payload: {
                    pluginName: name,
                    timestamp: Date.now(),
                    error: errorMsg,
                },
                source: "plugin-manager",
            });

            return false;
        }

        // Step 3: 检查插件可用性
        const isAvailable = await plugin.isAvailable();
        if (!isAvailable) {
            const errorMsg = `Plugin "${name}" is not available`;
            console.warn(errorMsg);

            // 发送激活失败消息
            await this.messageBus.publishMessage({
                type: PluginLifecycleEvents.ACTIVATION_FAILED,
                payload: {
                    pluginName: name,
                    timestamp: Date.now(),
                    error: errorMsg,
                },
                source: "plugin-manager",
            });

            return false;
        }

        // Step 4: 调用插件激活钩子
        if (plugin.onActivate) {
            try {
                const result = plugin.onActivate();
                if (result instanceof Promise) {
                    await result;
                }
                console.debug(`Plugin "${name}" onActivate hook executed`);
            } catch (error) {
                const errorMsg = `onActivate hook failed: ${String(error)}`;
                console.error(`Plugin "${name}": ${errorMsg}`);

                // 发送激活失败消息
                await this.messageBus.publishMessage({
                    type: PluginLifecycleEvents.ACTIVATION_FAILED,
                    payload: {
                        pluginName: name,
                        timestamp: Date.now(),
                        error: errorMsg,
                    },
                    source: "plugin-manager",
                });

                if (this.config.throwOnActivationError) {
                    throw error;
                }
                // 激活钩子失败不影响插件激活，只记录日志
            }
        }

        this.activePlugins.add(name);
        console.log(`Activated plugin: ${name}`);

        // Step 5: 发送激活成功消息
        const capabilities = plugin.getCapabilities?.();
        await this.messageBus.publishMessage({
            type: PluginLifecycleEvents.ACTIVATED,
            payload: {
                pluginName: name,
                timestamp: Date.now(),
                capabilities,
            },
            source: "plugin-manager",
        });

        return true;
    }

    /**
     * 停用插件
     *
     * 生命周期流程：
     * 1. 发送 plugin:before-deactivate 消息
     * 2. 调用 onDeactivate() 钩子
     * 3. 成功后发送 plugin:deactivated 消息
     * 4. 失败时发送 plugin:deactivation-failed 消息
     *
     * @param name 插件名称
     * @returns 是否停用成功
     */
    async deactivate(name: string): Promise<boolean> {
        const plugin = this.plugins.get(name);
        if (!plugin) {
            logger.warn(`Plugin "${name}" is not registered`);
            return false;
        }

        if (!this.activePlugins.has(name)) {
            console.warn(`Plugin "${name}" is already inactive`);
            return false;
        }

        // Step 1: 发送停用前消息
        await this.messageBus.publishMessage({
            type: PluginLifecycleEvents.BEFORE_DEACTIVATE,
            payload: {
                pluginName: name,
                timestamp: Date.now(),
            },
            source: "plugin-manager",
        });

        // Step 2: 调用插件停用钩子
        if (plugin.onDeactivate) {
            try {
                const result = plugin.onDeactivate();
                if (result instanceof Promise) {
                    await result;
                }
                console.debug(`Plugin "${name}" onDeactivate hook executed`);
            } catch (error) {
                const errorMsg = `onDeactivate hook failed: ${String(error)}`;
                console.error(`Plugin "${name}": ${errorMsg}`);

                // 发送停用失败消息
                await this.messageBus.publishMessage({
                    type: PluginLifecycleEvents.DEACTIVATION_FAILED,
                    payload: {
                        pluginName: name,
                        timestamp: Date.now(),
                        error: errorMsg,
                    },
                    source: "plugin-manager",
                });

                if (this.config.throwOnDeactivationError) {
                    throw error;
                }
            }
        }

        this.activePlugins.delete(name);
        console.log(`Deactivated plugin: ${name}`);

        // Step 3: 发送停用成功消息
        await this.messageBus.publishMessage({
            type: PluginLifecycleEvents.DEACTIVATED,
            payload: {
                pluginName: name,
                timestamp: Date.now(),
            },
            source: "plugin-manager",
        });

        return true;
    }

    /**
     * 停用所有插件
     */
    async deactivateAll(): Promise<void> {
        const count = this.activePlugins.size;
        const names = Array.from(this.activePlugins);

        // 按顺序停用所有活动插件
        for (const name of names) {
            await this.deactivate(name);
        }

        console.log(`Deactivated all ${count} plugins`);
    }

    /**
     * 批量激活插件（并行执行）
     * @param names 插件名称数组
     * @returns 成功激活的插件数量
     */
    async activateMultiple(names: string[]): Promise<number> {
        console.log(`Activating ${names.length} plugins`);

        const activationResults = await Promise.all(
            names.map(async (name) => {
                const success = await this.activate(name);
                return { name, success };
            }),
        );

        const successCount = activationResults.filter((r) => r.success).length;
        const failedPlugins = activationResults
            .filter((r) => !r.success)
            .map((r) => r.name);

        if (failedPlugins.length > 0) {
            console.warn(
                `Plugin activation completed: ${successCount}/${names.length} successful (failed: ${failedPlugins.join(", ")})`,
            );
        } else {
            console.log(
                `Plugin activation completed: ${successCount}/${names.length} successful`,
            );
        }

        return successCount;
    }

    /**
     * 重新激活插件（先停用所有，再激活指定插件）
     * @param names 插件名称数组
     * @returns 成功激活的插件数量
     */
    async reactivate(names: string[]): Promise<number> {
        console.log("Reactivating plugins: deactivate all then activate selected");
        await this.deactivateAll();
        return this.activateMultiple(names);
    }

    /**
     * 检查插件是否处于活动状态
     * @param name 插件名称
     * @returns 是否活动
     */
    isActive(name: string): boolean {
        return this.activePlugins.has(name);
    }

    /**
     * 获取所有活动插件的名称
     * @returns 活动插件名称数组
     */
    getActivePluginNames(): string[] {
        return Array.from(this.activePlugins);
    }

    /**
     * 获取插件统计信息
     * @returns 插件统计信息
     */
    getStats(): PluginStats {
        const plugins = Array.from(this.plugins.values()).map((plugin) => ({
            name: plugin.name,
            displayName: plugin.displayName,
            version: plugin.version,
            active: this.activePlugins.has(plugin.name),
        }));

        return {
            total: plugins.length,
            active: this.activePlugins.size,
            plugins,
        };
    }

    /**
     * 清除所有插件
     */
    clear(): void {
        this.plugins.clear();
        this.activePlugins.clear();
        console.log("Cleared all plugins");
    }

    /**
     * 获取消息总线实例
     * @returns 消息总线实例
     */
    getMessageBus(): MessageBus {
        return this.messageBus;
    }

    /**
     * 发布消息（简单 API）
     *
     * 通过消息总线发布一条消息
     *
     * @param type 消息类型
     * @param payload 消息载荷（可选）
     * @param source 消息来源（默认为 "plugin-manager"）
     * @returns 处理该消息的订阅者数量
     */
    async publishMessage(
        type: string,
        payload?: any,
        source?: string,
    ): Promise<number> {
        return this.messageBus.publish(type, payload, source || "plugin-manager");
    }

    /**
     * 发布消息（高级 API）
     *
     * 发布完整的 Message 对象，支持元数据和优先级等高级特性
     *
     * @param message 完整的 Message 对象
     * @returns 处理该消息的订阅者数量
     */
    async publishMessageWithMetadata<T = any>(
        message: Message<T>,
    ): Promise<number> {
        return this.messageBus.publishMessage(message);
    }
}
