/**
 * 文档关闭监听器
 *
 * 职责：监听文档关闭事件，清除防抖定时器和诊断信息
 */

import * as vscode from "vscode";
import { logger } from "../../utils/log";
import { DebounceManager } from "../../utils/debounce";

/**
 * 注册文档关闭监听器
 *
 * @param diagnosticCollection VSCode 诊断集合
 * @param debounceManager 防抖管理器
 */
export function registerCloseListener(
    diagnosticCollection: vscode.DiagnosticCollection,
    debounceManager: DebounceManager,
): vscode.Disposable {
    logger.info("Registering document close listener");

    return vscode.workspace.onDidCloseTextDocument((document) => {
        const uri = document.uri.toString();
        debounceManager.cancel(uri);

        // 清除该文件的诊断信息，避免问题面板显示已关闭文件的问题
        diagnosticCollection.delete(document.uri);

        logger.debug(
            `Debounce timer and diagnostics cleared for closed document: ${document.fileName}`,
        );
    });
}
