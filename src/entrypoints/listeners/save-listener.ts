/**
 * 文档保存监听器
 *
 * 职责：监听文档保存事件，触发诊断
 */

import * as vscode from "vscode";
import { diagnoseDocument } from "../../application/usecases/diagnose-document";
import { fromDomainDiagnostics } from "../../shared/converters/diagnostic";
import { toDomainDocument } from "../../shared/converters/document";
import { normalizeToFileUri, shouldSkipFile } from "../../shared/file-checker";
import { PERFORMANCE_METRICS } from "../../shared/performance-metrics";
import { DebounceManager } from "../../utils/debounce";
import { logger } from "../../utils/log";
import { startTimer } from "../../utils/performance/monitor";

/**
 * 注册文档保存监听器
 *
 * @param diagnosticCollection VSCode 诊断集合
 * @param debounceManager 防抖管理器
 */
export function registerSaveListener(
    diagnosticCollection: vscode.DiagnosticCollection,
    debounceManager: DebounceManager,
): vscode.Disposable {
    logger.info("Registering document save listener");

    return vscode.workspace.onDidSaveTextDocument(async (document) => {

        // 跳过特殊文件
        if (shouldSkipFile(document)) {
            logger.debug(
                `Skipping save diagnosis for: ${document.fileName} (special file)`,
            );
            return;
        }

        logger.info(`Document saved: ${document.fileName}`);

        // 清除该文档的防抖定时器，避免被后续的防抖诊断覆盖
        const uri = document.uri.toString();
        debounceManager.cancel(uri);

        // 重新诊断以获取最新状态
        try {
            const timer = startTimer(
                PERFORMANCE_METRICS.DOCUMENT_SAVE_DIAGNOSIS_DURATION,
            );
            const domainDocument = toDomainDocument(document);
            const diagnostics = await diagnoseDocument(domainDocument);
            const vscodeDiagnostics = fromDomainDiagnostics(diagnostics);
            timer.stop();
            // 强制更新诊断集合，清除任何旧的诊断信息
            diagnosticCollection.set(normalizeToFileUri(document.uri), vscodeDiagnostics);
            logger.debug(
                `Updated diagnostics for saved file: ${vscodeDiagnostics.length} diagnostics`,
            );
        } catch (error) {
            logger.error(
                `Error diagnosing saved document ${document.fileName}: ${String(error)}`,
            );
        }
    });
}
