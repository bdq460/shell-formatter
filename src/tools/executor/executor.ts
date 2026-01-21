/**
 * 通用进程执行器
 *
 * 职责：
 * - 执行外部命令并捕获输出
 * - 管理进程生命周期（创建、监视、清理）
 * - 处理超时和取消请求
 * - 完整的错误处理（执行错误、超时、取消）
 *
 * 纯粹的进程执行逻辑，与业务和 VSCode 无关
 *
 * 特点：
 * - 支持超时控制（默认 30 秒）
 * - 支持通过 CancellationToken 取消执行
 * - 完整的错误处理和资源清理
 * - 所有异常都反映在 ExecutionResult 中，不会抛出异常
 * - 内存安全：及时清理流和进程
 *
 * 使用示例：
 * ```typescript
 * const result = await execute("shfmt", {
 *   args: ["-d", "/path/to/script.sh"],
 *   timeout: 5000
 * });
 * if (result.error) {
 *   console.error(result.error.message);
 * } else {
 *   console.log(result.stdout);
 * }
 * ```
 */

import { spawn } from "child_process";
import { logger } from "../../utils/log";
import { ErrorType, ExecutionResult, ExecutorOptions } from "./types";

/**
 * 执行外部命令
 *
 * 内部流程：
 * 1. 检查取消令牌（如果已取消则立即返回）
 * 2. 创建子进程并设置数据监听
 * 3. 配置超时处理器（如果指定超时）
 * 4. 监听进程事件：close（正常完成）、error（执行错误）
 * 5. 处理取消事件（注册监听器）
 * 6. 返回结果（成功或失败都包含完整信息）
 * 7. 清理资源（流、定时器、事件监听）
 *
 * 错误优先级：
 * - 取消请求 > 超时 > 执行错误 > 正常退出
 *
 * @param command 要执行的命令（如 "shfmt"）
 * @param options 执行选项：
 *   - args: 命令行参数数组
 *   - timeout: 超时时间（毫秒），默认 30000ms
 *   - token: 取消令牌（CancellationToken）
 *   - stdin: 标准输入内容（可选）
 * @returns Promise<ExecutionResult> 执行结果，包含：
 *   - command: 完整的命令行
 *   - exitCode: 进程退出码（null 表示异常退出）
 *   - stdout: 标准输出
 *   - stderr: 标准错误输出
 *   - error?: 错误信息（如果有错误）
 */
