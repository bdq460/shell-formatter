/**
 * 基础插件抽象类
 *
 * 职责：
 * - 继承通用插件机制 (BasePlugin)
 * - 提供格式化和检查功能的基础实现
 * - 提供统一的异常处理和错误转换机制
 * - 简化子类的实现，避免重复的 try-catch 和错误处理代码
 *
 * 设计模式：
 * 模板方法模式（Template Method Pattern）
 * - check() 和 format() 方法由子类实现
 * - 基类提供 handleCheckError() 和 handleFormatError() 处理异常
 * - 子类只需关注核心业务逻辑，异常处理委托给基类
 *
 * 架构说明：
 * - 使用领域类型（Document, Diagnostic, TextEdit 等），不依赖 VSCode
 * - 领域层保持纯净，通过适配器层与 VSCode 集成
 * - 支持在 CLI、Web、桌面应用等多种场景使用
 *
 * 继承关系：
 * BasePlugin (通用插件机制)
 *   └── BasePlugin (领域层 - 插件基类)
 *         ├── PureShfmtPlugin
 *         └── PureShellcheckPlugin
 */

import { ToolCheckResult, ToolFormatResult } from "../../infrastructure/shell-tools/types";
import { PackageInfo } from "../../config";
import { logger } from "../../utils/log";
import { BasePlugin as BasePluginBase } from "../../utils/plugin";
import {
    Diagnostic,
    DiagnosticSeverity,
    Document,
    IFormatPlugin,
    PluginCheckResult,
    PluginFormatResult,
    Range,
    TextEdit,
} from "../plugin-interface";

/**
 * 创建执行错误诊断（私有工具方法）
 * 用于捕获异常时生成诊断对象
 *
 * 为什么是私有方法：
 * - 这是基类的内部实现细节
 * - 子类通过 handleCheckError/handleFormatError 使用，不直接调用
 * - 避免子类误用
 */
function createErrorDiagnostic(
    document: Document,
    errorMessage: string,
    source: string,
): Diagnostic {
    const range: Range = {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 0 },
    };

    return {
        range,
        message: errorMessage,
        severity: DiagnosticSeverity.Error,
        code: "execution-error",
        source,
    };
}

/**
 * 基础插件抽象类
 *
 * 继承 BasePlugin（通用插件机制），提供格式化和检查功能的基础实现
 * 使用领域类型，不依赖 VSCode
 */
