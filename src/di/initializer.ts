/**
 * 依赖注入初始化器
 *
 * 负责初始化 DI 容器并注册所有服务
 * 这是应用启动时的唯一服务创建和注册入口
 *
 * 职责：
 * - 注册核心服务（PluginManager、PerformanceMonitor 等）
 * - 注册插件实例（ShfmtPlugin、ShellcheckPlugin）
 * - 验证所有必需的服务都已注册
 */

import { SettingInfo } from "../config";
import { PluginManager } from "../plugins/pluginManager";
import { PureShellcheckPlugin } from "../plugins/shellcheckPlugin";
import { PureShfmtPlugin } from "../plugins/shfmtPlugin";
import { logger } from "../utils/log";
import { PerformanceMonitor } from "../utils/performance/monitor";
import { DIContainer } from "./container";

/**
 * 服务名称常量
 * 所有服务都必须通过这些常量进行注册和解析
 */
export const ServiceNames = {
    // 核心服务
    PLUGIN_MANAGER: "pluginManager",
    PERFORMANCE_MONITOR: "performanceMonitor",

    // 插件实例
    SHFMT_PLUGIN: "shfmtPlugin",
    SHELLCHECK_PLUGIN: "shellcheckPlugin",

    // 配置
    SETTING_INFO: "settingInfo",
} as const;

/**
 * 初始化 DI 容器
 * 注册所有单例服务，应在应用启动时调用一次
 *
 * 这个函数只负责服务的创建和注册，不涉及插件的激活
 *
 * @param container DI 容器实例
 * @throws 如果服务注册失败或存在循环依赖
 */
export function initializeDIContainer(container: DIContainer): void {
    logger.info("Initializing DI container with all services");

    try {
        // 1. 注册核心服务
        registerCoreServices(container);

        // 2. 注册插件实例
        registerPluginInstances(container);

        // 3. 验证所有必需的服务都已注册
        validateRegistrations(container);

        logger.info("DI container initialized successfully");
    } catch (error) {
        logger.error(`Failed to initialize DI container: ${String(error)}`);
        throw error;
    }
}

/**
 * 注册核心服务
 * @param container DI 容器实例
 */
function registerCoreServices(container: DIContainer): void {
    logger.debug("Registering core services");

    // 注册 PluginManager（单例）
    container.registerSingleton(
        ServiceNames.PLUGIN_MANAGER,
        () => new PluginManager(),
        [], // 无依赖
    );

    // 注册 PerformanceMonitor（单例）
    container.registerSingleton(
        ServiceNames.PERFORMANCE_MONITOR,
        () => PerformanceMonitor.getInstance(),
        [],
    );

    // 注册 SettingInfo（单例 - 仅为了方便在 DI 中访问）
    container.registerSingleton(ServiceNames.SETTING_INFO, () => SettingInfo, []);
}

/**
 * 注册插件实例
 * @param container DI 容器实例
 */
function registerPluginInstances(container: DIContainer): void {
    logger.debug("Registering plugin instances");

    // 获取配置
    const shfmtPath = SettingInfo.getShfmtPath();
    const shellcheckPath = SettingInfo.getShellcheckPath();
    const indent = SettingInfo.getRealTabSize();

    // 注册 ShfmtPlugin（单例）
    container.registerSingleton(
        ServiceNames.SHFMT_PLUGIN,
        () => new PureShfmtPlugin(shfmtPath, indent),
        [],
    );

    // 注册 ShellcheckPlugin（单例）
    container.registerSingleton(
        ServiceNames.SHELLCHECK_PLUGIN,
        () => new PureShellcheckPlugin(shellcheckPath),
        [],
    );
}

/**
 * 验证所有必需的服务都已注册
 * @param container DI 容器实例
 * @throws 如果缺少必需的服务
 */
function validateRegistrations(container: DIContainer): void {
    logger.debug("Validating DI container registrations");

    const requiredServices = [
        ServiceNames.PLUGIN_MANAGER,
        ServiceNames.PERFORMANCE_MONITOR,
        ServiceNames.SHFMT_PLUGIN,
        ServiceNames.SHELLCHECK_PLUGIN,
        ServiceNames.SETTING_INFO,
    ];

    for (const serviceName of requiredServices) {
        if (!container.has(serviceName)) {
            throw new Error(`Required service not registered: ${serviceName}`);
        }
    }

    logger.debug("All required services are registered");
}
