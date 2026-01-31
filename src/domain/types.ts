/**
 * 领域层类型定义
 *
 * 定义不依赖 VSCode 的领域类型
 * 用于插件接口和核心业务逻辑
 *
 * 设计原则：
 * 1. 不依赖任何外部框架（VSCode、浏览器等）
 * 2. 可在 CLI、Web、桌面应用等多种场景使用
 * 3. 通过适配器层与 VSCode 类型进行转换
 */

/**
 * 文档领域模型
 * 对应 VSCode TextDocument 的领域表示
 */
export interface Document {
    /** 文档 URI */
    uri: string;
    /** 文档内容 */
    content: string;
    /** 语言 ID */
    languageId: string;
    /** 文件名 */
    fileName: string;
    /** 行数 */
    lineCount: number;
}

/**
 * 位置领域模型
 * 对应 VSCode Position 的领域表示
 */
export interface Position {
    /** 行号（0-based） */
    line: number;
    /** 列号（0-based） */
    character: number;
}

/**
 * 范围领域模型
 * 对应 VSCode Range 的领域表示
 */
export interface Range {
    /** 起始位置 */
    start: Position;
    /** 结束位置 */
    end: Position;
}

/**
 * 文本编辑领域模型
 * 对应 VSCode TextEdit 的领域表示
 */
export interface TextEdit {
    /** 编辑范围 */
    range: Range;
    /** 新文本内容 */
    newText: string;
}

/**
 * 诊断严重级别
 * 对应 VSCode DiagnosticSeverity 的领域表示
 */
export enum DiagnosticSeverity {
    /** 错误 */
    Error = 0,
    /** 警告 */
    Warning = 1,
    /** 信息 */
    Information = 2,
    /** 提示 */
    Hint = 3,
}

/**
 * 诊断领域模型
 * 对应 VSCode Diagnostic 的领域表示
 */
export interface Diagnostic {
    /** 诊断范围 */
    range: Range;
    /** 诊断消息 */
    message: string;
    /** 严重级别 */
    severity: DiagnosticSeverity;
    /** 诊断代码 */
    code?: string | number;
    /** 诊断源 */
    source?: string;
}

// 从基础设施层导入基础类型
import type { CancellationToken, Disposable } from "../utils/executor/types";
export type { CancellationToken, Disposable };

/**
 * 通用插件选项
 */
export interface PluginCommonOptions {
    /** 取消令牌 */
    token?: CancellationToken;
    /** 超时时间（毫秒） */
    timeout?: number;
}

/**
 * 格式化选项
 */
export interface PluginFormatOptions extends PluginCommonOptions { }

/**
 * 检查选项
 */
export interface PluginCheckOptions extends PluginCommonOptions { }

/**
 * 通用插件结果
 */
export interface PluginCommonResult {
    /** 是否有错误 */
    hasErrors: boolean;
    /** 诊断信息 */
    diagnostics: Diagnostic[];
}

/**
 * 格式化结果
 */
export interface PluginFormatResult extends PluginCommonResult {
    /** 格式化后的内容 */
    formattedContent?: string;
    /** 文本编辑列表 */
    textEdits: TextEdit[];
}

/**
 * 检查结果
 */
export interface PluginCheckResult extends PluginCommonResult { }
