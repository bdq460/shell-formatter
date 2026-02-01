/**
 * 文件删除监听器
 *
 * 职责：监听文件删除事件，清除对应的诊断信息
 */

import * as vscode from "vscode";
import { shouldSkipUri } from "../../shared/file-checker";
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

            // 跳过特殊文件
            if (shouldSkipUri(uri)) {
                logger.debug(`Skipping delete listener for: ${uri.toString()} (special file)`);
                continue;
            }

            // 清除该文件的诊断信息
            diagnosticCollection.delete(uri);
            logger.debug(`Diagnostics cleared for deleted file: ${uri.toString()}`);
        }
    });
}
