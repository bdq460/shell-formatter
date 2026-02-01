/**
 * 诊断转换器
 *
 * 职责：
 * - 将工具结果转换为 VSCode Diagnostic
 * - 统一处理诊断的优先级和严重级别
 */

import * as vscode from "vscode";
import { PackageInfo } from "../../config/package-info";
import { Diagnostic as DomainDiagnostic } from "../../domain/types";

/**
 * 将领域诊断转换为 VSCode 诊断
 * @param diagnostics 领域诊断数组
 * @returns VSCode 诊断数组
 */
export function fromDomainDiagnostics(diagnostics: DomainDiagnostic[]): vscode.Diagnostic[] {
    return diagnostics.map((d) => {
        const range = new vscode.Range(
            d.range.start.line,
            d.range.start.character,
            d.range.end.line,
            d.range.end.character,
        );
        const diagnostic = new vscode.Diagnostic(range, d.message, d.severity);
        // diagnostic.source = d.source;
        // 统一设置来源为扩展名称
        diagnostic.source = PackageInfo.extensionName;
        if (d.code !== undefined) {
            diagnostic.code = d.code;
        }
        return diagnostic;
    });
}
