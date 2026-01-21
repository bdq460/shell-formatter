/**
 * 解析 shfmt 输出
 */

import { logger } from "../../../utils";
import { ExecutionResult } from "../../executor/types";
import { CheckResult, FormatIssue, FormatResult, SyntaxError } from "../types";

/**
 * 解析 shfmt 输出
 * @param result 执行结果
 * @param originalContent 原始内容
 * @param mode 模式：format 或 check
 * @returns 工具结果
 *
 * shfmt命令：
 * 检查格式: shfmt -i 2 -ci -s -w -d
 * - 当有语法错误时:
 *      exitcode: 非0
 *      stdout: 空
 *      stderr: 语法错误信息
 * - 当有格式问题时:
 *      exitcode: 非0
 *      stdout: unified diff
 *      stderr: 空
 * - 当格式完全正确时:
 *      exitcode: 0
 *      stdout: 空
 *      stderr: 空
 *
 * 修复格式: shfmt -i 2 -ci -s -w
 * - 有语法错误时:
 *      exitcode: 非0
 *      stdout: 空
 *      stderr: 语法错误信息
 * - 无语法错误时(包括无内容变化)
 *      exitcode: 0
 *      stdout: 格式化后的内容
 *      stderr: 空
 *
 */
export function parseShfmtOutput(
    result: ExecutionResult,
    mode: "format" | "check",
): CheckResult | FormatResult {
    let toolResult: CheckResult | FormatResult = {};

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

    // check 模式：检查格式问题和语法错误
    if (mode === "check") {
        if (result.exitCode !== 0) {
            if (result.stdout.trim()) {
                toolResult.formatIssues = parseDiffOutput(result.stdout);
            }
            if (result.stderr.trim()) {
                const syntaxErrors = parseSyntaxErrors(result.stderr);
                if (syntaxErrors.length > 0) {
                    toolResult.syntaxErrors = syntaxErrors;
                }
            }
        }
        return toolResult as CheckResult;
    }

    // format 模式: 返回格式化后的内容
    if (mode === "format") {
        if (result.exitCode !== 0) {
            if (result.stderr.trim()) {
                const syntaxErrors = parseSyntaxErrors(result.stderr);
                if (syntaxErrors.length > 0) {
                    toolResult.syntaxErrors = syntaxErrors;
                }
            }
        } else {
            toolResult = { ...toolResult, formattedContent: result.stdout };
        }
        return toolResult as FormatResult;
    }

    logger.error(`Invalid mode: ${mode}`);
    throw new Error(`Invalid mode: ${mode}`);
}

/**
 * 解析语法错误
 * 格式: <standard input>:14:1: if statement must end with "fi"
 *       或: /path/to/file.sh:14:1: if statement must end with "fi"
 * @param stderr 标准错误输出
 * @returns 语法错误数组
 */
function parseSyntaxErrors(stderr: string): SyntaxError[] {
    const errors: SyntaxError[] = [];
    const match = stderr.match(/.+?:(\d+):(\d+): (.+)/);

    if (match) {
        errors.push({
            line: parseInt(match[1], 10) - 1,
            column: parseInt(match[2], 10) - 1,
            message: match[3],
        });
    }

    return errors;
}

/**
 * 解析 diff 输出，提取具体的格式问题
 * 格式: unified diff
 * @param diffOutput diff 输出
 * @returns 格式问题列表
 */
function parseDiffOutput(diffOutput: string): FormatIssue[] {
    const issues: FormatIssue[] = [];
    const lines = diffOutput.split("\n");

    let currentLine = 0; // 当前行号（0-based）
    const issueMap = new Map<
        number,
        { line: number; oldContent?: string; newContent?: string }
    >(); // 按行号映射问题

    // 第一遍：解析 diff，提取新旧内容
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // 解析 @@ 行：@@ -old_start,old_count +new_start,new_count @@
        const match = line.match(/^@@ -(\d+),?(\d+)? \+(\d+),?(\d+)? @@/);
        if (match) {
            const newStart = parseInt(match[3], 10);
            currentLine = newStart - 1; // 转为 0-based
            continue;
        }

        // 解析删除的行（- 开头）
        if (line.startsWith("-") && !line.startsWith("---")) {
            if (!issueMap.has(currentLine)) {
                issueMap.set(currentLine, { line: currentLine });
            }
            issueMap.get(currentLine)!.oldContent = line.substring(1);
            // 删除行不增加行号
            continue;
        }

        // 解析新增的行（+ 开头）
        if (line.startsWith("+") && !line.startsWith("+++")) {
            if (!issueMap.has(currentLine)) {
                issueMap.set(currentLine, { line: currentLine });
            }
            issueMap.get(currentLine)!.newContent = line.substring(1);
        }

        // 普通行（空行或以空格开头），增加行号
        currentLine++;
    }

    // 第二遍：分析每个问题的具体变更类型，生成智能提示
    for (const issue of issueMap.values()) {
        // 分析变更并生成提示
        const { column, rangeLength, message } = analyzeFormatIssue(
            issue.oldContent || "",
            issue.newContent || "",
        );

        issues.push({
            line: issue.line,
            column,
            rangeLength,
            oldContent: issue.oldContent,
            newContent: issue.newContent,
            message,
        });
    }

    return issues;
}

