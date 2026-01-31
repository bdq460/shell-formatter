/**
 * 插件状态服务
 *
 * 职责：提供插件状态查询和管理功能
 * 属于应用层服务，协调插件状态的各个方面
 */

import { PluginManager } from "../../domain/plugin-manager";
import { logger } from "../../utils/log";
import { getContainer, ServiceNames } from "../../utils/di/container";

/**
 * 插件状态信息
 */
export interface PluginStatus {
    /** 插件名称 */
    name: string;
    /** 插件显示名称 */
    displayName: string;
    /** 插件版本 */
    version: string;
    /** 插件描述 */
    description: string;
    /** 是否已注册 */
    registered: boolean;
    /** 是否已激活 */
    active: boolean;
    /** 是否可用 */
    available: boolean;
    /** 插件能力 */
    capabilities: string[];
    /** 插件依赖 */
    dependencies: string[];
}

/**
 * 获取所有插件状态
 *
 * @returns 插件状态数组
 */
export async function getAllPluginStatus(): Promise<PluginStatus[]> {
    logger.info("Getting all plugin status");

    // 从 DI 容器获取 PluginManager 实例
    const container = getContainer();
    const pluginManager = container.resolve<PluginManager>(
        ServiceNames.PLUGIN_MANAGER,
    );
    const stats = pluginManager.getStats();

    logger.info(`Plugin stats: ${stats.total} total, ${stats.active} active`);

    // 构建插件状态列表
    const statuses: PluginStatus[] = [];
    const activePlugins = pluginManager.getActivePluginNames();

    // 获取所有已注册的插件
    for (const pluginName of ["shfmt", "shellcheck"]) {
        const plugin = pluginManager.get(pluginName);
        if (plugin) {
            const isActive = activePlugins.includes(pluginName);
            const isAvailable = await plugin.isAvailable();

            statuses.push({
                name: plugin.name,
                displayName: plugin.displayName,
                version: plugin.version,
                description: plugin.description,
                registered: true,
                active: isActive,
                available: isAvailable,
                capabilities: plugin.getCapabilities ? plugin.getCapabilities() : [],
                dependencies: plugin.getDependencies
                    ? plugin.getDependencies().map((d) => d.name)
                    : [],
            });
        }
    }

    return statuses;
}

/**
 * 显示插件状态
 *
 * 显示当前所有插件的状态信息
 */
export async function showPluginStatus(): Promise<void> {
    logger.info("=== Plugin Status ===");

    // 从 DI 容器获取 PluginManager 实例
    const container = getContainer();
    const pluginManager = container.resolve<PluginManager>(
        ServiceNames.PLUGIN_MANAGER,
    );
    const stats = pluginManager.getStats();

    logger.info(`Total plugins: ${stats.total}`);
    logger.info(`Active plugins: ${stats.active}`);

    const activePlugins = pluginManager.getActivePluginNames();
    if (activePlugins.length > 0) {
        logger.info(`Active plugin names: ${activePlugins.join(", ")}`);
    } else {
        logger.info("No active plugins");
    }

    logger.info("====================");
}

/**
 * 检查插件是否可用
 *
 * @param pluginName 插件名称
 * @returns 是否可用
 */
export async function isPluginAvailable(pluginName: string): Promise<boolean> {
    logger.debug(`Checking if plugin "${pluginName}" is available`);

    // 从 DI 容器获取 PluginManager 实例
    const container = getContainer();
    const pluginManager = container.resolve<PluginManager>(
        ServiceNames.PLUGIN_MANAGER,
    );
    const plugin = pluginManager.get(pluginName);

    if (!plugin) {
        return false;
    }

    return plugin.isAvailable();
}
