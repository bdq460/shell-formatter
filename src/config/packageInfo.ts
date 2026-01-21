/**
 * 插件元信息工具类
 * 统一管理从 package.json 读取的静态插件信息
 */

import * as packageJson from "../../package.json";

interface Command {
    command: string;
    title: string;
}

interface CodeAction {
    kind: string;
    title: string;
    languages?: string[];
}

/**
 * 插件信息类
 * 统一管理从 package.json 读取的插件元数据
 *
 * 该类提供了静态访问器来获取插件的配置信息，包括：
 * - 基本信息（名称、版本、发布者等）
 * - 语言配置（语言ID、别名、文件扩展名）
 * - 命令配置（命令ID和标题）
 * - CodeAction 配置
 * - 默认配置值
 *
 * 所有配置都直接从 package.json 读取，避免硬编码
 */
export class PackageInfo {
    // ==================== 插件基本信息 ====================

    /**
     * 获取插件名称
     * @returns 插件标识符
     */
    static get extensionName(): string {
        return packageJson.name;
    }

    /**
     * 获取插件显示名称
     * @returns 插件在市场中显示的名称
     */
    static get displayName(): string {
        return packageJson.displayName;
    }

    /**
     * 获取插件描述
     * @returns 插件的功能描述
     */
    static get description(): string {
        return packageJson.description;
    }

    /**
     * 获取插件版本
     * @returns 插件版本号
     */
    static get version(): string {
        return packageJson.version;
    }

    /**
     * 获取插件发布者
     * @returns 插件发布者名称
     */
    static get publisher(): string {
        return packageJson.publisher;
    }

    // ==================== 语言配置 ====================

    /**
     * 获取语言ID
     * @returns shell 脚本的语言标识符，默认为 'shellscript'
     */
    static get languageId(): string {
        return packageJson.contributes?.languages?.[0]?.id || "shellscript";
    }

    /**
     * 获取语言别名
     * @returns 语言的别名数组，如 ['shell', 'bash', 'sh']
     */
    static get languageAliases(): string[] {
        return packageJson.contributes?.languages?.[0]?.aliases || [];
    }

    /**
     * 获取支持的文件扩展名
     * @returns 支持的文件扩展名数组，如 ['.sh', '.bash', '.zsh']
     */
    static get fileExtensions(): string[] {
        return (
            packageJson.contributes?.languages?.[0]?.extensions || [
                ".sh",
                ".bash",
                ".zsh",
            ]
        );
    }

    // ==================== 命令配置 ====================

    /**
     * 获取格式化文档的命令ID
     * @returns 格式化文档命令的完整ID
     */
    // static get commandFormatDocument(): string {
    //     return packageJson.contributes?.commands?.find((c: Command) => c.command?.includes('formatDocument'))?.command
    //         || 'shell-format.formatDocument';
    // }

    /**
     * 获取修复所有问题的命令ID
     * @returns 修复所有问题命令的完整ID
     */
    static get commandFixAllProblems(): string {
        return (
            packageJson.contributes?.commands?.find((c: Command) =>
                c.command?.includes("fixAllProblems"),
            )?.command || "shell-format.fixAllProblems"
        );
    }

    /**
     * 获取显示性能报告的命令ID
     * @returns 显示性能报告命令的完整ID
     */
    static get commandShowPerformanceReport(): string {
        return (
            packageJson.contributes?.commands?.find((c: Command) =>
                c.command?.includes("showPerformanceReport"),
            )?.command || "shell-format.showPerformanceReport"
        );
    }

    /**
     * 获取重置性能指标的命令ID
     * @returns 重置性能指标命令的完整ID
     */
    static get commandResetPerformanceMetrics(): string {
        return (
            packageJson.contributes?.commands?.find((c: Command) =>
                c.command?.includes("resetPerformanceMetrics"),
            )?.command || "shell-format.resetPerformanceMetrics"
        );
    }

    /**
     * 获取格式化文档命令的标题
     * @returns 格式化文档命令在命令面板中显示的标题
     */
    static get commandFormatTitle(): string {
        return (
            packageJson.contributes?.commands?.find((c: Command) =>
                c.command?.includes("formatDocument"),
            )?.title || "Format Document"
        );
    }

