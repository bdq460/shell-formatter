/**
 * VSCode 插件管理器
 *
 * 管理格式化和检查插件的注册、加载和调用
 * 支持动态加载和插件生命周期管理
 *
 * 架构：
 * - 使用通用 PluginManager 管理插件生命周期
 * - 添加 VSCode 特定的 format 和 check 方法
 * - 提供错误诊断创建等 VSCode 特定功能
 */

import * as vscode from "vscode";
import { PERFORMANCE_METRICS } from "../metrics";
import { logger, startTimer } from "../utils";
import { PluginManager as BasePluginManager } from "../utils/plugin";
import {
    IFormatPlugin,
    PluginCheckOptions,
    PluginCheckResult,
    PluginFormatOptions,
    PluginFormatResult,
} from "./pluginInterface";

/**
 * VSCode 插件管理器
 *
 * 继承通用插件管理器的功能，添加 VSCode 特定的格式化和检查方法
 */
export class PluginManager {
    private baseManager: BasePluginManager<IFormatPlugin>;

    constructor() {
        this.baseManager = new BasePluginManager({
            // 不在钩子失败时抛出异常，只记录日志
            throwOnActivationError: false,
            throwOnDeactivationError: false,
        });
    }

    /**
     * 注册插件
     * @param plugin 插件实例
     */
    register(plugin: IFormatPlugin): void {
        this.baseManager.register(plugin);
        logger.info(`Registered plugin: ${plugin.name} v${plugin.version} (${plugin.displayName})`);
    }

    /**
     * 注销插件
     * @param name 插件名称
     */
    async unregister(name: string): Promise<void> {
        await this.baseManager.unregister(name);
        logger.info(`Unregistered plugin: ${name}`);
    }

    /**
     * 获取插件
     * @param name 插件名称
     * @returns 插件实例，如果不存在则返回 undefined
     */
    get(name: string): IFormatPlugin | undefined {
        return this.baseManager.get(name);
    }

    /**
     * 检查插件是否已注册
     * @param name 插件名称
     * @returns 是否已注册
     */
    has(name: string): boolean {
        return this.baseManager.has(name);
    }

    /**
     * 获取所有已注册的插件
     * @returns 插件实例数组
     */
    getAll(): IFormatPlugin[] {
        return this.baseManager.getAll();
    }

    /**
     * 获取可用的插件
     * @returns 可用的插件数组
     */
    async getAvailablePlugins(): Promise<IFormatPlugin[]> {
        const timer = startTimer(PERFORMANCE_METRICS.PLUGIN_LOAD_DURATION);
        logger.info(`Checking availability of plugins`);

        const plugins = await this.baseManager.getAvailablePlugins();

        timer.stop();
        logger.info(`Available plugins: ${plugins.length}/${this.baseManager.getStats().total}`);
        return plugins;
    }

    /**
     * 使用所有活动插件格式化文档
     * @param document 文档对象
     * @param options 格式化选项
     * @returns 格式化结果（第一个成功的结果）
     */
    async format(
        document: vscode.TextDocument,
        options: PluginFormatOptions,
    ): Promise<PluginFormatResult> {
        const timer = startTimer(
            PERFORMANCE_METRICS.PLUGIN_EXECUTE_FORMAT_DURATION,
        );
        const activePluginNames = this.baseManager.getActivePluginNames();
        logger.info(
            `Formatting document: ${document.fileName} with ${activePluginNames.length} active plugins`,
        );

        if (activePluginNames.length === 0) {
            logger.warn("No active plugins available for formatting");
            timer.stop();
            return {
                hasErrors: true,
                diagnostics: [],
                textEdits: [],
            };
        }

        const allDiagnostics: vscode.Diagnostic[] = [];
        const errors: string[] = [];
        let hasErrors = false;

        for (const name of activePluginNames) {
            const plugin = this.baseManager.get(name);

            if (plugin) {
                try {
                    logger.debug(`Attempting to format with plugin: ${name}`);
                    if (!plugin.format) {
                        logger.debug(
                            `Plugin "${name}" does not implement format(), skipping`,
                        );
                        continue;
                    }
                    const result = await plugin.format(document, options);

                    // 收集诊断信息
                    if (result.diagnostics && result.diagnostics.length > 0) {
                        allDiagnostics.push(...result.diagnostics);
                    }

                    // 检查是否有错误
                    if (result.hasErrors) {
                        hasErrors = true;
                    }

                    // 如果有文本编辑，返回结果
                    if (result.textEdits && result.textEdits.length > 0) {
                        timer.stop();
                        logger.info(
                            `Successfully formatted with plugin: ${name} (${result.textEdits.length} edits)`,
                        );
                        return {
                            hasErrors,
                            diagnostics: allDiagnostics,
                            textEdits: result.textEdits,
                        };
                    } else {
                        logger.debug(
                            `Plugin "${name}" returned no edits, trying next plugin`,
                        );
                    }
                } catch (error) {
                    const msg = `Plugin "${name}" format failed: ${String(error)}, trying next plugin`;
                    logger.error(msg);
                    errors.push(msg);
                    hasErrors = true;
                    // 将异常错误转化为 diagnostic
                    const errorDiagnostic = this.createErrorDiagnostic(
                        msg,
                        document,
                        name,
                    );
                    allDiagnostics.push(errorDiagnostic);
                }
            }
        }

        timer.stop();
        if (errors.length > 0) {
            logger.warn(`Format errors: \n${errors.join("\n")}`);
        }
        logger.info(`No text edits returned for document: ${document.fileName}`);
        return {
            hasErrors,
            diagnostics: allDiagnostics,
            textEdits: [],
        };
    }

