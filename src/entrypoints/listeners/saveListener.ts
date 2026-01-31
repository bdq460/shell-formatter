/**
 * 文档保存监听器
 *
 * 职责：监听文档保存事件，触发诊断
 */

import * as vscode from "vscode";
import { PERFORMANCE_METRICS, startTimer } from "../../application/services/performance-service";
import { diagnoseDocument } from "../../application/usecases/diagnose-document";
import { PackageInfo } from "../../config";
import { fromDomainDiagnostics } from "../../shared/converters/diagnostic";
import { toDomainDocument } from "../../shared/converters/document";
import { DebounceManager } from "../../utils/debounce";
import { logger } from "../../utils/log";

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
        // 只处理 shell 语言文件
        if (document.languageId !== PackageInfo.languageId) {
            return;
        }

        // 跳过特殊文件
        if (shouldSkipFile(document.fileName)) {
            logger.info(
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
            diagnosticCollection.set(document.uri, vscodeDiagnostics);
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

/**
 * 检查是否应该跳过该文件
 * VSCode 编辑器中打开 Git 冲突文件时（如 example.sh.git），文件名会以 .git 结尾。
 * 打开的文件名是.sh 的文件，但是内部文件名其实是.git结尾的,对于这种要进行过滤
 * @param fileName 文件名
 * @returns 如果应该跳过返回 true，否则返回 false
 */
export function shouldSkipFile(fileName: string): boolean {
    const baseName = fileName;

    // 跳过 Git 冲突文件、临时文件等
    const skipPatterns = [
        /\.git$/, // Git 冲突文件
        /\.swp$/, // Vim 临时文件
        /\.swo$/, // Vim 交换文件
        /~$/, // 备份文件
        /\.tmp$/, // 临时文件
        /\.bak$/, // 备份文件
        /^extension-output-/, // VSCode 扩展开发输出文件
    ];

    return skipPatterns.some((pattern) => pattern.test(baseName));
}
