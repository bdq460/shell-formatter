/**
 * 解析 shellcheck 输出
 */

import { ExecutionResult } from "../../executor/types";
import { CheckResult, LinterIssue } from "../types";

/**
 * 解析 shellcheck 输出
 * @param result 执行结果
 * @returns 工具结果
 */
export function parseShellcheckOutput(result: ExecutionResult): CheckResult {
    let toolResult: CheckResult = {};

    // 检查执行错误（超时、取消、spawn 错误等）
    if (result.error) {
        toolResult.executeErrors = [
            {
                command: result.command,
                exitCode: result.exitCode,
                message: result.error.message,
            },
        ];
    }

    // 成功：检查是否有输出
    const allOutput = `${result.stdout}${result.stderr}`;

    // 有输出，返回 linter 问题
    const linterIssues = parseIssues(allOutput);
    if (linterIssues.length > 0) {
        toolResult.linterIssues = linterIssues;
    }

    return toolResult;
}

/**
 * 解析 shellcheck 问题
 * 格式: file:line:column: type: message [SCxxxx]
 * @param output 输出内容
 * @returns 问题数组
 */
function parseIssues(output: string): LinterIssue[] {
    const issues: LinterIssue[] = [];
    const lines = output.split("\n");

    for (const line of lines) {
        const match = line.match(
            /^.+?:(\d+):(\d+): (error|warning|note): (.+) \[(SC\d+)\]$/,
        );

        if (match) {
            const typeStr = match[3];
            const validTypes: Array<"error" | "warning" | "info"> = [
                "error",
                "warning",
                "info",
            ];
            const type = validTypes.includes(typeStr as any)
                ? (typeStr as "error" | "warning" | "info")
                : "warning";

            issues.push({
                line: parseInt(match[1], 10) - 1,
                column: parseInt(match[2], 10) - 1,
                type,
                message: match[4],
                code: match[5],
            });
        }
    }

    return issues;
}
