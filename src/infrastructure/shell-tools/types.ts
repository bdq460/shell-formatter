/**
 * 工具层类型定义
 * 定义工具的统一接口和数据结构
 */

/**
 * 工具检查结果
 */
export interface ToolResult {
    syntaxErrors?: SyntaxError[];
    formatIssues?: FormatIssue[];
    linterIssues?: LinterIssue[];
    executeErrors?: ExecuteError[];
}

export interface ToolCheckResult extends ToolResult { }

export interface ToolFormatResult extends ToolResult {
    formattedContent?: string;
}

/**
 * 语法错误: 语法错，跑不了
 *
 * 严重程度: ⚠️ 最高 - 代码无法正确解析
 * 用途: 表示 Shell 脚本存在语法错误，导致无法被解析器识别
 * 可执行性: ❌ 不可执行，必须修复
 */
export interface SyntaxError {
    line: number; // 0-based
    column: number; // 0-based
    message: string;
}

/**
 * 格式问题: 格式丑，能跑
 *
 * 严重程度: 💡 低 - 仅格式不符
 * 用途: 表示代码格式不符合规范（如缩进、空格、换行等），但不影响功能执行
 * 可执行性: ✅ 可执行，不阻塞解析
 * 示例: 缩进混乱、空格不一致、换行位置不统一等
 */
export interface FormatIssue {
    line: number; // 问题所在的行号（0-based）
    column: number; // 问题所在的列号（0-based）
    rangeLength: number; // 问题范围的长度（用于高亮）
    oldContent?: string; // 原始内容（带 - 前缀的行）
    newContent?: string; // 新内容（带 + 前缀的行）
    message?: string; // 问题描述
}

/**
 * 代码检查问题: 质量差，小心跑
 *
 * 严重程度: 🔶 中等 - 分级告警
 * 用途: 表示代码质量问题、潜在 bug 或最佳实践建议
 * 可执行性: ⚠️ 可能执行，根据级别决定是否阻塞
 * 级别说明:
 *   - error: 严重问题，可能导致运行错误
 *   - warning: 警告信息，建议修复
 *   - info: 提示信息，可优化但不必须
 * 示例: 未使用变量、安全漏洞、编码规范问题等
 */
export interface LinterIssue {
    line: number;
    column: number;
    type: "error" | "warning" | "info";
    code: string;
    message: string;
}

/**
 * 执行错误类型
 */
export interface ExecuteError {
    command: string;
    exitCode: number | null;
    message: string;
}