    /**
     * 获取修复所有问题命令的标题
     * @returns 修复所有问题命令在命令面板中显示的标题
     */
    static get commandFixAllTitle(): string {
        return (
            packageJson.contributes?.commands?.find((c: Command) =>
                c.command?.includes("fixAllProblems"),
            )?.title || "Fix All Problems"
        );
    }

    // ==================== CodeAction 配置 ====================

    /**
     * 获取快速修复 CodeAction 的标题
     * @returns 快速修复操作在代码问题灯泡中显示的标题
     */
    static get codeActionQuickFixTitle(): string {
        return (
            packageJson.contributes?.codeActions?.find((c: CodeAction) =>
                c.kind?.includes("quickfix"),
            )?.title || "Fix this issue with shell-format"
        );
    }

    /**
     * 获取修复所有 CodeAction 的标题
     * @returns 修复所有操作在代码问题灯泡中显示的标题
     */
    static get codeActionFixAllTitle(): string {
        return (
            packageJson.contributes?.codeActions?.find((c: CodeAction) =>
                c.kind?.includes("source.fixAll"),
            )?.title || "Fix all with shell-format"
        );
    }

    // ==================== 诊断配置 ====================

    /**
     * 获取诊断源名称
     * @returns 用于标识诊断信息的来源名称
     */
    static get diagnosticSource(): string {
        return `${this.publisher}.${this.extensionName}`;
    }
    // ==================== 默认配置 ====================

    /**
     * 获取 shellcheck 可执行文件的默认路径
     * @returns shellcheck 可执行文件的默认路径，默认为 'shellcheck'
     */
    static get defaultShellCheckPath(): string {
        const configProperties = packageJson.contributes?.configuration
            ?.properties as any;
        return (
            configProperties?.[`${PackageInfo.extensionName}.shellcheckPath`]
                ?.default || "shellcheck"
        );
    }

    // ==================== shfmt 路径配置 ====================

    /**
     * 获取 shfmt 可执行文件的默认路径
     * @returns shfmt 可执行文件的默认路径，默认为 'shfmt'
     */
    static get defaultShfmtPath(): string {
        const configProperties = packageJson.contributes?.configuration
            ?.properties as any;
        return (
            configProperties?.[`${PackageInfo.extensionName}.shfmtPath`]?.default ||
            "shfmt"
        );
    }

    /**
     * 获取 shfmt 的默认参数
     * @returns shfmt 的默认参数数组，如 ['-i', '2', '-bn', '-ci', '-sr'] 或 ['-tabs', '-bn', '-ci', '-sr']
     */
    static get defaultShfmtArgs(): string[] {
        return ["-bn", "-ci", "-sr"];
    }

    /**
     * 获取默认的日志配置
     * @returns 默认的日志配置对象
     */
    static get defaultLog(): {
        enabled: boolean;
        level: string;
        format: string;
    } {
        const configProperties = packageJson.contributes?.configuration
            ?.properties as any;
        return (
            configProperties?.[`${PackageInfo.extensionName}.log`]?.default || {
                enabled: false,
                level: "info",
                format: "timestamp",
            }
        );
    }

    /**
     * 获取默认的错误处理方式
     * @returns 默认的错误处理方式，可选值为 'showProblem' 或 'ignore'
     */
    static get defaultOnError(): string {
        const configProperties = packageJson.contributes?.configuration
            ?.properties as any;
        return (
            configProperties?.[`${PackageInfo.extensionName}.onError`]?.default ||
            "showProblem"
        );
    }

    /**
     * 获取默认的 tab 缩进配置
     * @returns 默认的 tab 缩进配置，数字或 'ignore'
     * - 数字：使用指定数量的空格进行缩进
     * - 'vscode'：使用 VSCode 的缩进配置
     * - 'ignore'：忽略缩进配置
     * 默认值为 'vscode'
     */
    static get defaultTabSize(): number | string {
        const configProperties = packageJson.contributes?.configuration
            ?.properties as any;
        return (
            configProperties?.[`${PackageInfo.extensionName}.tabSize`]?.default ||
            "vscode"
        );
    }
}
