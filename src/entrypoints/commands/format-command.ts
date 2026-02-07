/**
 * 格式化命令模块
 * 提供格式化文档命令的注册
 */

import * as vscode from "vscode";
import { PackageInfo } from "../../config";
import { t } from "../../i18n";
import { shouldSkipFile } from "../../shared/file-checker";
import { logger } from "../../utils/log";

/**
 * 注册格式化文档命令
 */
export function registerFormatDocumentCommand(): vscode.Disposable {
    logger.info("Registering format document command");
    return vscode.commands.registerCommand(
        PackageInfo.commandFormatDocument,
        async () => {
            logger.info("Format document command triggered");
            const activeEditor = vscode.window.activeTextEditor;
            if (!activeEditor) {
                vscode.window.showWarningMessage(t("messages.noActiveDocument"));
                return;
            }

            // 检查文件是否需要跳过
            if (shouldSkipFile(activeEditor.document)) {
                logger.info(
                    `Skipping format document for: ${activeEditor.document.fileName}`,
                );
                vscode.window.showInformationMessage(
                    t("messages.unsupportedFileType"),
                );
                return;
            }

            await vscode.commands.executeCommand(
                "editor.action.formatDocument",
                activeEditor.document.uri,
            );
        },
    );
}
