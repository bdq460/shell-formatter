/**
 * 性能监控和告警使用示例
 *
 * 演示如何使用性能告警功能监控关键操作
 */

import * as vscode from "vscode";
import {
    startTimer,
} from "./monitor";
import {
    onPerformanceAlert,
    getPerformanceAlerts,
    getAlertStats,
    clearAlertHistory,
} from "./integration";

/**
 * 启用性能告警
 *
 * 这会在性能指标超过阈值时自动触发告警
 * 默认阈值在 alertManager.ts 中配置
 */
export function setupPerformanceAlerts(): void {
    // 注册告警处理器
    onPerformanceAlert((alert) => {
        // 在 VSCode 中显示告警通知
        const alertLevel = alert.level;
        let severity: vscode.MessageItem;

        switch (alertLevel) {
            case "CRITICAL":
                severity = { title: "查看详情" };
                vscode.window.showErrorMessage(
                    `性能告警: ${alert.message}`,
                    severity,
                );
                break;
            case "HIGH":
                vscode.window.showWarningMessage(
                    `性能告警: ${alert.message}`,
                );
                break;
            case "MEDIUM":
                vscode.window.showWarningMessage(
                    `性能提醒: ${alert.message}`,
                );
                break;
            default:
                vscode.window.showInformationMessage(
                    `性能提示: ${alert.message}`,
                );
        }

        // 记录到输出通道
        const outputChannel = vscode.window.createOutputChannel("性能告警");
        outputChannel.appendLine(
            `[${new Date(alert.timestamp).toISOString()}] ${alert.message}`,
        );
        outputChannel.show();
    });
}

/**
 * 检查性能告警历史
 *
 * @param limit 限制显示的告警数量
 */
export function showAlertHistory(limit: number = 10): void {
    const alerts = getPerformanceAlerts(limit);
    const stats = getAlertStats();

    if (alerts.length === 0) {
        vscode.window.showInformationMessage("暂无性能告警记录");
        return;
    }

    // 构建显示信息
    let message = `性能告警历史 (最近 ${alerts.length} 条):\n\n`;
    message += `总计: ${stats.total} 条告警\n`;
    message += `严重: ${stats.byLevel.CRITICAL} 条\n`;
    message += `高: ${stats.byLevel.HIGH} 条\n`;
    message += `中: ${stats.byLevel.MEDIUM} 条\n`;
    message += `低: ${stats.byLevel.LOW} 条\n\n`;

    alerts.forEach((alert, index) => {
        message += `${index + 1}. ${alert.metricName} = ${alert.value}ms\n`;
        message += `   级别: ${alert.level}, 阈值: ${alert.threshold}ms\n`;
        message += `   时间: ${new Date(alert.timestamp).toLocaleString()}\n\n`;
    });

    vscode.window.showInformationMessage(message, "清除历史").then((selection) => {
        if (selection === "清除历史") {
            clearAlertHistory();
            vscode.window.showInformationMessage("已清除告警历史");
        }
    });
}

/**
 * 格式化文档并监控性能
 *
 * 此函数演示如何在关键操作中使用性能监控
 * 当格式化时间超过阈值时，会自动触发告警
 *
 * @param document 要格式化的文档
 * @returns 格式化结果
 */
export async function formatDocumentWithMonitoring(
    document: vscode.TextDocument,
): Promise<void> {
    const timer = startTimer("format_duration");

    try {
        // 模拟格式化操作
        await new Promise((resolve) => setTimeout(resolve, 100));

        // timer.stop() 会自动检查阈值并触发告警
        const duration = timer.stop();

        // 在输出通道显示性能数据
        const outputChannel = vscode.window.createOutputChannel("性能监控");
        outputChannel.appendLine(
            `格式化完成: ${document.fileName}, 耗时 ${duration}ms`,
        );
        outputChannel.show();
    } catch (error) {
        timer.stop(); // 确保停止计时
        throw error;
    }
}

/**
 * 使用示例
 *
 * 在 extension.ts 的 activate 函数中调用：
 *
 * ```typescript
 * import { setupPerformanceAlerts } from './utils/performance/example';
 *
 * export function activate(context: vscode.ExtensionContext) {
 *     // 设置性能告警
 *     setupPerformanceAlerts();
 *
 *     // 注册命令查看告警历史
 *     const showHistoryCmd = vscode.commands.registerCommand(
 *         'shellFormat.showAlertHistory',
 *         () => showAlertHistory()
 *     );
 *     context.subscriptions.push(showHistoryCmd);
 * }
 * ```
 */
