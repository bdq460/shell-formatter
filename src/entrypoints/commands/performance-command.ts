/**
 * 性能报告命令模块
 * 提供查看性能报告的命令注册
 */

import * as vscode from "vscode";
import {
    showPerformanceReport as serviceShowPerformanceReport
} from "../../application";
import { PackageInfo } from "../../config";
import { t } from "../../i18n";
import { logger } from "../../utils/log";
import { resetMetrics } from "../../utils/performance/integration";

/**
 * 显示性能报告
 */
async function showPerformanceReport(): Promise<void> {
    logger.info("Show performance report command triggered");

    const outputChannel = vscode.window.createOutputChannel(
        "Shell Formatter Performance Report",
    );

    await serviceShowPerformanceReport((content: string) => {
        outputChannel.appendLine(content);
        outputChannel.show();
    });

    logger.info("Performance report displayed");
}

/**
 * 注册性能报告命令
 */
export function registerPerformanceReportCommand(): vscode.Disposable {
    logger.info("Registering performance report command");
    return vscode.commands.registerCommand(
        PackageInfo.commandShowPerformanceReport,
        showPerformanceReport,
    );
}

/**
 * 注册重置性能指标命令
 */
export function registerResetPerformanceCommand(): vscode.Disposable {
    logger.info("Registering reset performance metrics command");
    return vscode.commands.registerCommand(
        PackageInfo.commandResetPerformanceMetrics,
        async () => {
            logger.info("Reset performance metrics command triggered");

            const confirm = await vscode.window.showWarningMessage(
                t("messages.confirmResetMetrics"),
                "Reset",
                "Cancel",
            );

            if (confirm === "Reset") {
                resetMetrics();
                vscode.window.showInformationMessage(
                    t("messages.resetMetricsSuccess"),
                );
                logger.info("Performance metrics have been reset");
            }
        },
    );
}
