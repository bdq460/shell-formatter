/**
 * 性能报告命令模块
 * 提供查看性能报告的命令
 */

import * as vscode from "vscode";
import { PackageInfo } from "../config";
import { getContainer, ServiceNames } from "../di";
import { logger } from "../utils/log";
import { PerformanceMonitor } from "../utils/performance/monitor";

/**
 * 注册性能报告命令
 */
export function registerPerformanceReportCommand(): vscode.Disposable {
    logger.info("Registering performance report command");
    return vscode.commands.registerCommand(
        PackageInfo.commandShowPerformanceReport,
        async () => {
            logger.info("Show performance report command triggered");
            showPerformanceReport();
        },
    );
}

/**
 * 显示性能报告
 */
function showPerformanceReport(): void {
    const container = getContainer();
    const monitor = container.resolve<PerformanceMonitor>(
        ServiceNames.PERFORMANCE_MONITOR,
    );
    const report = monitor.generateReport();

    // 创建输出通道显示性能报告
    const outputChannel = vscode.window.createOutputChannel(
        "Shell Format Performance Report",
    );
    outputChannel.appendLine(report);
    outputChannel.show();

    logger.info("Performance report displayed");
}

/**
 * 注册重置性能指标命令
 */
export function registerResetPerformanceCommand(): vscode.Disposable {
    logger.info("Registering reset performance metrics command");
    return vscode.commands.registerCommand(
        "shell-format.resetPerformanceMetrics",
        async () => {
            logger.info("Reset performance metrics command triggered");

            const confirm = await vscode.window.showWarningMessage(
                "Are you sure you want to reset all performance metrics?",
                "Reset",
                "Cancel",
            );

            if (confirm === "Reset") {
                const container = getContainer();
                const monitor = container.resolve<PerformanceMonitor>(
                    ServiceNames.PERFORMANCE_MONITOR,
                );
                monitor.reset();
                vscode.window.showInformationMessage(
                    "Performance metrics have been reset.",
                );
                logger.info("Performance metrics have been reset");
            }
        },
    );
}
