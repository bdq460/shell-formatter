/**
 * 配置变更监听器
 *
 * 职责：监听 VSCode 配置变更事件，重新初始化插件系统
 */

import * as vscode from "vscode";
import { initializeDIContainer } from "../../application";
import { SettingInfo } from "../../config";
import { initializePlugins } from "../../domain/plugin-initializer";
import { initializeI18n } from "../../i18n";
import { PERFORMANCE_METRICS } from "../../shared/performance-metrics";
import { DebounceManager } from "../../utils/debounce";
import { getContainer } from "../../utils/di/container";
import { logger } from "../../utils/log";
import { startTimer } from "../../utils/performance/monitor";

/**
 * 注册配置变更监听器
 *
 * @param diagnosticCollection VSCode 诊断集合（已弃用，保留兼容性）
 * @param debounceManager 防抖管理器
 */
export function registerConfigChangeListener(
    diagnosticCollection: vscode.DiagnosticCollection,
    debounceManager: DebounceManager,
): vscode.Disposable {
    void diagnosticCollection; // 显式声明以避免 linter 警告

    // onDidChangeConfiguration会监听配置变化, 包括用户settings.json或工作区.vscode/settings.json所有配置变化
    logger.info("Registering configuration change listener");

    return vscode.workspace.onDidChangeConfiguration(async (event) => {
        logger.info(`Configuration change event happened! event:${event}`);

        // 检查语言配置是否变化
        const languageConfigKey = `${SettingInfo.configSectionName}.language`;
        const languageChanged = event.affectsConfiguration(languageConfigKey);

        // 检查扩展相关配置是否变化
        if (languageChanged || SettingInfo.isConfigurationChanged(event)) {
            const timer = startTimer(
                PERFORMANCE_METRICS.CONFIGURATION_CHANGE_HANDLER_DURATION,
            );
            try {
                logger.info("Extension relevant configuration changed");

                // 步骤 1: 刷新 SettingInfo 的配置缓存
                // 这是核心：所有配置缓存在 SettingInfo 中统一管理
                SettingInfo.refreshCache();

                // 步骤 2: 如果语言配置变化，重新初始化 i18n 系统
                if (languageChanged) {
                    const newLanguage = SettingInfo.getLanguage();
                    logger.info(`Language configuration changed to: ${newLanguage}`);
                    initializeI18n(newLanguage);
                    logger.info("i18n system reinitialized with new language.");
                }

                // 步骤 3: 重新初始化插件系统（配置变化可能影响插件参数）
                logger.info("Reinitializing plugins due to configuration change");
                const container = getContainer();
                container.reset(); // 清除所有单例实例
                initializeDIContainer(container); // 重新注册所有服务
                await initializePlugins(); // 重新初始化插件（等待完成）

                // 步骤 4: 清除所有活跃的防抖定时器
                debounceManager.clearAll();

                timer.stop();
                logger.info("Configuration change handled successfully");
            } catch (error) {
                timer.stop();
                logger.error(
                    `Error handling configuration change: ${String(error)}`,
                );
            }
        }
    });
}
