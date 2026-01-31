/**
 * Application 层 DI 容器初始化器
 *
 * 职责：
 * - 注册所有服务到 DI 容器
 * - 协调领域层服务的创建
 *
 * 依赖：domain/, config/, utils/
 */

import { SettingInfo } from "../../config";
import { PluginManager } from "../../domain/plugin-manager";
import { PureShellcheckPlugin } from "../../domain/plugins/shellcheck-plugin";
import { PureShfmtPlugin } from "../../domain/plugins/shfmt-plugin";
import { DIContainer, ServiceNames } from "../../utils/di/container";
import { logger } from "../../utils/log";
import { PERFORMANCE_METRICS, startTimer } from "../services/performance-service";

/**
 * 初始化 DI 容器
 * 注册所有服务到容器
 *
 * @param container DI 容器实例
 */
export function initializeDIContainer(container: DIContainer): void {
    logger.info("Initializing DI container...");

    // 注册领域层服务
    registerDomainServices(container);

    logger.info("DI container initialized successfully");
}

/**
 * 注册领域层服务
 */
function registerDomainServices(container: DIContainer): void {
    logger.debug("Registering domain services...");

    // 注册 shfmt 插件
    container.registerSingleton(
        ServiceNames.SHFMT_PLUGIN,
        () => {
            const shfmtPath = SettingInfo.getShfmtPath();
            const tabSize = SettingInfo.getRealTabSize();
            return new PureShfmtPlugin(shfmtPath, tabSize);
        },
    );

    // 注册 shellcheck 插件
    container.registerSingleton(
        ServiceNames.SHELLCHECK_PLUGIN,
        () => {
            const shellcheckPath = SettingInfo.getShellcheckPath();
            return new PureShellcheckPlugin(shellcheckPath);
        },
    );

    // 注册 PluginManager（依赖插件）
    container.registerSingleton(
        ServiceNames.PLUGIN_MANAGER,
        () => {
            const pluginManager = new PluginManager();

            // 注册插件到管理器
            try {
                const shfmtPlugin = container.resolve<PureShfmtPlugin>(
                    ServiceNames.SHFMT_PLUGIN,
                );
                pluginManager.register(shfmtPlugin);
                logger.debug("Registered shfmt plugin to PluginManager");
            } catch (error) {
                logger.warn(`Failed to register shfmt plugin: ${String(error)}`);
            }

            try {
                const shellcheckPlugin = container.resolve<PureShellcheckPlugin>(
                    ServiceNames.SHELLCHECK_PLUGIN,
                );
                pluginManager.register(shellcheckPlugin);
                logger.debug("Registered shellcheck plugin to PluginManager");
            } catch (error) {
                logger.warn(
                    `Failed to register shellcheck plugin: ${String(error)}`,
                );
            }

            return pluginManager;
        },
        [ServiceNames.SHFMT_PLUGIN, ServiceNames.SHELLCHECK_PLUGIN],
    );

    logger.debug("Domain services registered");
}

/**
 * 重新初始化 DI 容器
 * 用于配置变更后重置服务
 *
 * @param container DI 容器实例
 */
export function reinitializeDIContainer(container: DIContainer): void {
    logger.info("Reinitializing DI container...");
    const timer = startTimer(PERFORMANCE_METRICS.DI_CONTAINER_REINITIALIZATION_DURATION);

    // 重置容器（清除所有实例，保留注册）
    container.reset();

    // 重新初始化
    initializeDIContainer(container);

    timer.stop();
    logger.info("DI container reinitialized");
}
