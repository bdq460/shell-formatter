/**
 * 诊断转换器
 *
 * 职责：
 * - 将工具结果转换为 VSCode Diagnostic
 * - 统一处理诊断的优先级和严重级别
 */

import {
    ExecuteError,
    FormatIssue,
    LinterIssue,
    SyntaxError,
    ToolCheckResult,
} from "../../infrastructure/shell-tools/types";
import * as vscode from "vscode";
import { logger } from "../../utils/log";
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
        diagnostic.source = d.source;
        if (d.code !== undefined) {
            diagnostic.code = d.code;
        }
        return diagnostic;
    });
}

/**
 * 诊断转换器
 * 提供统一的方式创建各种类型的诊断
 */
export class DiagnosticConverter {
    /**
     * 将工具结果转换为诊断数组
     * 统一的错误优先级：executeErrors > syntaxErrors > formatIssues > linterIssues
     *
     * 处理流程：
     * 1. 检查是否有执行错误（工具不可用）-> 停止处理
     * 2. 检查是否有语法错误（脚本语法错误）-> 停止处理
     * 3. 收集格式问题和 linter 问题作为补充诊断
     *
     * @param result 工具执行结果对象
     * @param document 文档对象（用于获取行信息）
     * @param source 诊断源（如 "shfmt", "shellcheck"）
     * @returns 诊断数组（按优先级排序）
     */
    static convertToolResultToDiagnostics(
        result: ToolCheckResult,
        document: vscode.TextDocument,
        source: string,
    ): vscode.Diagnostic[] {
        const diagnostics: vscode.Diagnostic[] = [];

        // 错误优先级1：执行错误 - 最严重，停止进一步处理
        if (result.executeErrors?.length) {
            logger?.debug(
                `DiagnosticConverter: Converting ${result.executeErrors.length} execute errors from ${source}`,
            );
            for (const err of result.executeErrors) {
                diagnostics.push(this.createExecuteError(err, document, source));
            }
            logger?.debug(
                `DiagnosticConverter: Created ${diagnostics.length} execute error diagnostics`,
            );
        }
        // 错误优先级2：语法错误 - 次严重，脚本本身有问题
        else if (result.syntaxErrors?.length) {
            logger?.debug(
                `DiagnosticConverter: Converting ${result.syntaxErrors.length} syntax errors from ${source}`,
            );
            for (const err of result.syntaxErrors) {
                diagnostics.push(this.createSyntaxError(err, document, source));
            }
            logger?.debug(
                `DiagnosticConverter: Created ${diagnostics.length} syntax error diagnostics`,
            );
        }
        // 错误优先级3&4：格式问题和 linter 问题 - 信息性提示
        // 只在没有致命错误时才展示这些问题
        else {
            if (result.formatIssues?.length) {
                logger?.debug(
                    `DiagnosticConverter: Converting ${result.formatIssues.length} format issues from ${source}`,
                );
                for (const issue of result.formatIssues) {
                    diagnostics.push(this.createFormatIssue(issue, source));
                }
            }
            if (result.linterIssues?.length) {
                logger?.debug(
                    `DiagnosticConverter: Converting ${result.linterIssues.length} linter issues from ${source}`,
                );
                for (const issue of result.linterIssues) {
                    diagnostics.push(this.createLinterIssue(issue, source));
                }
            }
            if (diagnostics.length > 0) {
                logger?.debug(
                    `DiagnosticConverter: Created ${diagnostics.length} format/linter diagnostics`,
                );
            }
        }

        return diagnostics;
    }

    /**
     * 创建执行错误诊断
     * 用于工具执行失败的情况（如工具未安装、权限不足、超时等）
     */
    static createExecuteError(
        error: ExecuteError,
        document: vscode.TextDocument,
        source?: string,
    ): vscode.Diagnostic {
        const lineRange =
            document.lineCount > 0
                ? document.lineAt(0).range
                : new vscode.Range(0, 0, 0, 0);

        const commandName = error.command.split(" ")[0];
        const fullMessage = `${error.message}\n\nCommand: ${error.command}`;

        logger?.warn(
            `DiagnosticConverter: Creating execution error for ${source}: ${error.message}`,
        );

        const diagnostic = new vscode.Diagnostic(
            lineRange,
            fullMessage,
            vscode.DiagnosticSeverity.Error,
        );
        diagnostic.source = source || commandName;
        diagnostic.code = "execution-error";
        return diagnostic;
    }

    /**
     * 创建语法错误诊断
     * 用于脚本语法错误（如括号不匹配、命令语法错误等）
     */
    static createSyntaxError(
        error: SyntaxError,
        document: vscode.TextDocument,
        source: string,
    ): vscode.Diagnostic {
        const lineRange =
            document.lineCount > 0 && error.line < document.lineCount
                ? document.lineAt(error.line).range
                : new vscode.Range(0, 0, 0, 0);

        logger?.warn(
            `DiagnosticConverter: Creating syntax error at line ${error.line} from ${source}: ${error.message}`,
        );

        const diagnostic = new vscode.Diagnostic(
            lineRange,
            `Syntax error: ${error.message}`,
            vscode.DiagnosticSeverity.Error,
        );
        diagnostic.source = source;
        diagnostic.code = "syntax-error";
        return diagnostic;
    }

    /**
     * 创建格式问题诊断
     * 用于格式不符合预期的情况（如缩进、空格、行长等）
     */
    static createFormatIssue(
        issue: FormatIssue,
        source: string,
    ): vscode.Diagnostic {
        const range = new vscode.Range(
            new vscode.Position(issue.line, issue.column),
            new vscode.Position(issue.line, issue.column + issue.rangeLength),
        );

        logger?.debug(
            `DiagnosticConverter: Creating format issue at [${issue.line}:${issue.column}] from ${source}`,
        );

        const diagnostic = new vscode.Diagnostic(
            range,
            issue.message || "格式不正确",
            vscode.DiagnosticSeverity.Warning,
        );
        diagnostic.source = source;
        diagnostic.code = "format-issue";
        return diagnostic;
    }

    /**
     * 创建 Linter 问题诊断
     * 用于 linter（如 shellcheck）检查出的问题
     */
    static createLinterIssue(
        issue: LinterIssue,
        source: string,
    ): vscode.Diagnostic {
        const range = new vscode.Range(
            issue.line,
            issue.column,
            issue.line,
            issue.column + 1,
        );

        const severity =
            issue.type === "error"
                ? vscode.DiagnosticSeverity.Error
                : issue.type === "warning"
                    ? vscode.DiagnosticSeverity.Warning
                    : vscode.DiagnosticSeverity.Information;

        logger?.debug(
            `DiagnosticConverter: Creating linter issue [${issue.code}] at [${issue.line}:${issue.column}] from ${source}`,
        );

        const diagnostic = new vscode.Diagnostic(
            range,
            `${issue.code}: ${issue.message}`,
            severity,
        );
        diagnostic.source = source;
        diagnostic.code = issue.code;

        return diagnostic;
    }
}
