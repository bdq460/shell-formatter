/**
 * 文档格式化用例
 *
 * 职责：协调领域层完成文档格式化
 * 这是应用层的用例编排，不直接依赖 VSCode
 */

import { Document, PluginFormatResult, TextEdit } from "../../domain/types";
import { PluginManager } from "../../domain/plugin-manager";
import { logger } from "../../utils/log";
import { getContainer, ServiceNames } from "../../utils/di/container";
import { startTimer, PERFORMANCE_METRICS } from "../services/performance-service";

/**
 * 格式化文档
 *
 * 协调领域层的插件管理器完成文档格式化
 *
 * @param document 领域文档对象
 * @param options 格式化选项
 * @param token 取消令牌（可选）
 * @returns 文本编辑数组
 */
export async function formatDocument(
    document: Document,
    options?: {
        token?: import("../../utils/executor/types").CancellationToken;
    },
): Promise<TextEdit[]> {
    logger.info(`Formatting document: ${document.fileName}`);
    const timer = startTimer(PERFORMANCE_METRICS.SHFMT_FORMAT_DURATION);

    try {
        // 从 DI 容器获取 PluginManager 实例
        const container = getContainer();
        const pluginManager = container.resolve<PluginManager>(
            ServiceNames.PLUGIN_MANAGER,
        );

        // 检查是否有启用的插件
        const availablePlugins = await pluginManager.getAvailablePlugins();
        if (availablePlugins.length === 0) {
            logger.warn("No plugins available for formatting");
            timer.stop();
            return [];
        }

        // 执行格式化
        const pluginTimer = startTimer(
            PERFORMANCE_METRICS.PLUGIN_EXECUTE_FORMAT_DURATION,
        );
        const result: PluginFormatResult = await pluginManager.format(document, {
            token: options?.token,
        });
        pluginTimer.stop();

        timer.stop();
        logger.info(
            `Formatting completed for ${document.fileName}: ${result.textEdits?.length || 0} edits, hasErrors=${result.hasErrors}`,
        );

        return result.textEdits || [];
    } catch (error) {
        timer.stop();
        logger.error(`Failed to format document ${document.fileName}: ${String(error)}`);
        return [];
    }
}
