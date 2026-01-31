/**
 * Shellcheck 工具适配器
 *
 * 将基础设施层的 ShellcheckTool 适配到领域层的 ICheckTool 接口
 * 遵循适配器模式，解耦领域层与基础设施实现
 */

import {
    ICheckTool,
    CheckToolOptions,
    ToolCheckResult,
} from "../../domain/port";
import { Diagnostic, DiagnosticSeverity } from "../../domain/types";
import { ShellcheckTool } from "../shell-tools/shellcheck/shellcheck-tool";

/**
 * Shellcheck 工具适配器
 * 实现领域层 ICheckTool 接口，封装基础设施实现
 */
export class ShellcheckToolAdapter implements ICheckTool {
    private tool: ShellcheckTool;

    constructor(shellcheckPath: string | undefined) {
        this.tool = new ShellcheckTool(shellcheckPath);
    }

    /**
     * 检查文档内容
     */
    async check(content: string, options?: CheckToolOptions): Promise<ToolCheckResult> {
        const result = await this.tool.check({
            file: "-",
            content,
            token: options?.token,
        });

        return this.convertToToolCheckResult(result);
    }

    /**
     * 检查工具是否可用
     */
    async isAvailable(): Promise<boolean> {
        try {
            await this.tool.check({ file: "-", content: "# test" });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * 转换基础设施结果到领域结果
     */
    private convertToToolCheckResult(
        toolResult: import("../shell-tools/types").ToolCheckResult,
    ): ToolCheckResult {
        const diagnostics: Diagnostic[] = [];

        // 转换执行错误
        if (toolResult.executeErrors?.length) {
            for (const err of toolResult.executeErrors) {
                diagnostics.push({
                    range: {
                        start: { line: 0, character: 0 },
                        end: { line: 0, character: 0 },
                    },
                    message: `[${err.command}] Exit code ${err.exitCode}: ${err.message}`,
                    severity: DiagnosticSeverity.Error,
                    code: "execute-error",
                    source: "shellcheck",
                });
            }
        }

        // 转换语法错误
        if (toolResult.syntaxErrors?.length) {
            for (const err of toolResult.syntaxErrors) {
                diagnostics.push({
                    range: {
                        start: { line: err.line, character: err.column },
                        end: { line: err.line, character: err.column + 1 },
                    },
                    message: err.message,
                    severity: DiagnosticSeverity.Error,
                    code: "syntax-error",
                    source: "shellcheck",
                });
            }
        }

        // 转换 linter 问题
        if (toolResult.linterIssues?.length) {
            for (const issue of toolResult.linterIssues) {
                let severity: DiagnosticSeverity;
                switch (issue.type) {
                    case "error":
                        severity = DiagnosticSeverity.Error;
                        break;
                    case "warning":
                        severity = DiagnosticSeverity.Warning;
                        break;
                    case "info":
                        severity = DiagnosticSeverity.Information;
                        break;
                    default:
                        severity = DiagnosticSeverity.Warning;
                }

                diagnostics.push({
                    range: {
                        start: { line: issue.line, character: issue.column },
                        end: { line: issue.line, character: issue.column + 1 },
                    },
                    message: `[${issue.code}] ${issue.message}`,
                    severity,
                    code: issue.code,
                    source: "shellcheck",
                });
            }
        }

        const hasErrors = diagnostics.some(
            (diag) => diag.severity === DiagnosticSeverity.Error,
        );

        return { hasErrors, diagnostics };
    }
}
