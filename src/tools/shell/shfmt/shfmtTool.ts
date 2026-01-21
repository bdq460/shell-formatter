/**
 * shfmt 工具类
 * 封装 shfmt 的所有操作
 */

import { CancellationToken, execute } from "../../executor";
import { ExecutionResult } from "../../executor/types";
import { CheckResult, FormatResult } from "../types";
import { parseShfmtOutput } from "./parser";

/**
 * shfmt 工具类
 */
export class ShfmtTool {
    private commandPath: string;

    constructor(commandPath?: string) {
        this.commandPath = commandPath || "shfmt";
    }

    /**
     * 格式化 Shell 脚本
     */
    async format(
        fileName: string,
        options?: Partial<ShfmtFormatOptions>,
    ): Promise<FormatResult> {
        const args = this.buildFormatArgs(options || {});
        // 如果提供了content，使用stdin模式，添加'-'作为文件名占位符
        const fileNameOrStdin = options?.content ? "-" : fileName;
        args.push(fileNameOrStdin);

        const result: ExecutionResult = await execute(this.commandPath, {
            args: args,
            token: options?.token,
            stdin: options?.content,
        });

        return parseShfmtOutput(result, "format");
    }

    /**
     * 检查格式
     */
    async check(
        fileName: string,
        options?: Partial<ShfmtCheckOptions>,
    ): Promise<CheckResult> {
        const args = this.buildCheckArgs(options || {});
        // 如果提供了content，使用stdin模式，添加'-'作为文件名占位符
        const fileNameOrStdin = options?.content ? "-" : fileName;
        args.push(fileNameOrStdin);

        const result: ExecutionResult = await execute(this.commandPath, {
            args: args,
            token: options?.token,
            stdin: options?.content,
        });

        return parseShfmtOutput(result, "check");
    }

    /**
     * 构建格式化参数
     * 不包括 '-w' 参数，因为该参数用于原地写入文件，而插件使用标准输入输出
     */
    private buildFormatArgs(options: ShfmtFormatOptions): string[] {
        const args: string[] = [];

        if (options.indent !== undefined) {
            args.push("-i", options.indent.toString());
        }
        if (options.binaryNextLine) args.push("-bn");
        if (options.caseIndent) args.push("-ci");
        if (options.spaceRedirects) args.push("-sr");

        return args;
    }

    /**
     * 构建检查参数
     */
    private buildCheckArgs(options: ShfmtCheckOptions): string[] {
        const args = this.buildFormatArgs(options);
        args.push("-d"); // 检查模式
        return args;
    }
}

/**
 * shfmt 格式化选项
 */
export interface ShfmtFormatOptions {
    /** 缩进空格数 */
    indent?: number;
    /** 二元操作符换行 */
    binaryNextLine?: boolean;
    /** case 语句缩进 */
    caseIndent?: boolean;
    /** 重定向操作符添加空格 */
    spaceRedirects?: boolean;
    /** 取消令牌 */
    token?: CancellationToken;
    /** 文件内容（可选，用于stdin模式） */
    content?: string;
}

/**
 * shfmt 检查选项
 */
export interface ShfmtCheckOptions extends ShfmtFormatOptions { }