    /**
     * 使用所有活动插件检查文档
     * @param document 文档对象
     * @param options 检查选项
     * @returns 所有插件的诊断结果合并
     */
    async check(
        document: vscode.TextDocument,
        options: PluginCheckOptions,
    ): Promise<PluginCheckResult> {
        const timer = startTimer(PERFORMANCE_METRICS.PLUGIN_EXECUTE_CHECK_DURATION);
        const activePluginNames = this.baseManager.getActivePluginNames();
        logger.info(
            `Checking document: ${document.fileName} with ${activePluginNames.length} active plugins`,
        );

        if (activePluginNames.length === 0) {
            logger.warn("No active plugins available for checking");
            timer.stop();
            return {
                hasErrors: false,
                diagnostics: [],
            };
        }

        const allDiagnostics: vscode.Diagnostic[] = [];
        let hasErrors = false;
        const errors: string[] = [];

        for (const name of activePluginNames) {
            const plugin = this.baseManager.get(name);

            if (plugin) {
                try {
                    logger.debug(`Checking with plugin: ${name}`);
                    const result = await plugin.check(document, options);

                    if (result.diagnostics) {
                        allDiagnostics.push(...result.diagnostics);
                        logger.debug(
                            `Plugin "${name}" returned ${result.diagnostics.length} diagnostics`,
                        );
                    }

                    if (result.hasErrors) {
                        hasErrors = true;
                    }
                } catch (error) {
                    const msg = `Plugin "${name}" check failed: ${String(error)}`;
                    logger.error(msg);
                    errors.push(msg);
                    hasErrors = true;
                    // 将异常错误转化为 diagnostic
                    const errorDiagnostic = this.createErrorDiagnostic(
                        msg,
                        document,
                        name,
                    );
                    allDiagnostics.push(errorDiagnostic);
                }
            }
        }

        timer.stop();
        if (errors.length > 0) {
            logger.warn(`Check errors: \n${errors.join("\n")}`);
        }
        logger.info(
            `Checking completed: ${allDiagnostics.length} total diagnostics from ${activePluginNames.length} plugins`,
        );

        return {
            hasErrors,
            diagnostics: allDiagnostics,
        };
    }

    /**
     * 清除所有插件
     */
    clear(): void {
        this.baseManager.clear();
        logger.info("Cleared all plugins");
    }

    /**
     * 将错误消息转化为 Diagnostic
     * @param errorMessage 错误消息
     * @param document 文档对象
     * @param source 错误来源（插件名称）
     * @returns Diagnostic 对象
     */
    private createErrorDiagnostic(
        errorMessage: string,
        document: vscode.TextDocument,
        source: string,
    ): vscode.Diagnostic {
        // 使用文档的第一行或空文档的默认位置
        const range =
            document.lineCount > 0
                ? document.lineAt(0).range
                : new vscode.Range(0, 0, 0, 0);

        const diagnostic = new vscode.Diagnostic(
            range,
            errorMessage,
            vscode.DiagnosticSeverity.Error,
        );
        diagnostic.source = source;
        return diagnostic;
    }

    /**
     * 停用所有插件
     */
    async deactivateAll(): Promise<void> {
        await this.baseManager.deactivateAll();
        logger.info(`Deactivated all plugins`);
    }

    /**
     * 重新激活插件（先停用所有，再激活指定插件）
     * @param names 插件名称数组
     * @returns 成功激活的插件数量
     */
    async reactivate(names: string[]): Promise<number> {
        logger.info("Reactivating plugins: deactivate all then activate selected");
        return this.baseManager.reactivate(names);
    }

    /**
     * 批量激活插件（并行执行以提升性能）
     * @param names 插件名称数组
     * @returns 成功激活的插件数量
     */
    async activateMultiple(names: string[]): Promise<number> {
        const timer = startTimer(PERFORMANCE_METRICS.PLUGIN_LOAD_DURATION);
        logger.info(`Activating ${names.length} plugins`);

        const successCount = await this.baseManager.activateMultiple(names);

        timer.stop();
        return successCount;
    }

    /**
     * 激活插件
     * @param name 插件名称
     * @returns 是否激活成功
     */
    async activate(name: string): Promise<boolean> {
        return this.baseManager.activate(name);
    }

    /**
     * 停用插件
     * @param name 插件名称
     * @returns 是否停用成功
     */
    async deactivate(name: string): Promise<boolean> {
        return this.baseManager.deactivate(name);
    }

    /**
     * 检查插件是否处于活动状态
     * @param name 插件名称
     * @returns 是否活动
     */
    isActive(name: string): boolean {
        return this.baseManager.isActive(name);
    }

    /**
     * 获取所有活动插件的名称
     * @returns 活动插件名称数组
     */
    getActivePluginNames(): string[] {
        return this.baseManager.getActivePluginNames();
    }

    /**
     * 获取插件统计信息
     * @returns 插件统计信息
     */
    getStats(): {
        total: number;
        active: number;
        plugins: Array<{
            name: string;
            displayName: string;
            version: string;
            active: boolean;
        }>;
    } {
        return this.baseManager.getStats();
    }
}

/**
 * 全局插件管理器实例
 */
let globalPluginManager: PluginManager | null = null;

/**
 * 获取全局插件管理器实例
 * @returns 插件管理器实例
 */
export function getPluginManager(): PluginManager {
    if (!globalPluginManager) {
        globalPluginManager = new PluginManager();
        logger.info("Global plugin manager initialized");
    }
    return globalPluginManager;
}

/**
 * 设置全局插件管理器实例（主要用于测试）
 * @param manager 插件管理器实例
 */
export function setPluginManager(manager: PluginManager): void {
    globalPluginManager = manager;
}

/**
 * 重置全局插件管理器（主要用于测试）
 */
export function resetPluginManager(): void {
    if (globalPluginManager) {
        globalPluginManager.clear();
    }
}
