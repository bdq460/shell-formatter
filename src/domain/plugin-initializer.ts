/**
 * 插件初始化器
 *
 * 负责插件的初始化、注册和激活
 * 与 DIContainer 交互来获取和管理插件实例
 *
 * 职责：
 * - 从 DI 容器获取插件实例
 * - 将插件注册到 PluginManager
 * - 根据配置激活已启用的插件
 * - 管理插件的生命周期
 */
// TODO : domain层去除对config的依赖
import { SettingInfo } from "../config";
import { PERFORMANCE_METRICS } from "../shared/performance-metrics";
import { getContainer, ServiceNames } from "../utils/di/container";
import { logger } from "../utils/log";
import { startTimer } from "../utils/performance/monitor";
import { PluginManager } from "./plugin-manager";

/**
 * 初始化和注册所有插件
 * 从 DI 容器获取插件实例，然后注册到 PluginManager
 *
 * @throws 如果获取插件实例或注册失败
 */
export async function initializePlugins(): Promise<void> {
    logger.info("Initializing plugins from DI container");
    const timer = startTimer(PERFORMANCE_METRICS.PLUGIN_LOAD_DURATION);

    try {
        const container = getContainer();

        // 从 DI 容器获取插件管理器（已包含注册的插件）
        logger.info("Getting PluginManager from DI container...");
        container.resolve<PluginManager>(ServiceNames.PLUGIN_MANAGER);

        logger.info("All plugins initialized and registered successfully");

        // 激活已启用的插件（等待完成）
        await activatePlugins();
        timer.stop();
        logger.info("Plugin system activated successfully");
    } catch (error) {
        timer.stop();
        logger.error(`Failed to initialize plugins: ${String(error)}`);
        throw error;
    }
}

/**
 * 激活可用插件（基于配置）
 * 只激活用户在配置中启用的插件
 *
 * @throws 如果激活过程失败
 */
export async function activatePlugins(): Promise<void> {
    logger.info("Activating enabled plugins...");

    try {
        // 从 DI 容器获取 PluginManager
        const container = getContainer();
        const pluginManager = container.resolve<PluginManager>(
            ServiceNames.PLUGIN_MANAGER,
        );

        // 获取插件启用状态配置
        const shfmtEnabled = SettingInfo.isShfmtEnabled();
        const shellcheckEnabled = SettingInfo.isShellcheckEnabled();

        logger.info(
            `Plugin configuration: shfmt=${shfmtEnabled}, shellcheck=${shellcheckEnabled}`,
        );

        // 构建需要激活的插件列表
        const pluginsToActivate: string[] = [];
        if (shfmtEnabled) {
            pluginsToActivate.push("shfmt");
        }
        if (shellcheckEnabled) {
            pluginsToActivate.push("shellcheck");
        }

        if (pluginsToActivate.length === 0) {
            logger.warn("No plugins are enabled in configuration");
            return;
        }

        logger.info(`Activating ${pluginsToActivate.length} enabled plugins...`);
        const successCount =
            await pluginManager.activateMultiple(pluginsToActivate);

        logger.info(
            `Activated ${successCount}/${pluginsToActivate.length} plugins successfully`,
        );

        // 打印插件状态
        const stats = pluginManager.getStats();
        logger.info(`Plugin stats: ${stats.total} total, ${stats.active} active`);
    } catch (error) {
        logger.error(`Failed to activate plugins: ${String(error)}`);
        throw error;
    }
}
