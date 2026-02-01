/**
 * shfmt Parser Tests
 */

import { parseShfmtOutput } from "../../../../../src/infrastructure/shell-tools/shfmt/parser";
import { ErrorType, ExecutionResult } from "../../../../../src/utils/executor/types";

jest.mock("../../../../../src/utils/log", () => ({
    logger: {
        error: jest.fn(),
    },
}));

describe("parseShfmtOutput", () => {
    describe("format mode", () => {
        it("should return formatted content on success", () => {
            const result: ExecutionResult = {
                command: "shfmt",
                exitCode: 0,
                stdout: "#!/bin/bash\necho \"hello\"\n",
                stderr: "",
            };

            const parsed = parseShfmtOutput(result, "format");

            expect("formattedContent" in parsed).toBe(true);
            if ("formattedContent" in parsed) {
                expect(parsed.formattedContent).toBe("#!/bin/bash\necho \"hello\"\n");
                expect(parsed.syntaxErrors).toBeUndefined();
                expect(parsed.executeErrors).toBeUndefined();
            }
        });

        it("should handle syntax errors in format mode", () => {
            const result: ExecutionResult = {
                command: "shfmt",
                exitCode: 1,
                stdout: "",
                stderr: "<standard input>:5:1: syntax error: unexpected end of file",
            };

            const parsed = parseShfmtOutput(result, "format");

            expect("formattedContent" in parsed).toBe(false);
            expect(parsed.syntaxErrors).toBeDefined();
            expect(parsed.syntaxErrors).toHaveLength(1);
            expect(parsed.syntaxErrors?.[0]).toEqual({
                line: 4, // 5 - 1 (0-based)
                column: 0, // 1 - 1 (0-based)
                message: "syntax error: unexpected end of file",
            });
        });

        it("should handle execution errors", () => {
            const result: ExecutionResult = {
                command: "shfmt",
                exitCode: null,
                stdout: "",
                stderr: "",
                error: {
                    type: ErrorType.Execution,
                    message: "Command not found",
                },
            };

            const parsed = parseShfmtOutput(result, "format");

            expect("formattedContent" in parsed).toBe(false);
            expect(parsed.executeErrors).toBeDefined();
            expect(parsed.executeErrors).toHaveLength(1);
            expect(parsed.executeErrors?.[0]).toEqual({
                command: "shfmt",
                exitCode: null,
                message: "Command not found",
            });
        });

        it("should handle both execution and syntax errors", () => {
            const result: ExecutionResult = {
                command: "shfmt",
                exitCode: 1,
                stdout: "",
                stderr: "<standard input>:3:1: if statement must end with \"fi\"",
                error: {
                    type: ErrorType.Execution,
                    message: "Execution error",
                },
            };

            const parsed = parseShfmtOutput(result, "format");

            expect("formattedContent" in parsed).toBe(false);
            expect(parsed.executeErrors).toHaveLength(1);
            expect(parsed.syntaxErrors).toHaveLength(1);
        });

        it("should return empty formattedContent when no output", () => {
            const result: ExecutionResult = {
                command: "shfmt",
                exitCode: 0,
                stdout: "",
                stderr: "",
            };

            const parsed = parseShfmtOutput(result, "format");

            expect("formattedContent" in parsed).toBe(true);
            if ("formattedContent" in parsed) {
                expect(parsed.formattedContent).toBe("");
            }
        });
    });

    describe("check mode", () => {
        it("should return no issues when format is correct", () => {
            const result: ExecutionResult = {
                command: "shfmt",
                exitCode: 0,
                stdout: "",
                stderr: "",
            };

            const parsed = parseShfmtOutput(result, "check");

            expect(parsed.formatIssues).toBeUndefined();
            expect(parsed.syntaxErrors).toBeUndefined();
            expect(parsed.executeErrors).toBeUndefined();
        });

        it("should parse format issues from diff output", () => {
            const diffOutput = `--- a/script.sh
+++ b/script.sh
@@ -1,2 +1,2 @@
 #!/bin/bash
-echo hello
+echo "hello"`;

            const result: ExecutionResult = {
                command: "shfmt",
                exitCode: 1,
                stdout: diffOutput,
                stderr: "",
            };

            const parsed = parseShfmtOutput(result, "check");

            expect(parsed.formatIssues).toBeDefined();
            expect(parsed.formatIssues?.length).toBeGreaterThan(0);
        });

        it("should parse syntax errors from stderr", () => {
            const result: ExecutionResult = {
                command: "shfmt",
                exitCode: 1,
                stdout: "",
                stderr: "<standard input>:10:5: syntax error: unexpected end of file",
            };

            const parsed = parseShfmtOutput(result, "check");

            expect(parsed.syntaxErrors).toBeDefined();
            expect(parsed.syntaxErrors).toHaveLength(1);
            expect(parsed.syntaxErrors?.[0]).toEqual({
                line: 9, // 10 - 1 (0-based)
                column: 4, // 5 - 1 (0-based)
                message: "syntax error: unexpected end of file",
            });
        });

        it("should handle both format and syntax errors", () => {
            const result: ExecutionResult = {
                command: "shfmt",
                exitCode: 1,
                stdout: "-echo\n+echo  ",
                stderr: "<standard input>:5:1: if statement must end with \"fi\"",
            };

            const parsed = parseShfmtOutput(result, "check");

            expect(parsed.formatIssues).toBeDefined();
            expect(parsed.syntaxErrors).toBeDefined();
            expect(parsed.formatIssues?.length).toBeGreaterThan(0);
            expect(parsed.syntaxErrors?.length).toBeGreaterThan(0);
        });

        it("should handle execution errors in check mode", () => {
            const result: ExecutionResult = {
                command: "shfmt",
                exitCode: null,
                stdout: "",
                stderr: "",
                error: {
                    type: ErrorType.Timeout,
                    message: "Timeout",
                },
            };

            const parsed = parseShfmtOutput(result, "check");

            expect(parsed.executeErrors).toBeDefined();
            expect(parsed.executeErrors).toHaveLength(1);
            expect(parsed.executeErrors?.[0].message).toBe("Timeout");
        });

        it("should handle exit code 0 with stdout (edge case)", () => {
            const result: ExecutionResult = {
                command: "shfmt",
                exitCode: 0,
                stdout: "#!/bin/bash\n",
                stderr: "",
            };

            const parsed = parseShfmtOutput(result, "check");

            // In check mode with exitCode 0, should not parse stdout
            expect(parsed.formatIssues).toBeUndefined();
            expect(parsed.syntaxErrors).toBeUndefined();
        });

        it("should parse syntax error with file path", () => {
            const result: ExecutionResult = {
                command: "shfmt",
                exitCode: 1,
                stdout: "",
                stderr: "/path/to/file.sh:14:1: if statement must end with \"fi\"",
            };

            const parsed = parseShfmtOutput(result, "check");

            expect(parsed.syntaxErrors).toBeDefined();
            expect(parsed.syntaxErrors?.[0]).toEqual({
                line: 13,
                column: 0,
                message: "if statement must end with \"fi\"",
            });
        });
    });

    describe("error handling", () => {
        it("should throw error for invalid mode", () => {
            const result: ExecutionResult = {
                command: "shfmt",
                exitCode: 0,
                stdout: "",
                stderr: "",
            };

            // @ts-expect-error - Testing invalid mode
            expect(() => parseShfmtOutput(result, "invalid")).toThrow(
                "Invalid mode: invalid",
            );
        });
    });

    describe("diff parsing edge cases", () => {
        it("should handle empty diff output", () => {
            const result: ExecutionResult = {
                command: "shfmt",
                exitCode: 1,
                stdout: "",
                stderr: "",
            };

            const parsed = parseShfmtOutput(result, "check");

            expect(parsed.formatIssues).toBeUndefined();
        });

        it("should handle deletion-only diff", () => {
            const result: ExecutionResult = {
                command: "shfmt",
                exitCode: 1,
                stdout: "@@ -1 +0 @@\n-echo test",
                stderr: "",
            };

            const parsed = parseShfmtOutput(result, "check");

            expect(parsed.formatIssues).toBeDefined();
            expect(parsed.formatIssues?.[0].message).toContain("删除");
        });

        it("should handle addition-only diff", () => {
            const result: ExecutionResult = {
                command: "shfmt",
                exitCode: 1,
                stdout: "@@ -0 +1 @@\n+echo test",
                stderr: "",
            };

            const parsed = parseShfmtOutput(result, "check");

            expect(parsed.formatIssues).toBeDefined();
            expect(parsed.formatIssues?.[0].message).toContain("应为");
        });

        it("should handle single line diff", () => {
            const result: ExecutionResult = {
                command: "shfmt",
                exitCode: 1,
                stdout: "@@ -1 +1 @@\n-echo hello\n+echo \"hello\"",
                stderr: "",
            };

            const parsed = parseShfmtOutput(result, "check");

            expect(parsed.formatIssues).toBeDefined();
            expect(parsed.formatIssues?.length).toBe(1);
            expect(parsed.formatIssues?.[0].line).toBe(0);
        });

        it("should handle multiple diff hunks", () => {
            const result: ExecutionResult = {
                command: "shfmt",
                exitCode: 1,
                stdout: `@@ -1,2 +1,2 @@
-echo "hello"
+echo "hello"

@@ -4,1 +4,1 @@
-echo "world"
+echo "world"  `,
                stderr: "",
            };

            const parsed = parseShfmtOutput(result, "check");

            expect(parsed.formatIssues).toBeDefined();
            expect(parsed.formatIssues?.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe("format issue analysis", () => {
        const buildDiff = (oldLine: string, newLine: string) => `@@ -1 +1 @@\n-${oldLine}\n+${newLine}`;

        it("should report empty line changes", () => {
            const result: ExecutionResult = {
                command: "shfmt",
                exitCode: 1,
                stdout: buildDiff("   ", " "),
                stderr: "",
            };

            const parsed = parseShfmtOutput(result, "check");

            expect(parsed.formatIssues?.[0].message).toContain("格式不正确");
        });

        it("should report added line", () => {
            const result: ExecutionResult = {
                command: "shfmt",
                exitCode: 1,
                stdout: buildDiff("", "echo test"),
                stderr: "",
            };

            const parsed = parseShfmtOutput(result, "check");

            expect(parsed.formatIssues?.[0].message).toContain("应为");
        });

        it("should report removed line", () => {
            const result: ExecutionResult = {
                command: "shfmt",
                exitCode: 1,
                stdout: buildDiff("echo test", ""),
                stderr: "",
            };

            const parsed = parseShfmtOutput(result, "check");

            expect(parsed.formatIssues?.[0].message).toContain("删除");
        });

        it("should detect punctuation removal", () => {
            const result: ExecutionResult = {
                command: "shfmt",
                exitCode: 1,
                stdout: buildDiff("echo test;", "echo test"),
                stderr: "",
            };

            const parsed = parseShfmtOutput(result, "check");

            expect(parsed.formatIssues?.[0].message).toContain("删除末尾标点符号");
        });

        it("should detect quote adjustment", () => {
            const result: ExecutionResult = {
                command: "shfmt",
                exitCode: 1,
                stdout: buildDiff("'echo test'", '"echo test"'),
                stderr: "",
            };

            const parsed = parseShfmtOutput(result, "check");

            expect(parsed.formatIssues?.[0].message).toContain("调整引号");
        });

        it("should detect extra spaces removed", () => {
            const result: ExecutionResult = {
                command: "shfmt",
                exitCode: 1,
                stdout: buildDiff("echo   test", "echo test"),
                stderr: "",
            };

            const parsed = parseShfmtOutput(result, "check");

            expect(parsed.formatIssues?.[0].message).toContain("减少多余空格");
        });

        it("should reduce multiple spaces without consecutive match", () => {
            const result: ExecutionResult = {
                command: "shfmt",
                exitCode: 1,
                stdout: buildDiff("a b c", "abc"),
                stderr: "",
            };

            const parsed = parseShfmtOutput(result, "check");

            expect(parsed.formatIssues?.[0].message).toContain("减少多余空格");
        });

        it("should detect added spaces", () => {
            const result: ExecutionResult = {
                command: "shfmt",
                exitCode: 1,
                stdout: buildDiff("echo test", "echo   test"),
                stderr: "",
            };

            const parsed = parseShfmtOutput(result, "check");

            expect(parsed.formatIssues?.[0].message).toContain("增加空格");
        });

        it("should add multiple spaces without matching index", () => {
            const result: ExecutionResult = {
                command: "shfmt",
                exitCode: 1,
                stdout: buildDiff("abc", "a b c"),
                stderr: "",
            };

            const parsed = parseShfmtOutput(result, "check");

            expect(parsed.formatIssues?.[0].message).toContain("增加空格");
        });

        it("should detect operator spacing", () => {
            const result: ExecutionResult = {
                command: "shfmt",
                exitCode: 1,
                stdout: buildDiff("a=1", "a = 1"),
                stderr: "",
            };

            const parsed = parseShfmtOutput(result, "check");

            expect(parsed.formatIssues?.[0].message).toContain("调整操作符空格");
        });

        it("should detect bracket spacing", () => {
            const result: ExecutionResult = {
                command: "shfmt",
                exitCode: 1,
                stdout: buildDiff("[ 1 ]", "[1 ]"),
                stderr: "",
            };

            const parsed = parseShfmtOutput(result, "check");

            expect(parsed.formatIssues?.[0].message).toContain("调整括号空格");
        });

        it("should show full comparison when trailing space changes", () => {
            const result: ExecutionResult = {
                command: "shfmt",
                exitCode: 1,
                stdout: buildDiff("echo test ", "echo test"),
                stderr: "",
            };

            const parsed = parseShfmtOutput(result, "check");

            expect(parsed.formatIssues?.[0].message).toContain("→");
        });

        it("should show comparison when trailing spaces trimmed", () => {
            const result: ExecutionResult = {
                command: "shfmt",
                exitCode: 1,
                stdout: buildDiff("echo test  ", "echo test"),
                stderr: "",
            };

            const parsed = parseShfmtOutput(result, "check");

            expect(parsed.formatIssues?.[0].message).toContain("→");
        });

        it("should show full comparison when no specific change detected", () => {
            const result: ExecutionResult = {
                command: "shfmt",
                exitCode: 1,
                stdout: buildDiff("echo test", "echo test"),
                stderr: "",
            };

            const parsed = parseShfmtOutput(result, "check");

            expect(parsed.formatIssues?.[0].message).toContain("→");
        });

        it("should detect quote change inside line", () => {
            const result: ExecutionResult = {
                command: "shfmt",
                exitCode: 1,
                stdout: buildDiff("echo 'test'", "echo \"test\""),
                stderr: "",
            };

            const parsed = parseShfmtOutput(result, "check");

            expect(parsed.formatIssues?.[0].message).toContain("调整引号");
        });
    });

    describe("syntax error parsing edge cases", () => {
        it("should handle syntax error without match", () => {
            const result: ExecutionResult = {
                command: "shfmt",
                exitCode: 1,
                stdout: "",
                stderr: "Some error message without line numbers",
            };

            const parsed = parseShfmtOutput(result, "check");

            // Should return empty syntax errors array when no match
            expect(parsed.syntaxErrors).toBeUndefined();
        });

        it("should handle empty stderr", () => {
            const result: ExecutionResult = {
                command: "shfmt",
                exitCode: 1,
                stdout: "",
                stderr: "",
            };

            const parsed = parseShfmtOutput(result, "check");

            expect(parsed.syntaxErrors).toBeUndefined();
            expect(parsed.formatIssues).toBeUndefined();
        });
    });
});
