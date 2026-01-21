/**
 * 日志模块 - 提供统一的日志级别定义和工具函数
 *
 * 特点：
 * - 统一的日志级别定义
 * - 日志级别的数值映射和比较能力
 * - 灵活的日志记录器接口
 */

// ==================== 日志级别定义 ====================

/**
 * 日志级别枚举
 *
 * 取值：
 * - DEBUG (0): 调试级别 - 开发调试使用
 * - INFO (1):  信息级别 - 一般信息提示
 * - WARN (2):  警告级别 - 潜在问题
 * - ERROR (3): 错误级别 - 严重问题
 *
 * 与 ErrorSeverity 一致，便于复用
 */
export enum LogLevel {
    DEBUG = "debug",
    INFO = "info",
    WARN = "warn",
    ERROR = "error",
}

/**
 * 日志级别的数值排序
 *
 * 用途：
 * 1. 比较日志严重程度（值越大越严重）
 * 2. 判断是否应该输出日志
 *
 * 映射关系：
 * DEBUG=0 < INFO=1 < WARN=2 < ERROR=3
 */
export const LOG_LEVEL_VALUES: Record<LogLevel | string, number> = {
    [LogLevel.DEBUG]: 0,
    [LogLevel.INFO]: 1,
    [LogLevel.WARN]: 2,
    [LogLevel.ERROR]: 3,
};

// ==================== 日志级别工具函数 ====================

/**
 * 获取日志级别的数值等级
 *
 * 将日志级别转换为数值，用于级别比较
 *
 * @param level 日志级别（支持枚举值或字符串）
 * @returns 日志级别的数值等级（0-3）
 *
 * 示例：
 * ```
 * getLogLevelRank(LogLevel.INFO) // 返回 1
 * getLogLevelRank("warn")        // 返回 2
 * ```
 */
export function getLogLevelRank(level: LogLevel | string): number {
    const normalized = typeof level === "string" ? level.toLowerCase() : level;
    return LOG_LEVEL_VALUES[normalized] ?? LOG_LEVEL_VALUES[LogLevel.INFO];
}

/**
 * 判断指定消息级别是否应该输出
 *
 * 通过比较消息级别和配置级别来决定：
 * - 如果 messageLevel >= configLevel，返回 true（应该输出）
 * - 否则返回 false（不输出）
 *
 * @param messageLevel 消息的日志级别
 * @param configLevel  配置的日志级别阈值
 * @returns 是否应该输出该日志
 *
 * 示例：
 * ```
 * // 配置级别为 INFO (1)
 * shouldLogByLevel(LogLevel.DEBUG, LogLevel.INFO) // false (0 < 1)
 * shouldLogByLevel(LogLevel.INFO,  LogLevel.INFO) // true  (1 >= 1)
 * shouldLogByLevel(LogLevel.WARN,  LogLevel.INFO) // true  (2 >= 1)
 * ```
 */
export function shouldLogByLevel(
    messageLevel: LogLevel | string,
    configLevel: LogLevel | string,
): boolean {
    const messageRank = getLogLevelRank(messageLevel);
    const configRank = getLogLevelRank(configLevel);
    return messageRank >= configRank;
}

// ==================== 日志记录器接口与管理 ====================

/**
 * 日志记录器接口
 *
 * 职责：
 * - 实现具体的日志输出能力（例如写入文件、输出通道等）
 * - 不关心日志级别的配置，由调用方管理
 *
 * 实现者示例：
 * - VSCode 适配器实现（使用 OutputChannel）
 * - 文件日志实现（写入日志文件）
 * - 内存日志实现（用于测试）
 */
export interface Logger {
    /** 调试信息 - 仅在开发调试时输出 */
    debug(message: string): void;

    /** 一般信息 - 常规消息提示 */
    info(message: string): void;

    /** 警告信息 - 潜在问题提示 */
    warn(message: string): void;

    /** 错误信息 - 严重问题报告 */
    error(message: string): void;
}

/**
 * 全局日志记录器实例
 *
 * 初始化流程：
 * 1. 扩展启动时调用 setLogger() 设置实现
 * 2. 其他模块通过导入 logger 使用
 * 3. 日志级别由 LoggerAdapter 在输出时控制
 */
export let logger: Logger;

/**
 * 设置日志记录器实现
 *
 * 必须在扩展启动的早期阶段调用
 *
 * @param log 日志记录器的实现
 *
 * 示例：
 * ```
 * import { LoggerAdapter } from './adapters/loggerAdapter';
 * setLogger(new LoggerAdapter());
 * ```
 */
export function setLogger(log: Logger): void {
    console.log("Set logger");
    if (!logger) {
        console.log("logger is null set by param");
        logger = log;
    }
}
