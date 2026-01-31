/**
 * 命令注册器
 * 统一注册所有命令
 */

import * as vscode from "vscode";
import { logger } from "../../utils/log";
import { registerFixAllCommand } from "./fix-command";
import {
    registerFormatDocumentCommand,
    registerPerformanceReportCommand,
    registerResetPerformanceCommand,
} from "./performance-command";
import { registerPluginStatusCommand } from "./plugin-status-command";

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
        registerFormatDocumentCommand(),
        registerFixAllCommand(diagnosticCollection),
        registerPerformanceReportCommand(),
        registerResetPerformanceCommand(),
        registerPluginStatusCommand(),
    ];
}
