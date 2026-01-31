/**
 * Shfmt 工具适配器
 *
 * 将基础设施层的 ShfmtTool 适配到领域层的 IFormatTool 接口
 * 遵循适配器模式，解耦领域层与基础设施实现
 */

import {
    IFormatTool,
    FormatToolOptions,
    CheckToolOptions,
    ToolCheckResult,
} from "../../domain/port";
import { Diagnostic, DiagnosticSeverity } from "../../domain/types";
import { ShfmtTool, ShfmtFormatOptions } from "../shell-tools/shfmt/shfmt-tool";

/**
 * Shfmt 工具适配器
 * 实现领域层 IFormatTool 接口，封装基础设施实现
 */
export class ShfmtToolAdapter implements IFormatTool {
    private tool: ShfmtTool;
    private defaultOptions: ShfmtFormatOptions;

    constructor(
        shfmtPath: string | undefined,
        private config: { tabSize: number },
    ) {
        this.tool = new ShfmtTool(shfmtPath);
        this.defaultOptions = {
            indent: config.tabSize,
            binaryNextLine: true,
            caseIndent: true,
            spaceRedirects: true,
        };
    }

    /**
     * 格式化文档内容
     */
    async format(content: string, options?: FormatToolOptions): Promise<string> {
        const result = await this.tool.format("-", {
            ...this.defaultOptions,
            indent: options?.indent ?? this.config.tabSize,
            content,
        });

        if (result.formattedContent === undefined) {
            throw new Error("Format failed: no content returned");
        }

        return result.formattedContent;
    }

    /**
     * 检查文档内容
     */
    async check(content: string, options?: CheckToolOptions): Promise<ToolCheckResult> {
        const result = await this.tool.check("-", {
            ...this.defaultOptions,
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
            await this.tool.check("-", {
                ...this.defaultOptions,
                content: "# test",
            });
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
                    source: "shfmt",
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
                    source: "shfmt",
                });
            }
        }

        // 转换格式问题
        if (toolResult.formatIssues?.length) {
            for (const issue of toolResult.formatIssues) {
                diagnostics.push({
                    range: {
                        start: { line: issue.line, character: issue.column },
                        end: {
                            line: issue.line,
                            character: issue.column + (issue.rangeLength || 1),
                        },
                    },
                    message: issue.message || "Format issue",
                    severity: DiagnosticSeverity.Warning,
                    code: "format-issue",
                    source: "shfmt",
                });
            }
        }

        const hasErrors = diagnostics.some(
            (diag) => diag.severity === DiagnosticSeverity.Error,
        );

        return { hasErrors, diagnostics };
    }
}
