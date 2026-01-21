/**
 * 命令注册器
 * 统一注册所有命令
 */

import * as vscode from "vscode";
import { logger } from "../utils/log";
import { registerFixAllCommand } from "./fixCommand";
import {
    registerPerformanceReportCommand,
    registerResetPerformanceCommand,
} from "./performanceCommand";
import { registerPluginStatusCommand } from "./pluginStatusCommand";

/**
 * 注册所有命令
 *
 * @param diagnosticCollection VSCode 诊断集合
 */
export function registerAllCommands(
    diagnosticCollection: vscode.DiagnosticCollection,
): vscode.Disposable[] {
    logger.info("Registering all commands");
    return [
        // 不需要注册格式化文档命令, extension.ts中注册了DocumentRangeFormattingEditProvider
        // registerFormatCommand(),
        registerFixAllCommand(diagnosticCollection),
        registerPerformanceReportCommand(),
        registerResetPerformanceCommand(),
        registerPluginStatusCommand(),
    ];
}
