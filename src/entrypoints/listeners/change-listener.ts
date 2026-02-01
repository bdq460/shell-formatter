/**
 * 文档变更监听器
 *
 * 职责：监听文档内容变更事件，触发防抖诊断
 */

import * as vscode from "vscode";
import { diagnoseDocument } from "../../application/usecases/diagnose-document";
import { PackageInfo } from "../../config";
import { fromDomainDiagnostics } from "../../shared/converters/diagnostic";
import { toDomainDocument } from "../../shared/converters/document";
import { DebounceManager } from "../../utils/debounce";
import { logger } from "../../utils/log";
import { shouldSkipFile } from "./save-listener";

/**
 * 注册文档变更监听器
 *
 * @param diagnosticCollection VSCode 诊断集合
 * @param debounceManager 防抖管理器
 */
export function registerChangeListener(
    diagnosticCollection: vscode.DiagnosticCollection,
    debounceManager: DebounceManager,
): vscode.Disposable {
    logger.info("Registering document change listener");

    return vscode.workspace.onDidChangeTextDocument((event) => {
        // 只处理 shell 语言文件
        if (event.document.languageId !== PackageInfo.languageId) {
            return;
        }

        // 跳过特殊文件
        if (shouldSkipFile(event.document.fileName)) {
            logger.info(
                `Skipping change diagnosis for: ${event.document.fileName} (special file)`,
            );
            return;
        }

        logger.debug(
            `Document change triggered debounce for: ${event.document.fileName}`,
        );

        const uri = event.document.uri.toString();
        const fileUri = event.document.uri;
        debounceManager.debounce(
            uri,
            async () => {
                // 重新诊断以获取最新状态
                try {
                    // 重新获取最新文档，避免使用过时的引用
                    const textDocument = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === uri);
                    if (!textDocument) {
                        logger.debug(`Document ${uri} not found in workspace, skipping diagnosis`);
                        return;
                    }

                    const domainDocument = toDomainDocument(textDocument);
                    const diagnostics = await diagnoseDocument(domainDocument);
                    const vscodeDiagnostics = fromDomainDiagnostics(diagnostics);
                    // 强制更新诊断集合
                    diagnosticCollection.set(fileUri, vscodeDiagnostics);
                    logger.debug(
                        `Updated diagnostics for changed file: ${vscodeDiagnostics.length} diagnostics`,
                    );
                } catch (error) {
                    logger.error(
                        `Error diagnosing changed document ${event.document.fileName}: ${String(error)}`,
                    );
                }
            },
            300, // 防抖延迟 300ms
        );
    });
}
