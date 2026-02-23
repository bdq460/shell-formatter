/**
 * Shell Formatter VSCode Extension
 * 基于 shfmt 和 shellcheck 的 Shell 脚本格式化插件
 *
 * 架构说明：
 * - entrypoints 层：直接与 VSCode API 交互，注册 Provider、监听器和命令
 * - features 层：实现业务逻辑
 * - extension.ts：作为入口，负责初始化和协调各层
 */

import * as vscode from "vscode";
import { initializeDIContainer } from "./application";
import { PackageInfo, SettingInfo } from "./config";
import { initializePlugins } from "./domain/plugin-initializer";
import * as entrypoints from "./entrypoints";
import { initializeI18n } from "./i18n";
import { initializeLogger } from "./shared/logger";
import { DebounceManager } from "./utils/debounce";
import { getContainer } from "./utils/di/container";
import { logger } from "./utils/log";

// ==================== 防抖管理器 ====================

const debounceManager = new DebounceManager();

/**
 * 扩展激活函数
 */
export async function activate(context: vscode.ExtensionContext) {

    // 初始化日志
    console.log(`[${PackageInfo.extensionName}] Start initialize logger`);

    // 初始化日志
    initializeLogger();

    logger.info("Extension is now active");

    // 初始化 i18n
    logger.info("Initializing i18n");
    const languageSetting = SettingInfo.getLanguage();
    initializeI18n(languageSetting);

    // 初始化 DI 容器
    logger.info("Initializing DI container");
    const container = getContainer();
    initializeDIContainer(container);

    // 初始化插件（等待插件激活完成）
    logger.info("Initializing plugins from DI container");
    await initializePlugins();

    // 创建诊断集合
    const diagnosticCollection = entrypoints.createDiagnosticCollection();

    // 注册所有 VSCode 功能（使用 entrypoints 层）
    const disposables: vscode.Disposable[] = [
        // 格式化提供者
        entrypoints.registerFormattingProvider(),
        // Code Actions 提供者
        entrypoints.registerCodeActionsProvider(diagnosticCollection),
        // 所有命令
        ...entrypoints.registerAllCommands(diagnosticCollection),
        // 文档监听器
        entrypoints.registerSaveListener(diagnosticCollection, debounceManager),
        entrypoints.registerOpenListener(diagnosticCollection),
        entrypoints.registerChangeListener(diagnosticCollection, debounceManager),
        entrypoints.registerCloseListener(diagnosticCollection, debounceManager),
        entrypoints.registerDeleteListener(diagnosticCollection),
        entrypoints.registerConfigChangeListener(diagnosticCollection, debounceManager),
    ];

    // 将所有资源添加到上下文订阅中
    context.subscriptions.push(...disposables, diagnosticCollection);
}

/**
 * 扩展停用函数
 *
 * 清理说明：
 * - context.subscriptions 中的资源由 VSCode 自动清理
 * - debounceManager 中的定时器需要手动清理
 * - logger 需要手动清理
 * - DI 容器需要显式清理（如果实现了清理钩子）
 */
export function deactivate() {
    logger.info("Extension is now deactivated");

    try {
        // 清理所有防抖定时器
        const activeCount = debounceManager.getActiveCount();
        logger.info(`Clearing ${activeCount} active debounce timers`);
        debounceManager.clearAll();

        // 清理 DI 容器（执行清理钩子）
        logger.info("Cleaning up DI container");
        const container = getContainer();
        if (container instanceof Object && "cleanup" in container) {
            (container as any).cleanup();
        }

        // 清理日志输出通道
        if (logger instanceof vscode.Disposable) {
            logger.dispose();
        }

        logger.info("Deactivation completed successfully");
    } catch (error) {
        console.error(`Error during deactivation: ${String(error)}`);
    }
}
