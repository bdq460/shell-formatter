/**
 * 日志适配器
 * 将 VSCode 输出通道适配为统一的日志接口
 */

import * as vscode from "vscode";
import { PackageInfo, SettingInfo } from "../config";
import { Logger, LogLevel, setLogger, shouldLogByLevel } from "../utils/log";

// export let logger: LoggerAdapter

/**
 * 初始化日志输出通道
 */
export function initializeLoggerAdapter(): void {
    console.log("Initialize logger");
    // 设置log模块logger
    setLogger(new LoggerAdapter());
}

/**
 * 日志适配器
 * 将插件日志系统适配到基础层 Logger 接口
 */
export class LoggerAdapter implements Logger, vscode.Disposable {
    private outputChannel: vscode.OutputChannel | undefined;

    info(message: string): void {
        this.logMessage(message, LogLevel.INFO);
    }

    warn(message: string): void {
        this.logMessage(message, LogLevel.WARN);
    }

    error(message: string): void {
        this.logMessage(message, LogLevel.ERROR);
    }

    debug(message: string): void {
        this.logMessage(message, LogLevel.DEBUG);
    }

    /**
     * 检查日志级别是否应该输出
     */
    private shouldLogMessage(messageLevel: LogLevel): boolean {
        const logConfig = SettingInfo.getLog();
        if (!logConfig.enabled) {
            return false;
        }

        return shouldLogByLevel(messageLevel, logConfig.level);
    }

    /**
     * 获取日志级别的字符串表示
     */
    private getLevelString(level: LogLevel): string {
        switch (level.toLowerCase ? level.toLowerCase() : level) {
            case LogLevel.DEBUG:
                return "DEBUG";
            case LogLevel.INFO:
                return "INFO";
            case LogLevel.WARN:
                return "WARN";
            case LogLevel.ERROR:
                return "ERROR";
            default:
                return "INFO";
        }
    }

    /**
     * 获取调用堆栈信息
     * @returns 调用信息对象，包含文件路径、方法名、行号
     */
    private getCallerInfo(): {
        filepath: string;
        method: string;
        line: number;
    } | null {
        const stack = new Error().stack;
        if (!stack) return null;

        // 解析堆栈，找到调用 logger 的那一行
        const lines = stack.split("\n");

        // 跳过：
        // [0] Error
        // [1] at LoggerAdapter.logMessage
        // [2] at LoggerAdapter.info/error/debug/warn
        // 找到第一个不在 LoggerAdapter 中的调用者
        for (let i = 3; i < lines.length; i++) {
            const line = lines[i];
            if (!line || line.includes("LoggerAdapter")) {
                continue;
            }

            // 解析格式：at methodName (filepath:line:column)
            // 例如: at ShellFormatCodeActionProvider.provideCodeActions (providers/index.js:72:22)
            const match = line.match(/at\s+([^\(]+)\s*\(([^:]+):(\d+):\d+\)/);
            if (match) {
                const filepath = match[2];
                // 简化文件路径：移除常见的路径前缀
                const simplifiedPath = this.simplifyFilepath(filepath);
                return {
                    method: match[1].trim(),
                    filepath: simplifiedPath,
                    line: parseInt(match[3]),
                };
            }

            // 尝试另一种格式：at filepath:line:column (匿名函数)
            const anonymousMatch = line.match(/at\s+([^:]+):(\d+):\d+/);
            if (anonymousMatch) {
                const filepath = anonymousMatch[1];
                // 简化文件路径
                const simplifiedPath = this.simplifyFilepath(filepath);
                return {
                    method: "anonymous",
                    filepath: simplifiedPath,
                    line: parseInt(anonymousMatch[2]),
                };
            }
        }

        return null;
    }

    /**
     * 简化文件路径
     * 移除常见的路径前缀，只保留相对路径
     *
     * @param filepath 文件路径
     * @returns 简化后的文件路径
     */
    private simplifyFilepath(filepath: string): string {
        // 获取插件路径
        let extensionName = PackageInfo.diagnosticSource;
        // 查找${extensionName}的位置
        let extensionNameIndex = filepath.indexOf(extensionName);
        // 查找/dist的位置
        let distIndex = filepath.indexOf("/dist", extensionNameIndex);
        // 获取相对路径
        let simplePath = filepath.substring(distIndex + "/dist".length);

        return simplePath;
    }

    /**
     * 格式化日志消息
     * 根据用户配置的格式字符串生成日志输出
     * @param message 日志消息
     * @param level 日志级别
     */
    private formatMessage(message: string, level: LogLevel): string {
        const logConfig = SettingInfo.getLog();
        const timestamp = new Date().toLocaleTimeString("zh-CN", { hour12: false });
        const levelStr = this.getLevelString(level);
        const callerInfo = this.getCallerInfo();

        // 替换格式字符串中的占位符
        let formatted = logConfig.format;

        // 支持多种占位符格式（短名称和长名称）
        formatted = formatted.replace(/%timestamp|%t/g, timestamp);
        formatted = formatted.replace(/%level/g, levelStr);

        // 文件路径（从调用堆栈获取）
        if (callerInfo) {
            formatted = formatted.replace(/%name|%n/g, callerInfo.filepath);
            formatted = formatted.replace(/%method/g, callerInfo.method);
            formatted = formatted.replace(/%line/g, String(callerInfo.line));
        } else {
            // 如果无法获取调用信息，使用占位符
            formatted = formatted.replace(/%name|%n/g, "unknown");
            formatted = formatted.replace(/%method/g, "unknown");
            formatted = formatted.replace(/%line/g, "0");
        }

        formatted = formatted.replace(/%message|%m/g, message);

        // 插件名称始终添加在最前面
        formatted = `[${PackageInfo.extensionName}] ${formatted}`;

        return formatted;
    }

    logMessage(message: string, level: LogLevel) {
        // 检查是否应该输出该级别的日志
        if (!this.shouldLogMessage(level)) {
            return;
        }

        // 根据格式字符串生成日志消息
        const formattedMessage = this.formatMessage(message, level);

        // 输出到控制台 (可以从"帮助 -> 切换开发人员"工具打开控制台界面)
        switch (level) {
            case LogLevel.DEBUG:
                console.debug(formattedMessage);
                break;
            case LogLevel.WARN:
                console.warn(formattedMessage);
                break;
            case LogLevel.ERROR:
                console.error(formattedMessage);
                break;
            default:
                console.info(formattedMessage);
                break;
        }

        // 输出到输出通道
        if (SettingInfo.getLog().enabled) {
            if (this.outputChannel === undefined) {
                this.outputChannel = vscode.window.createOutputChannel(
                    PackageInfo.extensionName,
                );
            }
            this.outputChannel?.appendLine(formattedMessage);
        }
    }

    dispose() {
        this.info("logger dispose.");
        this.info(
            "logger outputChannel not null , start to dispose output channel.",
        );
        this.outputChannel?.dispose();
    }
}
