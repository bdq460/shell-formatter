/**
 * 文档格式化器模块
 * 提供文档格式化功能
 *
 * 架构优化：
 * 1. 使用 PluginManager 管理插件实例
 * 2. 直接调用 Tool 层，减少中间层
 * 3. 性能监控：记录格式化执行时间
 */

import * as vscode from "vscode";
import { getContainer, ServiceNames } from "../di";
import { PERFORMANCE_METRICS } from "../metrics";
import { PluginManager } from "../plugins";
import { logger, startTimer } from "../utils";

/**
 * 格式化文档
 * @param document 文档对象
 * @param _options 格式化选项（未使用，由插件内部处理）
 * @param token 取消令牌
 * @param preferContentMode 是否优先使用content模式（未使用，纯插件方案总是使用content模式）
 * @returns TextEdit 数组
 *
 * 使用插件格式化文档, 并返回格式化后的内容
 */
export async function formatDocument(
    document: vscode.TextDocument,
    _options?: vscode.FormattingOptions,
    token?: vscode.CancellationToken,
): Promise<vscode.TextEdit[]> {
    logger.info(`Start format document: ${document.fileName}`);

    // 使用 DI 容器获取 PluginManager
    const container = getContainer();
    const pluginManager = container.resolve<PluginManager>(
        ServiceNames.PLUGIN_MANAGER,
    );

    const timer = startTimer(PERFORMANCE_METRICS.FORMAT_DURATION);
    try {
        const result = await pluginManager.format(document, {
            token,
            timeout: undefined,
        });
        timer.stop();

        // 处理格式化结果
        if (result.diagnostics && result.diagnostics.length > 0) {
            // 如果有诊断信息（如语法错误），记录到日志
            logger.debug(
                `Format returned ${result.diagnostics.length} diagnostics: ${result.diagnostics.map((d) => d.message).join("; ")}`,
            );
        }

        logger.debug(`Format returned ${result.textEdits.length} edits`);
        return result.textEdits;
    } catch (error) {
        timer.stop();
        logger.error(`Format failed: ${String(error)}`);
        return [];
    }
}
