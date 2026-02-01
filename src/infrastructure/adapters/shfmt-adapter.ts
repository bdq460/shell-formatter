/**
 * Shfmt 工具适配器
 *
 * 将基础设施层的 ShfmtTool 适配到领域层的 IFormatTool 接口
 * 遵循适配器模式，解耦领域层与基础设施实现
 */

import {
    CheckToolOptions,
    FormatToolOptions,
    IFormatTool,
    PluginCheckResult,
    PluginFormatResult,
} from "../../domain/port";
import { Diagnostic, DiagnosticSeverity, TextEdit } from "../../domain/types";
import { ShfmtFormatOptions, ShfmtTool } from "../shell-tools/shfmt/shfmt-tool";
import { ToolCheckResult, ToolFormatResult } from "../shell-tools/types";

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
    async format(content: string, options?: FormatToolOptions): Promise<PluginFormatResult> {
        const toolResult = await this.tool.format("-", {
            ...this.defaultOptions,
            indent: options?.indent ?? this.config.tabSize,
            content,
        });

        if (toolResult.formattedContent === undefined) {
            throw new Error("Format failed: no content returned");
        }

        return this.convertToPluginFormatResult(toolResult);
    }

    /**
     * 检查文档内容
     */
    async check(content: string, options?: CheckToolOptions): Promise<PluginCheckResult> {
        const result = await this.tool.check("-", {
            ...this.defaultOptions,
            content,
            token: options?.token,
        });

        return this.convertToPluginCheckResult(result);
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
    private convertToPluginCheckResult(
        toolResult: ToolCheckResult,
    ): PluginCheckResult {
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

    /**
     * 转换基础设施格式化结果到领域结果
     */
    private convertToPluginFormatResult(
        toolResult: ToolFormatResult,
    ): PluginFormatResult {
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

        // 生成 TextEdit（仅当无致命错误且有格式化内容时）
        const textEdits: TextEdit[] = [];
        if (!hasErrors && toolResult.formattedContent) {
            // 注意：这里无法计算精确的行数，暂时生成全文档替换
            textEdits.push({
                range: {
                    start: { line: 0, character: 0 },
                    end: { line: Number.MAX_SAFE_INTEGER, character: 0 },
                },
                newText: toolResult.formattedContent,
            });
        }

        return {
            hasErrors,
            diagnostics,
            textEdits,
            formattedContent: toolResult.formattedContent,
        };
    }
}
