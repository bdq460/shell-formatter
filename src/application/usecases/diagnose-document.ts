/**
 * 文档诊断用例
 *
 * 职责：协调领域层完成文档诊断
 * 这是应用层的用例编排，不直接依赖 VSCode
 */

import { Document, PluginCheckResult, Diagnostic } from "../../domain/types";
import { PluginManager } from "../../domain/plugin-manager";
import { logger } from "../../utils/log";
import { PackageInfo } from "../../config";
import { getContainer, ServiceNames } from "../../utils/di/container";
import { startTimer, PERFORMANCE_METRICS } from "../services/performance-service";

/**
 * 诊断文档
 *
 * 协调领域层的插件管理器完成文档诊断
 *
 * @param document 领域文档对象
 * @param token 取消令牌（可选）
 * @returns VSCode 诊断数组
 */
export async function diagnoseDocument(
    document: Document,
    token?: import("../../utils/executor/types").CancellationToken,
): Promise<Diagnostic[]> {
    logger.info(`Diagnosing document: ${document.fileName}`);
    const timer = startTimer(PERFORMANCE_METRICS.SHELLCHECK_DIAGNOSE_DURATION);

    try {
        // 从 DI 容器获取 PluginManager 实例
        const container = getContainer();
        const pluginManager = container.resolve<PluginManager>(
            ServiceNames.PLUGIN_MANAGER,
        );

        // 检查是否有启用的插件
        const availablePlugins = await pluginManager.getAvailablePlugins();
        if (availablePlugins.length === 0) {
            logger.warn("No plugins available for diagnosis");
            timer.stop();
            return [];
        }

        // 执行诊断
        const pluginTimer = startTimer(
            PERFORMANCE_METRICS.PLUGIN_EXECUTE_CHECK_DURATION,
        );
        const result: PluginCheckResult = await pluginManager.check(document, {
            token,
        });
        pluginTimer.stop();

        timer.stop();
        logger.info(
            `Diagnosis completed for ${document.fileName}: ${result.diagnostics.length} diagnostics, hasErrors=${result.hasErrors}`,
        );

        return result.diagnostics;
    } catch (error) {
        timer.stop();
        logger.error(`Failed to diagnose document ${document.fileName}: ${String(error)}`);
        // 返回执行错误诊断
        return [
            {
                range: {
                    start: { line: 0, character: 0 },
                    end: { line: 0, character: 0 },
                },
                message: `Diagnosis failed: ${String(error)}`,
                severity: 0, // DiagnosticSeverity.Error
                code: "diagnosis-error",
                source: PackageInfo.diagnosticSource,
            },
        ];
    }
}