/**
 * 分析单个格式问题，生成精确的列位置和详细的提示信息
 * @param oldContent 旧内容（包含原始缩进和空格）
 * @param newContent 新内容（包含原始缩进和空格）
 * @returns 列位置、范围长度和提示信息
 */
function analyzeFormatIssue(
    oldContent: string,
    newContent: string,
): { column: number; rangeLength: number; message: string } {
    const oldTrimmed = oldContent.trim();
    const newTrimmed = newContent.trim();

    // 如果都为空
    if (!oldTrimmed && !newTrimmed) {
        return { column: 0, rangeLength: 10, message: "格式不正确" };
    }

    // 如果只有新内容（新增行）
    if (!oldTrimmed && newTrimmed) {
        return {
            column: 0,
            rangeLength: Math.min(newTrimmed.length, 30),
            message: `格式问题: 应为 "${newTrimmed}"`,
        };
    }

    // 如果只有旧内容（删除行）
    if (oldTrimmed && !newTrimmed) {
        return {
            column: 0,
            rangeLength: Math.min(oldTrimmed.length, 30),
            message: `格式问题: 删除 "${oldTrimmed}"`,
        };
    }

    // 分析具体的格式变更
    const { column, rangeLength, changes } = analyzeFormatChangesWithColumn(
        oldTrimmed,
        newTrimmed,
    );

    // 构建详细的消息
    let message: string;
    if (changes.length === 0) {
        // 没有检测到具体变更，显示完整对比
        message = `格式问题: "${oldTrimmed}" → "${newTrimmed}"`;
    } else {
        // 根据变更类型生成具体提示
        message = `格式问题: ${changes.join(", ")}\n  原始: "${oldTrimmed}"\n  修改为: "${newTrimmed}"`;
    }

    return { column, rangeLength, message };
}

/**
 * 分析格式变更类型并计算精确的列位置和范围长度
 * @param oldContent 旧内容（已 trim）
 * @param newContent 新内容（已 trim）
 * @returns 列位置、范围长度和变更类型描述数组
 */
