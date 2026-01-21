/**
 * 适配器：将工具结果转换为 VSCode Diagnostic
 */

import * as vscode from "vscode";
import { ToolCheckResult } from "../tools/shell/types";
import { DiagnosticFactory } from "./diagnosticFactory";

/**
 * 诊断适配器
 * 将工具结果转换为 VSCode Diagnostic
 */
export class DiagnosticAdapter {
    /**
     * 完整的结果处理，包含错误检查和诊断创建
     * 统一的错误优先级：executeErrors > syntaxErrors > formatIssues > linterIssues
     * @param result 工具结果
     * @param document 文档对象
     * @param source 诊断源
     * @returns 诊断数组
     */
    static convertCheckResultToDiagnostics(
        result: ToolCheckResult,
        document: vscode.TextDocument,
        source: string,
    ): vscode.Diagnostic[] {
        return DiagnosticFactory.convertToolResultToDiagnostics(
            result,
            document,
            source,
        );
    }
}
