/**
 * 文档关闭监听器
 *
 * 职责：监听文档关闭事件，清除防抖定时器和诊断信息
 */

import * as vscode from "vscode";
import { shouldSkipFile } from "../../shared/file-checker";
import { DebounceManager } from "../../utils/debounce";
import { logger } from "../../utils/log";

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

        // 跳过特殊文件
        if (shouldSkipFile(document)) {
            logger.debug(
                `Skipping close diagnosis for: ${document.fileName} (special file)`,
            );
            return;
        }

        const uri = document.uri.toString();

        // 取消防抖定时器，避免延迟诊断
        debounceManager.cancel(uri);

        // 清除该文件的诊断信息
        diagnosticCollection.delete(document.uri);

        logger.debug(
            `Debounce timer and diagnostics cleared for closed document: ${document.fileName}`,
        );
    });
}
