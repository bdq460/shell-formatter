/**
 * 基础格式化插件抽象类
 *
 * 职责：
 * - 继承通用插件机制 (BasePlugin)
 * - 添加 VSCode 特定的格式化和检查功能
 * - 提供统一的异常处理和错误转换机制
 * - 简化子类的实现，避免重复的 try-catch 和错误处理代码
 *
 * 设计模式：
 * 模板方法模式（Template Method Pattern）
 * - check() 和 format() 方法由子类实现
 * - 基类提供 handleCheckError() 和 handleFormatError() 处理异常
 * - 子类只需关注核心业务逻辑，异常处理委托给基类
 *
 * 通用逻辑：
 * - 异常捕获：子类 catch 块直接调用 handleCheckError/handleFormatError
 * - 结果转换：createCheckResult/createFormatResult 代理给适配器
 * - 诊断生成：统一通过 DiagnosticFactory 确保一致性
 *
 * 继承关系：
 * BasePlugin (通用插件机制)
 *   └── BaseFormatPlugin (VSCode 特定)
 *         ├── PureShfmtPlugin
 *         └── PureShellcheckPlugin
 */

import * as vscode from "vscode";
import { DiagnosticAdapter } from "../adapters/diagnosticAdapter";
import { FormatterAdapter } from "../adapters/formatterAdapter";
import { PackageInfo } from "../config";
import { ToolCheckResult, ToolFormatResult } from "../tools/shell/types";
import { logger } from "../utils/log";
import { BasePlugin } from "../utils/plugin";
import {
    IFormatPlugin,
    PluginCheckResult,
    PluginFormatResult,
} from "./pluginInterface";

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
    document: vscode.TextDocument,
    errorMessage: string,
    source: string,
): vscode.Diagnostic {
    const lineRange =
        document.lineCount > 0
            ? document.lineAt(0).range
            : new vscode.Range(0, 0, 0, 0);
    const errorDiagnostic = new vscode.Diagnostic(
        lineRange,
        errorMessage,
        vscode.DiagnosticSeverity.Error,
    );
    errorDiagnostic.source = source;
    errorDiagnostic.code = "execution-error";
    return errorDiagnostic;
}

/**
 * 基础格式化插件抽象类
 *
 * 继承 BasePlugin（通用插件机制），添加 VSCode 特定的格式化和检查功能
 */
export abstract class BaseFormatPlugin
    extends BasePlugin
    implements IFormatPlugin {
    protected configChangeSubId?: string;

    /**
     * 获取插件的诊断源名称
     * 用于在 VSCode 诊断面板中显示
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
     * @param document 要检查的文档
     * @param options 检查选项
     * @returns 检查结果（诊断数组）
     */
    abstract check(document: any, options: any): Promise<PluginCheckResult>;

    /**
     * 格式化文档（子类可选实现）
     * 执行格式化操作
     * @param document 要格式化的文档
     * @param options 格式化选项
     * @returns 格式化结果（诊断 + 编辑）
     */
    format?(document: any, options: any): Promise<PluginFormatResult>;

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
     * @param document 文档对象
     * @param error 捕获到的异常
     * @returns PluginCheckResult（包含错误诊断）
     */
    protected handleCheckError(
        document: vscode.TextDocument,
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
     * @param document 文档对象
     * @param error 捕获到的异常
     * @returns PluginFormatResult（包含错误诊断，没有 TextEdit）
     */
    protected handleFormatError(
        document: vscode.TextDocument,
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
     * 1. 调用 DiagnosticAdapter 转换 ToolCheckResult → vscode.Diagnostic[]
     * 2. 检查诊断中是否包含 Error 级别（设置 hasErrors 标志）
     * 3. 返回统一的 PluginCheckResult 结构
     *
     * 为什么需要这个方法：
     * - 避免在每个插件的 check() 方法中重复转换逻辑
     * - 确保所有诊断转换通过适配器（单一职责原则）
     * - 简化子类代码
     *
     * @param toolResult 工具返回的检查结果
     * @param document 文档对象
     * @param source 诊断源
     * @returns PluginCheckResult
     */
    protected createCheckResult(
        toolResult: ToolCheckResult,
        document: vscode.TextDocument,
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

        const diagnostics = DiagnosticAdapter.convertCheckResultToDiagnostics(
            toolResult,
            document,
            source,
        );

        const hasErrors = diagnostics.some(
            (diag: vscode.Diagnostic) =>
                diag.severity === vscode.DiagnosticSeverity.Error,
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
     * 1. 调用 FormatterAdapter 转换 ToolFormatResult → { textEdits, diagnostics }
     * 2. 检查诊断中是否包含 Error 级别（设置 hasErrors 标志）
     * 3. 返回统一的 PluginFormatResult 结构
     *
     * 为什么分离 FormatterAdapter：
     * - DiagnosticAdapter 只处理诊断，FormatterAdapter 额外处理 TextEdit
     * - 格式化需要同时返回编辑和诊断，检查只返回诊断
     * - 避免混淆两种不同的适配逻辑
     *
     * @param toolResult 工具返回的格式化结果
     * @param document 文档对象
     * @param diagnosticSource 诊断源
     * @returns PluginFormatResult
     */
    protected createFormatResult(
        toolResult: ToolFormatResult,
        document: vscode.TextDocument,
        diagnosticSource: string,
    ): PluginFormatResult {
        logger?.debug(
            `${this.name}.createFormatResult: Converting tool format result`,
        );

        const { textEdits, diagnostics } =
            FormatterAdapter.convertFormatResultToDiagnosticsAndTextEdits(
                toolResult,
                document,
                diagnosticSource,
            );

        const hasErrors = diagnostics.some(
            (diag: vscode.Diagnostic) =>
                diag.severity === vscode.DiagnosticSeverity.Error,
        );

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
