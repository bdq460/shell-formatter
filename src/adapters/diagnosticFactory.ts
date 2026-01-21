/**
 * 诊断工厂类
 * 统一创建各种类型的诊断对象，消除适配器间的代码重复
 *
 * 职责：
 * - 将工具结果（ToolCheckResult, ToolFormatResult）转换为 VSCode Diagnostic 对象
 * - 统一管理诊断的优先级和严重级别
 * - 提供一致的诊断创建接口给所有适配器和插件
 *
 * 设计模式：
 * 工厂模式（Factory Pattern）- 将复杂的诊断对象创建逻辑集中在一个地方
 * 这样做的好处：
 * 1. 改变诊断逻辑时只需修改一个文件
 * 2. 确保所有地方的诊断创建行为一致
 * 3. 易于测试诊断创建的各种场景
 *
 * 错误优先级说明：
 * executeErrors > syntaxErrors > formatIssues > linterIssues
 *
 * 原因：
 * - executeErrors: 工具本身不可用，是最严重的错误
 * - syntaxErrors: 脚本语法有误，无法执行
 * - formatIssues: 代码格式问题（可以修复）
 * - linterIssues: 代码规范问题（信息性提示）
 */

import * as vscode from "vscode";
import {
    ExecuteError,
    FormatIssue,
    LinterIssue,
    SyntaxError,
    ToolCheckResult,
} from "../tools/shell/types";
import { logger } from "../utils/log";

/**
 * 诊断工厂
 * 提供统一的方式创建各种类型的诊断
 */
export class DiagnosticFactory {
    /**
     * 将工具结果转换为诊断数组
     * 统一的错误优先级：executeErrors > syntaxErrors > formatIssues > linterIssues
     * 这是 DiagnosticAdapter 和 FormatterAdapter 的共享逻辑
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
                `DiagnosticFactory: Converting ${result.executeErrors.length} execute errors from ${source}`,
            );
            for (const err of result.executeErrors) {
                diagnostics.push(this.createExecuteError(err, document, source));
            }
            logger?.debug(
                `DiagnosticFactory: Created ${diagnostics.length} execute error diagnostics`,
            );
        }
        // 错误优先级2：语法错误 - 次严重，脚本本身有问题
        else if (result.syntaxErrors?.length) {
            logger?.debug(
                `DiagnosticFactory: Converting ${result.syntaxErrors.length} syntax errors from ${source}`,
            );
            for (const err of result.syntaxErrors) {
                diagnostics.push(this.createSyntaxError(err, document, source));
            }
            logger?.debug(
                `DiagnosticFactory: Created ${diagnostics.length} syntax error diagnostics`,
            );
        }
        // 错误优先级3&4：格式问题和 linter 问题 - 信息性提示
        // 只在没有致命错误时才展示这些问题
        else {
            if (result.formatIssues?.length) {
                logger?.debug(
                    `DiagnosticFactory: Converting ${result.formatIssues.length} format issues from ${source}`,
                );
                for (const issue of result.formatIssues) {
                    diagnostics.push(this.createFormatIssue(issue, source));
                }
            }
            if (result.linterIssues?.length) {
                logger?.debug(
                    `DiagnosticFactory: Converting ${result.linterIssues.length} linter issues from ${source}`,
                );
                for (const issue of result.linterIssues) {
                    diagnostics.push(this.createLinterIssue(issue, source));
                }
            }
            if (diagnostics.length > 0) {
                logger?.debug(
                    `DiagnosticFactory: Created ${diagnostics.length} format/linter diagnostics`,
                );
            }
        }

        return diagnostics;
    }

    /**
     * 创建执行错误诊断
     * 用于工具执行失败的情况（如工具未安装、权限不足、超时等）
     *
     * 特点：
     * - 显示在第一行（最显眼的位置）
     * - 严重级别为 Error（红色）
     * - 包含完整的错误信息和命令行
     * - 便于用户快速定位问题
     *
     * @param error 执行错误对象
     * @param document 文档对象
     * @param source 诊断源（工具名称）
     * @returns 诊断对象
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
            `DiagnosticFactory: Creating execution error for ${source}: ${error.message}`,
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
     *
     * 特点：
     * - 精确定位到出错行
     * - 严重级别为 Error（红色）
     * - 提供清晰的错误描述
     * - 用户可以通过错误行号快速定位问题
     *
     * @param error 语法错误对象
     * @param document 文档对象
     * @param source 诊断源（工具名称）
     * @returns 诊断对象
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
            `DiagnosticFactory: Creating syntax error at line ${error.line} from ${source}: ${error.message}`,
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
     *
     * 特点：
     * - 精确到行列位置
     * - 严重级别为 Warning（黄色）
     * - 表示代码可以运行但不符合规范
     * - 配合 VSCode 快速修复功能使用
     *
     * @param issue 格式问题对象
     * @param source 诊断源（工具名称）
     * @returns 诊断对象
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
            `DiagnosticFactory: Creating format issue at [${issue.line}:${issue.column}] from ${source}`,
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
     * 用于 linter（如 shellcheck）检查出的问题（如未定义的变量、不安全的操作等）
     *
     * 特点：
     * - 精确到行列位置
     * - 严重级别根据问题类型而定（Error/Warning/Information）
     * - 包含错误代码便于查询文档
     * - 提供最详细的问题描述
     *
     * @param issue linter 问题对象
     * @param source 诊断源（工具名称）
     * @returns 诊断对象
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
            `DiagnosticFactory: Creating linter issue [${issue.code}] at [${issue.line}:${issue.column}] from ${source}`,
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
