/**
 * shellcheck 工具类
 */

import { CancellationToken, execute } from "../../executor";
import { ExecutionResult } from "../../executor/types";
import { CheckResult } from "../types";
import { parseShellcheckOutput } from "./parser";

export interface ShellcheckOptions {
    /** 文件路径 */
    file: string;
    /** 命令执行参数 */
    commandArgs?: string[];
    /** 取消令牌 */
    token?: CancellationToken;
    /** 文件内容（可选，用于stdin模式） */
    content?: string;
}

/**
 * shellcheck 工具类
 */
export class ShellcheckTool {
    private defaultArges = ["-f", "gcc"];
    private commandPath: string;

    constructor(commandPath?: string) {
        this.commandPath = commandPath || "shellcheck";
    }

    /**
     * 检查 Shell 脚本
     */
    async check(options: ShellcheckOptions): Promise<CheckResult> {
        const args = [...(options.commandArgs || this.defaultArges)];
        // 如果提供了content，使用stdin模式，添加'-'作为文件名占位符
        const fileNameOrStdin = options.content ? "-" : options.file;
        args.push(fileNameOrStdin);

        const executeOptions = {
            args,
            token: options.token,
            stdin: options.content,
        };
        const result: ExecutionResult = await execute(
            this.commandPath,
            executeOptions,
        );

        return parseShellcheckOutput(result);
    }
}
