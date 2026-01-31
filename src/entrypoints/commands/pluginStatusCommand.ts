/**
 * 插件状态命令模块
 * 提供查看插件状态的命令注册
 */

import * as vscode from "vscode";
import { showPluginStatus } from "../../application/services/plugin-status-service";
import { logger } from "../../utils/log";

/**
 * 注册插件状态命令
 */
export function registerPluginStatusCommand(): vscode.Disposable {
    logger.info("Registering plugin status command");
    return vscode.commands.registerCommand(
        "shell-format.showPluginStatus",
        async () => {
            logger.info("Show plugin status command triggered");
            // 显示插件状态
            await showPluginStatus();
            vscode.window.showInformationMessage("插件状态已输出到控制台");
        },
    );
}
