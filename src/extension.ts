/**
 * Shell Formatter VSCode Extension
 * 基于 shfmt 和 shellcheck 的 Shell 脚本格式化插件
 */

import * as path from "path";
import * as vscode from "vscode";
import {
    initializeLoggerAdapter,
    LoggerAdapter,
} from "./adapters/loggerAdapter";
import { registerAllCommands } from "./commands";
import { PackageInfo, SettingInfo } from "./config";
import { getContainer, initializeDIContainer } from "./di";
import { diagnoseAllShellScripts, diagnoseDocument } from "./diagnostics";
import { formatDocument } from "./formatters";
import { initializePlugins } from "./plugins";
import { ShellFormatCodeActionProvider } from "./providers";
import { DebounceManager, logger } from "./utils";

/**
 * 检查是否应该跳过该文件
 * VSCode 编辑器中打开 Git 冲突文件时（如 example.sh.git），文件名会以 .git 结尾。
 * 打开的文件名是.sh 的文件，但是内部文件名其实是.git结尾的,对于这种要进行过滤
 * @param fileName 文件名
 * @returns 如果应该跳过返回 true，否则返回 false
 */
function shouldSkipFile(fileName: string): boolean {
    const baseName = path.basename(fileName);

    // 跳过 Git 冲突文件、临时文件等
    const skipPatterns = [
        /\.git$/, // Git 冲突文件
        /\.swp$/, // Vim 临时文件
        /\.swo$/, // Vim 交换文件
        /~$/, // 备份文件
        /\.tmp$/, // 临时文件
        /\.bak$/, // 备份文件
        /^extension-output-/, // VSCode 扩展开发输出文件
    ];

    return skipPatterns.some((pattern) => pattern.test(baseName));
}

// ==================== 防抖管理类 ====================

const debounceManager = new DebounceManager();

/**
 * 扩展激活函数
 */