function analyzeFormatChangesWithColumn(
    oldContent: string,
    newContent: string,
): { column: number; rangeLength: number; changes: string[] } {
    const changes: string[] = [];
    let column = 0;
    let rangeLength = 10; // 默认范围长度

    // 1. 检查末尾标点符号
    const oldEndsWithDot = /[\.\,;]$/.test(oldContent);
    const newEndsWithDot = /[\.\,;]$/.test(newContent);
    if (oldEndsWithDot && !newEndsWithDot) {
        changes.push("删除末尾标点符号");
        column = oldContent.length - 1;
        rangeLength = 1; // 标点符号长度为 1
    }

    // 2. 检查首字符变化（引号）
    if (
        oldContent[0] !== newContent[0] &&
        (oldContent[0] === '"' ||
            oldContent[0] === "'" ||
            newContent[0] === '"' ||
            newContent[0] === "'")
    ) {
        if (!changes.includes("调整引号")) {
            changes.push("调整引号");
        }
        column = 0;
        rangeLength = 1;
    }

    // 3. 检查空格数量变化（行内空格）- 改进：精确定位空格位置
    const oldSpaceCount = (oldContent.match(/\s+/g) || []).join("").length;
    const newSpaceCount = (newContent.match(/\s+/g) || []).join("").length;
    if (Math.abs(oldSpaceCount - newSpaceCount) > 1) {
        if (newSpaceCount < oldSpaceCount) {
            // 减少空格：找到第一个多余的空格位置
            const extraSpaceIndex = findExtraSpaceIndex(oldContent, newContent);
            if (extraSpaceIndex !== -1) {
                column = extraSpaceIndex;
                // 计算要删除的空格数量
                const extraSpaceMatch = oldContent.match(/\s{2,}/);
                if (extraSpaceMatch) {
                    const relativeIndex = oldContent.indexOf(extraSpaceMatch[0]);
                    if (relativeIndex !== -1) {
                        rangeLength = extraSpaceMatch[0].length - 1;
                    } else {
                        rangeLength = oldSpaceCount - newSpaceCount;
                    }
                } else {
                    rangeLength = oldSpaceCount - newSpaceCount;
                }
            } else {
                column = 0;
                rangeLength = oldSpaceCount - newSpaceCount;
            }
            if (!changes.includes("删除末尾标点符号")) {
                changes.push("减少多余空格");
            }
        } else {
            // 增加空格：找到需要添加空格的位置
            const missingSpaceIndex = findMissingSpaceIndex(oldContent, newContent);
            if (missingSpaceIndex !== -1) {
                column = missingSpaceIndex;
                rangeLength = 1;
            } else {
                column = 0;
                rangeLength = 1;
            }
            if (!changes.includes("减少多余空格")) {
                changes.push("增加空格");
            }
        }
    }

    // 4. 检查操作符空格
    const operators = ["=", "==", "!=", "<", ">", "<=", ">=", "&&", "||"];
    for (const op of operators) {
        const oldPattern = new RegExp(`\\s*${op}\\s*`);
        const newPattern = new RegExp(`\\s*${op}\\s*`);
        const oldMatch = oldContent.match(oldPattern)?.[0];
        const newMatch = newContent.match(newPattern)?.[0];
        if (oldMatch && newMatch && oldMatch !== newMatch) {
            changes.push("调整操作符空格");
            // 计算操作符的位置
            const opIndex = oldContent.indexOf(op);
            if (opIndex !== -1) {
                column = opIndex;
                rangeLength = op.length;
            }
            break;
        }
    }

    // 5. 检查括号空格
    const oldHasBracketSpace = /\[\s/.test(oldContent);
    const newHasBracketSpace = /\[\s/.test(newContent);
    if (oldHasBracketSpace !== newHasBracketSpace) {
        if (!changes.includes("调整操作符空格")) {
            changes.push("调整括号空格");
        }
        const bracketIndex = oldContent.indexOf("[");
        if (bracketIndex !== -1) {
            column = bracketIndex;
            rangeLength = 1;
        }
    }

    // 6. 检查行尾空格
    const oldEndsWithSpace = /\s$/.test(oldContent);
    const newEndsWithSpace = /\s$/.test(newContent);
    if (oldEndsWithSpace && !newEndsWithSpace) {
        if (!changes.includes("删除末尾标点符号")) {
            changes.push("删除行尾空格");
        }
        const trimmedLength = oldContent.trimEnd().length;
        column = trimmedLength;
        rangeLength = oldContent.length - trimmedLength;
    }

    // 7. 检查引号变化（除了首字符）
    const oldHasDoubleQuote = oldContent.includes('"');
    const newHasDoubleQuote = newContent.includes('"');
    const oldHasSingleQuote = oldContent.includes("'");
    const newHasSingleQuote = newContent.includes("'");
    if (
        oldHasDoubleQuote !== newHasDoubleQuote ||
        oldHasSingleQuote !== newHasSingleQuote
    ) {
        if (!changes.includes("调整引号") && column === 0) {
            changes.push("调整引号");
            // 找到第一个不同的引号位置
            for (let i = 0; i < oldContent.length; i++) {
                if (oldContent[i] === '"' || oldContent[i] === "'") {
                    column = i;
                    rangeLength = 1;
                    break;
                }
            }
        }
    }

    // 如果没有设置列位置，默认使用 0
    if (
        column === 0 &&
        !changes.includes("删除末尾标点符号") &&
        !changes.includes("调整括号空格") &&
        !changes.includes("调整引号")
    ) {
        column = 0;
    }

    return { column, rangeLength, changes };
}

/**
 * 查找多余空格的位置
 */
function findExtraSpaceIndex(oldContent: string, newContent: string): number {
    const oldParts = oldContent.split(/(\s+)/);
    const newParts = newContent.split(/(\s+)/);

    for (let i = 0; i < oldParts.length; i++) {
        const oldPart = oldParts[i];
        const newPart = newParts[i];

        // 如果旧部分是空格且比新部分长，返回位置
        if (oldPart && /^\s+$/.test(oldPart)) {
            const oldLen = oldPart.length;
            const newLen = newPart ? newPart.length : 0;
            if (oldLen > newLen) {
                // 计算该空格在原始字符串中的位置
                let position = 0;
                for (let j = 0; j < i; j++) {
                    position += oldParts[j]?.length || 0;
                }
                return position;
            }
        }
    }

    return -1;
}

/**
 * 查找缺少空格的位置
 */
function findMissingSpaceIndex(oldContent: string, newContent: string): number {
    const oldParts = oldContent.split(/(\s+)/);
    const newParts = newContent.split(/(\s+)/);

    for (let i = 0; i < newParts.length; i++) {
        const oldPart = oldParts[i];
        const newPart = newParts[i];

        // 如果新部分是空格且比旧部分长，返回位置
        if (newPart && /^\s+$/.test(newPart)) {
            const newLen = newPart.length;
            const oldLen = oldPart ? oldPart.length : 0;
            if (newLen > oldLen) {
                // 计算该空格在原始字符串中的位置
                let position = 0;
                for (let j = 0; j < i; j++) {
                    position += newParts[j]?.length || 0;
                }
                return position;
            }
        }
    }

    return -1;
}
