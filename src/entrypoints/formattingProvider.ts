/**
 * 文档格式化提供者
 *
 * 职责：注册 VSCode 格式化提供者，处理格式化请求
 */

import * as vscode from "vscode";
import { PackageInfo } from "../config";
import { formatDocument } from "../application/usecases/format-document";
import { logger } from "../utils/log";
import { shouldSkipFile } from "./listeners/saveListener";
import { toDomainDocument } from "../shared/converters/document";

/**
 * 注册文档格式化提供者
 */
export function registerFormattingProvider(): vscode.Disposable {
    logger.info("Registering document range formatting provider");

    return vscode.languages.registerDocumentRangeFormattingEditProvider(
        PackageInfo.languageId,
        {
            async provideDocumentRangeFormattingEdits(
                document: vscode.TextDocument,
                range: vscode.Range,
                _options: vscode.FormattingOptions,
                token: vscode.CancellationToken,
            ): Promise<vscode.TextEdit[]> {
                // 防御性检查：确保语言类型匹配（虽然 VSCode 已过滤，但保持代码一致性）
                if (document.languageId !== PackageInfo.languageId) {
                    return [];
                }

                // 跳过特殊文件
                if (shouldSkipFile(document.fileName)) {
                    logger.info(
                        `Skipping range formatting for: ${document.fileName} (special file)`,
                    );
                    return [];
                }

                logger.info(
                    `Document range formatting triggered! Document: ${document.fileName}, range: [${range.start.line}, ${range.start.character}] - [${range.end.line}, ${range.end.character}]`,
                );
                logger.info(
                    `Note: Shell script formatting requires full document context, will format entire document`,
                );

                // 转换为领域文档并执行格式化
                const domainDocument = toDomainDocument(document);
                const textEdits = await formatDocument(domainDocument, {
                    token: {
                        isCancellationRequested: token.isCancellationRequested,
                        onCancellationRequested: (callback: () => void) => {
                            const disposable = token.onCancellationRequested(callback);
                            return {
                                dispose: () => disposable.dispose(),
                            };
                        },
                    },
                });

                // 将领域 TextEdit 转换为 VSCode TextEdit
                return textEdits.map((edit) =>
                    new vscode.TextEdit(
                        new vscode.Range(
                            edit.range.start.line,
                            edit.range.start.character,
                            edit.range.end.line,
                            edit.range.end.character,
                        ),
                        edit.newText,
                    ),
                );
            },
        },
    );
}