export abstract class BasePlugin
    extends BasePluginBase
    implements IFormatPlugin {
    protected configChangeSubId?: string;

    /**
     * 获取插件的诊断源名称
     * 用于在诊断面板中显示
     */
    getDiagnosticSource(): string {
        return PackageInfo.diagnosticSource;
    }

    /**
     * 检查插件是否可用
     * 通常检查工具是否已安装
     */
    abstract isAvailable(): Promise<boolean>;

    /**
     * 获取支持的文件扩展名
     * 用于过滤哪些文件应该被此插件处理
     */
    abstract getSupportedExtensions(): string[];

    /**
     * 获取插件依赖
     * 格式化插件默认没有依赖
     */
    getDependencies() {
        return [];
    }

    /**
     * 获取插件能力
     * 返回此插件提供的能力
     */
    getCapabilities(): string[] {
        const extensions = this.getSupportedExtensions();
        return [
            `format:${this.name}`,
            `check:${this.name}`,
            `extensions:${extensions.join(",")}`,
        ];
    }

    /**
     * 检查文档（子类实现）
     * 不执行格式化，只进行语法/规范检查
     * @param document 要检查的文档（领域类型）
     * @param options 检查选项
     * @returns 检查结果（诊断数组）
     */
    abstract check(
        document: Document,
        options: any,
    ): Promise<PluginCheckResult>;

    /**
     * 格式化文档（子类可选实现）
     * 执行格式化操作
     * @param document 要格式化的文档（领域类型）
     * @param options 格式化选项
     * @returns 格式化结果（诊断 + 编辑）
     */
    format?(
        document: Document,
        options: any,
    ): Promise<PluginFormatResult>;

    /**
     * 处理 check 操作的异常
     *
     * 使用场景：
     * 子类的 check() 方法中
     * ```typescript
     * try {
     *   const result = await tool.check();
     *   return this.createCheckResult(result, document, source);
     * } catch (error) {
     *   logger.error(`Check failed: ${error}`);
     *   return this.handleCheckError(document, error);
     * }
     * ```
     *
     * @param document 文档对象（领域类型）
     * @param error 捕获到的异常
     * @returns PluginCheckResult（包含错误诊断）
     */
    protected handleCheckError(
        document: Document,
        error: unknown,
    ): PluginCheckResult {
        const errorMessage = String(error);
        logger?.error(`${this.name}.check() error: ${errorMessage}`);

        return {
            hasErrors: true,
            diagnostics: [
                createErrorDiagnostic(
                    document,
                    errorMessage,
                    this.getDiagnosticSource(),
                ),
            ],
        };
    }

    /**
     * 处理 format 操作的异常
     *
     * 使用场景：
     * 子类的 format() 方法中
     * ```typescript
     * try {
     *   const result = await tool.format();
     *   return this.createFormatResult(result, document, source);
     * } catch (error) {
     *   logger.error(`Format failed: ${error}`);
     *   return this.handleFormatError(document, error);
     * }
     * ```
     *
     * @param document 文档对象（领域类型）
     * @param error 捕获到的异常
     * @returns PluginFormatResult（包含错误诊断，没有 TextEdit）
     */
    protected handleFormatError(
        document: Document,
        error: unknown,
    ): PluginFormatResult {
        const errorMessage = String(error);
        logger?.error(`${this.name}.format() error: ${errorMessage}`);

        return {
            hasErrors: true,
            diagnostics: [
                createErrorDiagnostic(
                    document,
                    errorMessage,
                    this.getDiagnosticSource(),
                ),
            ],
            textEdits: [],
        };
    }

    /**
     * 处理检查结果：转换工具结果到插件结果
     *
     * 职责：
     * 1. 将 ToolCheckResult 转换为领域 Diagnostic[]
     * 2. 检查诊断中是否包含 Error 级别（设置 hasErrors 标志）
     * 3. 返回统一的 PluginCheckResult 结构
     *
     * 为什么需要这个方法：
     * - 避免在每个插件的 check() 方法中重复转换逻辑
     * - 确保所有诊断转换逻辑一致
     * - 简化子类代码
     *
     * @param toolResult 工具返回的检查结果
     * @param document 文档对象（领域类型）
     * @param source 诊断源
     * @returns PluginCheckResult
     */
    protected createCheckResult(
        toolResult: ToolCheckResult,
        document: Document,
        source: string,
    ): PluginCheckResult {
        const errorCount =
            (toolResult.syntaxErrors?.length || 0) +
            (toolResult.executeErrors?.length || 0) +
            (toolResult.formatIssues?.length || 0) +
            (toolResult.linterIssues?.length || 0);

        logger?.debug(
            `${this.name}.createCheckResult: Converting tool result with ${errorCount} total errors`,
        );

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
                    source,
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
                    source,
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
                    source,
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
                    source,
                });
            }
        }

        const hasErrors = diagnostics.some(
            (diag) => diag.severity === DiagnosticSeverity.Error,
        );

        logger?.debug(
            `${this.name}.createCheckResult: Result has ${diagnostics.length} diagnostics, hasErrors=${hasErrors}`,
        );

        return {
            hasErrors,
            diagnostics,
        };
    }

    /**
     * 处理格式化结果：转换工具结果到插件结果
     *
     * 职责：
     * 1. 将 ToolFormatResult 转换为领域类型 { textEdits, diagnostics }
     * 2. 检查诊断中是否包含 Error 级别（设置 hasErrors 标志）
     * 3. 返回统一的 PluginFormatResult 结构
     *
     * @param toolResult 工具返回的格式化结果
     * @param document 文档对象（领域类型）
     * @param diagnosticSource 诊断源
     * @returns PluginFormatResult
     */
    protected createFormatResult(
        toolResult: ToolFormatResult,
        document: Document,
        diagnosticSource: string,
    ): PluginFormatResult {
        logger?.debug(
            `${this.name}.createFormatResult: Converting tool format result`,
        );

        // 首先获取诊断信息
        const checkResult: ToolCheckResult = {
            syntaxErrors: toolResult.syntaxErrors,
            formatIssues: toolResult.formatIssues,
            linterIssues: toolResult.linterIssues,
            executeErrors: toolResult.executeErrors,
        };

        const { diagnostics, hasErrors } =
            this.createCheckResult(checkResult, document, diagnosticSource);

        // 生成 TextEdit（仅当无致命错误且内容有变化时）
        let textEdits: TextEdit[] = [];
        if (
            !hasErrors &&
            toolResult.formattedContent &&
            toolResult.formattedContent !== document.content
        ) {
            textEdits = [
                {
                    range: {
                        start: { line: 0, character: 0 },
                        end: {
                            line: document.lineCount,
                            character: 0,
                        },
                    },
                    newText: toolResult.formattedContent,
                },
            ];
        }

        logger?.debug(
            `${this.name}.createFormatResult: Generated ${textEdits.length} TextEdits and ${diagnostics.length} diagnostics, hasErrors=${hasErrors}`,
        );

        return {
            hasErrors,
            diagnostics,
            textEdits,
        };
    }
}