export async function activate(context: vscode.ExtensionContext) {
    console.log("Start initialize logger");
    // 初始化日志
    initializeLoggerAdapter();

    logger.info("Extension is now active");

    // 初始化 DI 容器并注册所有服务
    logger.info("Initializing DI container");
    const container = getContainer();
    initializeDIContainer(container);

    // 初始化插件（等待插件激活完成）
    logger.info("Initializing plugins from DI container");
    await initializePlugins();

    // 创建诊断集合
    logger.info("Diagnostic collection created");
    const diagnosticCollection = vscode.languages.createDiagnosticCollection(
        PackageInfo.extensionName,
    );

    // 注册文档格式化提供者
    logger.info("Registering document range formatting provider");
    const rangeFormatProvider =
        vscode.languages.registerDocumentRangeFormattingEditProvider(
            PackageInfo.languageId,
            {
                provideDocumentRangeFormattingEdits(
                    document: vscode.TextDocument,
                    range: vscode.Range,
                    options: vscode.FormattingOptions,
                    token: vscode.CancellationToken,
                ): vscode.ProviderResult<vscode.TextEdit[]> {
                    // 防御性检查：确保语言类型匹配（虽然 VSCode 已过滤，但保持代码一致性）
                    if (document.languageId !== PackageInfo.languageId) {
                        return [];
                    }
                    // 跳过特殊文件
                    if (shouldSkipFile(document.fileName)) {
                        logger.info(
                            `Skipping range formatting for: ${document.fileName} (special file)`,
                        );
                        return [];
                    }
                    logger.info(
                        `Document range formatting triggered! Document: ${document.fileName}, range: [${range.start.line}, ${range.start.character}] - [${range.end.line}, ${range.end.character}]`,
                    );
                    logger.info(
                        `Note: Shell script formatting requires full document context, will format entire document`,
                    );
                    return formatDocument(document, options, token);
                },
            },
        );

    // 注册 Code Actions 类型提供者
    // registerCodeActionsProvider与CodeActionsProvider工作机制参考文档:
    // - 官方文档:https://code.visualstudio.com/api/references/vscode-api#CodeActionKind
    // - 本地文档:doc/vscode/extension-api.md
    logger.info("Registering code actions provider!");
    const codeActionProvider = vscode.languages.registerCodeActionsProvider(
        PackageInfo.languageId,
        new ShellFormatCodeActionProvider(diagnosticCollection),
        {
            providedCodeActionKinds: [
                vscode.CodeActionKind.QuickFix,
                vscode.CodeActionKind.SourceFixAll.append(PackageInfo.extensionName),
            ],
        },
    );

    // 注册所有命令
    // 绑定命令名称和具体实现
    logger.info("Registering commands");
    const commands = registerAllCommands(diagnosticCollection);

    // 监听文档保存时进行诊断
    logger.info("Registering document save listener");
    const saveListener = vscode.workspace.onDidSaveTextDocument(
        async (document) => {
            // 只处理 shell 语言文件
            if (document.languageId !== PackageInfo.languageId) {
                return;
            }
            // 跳过特殊文件
            if (shouldSkipFile(document.fileName)) {
                logger.info(
                    `Skipping save diagnosis for: ${document.fileName} (special file)`,
                );
                return;
            }
            logger.info(`Document saved: ${document.fileName}`);

            // 清除该文档的防抖定时器，避免被后续的防抖诊断覆盖
            const uri = document.uri.toString();
            debounceManager.cancel(uri);

            try {
                const diagnostics = await diagnoseDocument(document);
                diagnosticCollection.set(document.uri, diagnostics);
            } catch (error) {
                logger.error(
                    `Error diagnosing saved document ${document.fileName}: ${String(error)}`,
                );
            }
        },
    );

    // 监听文档打开时进行诊断
    logger.info("Registering document open listener");
    const openListener = vscode.workspace.onDidOpenTextDocument(
        async (document) => {
            // 只处理 shell 语言文件
            if (document.languageId !== PackageInfo.languageId) {
                return;
            }
            // 跳过特殊文件
            if (shouldSkipFile(document.fileName)) {
                logger.info(
                    `Skipping open diagnosis for: ${document.fileName} (special file)`,
                );
                return;
            }
            try {
                const diagnostics = await diagnoseDocument(document);
                diagnosticCollection.set(document.uri, diagnostics);
            } catch (error) {
                logger.error(
                    `Error diagnosing opened document ${document.fileName}: ${String(error)}`,
                );
            }
        },
    );

    // 监听文档内容变化时进行诊断（防抖）
    logger.info("Registering document change listener");
    const changeListener = vscode.workspace.onDidChangeTextDocument((event) => {
        // 只处理 shell 语言文件
        if (event.document.languageId !== PackageInfo.languageId) {
            return;
        }
        // 跳过特殊文件
        if (shouldSkipFile(event.document.fileName)) {
            logger.info(
                `Skipping change diagnosis for: ${event.document.fileName} (special file)`,
            );
            return;
        }
        logger.debug(
            `Document change triggered debounce for: ${event.document.fileName}`,
        );
        const uri = event.document.uri.toString();
        debounceManager.debounce(
            uri,
            async () => {
                try {
                    const diagnostics = await diagnoseDocument(event.document, undefined);
                    diagnosticCollection.set(event.document.uri, diagnostics);
                } catch (error) {
                    logger.error(
                        `Error diagnosing changed document ${event.document.fileName}: ${String(error)}`,
                    );
                }
            },
            300,
        );
    });

    // 监听配置变化
    // 监听配置变化时重新诊断所有 shell 脚本
    // onDidChangeConfiguration会监听配置变化, 包括用户settings.json或工作区.vscode/settings.json所有配置变化
    logger.info("Registering configuration change listener");
    const configChangeListener = vscode.workspace.onDidChangeConfiguration(
        async (event) => {
            logger.info(`Configuration change event happened! event:${event}`);

            // 检查扩展相关配置是否变化
            if (SettingInfo.isConfigurationChanged(event)) {
                try {
                    logger.info("Extension relevant configuration changed");

                    // 步骤 1: 刷新 SettingInfo 的配置缓存
                    // 这是核心：所有配置缓存在 SettingInfo 中统一管理
                    SettingInfo.refreshCache();

                    // 步骤 2: 重新初始化 DI 容器和插件系统（配置变化可能影响插件参数）
                    logger.info("Reinitializing plugins due to configuration change");
                    const container = getContainer();
                    container.reset(); // 清除所有单例实例
                    initializeDIContainer(container); // 重新注册所有服务
                    await initializePlugins(); // 重新初始化插件（等待完成）

                    // 步骤 3: 清除所有活跃的防抖定时器
                    debounceManager.clearAll();

                    // 步骤 4: 检查是否需要重新诊断
                    if (SettingInfo.isDiagnosticConfigChanged(event)) {
                        logger.info(
                            "Diagnostic relevant configuration changed, re-diagnosing all documents",
                        );

                        try {
                            // 重新诊断所有文档
                            const results = await diagnoseAllShellScripts();
                            results.forEach((diagnostics, uri) => {
                                diagnosticCollection.set(uri, diagnostics);
                            });
                        } catch (error) {
                            logger.error(
                                `Error re-diagnosing all documents: ${String(error)}`,
                            );
                        }
                    }

                    logger.info("Configuration change handled successfully");
                } catch (error) {
                    logger.error(`Error handling configuration change: ${String(error)}`);
                }
            }
        },
    );

    // 安装插件后, 异步诊断所有打开的 shell 脚本
    // 这是为了确保用户在安装插件后, 能够立即看到所有 shell 脚本的诊断结果
    // 注意：不等待结果，避免阻塞 activate 函数
    logger.info("Starting background diagnosis for all open shell scripts");
    (async () => {
        try {
            const results = await diagnoseAllShellScripts();
            results.forEach((diagnostics, uri) => {
                diagnosticCollection.set(uri, diagnostics);
            });
            logger.info("Background diagnosis completed successfully");
        } catch (error) {
            logger.error(`Background diagnosis failed: ${String(error)}`);
        }
    })();

    // 监听文档关闭事件，清除相关的防抖定时器
    logger.info("Registering document close listener");
    const closeListener = vscode.workspace.onDidCloseTextDocument((document) => {
        const uri = document.uri.toString();
        debounceManager.cancel(uri);
        logger.debug(
            `Debounce timer cleared for closed document: ${document.fileName}`,
        );
    });

    // 退出时清理
    // 自动清理机制
    //     vscode.ExtensionContext.subscriptions 是一个 Disposable 数组
    //     当扩展被停用时，VSCode 会自动调用每个 disposable 的 dispose() 方法。
    //
    // 清理时机
    // VSCode 会在以下情况自动调用 deactivate() 并清理 subscriptions：
    //  - 关闭 VSCode 窗口
    //  - 禁用扩展
    //  - 重新加载窗口（Reload Window）
    //  - 卸载扩展
    context.subscriptions.push(
        // formatProvider,
        rangeFormatProvider,
        codeActionProvider,
        ...commands,
        saveListener,
        openListener,
        changeListener,
        closeListener,
        configChangeListener,
        diagnosticCollection,
    );
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
        if (activeCount > 0) {
            logger.info(`Clearing ${activeCount} active debounce timers`);
        }
        debounceManager.clearAll();

        // 清理 DI 容器（执行清理钩子）
        logger.info("Cleaning up DI container");
        const container = getContainer();
        if (container instanceof Object && "cleanup" in container) {
            (container as any).cleanup();
        }

        // 清理日志输出通道
        if (logger instanceof LoggerAdapter) {
            logger.dispose();
        }

        logger.info("Deactivation completed successfully");
    } catch (error) {
        console.error(`Error during deactivation: ${String(error)}`);
    }
}
