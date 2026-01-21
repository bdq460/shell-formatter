/**
 * 适配器：将格式化结果转换为 VSCode TextEdit 和 Diagnostic
 *
 * 职责：
 * - 将 ToolFormatResult（工具层）转换为 VSCode 能理解的 TextEdit 和 Diagnostic
 * - 处理格式化结果的各种情况（成功、失败、部分成功等）
 * - 确保错误处理和成功结果的一致性
 *
 * 设计特点：
 * 1. 使用 DiagnosticFactory 统一处理错误转换
 * 2. 只在没有错误时才生成 TextEdit（避免应用有问题的格式）
 * 3. 返回统一的结构 { textEdits, diagnostics } 便于调用者处理
 *
 * 错误处理策略：
 * - 如果有致命错误（执行错误、语法错误），返回诊断但不返回 TextEdit
 * - 如果有警告（格式问题、linter 问题），仍然返回 TextEdit 但也返回诊断
 * - 如果成功且内容变化，返回替换整个文档的 TextEdit
 */

import * as vscode from "vscode";
import { ToolFormatResult } from "../tools/shell/types";
import { logger } from "../utils/log";
import { DiagnosticFactory } from "./diagnosticFactory";

/**
 * 格式化适配器
 * 将格式化结果转换为 VSCode TextEdit
 */
export class FormatterAdapter {
    /**
     * 转换格式化结果为 TextEdit 和 Diagnostic
     *
     * 处理流程：
     * 1. 使用 DiagnosticFactory 转换所有错误（统一优先级）
     * 2. 检查是否有致命错误（DiagnosticSeverity.Error）
     * 3. 只在无致命错误且内容有变化时生成 TextEdit
     * 4. 返回 { textEdits: [], diagnostics: [...] } 的统一结构
     *
     * 返回结果说明：
     * - textEdits 为空：有错误或内容未变化（不需要编辑）
     * - textEdits 包含一个 replace 操作：整个文档需要替换
     * - diagnostics 可能为空或包含多个诊断（错误、警告、提示）
     *
     * @param result 工具格式化结果
     * @param document 要格式化的文档对象
     * @param source 诊断源（如 "shfmt"）
     * @returns { textEdits: VSCode TextEdit[], diagnostics: VSCode Diagnostic[] }
     */
    static convertFormatResultToDiagnosticsAndTextEdits(
        result: ToolFormatResult,
        document: vscode.TextDocument,
        source: string,
    ): { textEdits: vscode.TextEdit[]; diagnostics: vscode.Diagnostic[] } {
        logger?.debug(
            `FormatterAdapter: Converting format result from ${source} for document: ${document.fileName}`,
        );

        // 步骤1：转换诊断（使用工厂方法处理优先级）
        const diagnostics = DiagnosticFactory.convertToolResultToDiagnostics(
            result,
            document,
            source,
        );

        // 步骤2：检查是否有致命错误（错误级别诊断）
        const hasErrors = diagnostics.some(
            (diag) => diag.severity === vscode.DiagnosticSeverity.Error,
        );

        if (hasErrors) {
            logger?.warn(
                `FormatterAdapter: Formatting has errors from ${source}, skipping TextEdit generation`,
            );
            return { textEdits: [], diagnostics };
        }

        // 步骤3：生成 TextEdit（仅当无致命错误且内容变化时）
        let textEdits: vscode.TextEdit[] = [];
        if (
            result.formattedContent &&
            result.formattedContent !== document.getText()
        ) {
            logger?.info(
                `FormatterAdapter: Format content changed from ${source}, generating TextEdit`,
            );
            const fullRange = new vscode.Range(
                document.positionAt(0),
                document.positionAt(document.getText().length),
            );
            textEdits = [vscode.TextEdit.replace(fullRange, result.formattedContent)];
            logger?.debug(
                `FormatterAdapter: Generated 1 TextEdit for full document replacement`,
            );
        } else {
            logger?.debug(
                `FormatterAdapter: No content change detected from ${source}, no TextEdit needed`,
            );
        }

        return { textEdits, diagnostics };
    }
}
