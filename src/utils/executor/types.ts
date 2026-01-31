/**
 * 基础类型定义
 * 与业务无关，与 VSCode 无关
 */

/**
 * 可释放对象接口
 */
export interface Disposable {
    dispose(): void;
}

/**
 * 执行选项
 */
export interface ExecutorOptions {
    /** 命令参数 */
    args: string[];
    /** 取消令牌 */
    token?: CancellationToken;
    /** 标准输入内容（可选，用于stdin模式） */
    stdin?: string;
}

/**
 * 取消令牌接口
 * 抽象取消机制，不依赖 VSCode
 */
export interface CancellationToken {
    readonly isCancellationRequested: boolean;
    onCancellationRequested(callback: () => void): Disposable | void;
}

/**
 * 执行结果
 * 包含所有执行情况，包括成功、失败、超时等
 */
export interface ExecutionResult {
    /** 完整的命令字符串 */
    command: string;
    /** 退出码 */
    exitCode: number | null;
    /** 标准输出 */
    stdout: string;
    /** 标准错误 */
    stderr: string;
    /** 错误信息（如果有异常） */
    error?: ExecutionError;
}

/**
 * 执行错误信息
 * 参考 ToolExecutionError 的结构
 */
export interface ExecutionError {
    /** 错误类型 */
    type: ErrorType;
    /** 错误码（如 ENOENT, EACCES） */
    code?: string;
    /** 错误消息 */
    message: string;
}
/**
 * 错误类型枚举
 */
export enum ErrorType {
    Timeout = "timeout", // 超时错误
    Cancelled = "cancelled", // 取消错误
    Execution = "execution", // 执行错误
}