export async function execute(
    command: string,
    options: ExecutorOptions,
): Promise<ExecutionResult> {
    const { args, token, stdin } = options;
    const timeout = (options as any).timeout ?? 30000; // 默认 30 秒超时
    const fullCommand = `${command} ${args.join(" ")}`;

    logger?.debug(`Executor: Starting execution of '${fullCommand}'`);

    return new Promise((resolve) => {
        // 步骤1：检查是否已请求取消（在启动前）
        if (token?.isCancellationRequested) {
            logger?.warn(
                `Executor: Execution cancelled before start: ${fullCommand}`,
            );
            resolve({
                command: fullCommand,
                exitCode: null,
                stdout: "",
                stderr: "",
                error: {
                    type: ErrorType.Cancelled,
                    message: `Execute ${fullCommand} cancelled before start`,
                },
            });
            return;
        }

        // 步骤2：创建子进程
        logger?.debug(
            `Executor: Spawning process: ${command} with ${args.length} args`,
        );
        const process = spawn(command, args);
        const stdout: Buffer[] = [];
        const stderr: Buffer[] = [];
        let timedOut = false;
        let cancelled = false;

        // 如果提供了 stdin 内容，写入进程的标准输入
        if (stdin) {
            logger?.debug(
                `Executor: Writing stdin to process (${stdin.length} bytes)`,
            );
            process.stdin.write(stdin);
            process.stdin.end();
        }

        // 清理进程资源的函数
        // 为什么需要这个函数：避免进程和流继续占用资源
        const cleanup = () => {
            try {
                if (!process.killed) {
                    logger?.debug(`Executor: Killing process for: ${fullCommand}`);
                    process.kill();
                }
                // 销毁流，避免内存泄漏
                process.stdout?.destroy();
                process.stderr?.destroy();
                process.stdin?.destroy();
                logger?.debug(`Executor: Process resources cleaned up`);
            } catch (error) {
                logger?.debug(
                    `Executor: Error during process cleanup: ${String(error)}`,
                );
            }
        };

        // 超时处理器：在指定时间后杀死进程
        let timeoutHandle: NodeJS.Timeout | null = null;
        const setupTimeout = () => {
            if (timeout && timeout > 0) {
                logger?.debug(`Executor: Setting timeout to ${timeout}ms`);
                timeoutHandle = setTimeout(() => {
                    timedOut = true;
                    const stdoutStr = Buffer.concat(stdout).toString();
                    const stderrStr = Buffer.concat(stderr).toString();
                    logger?.warn(
                        `Executor: Execution timed out after ${timeout}ms for: ${fullCommand}`,
                    );
                    cleanup();

                    resolve({
                        command: fullCommand,
                        exitCode: null,
                        stdout: stdoutStr,
                        stderr: stderrStr,
                        error: {
                            type: ErrorType.Timeout,
                            message: `Execute ${fullCommand} timed out after ${timeout}ms. Command execution exceeded the maximum allowed time.`,
                        },
                    });
                }, timeout);
            }
        };

        // 清除超时定时器
        const clearTimeoutHandler = () => {
            if (timeoutHandle) {
                clearTimeout(timeoutHandle);
                timeoutHandle = null;
            }
        };

        // 取消处理器：清理进程并返回取消错误
        // 通常由 VSCode 在用户按 Ctrl+C 或扩展卸载时调用
        const cancelHandler = () => {
            if (timedOut) {
                return; // 超时已经处理过了
            }
            cancelled = true;
            logger?.warn(`Executor: Cancellation requested for: ${fullCommand}`);
            clearTimeoutHandler();
            cleanup();
            const stdoutStr = Buffer.concat(stdout).toString();
            const stderrStr = Buffer.concat(stderr).toString();

            resolve({
                command: fullCommand,
                exitCode: null,
                stdout: stdoutStr,
                stderr: stderrStr,
                error: {
                    type: ErrorType.Cancelled,
                    message: `Execute ${fullCommand} cancelled`,
                },
            });
        };

        // 订阅取消事件，返回 Disposable 对象或 void
        // 当 token 触发取消时会调用 cancelHandler
        logger?.debug(`Executor: Registering cancellation handler`);
        const disposable = token?.onCancellationRequested(cancelHandler);

        // 确保在 Promise 完成后清理监听器，避免内存泄漏
        const unsubscribe = () => {
            clearTimeoutHandler();
            if (disposable && typeof disposable.dispose === "function") {
                disposable.dispose();
                logger?.debug(`Executor: Disposed cancellation token listener`);
            }
        };

        // 步骤3：设置超时
        setupTimeout();

        // 步骤4：监听标准输出数据
        process.stdout.on("data", (chunk) => {
            stdout.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });

        // 步骤4：监听标准错误数据
        process.stderr.on("data", (chunk) => {
            stderr.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });

        // 步骤5：监听进程关闭事件（正常或异常结束）
        process.on("close", (code) => {
            // 如果已经因超时或取消处理了，则不再处理
            if (timedOut || cancelled) {
                logger?.debug(
                    `Executor: close event ignored (already handled: timeout=${timedOut}, cancelled=${cancelled})`,
                );
                return;
            }

            const stdoutStr = Buffer.concat(stdout).toString();
            const stderrStr = Buffer.concat(stderr).toString();
            logger?.info(
                `Executor: Process completed with exit code: ${code} for: ${fullCommand}`,
            );
            if (stderrStr) {
                logger?.debug(
                    `Executor: stderr: ${stderrStr.substring(0, 200)}${stderrStr.length > 200 ? "..." : ""}`,
                );
            }

            // 清理监听器，避免内存泄漏
            unsubscribe();

            // 返回执行结果
            resolve({
                command: fullCommand,
                exitCode: code,
                stdout: stdoutStr,
                stderr: stderrStr,
            });
        });

        // 步骤5：监听进程错误事件
        // 这里的错误通常是：
        // - ENOENT: 命令找不到
        // - EACCES: 权限不足
        // - 其他系统错误
        process.on("error", (err) => {
            // 如果已经因超时或取消处理了，则不再处理
            if (timedOut || cancelled) {
                logger?.debug(`Executor: error event ignored (already handled)`);
                return;
            }

            const stdoutStr = Buffer.concat(stdout).toString();
            const stderrStr = Buffer.concat(stderr).toString();
            logger?.error(
                `Executor: Process error for '${fullCommand}': ${(err as NodeJS.ErrnoException).code} - ${err.message}`,
            );

            // 清理监听器
            unsubscribe();

            resolve({
                command: fullCommand,
                exitCode: null,
                stdout: stdoutStr,
                stderr: stderrStr,
                error: {
                    type: ErrorType.Execution,
                    code: (err as NodeJS.ErrnoException).code,
                    message: generateExecutionErrorMessage(
                        err as NodeJS.ErrnoException,
                        fullCommand,
                    ),
                },
            });
        });
    });
}

/**
 * 生成用户友好的执行错误消息
 *
 * 根据系统错误码生成对应的错误描述
 * 这样用户可以理解发生了什么，而不是看到晦涩的错误码
 *
 * @param error 原始 NodeJS 错误对象
 * @param command 完整命令行
 * @returns 用户友好的错误消息
 */
function generateExecutionErrorMessage(
    error: NodeJS.ErrnoException,
    command: string,
): string {
    const commandName = command.split(" ")[0];

    switch (error.code) {
        case "ENOENT":
            return `${commandName} not installed`;
        case "EACCES":
            return `Permission denied when running ${commandName}`;
        default:
            return `Failed to run ${commandName}: ${error.message}`;
    }
}
