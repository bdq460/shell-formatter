/**
 * 性能报告命令模块
 * 提供查看性能报告的命令注册
 */

import * as vscode from "vscode";
import {
    resetPerformanceMetrics,
    showPerformanceReport,
} from "../../application/services/performance-service";
import { PackageInfo } from "../../config";
import { logger } from "../../utils/log";

/**
 * 注册性能报告命令
 */
export function registerPerformanceReportCommand(): vscode.Disposable {
    logger.info("Registering performance report command");
    return vscode.commands.registerCommand(
        PackageInfo.commandShowPerformanceReport,
        async () => {
            logger.info("Show performance report command triggered");
            // 显示性能报告
            showPerformanceReport();
            vscode.window.showInformationMessage("性能报告已输出到控制台");
        },
    );
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
            // 重置性能指标
            resetPerformanceMetrics();
            vscode.window.showInformationMessage("性能指标已重置");
        },
    );
}
