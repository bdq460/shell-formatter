/**
 * 诊断模块
 * 管理 VSCode 诊断集合和对外 API
 *
 * 架构优化：
 * 1. 使用 PluginManager 管理插件实例
 * 2. 直接调用 Tool 层，减少中间层
 * 3. 使用 Promise.all 并行执行诊断
 */

import * as vscode from "vscode";
import { PackageInfo, SettingInfo } from "../config";
import { getContainer, ServiceNames } from "../di";
import { PERFORMANCE_METRICS } from "../metrics";
import { PluginManager } from "../plugins";
import { logger, startTimer } from "../utils";

// ==================== 诊断执行层 ====================

/**
 * 诊断单个文档
 *
 * 优化：
 * 1. 检查 onError 配置：ignore 时不执行诊断
 * 2. 性能监控：记录诊断执行时间
 *
 * 执行诊断并返回诊断结果
 *
 * @param document 文档对象
 * @param token 取消令牌
 * @param preferContentMode 是否优先使用content模式（未使用，纯插件方案总是使用content模式）
 * @returns 诊断数组
 */
export async function diagnoseDocument(
    document: vscode.TextDocument,
    token?: vscode.CancellationToken,
): Promise<vscode.Diagnostic[]> {
    // 检查 onError 配置：ignore 时不执行诊断
    if (SettingInfo.getOnErrorSetting() === "ignore") {
        logger.info(
            `Diagnostic ignored due to onError setting: ${document.fileName}`,
        );
        return [];
    }

    logger.info(`Diagnosing document: ${document.fileName}`);

    const timer = startTimer(PERFORMANCE_METRICS.DIAGNOSE_ONE_DOC_DURATION);
    try {
        const container = getContainer();
        const pluginManager = container.resolve<PluginManager>(
            ServiceNames.PLUGIN_MANAGER,
        );
        let result;
        try {
            result = await pluginManager.check(document, {
                token,
                timeout: undefined,
            });
        } catch (pluginError) {
            logger.error(`pluginManager.check failed: ${String(pluginError)}`);
            result = { diagnostics: [], hasErrors: true };
        }
        timer.stop();
        logger.debug(`Diagnose returned ${result.diagnostics.length} diagnostics`);
        return result.diagnostics;
    } catch (error) {
        timer.stop();
        logger.error(`Diagnose failed: ${String(error)}`);
        return [];
    }
}

/**
 * 诊断所有打开的 Shell 脚本
 *
 * @returns 文档和诊断结果的映射
 */
export async function diagnoseAllShellScripts(): Promise<
    Map<vscode.Uri, vscode.Diagnostic[]>
> {
    // 检查 onError 配置：ignore 时不执行诊断
    if (SettingInfo.getOnErrorSetting() === "ignore") {
        logger.info(`All diagnostics ignored due to onError setting`);
        return new Map();
    }

    const documents = vscode.workspace.textDocuments.filter(
        (doc) => doc.languageId === PackageInfo.languageId,
    );

    const results = new Map<vscode.Uri, vscode.Diagnostic[]>();

    try {
        const timer = startTimer(PERFORMANCE_METRICS.DIAGNOSE_ALL_DOCS_DURATION);
        for (const document of documents) {
            // 执行诊断
            const diagnostics = await diagnoseDocument(document);
            results.set(document.uri, diagnostics);
        }
        timer.stop();
        logger.info(`Diagnosed all ${documents.length} shell documents`);
    } catch (error) {
        logger.error(`Bulk diagnose failed: ${String(error)}`);
    }

    return results;
}
