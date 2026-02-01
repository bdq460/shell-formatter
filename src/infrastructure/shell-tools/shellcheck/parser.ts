/**
 * 解析 shellcheck 输出
 */

import { ExecutionResult } from "../../../utils/executor/types";
import { LinterIssue, ToolCheckResult } from "../types";

/**
 * 解析 shellcheck 输出
 * @param result 执行结果
 * @returns 工具结果
 */
export function parseShellcheckOutput(result: ExecutionResult): ToolCheckResult {
    let toolResult: ToolCheckResult = {};

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

    // 分别处理 stdout 和 stderr
    const issues: LinterIssue[] = [];
    issues.push(...parseIssues(result.stdout));
    issues.push(...parseIssues(result.stderr));

    if (issues.length > 0) {
        toolResult.linterIssues = issues;
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
            // shellcheck 使用 "note" 表示 info 级别
            const typeMapping: Record<string, "error" | "warning" | "info"> = {
                "error": "error",
                "warning": "warning",
                "note": "info",
            };
            const type = typeMapping[typeStr] || "warning";

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
