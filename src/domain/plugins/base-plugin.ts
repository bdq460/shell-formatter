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
 * - 领域层保持纯净，不依赖基础设施和配置
 * - 通过构造函数注入依赖（依赖倒置原则）
 * - 支持在 CLI、Web、桌面应用等多种场景使用
 *
 * 继承关系：
 * BasePlugin (通用插件机制)
 *   └── BasePlugin (领域层 - 插件基类)
 *         ├── PureShfmtPlugin
 *         └── PureShellcheckPlugin
 */

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
import { IPluginConfig } from "../port";

/**
 * 创建执行错误诊断（私有工具方法）
 * 用于捕获异常时生成诊断对象
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
 * 使用领域类型，不依赖 VSCode、基础设施和配置
 */
export abstract class BasePlugin
    extends BasePluginBase
    implements IFormatPlugin {
    protected configChangeSubId?: string;

    /**
     * 插件配置（通过构造函数注入）
     * 子类必须在构造函数中初始化此属性
     */
    protected abstract pluginConfig: IPluginConfig;

    /**
     * 获取插件的诊断源名称
     * 从注入的配置中获取
     */
    getDiagnosticSource(): string {
        return this.pluginConfig.diagnosticSource;
    }

    /**
     * 获取支持的文件扩展名
     * 从注入的配置中获取
     */
    getSupportedExtensions(): string[] {
        return this.pluginConfig.fileExtensions;
    }

    /**
     * 检查插件是否可用
     * 通常检查工具是否已安装
     */
    abstract isAvailable(): Promise<boolean>;

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
     * 创建格式化结果
     *
     * @param formattedContent 格式化后的内容
     * @param document 原始文档
     * @param diagnostics 诊断信息
     * @returns PluginFormatResult
     */
    protected createFormatResult(
        formattedContent: string | undefined,
        document: Document,
        diagnostics: Diagnostic[],
    ): PluginFormatResult {
        const hasErrors = diagnostics.some(
            (diag) => diag.severity === DiagnosticSeverity.Error,
        );

        // 生成 TextEdit（仅当无致命错误且内容有变化时）
        let textEdits: TextEdit[] = [];
        if (
            !hasErrors &&
            formattedContent &&
            formattedContent !== document.content
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
                    newText: formattedContent,
                },
            ];
        }

        return {
            hasErrors,
            diagnostics,
            textEdits,
        };
    }
}
