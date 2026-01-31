/**
 * 日志服务
 *
 * 职责：
 * - 管理 VSCode 输出通道
 * - 提供结构化的日志记录
 * - 支持日志级别控制
 */

import * as vscode from "vscode";
import { PackageInfo } from "../config";
import { Logger, setLogger } from "../utils/log";

/**
 * 日志级别
 */
export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
}

/**
 * 日志服务
 */
export class LoggerService implements Logger {
    private outputChannel: vscode.OutputChannel;
    private logLevel: LogLevel;

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel(
            PackageInfo.displayName,
        );
        this.logLevel = LogLevel.INFO;
    }

    /**
     * 设置日志级别
     */
    setLogLevel(level: LogLevel): void {
        this.logLevel = level;
    }

    /**
     * 记录调试日志
     */
    debug(message: string): void {
        if (this.logLevel <= LogLevel.DEBUG) {
            this.log("DEBUG", message);
        }
    }

    /**
     * 记录信息日志
     */
    info(message: string): void {
        if (this.logLevel <= LogLevel.INFO) {
            this.log("INFO", message);
        }
    }

    /**
     * 记录警告日志
     */
    warn(message: string): void {
        if (this.logLevel <= LogLevel.WARN) {
            this.log("WARN", message);
        }
    }

    /**
     * 记录错误日志
     */
    error(message: string): void {
        if (this.logLevel <= LogLevel.ERROR) {
            this.log("ERROR", message);
        }
    }

    /**
     * 显示输出通道
     */
    show(): void {
        this.outputChannel.show();
    }

    /**
     * 清理资源
     */
    dispose(): void {
        this.outputChannel.dispose();
    }

    private log(level: string, message: string): void {
        const timestamp = new Date().toISOString();
        this.outputChannel.appendLine(`[${timestamp}] [${level}] ${message}`);
    }
}

// 全局日志服务实例
let loggerService: LoggerService | undefined;

/**
 * 初始化日志服务
 */
export function initializeLoggerService(): LoggerService {
    if (!loggerService) {
        loggerService = new LoggerService();
    }
    setLogger(loggerService)
    return loggerService;
}

/**
 * 获取日志服务实例
 */
export function getLoggerService(): LoggerService {
    if (!loggerService) {
        throw new Error("LoggerService not initialized. Call initializeLoggerService() first.");
    }
    return loggerService;
}
