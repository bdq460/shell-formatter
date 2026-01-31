/**
 * 文件删除监听器
 *
 * 职责：监听文件删除事件，清除对应的诊断信息
 */

import * as vscode from "vscode";
import { logger } from "../../utils/log";

/**
 * 注册文件删除监听器
 *
 * @param diagnosticCollection VSCode 诊断集合
 */
export function registerDeleteListener(
    diagnosticCollection: vscode.DiagnosticCollection,
): vscode.Disposable {
    logger.info("Registering file delete listener");

    return vscode.workspace.onDidDeleteFiles((event) => {
        for (const uri of event.files) {
            // 删除文件时清除对应的诊断信息
            diagnosticCollection.delete(uri);
            logger.debug(`Diagnostics cleared for deleted file: ${uri.toString()}`);
        }
    });
}
