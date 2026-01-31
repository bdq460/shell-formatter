/**
 * 文档打开监听器
 *
 * 职责：监听文档打开事件，触发初始诊断
 */

import * as vscode from "vscode";
import { diagnoseDocument } from "../../application/usecases/diagnose-document";
import { PackageInfo } from "../../config";
import { fromDomainDiagnostics } from "../../shared/converters/diagnostic";
import { toDomainDocument } from "../../shared/converters/document";
import { logger } from "../../utils/log";
import { shouldSkipFile } from "./save-listener";

/**
 * 注册文档打开监听器
 *
 * @param diagnosticCollection VSCode 诊断集合
 */
export function registerOpenListener(
    diagnosticCollection: vscode.DiagnosticCollection,
): vscode.Disposable {
    logger.info("Registering document open listener");

    return vscode.workspace.onDidOpenTextDocument(async (document) => {
        // 只处理 shell 语言文件
        if (document.languageId !== PackageInfo.languageId) {
            return;
        }

        // 跳过特殊文件
        if (shouldSkipFile(document.fileName)) {
            logger.info(
                `Skipping open diagnosis for: ${document.fileName} (special file)`,
            );
            return;
        }

        // 诊断文档并设置诊断信息
        try {
            const domainDocument = toDomainDocument(document);
            const diagnostics = await diagnoseDocument(domainDocument);
            const vscodeDiagnostics = fromDomainDiagnostics(diagnostics);
            diagnosticCollection.set(document.uri, vscodeDiagnostics);
            logger.debug(
                `Initial diagnostics for opened file: ${vscodeDiagnostics.length} diagnostics`,
            );
        } catch (error) {
            logger.error(
                `Error diagnosing opened document ${document.fileName}: ${String(error)}`,
            );
        }
    });
}
