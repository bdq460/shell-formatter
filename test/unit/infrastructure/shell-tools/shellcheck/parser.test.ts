/**
 * shellcheck Parser Tests
 */

import { parseShellcheckOutput } from "../../../../../src/infrastructure/shell-tools/shellcheck/parser";
import { ErrorType, ExecutionResult } from "../../../../../src/utils/executor/types";

describe("parseShellcheckOutput", () => {
    describe("successful execution", () => {
        it("should return empty result when no issues", () => {
            const result: ExecutionResult = {
                command: "shellcheck",
                exitCode: 0,
                stdout: "",
                stderr: "",
            };

            const parsed = parseShellcheckOutput(result);

            expect(parsed.linterIssues).toBeUndefined();
            expect(parsed.syntaxErrors).toBeUndefined();
            expect(parsed.formatIssues).toBeUndefined();
            expect(parsed.executeErrors).toBeUndefined();
        });

        it("should parse error type issues", () => {
            const result: ExecutionResult = {
                command: "shellcheck",
                exitCode: 1,
                stdout: "script.sh:5:10: error: Use 'if [ ... ]; then ...' instead of 'if ...; then' [SC2039]",
                stderr: "",
            };

            const parsed = parseShellcheckOutput(result);

            expect(parsed.linterIssues).toBeDefined();
            expect(parsed.linterIssues).toHaveLength(1);
            expect(parsed.linterIssues?.[0]).toEqual({
                line: 4, // 5 - 1 (0-based)
                column: 9, // 10 - 1 (0-based)
                type: "error",
                message: "Use 'if [ ... ]; then ...' instead of 'if ...; then'",
                code: "SC2039",
            });
        });

        it("should parse warning type issues", () => {
            const result: ExecutionResult = {
                command: "shellcheck",
                exitCode: 1,
                stdout: "script.sh:10:5: warning: Quote this to prevent word splitting [SC2086]",
                stderr: "",
            };

            const parsed = parseShellcheckOutput(result);

            expect(parsed.linterIssues).toBeDefined();
            expect(parsed.linterIssues?.[0]).toEqual({
                line: 9, // 10 - 1
                column: 4, // 5 - 1
                type: "warning",
                message: "Quote this to prevent word splitting",
                code: "SC2086",
            });
        });

        it("should parse info type issues", () => {
            const result: ExecutionResult = {
                command: "shellcheck",
                exitCode: 0,
                stdout: "script.sh:1:1: note: Not following: file not specified [SC1090]",
                stderr: "",
            };

            const parsed = parseShellcheckOutput(result);

            expect(parsed.linterIssues?.[0]).toEqual({
                line: 0,
                column: 0,
                type: "info",
                message: "Not following: file not specified",
                code: "SC1090",
            });
        });

        it("should parse multiple issues", () => {
            const result: ExecutionResult = {
                command: "shellcheck",
                exitCode: 1,
                stdout: `script.sh:5:10: error: Use 'if [ ... ]; then ...' [SC2039]
script.sh:10:5: warning: Quote this to prevent word splitting [SC2086]
    script.sh:15:1: note: Not following: file not specified [SC1090]`,
                stderr: "",
            };

            const parsed = parseShellcheckOutput(result);

            expect(parsed.linterIssues).toHaveLength(3);
            expect(parsed.linterIssues?.[0].type).toBe("error");
            expect(parsed.linterIssues?.[1].type).toBe("warning");
            expect(parsed.linterIssues?.[2].type).toBe("info");
        });

        it("should handle issues in stderr", () => {
            const result: ExecutionResult = {
                command: "shellcheck",
                exitCode: 1,
                stdout: "",
                stderr: "script.sh:5:10: warning: Quote this to prevent word splitting [SC2086]",
            };

            const parsed = parseShellcheckOutput(result);

            expect(parsed.linterIssues).toHaveLength(1);
            expect(parsed.linterIssues?.[0].type).toBe("warning");
        });

        it("should handle issues in both stdout and stderr", () => {
            const result: ExecutionResult = {
                command: "shellcheck",
                exitCode: 1,
                stdout: "script.sh:5:10: error: Use 'if [ ... ]; then ...' [SC2039]",
                stderr: "script.sh:10:5: warning: Quote this to prevent word splitting [SC2086]",
            };

            const parsed = parseShellcheckOutput(result);

            expect(parsed.linterIssues).toHaveLength(2);
        });
    });

    describe("execution errors", () => {
        it("should handle command not found", () => {
            const result: ExecutionResult = {
                command: "shellcheck",
                exitCode: 127,
                stdout: "",
                stderr: "",
                error: {
                    type: ErrorType.Execution,
                    message: "spawn shellcheck ENOENT",
                },
            };

            const parsed = parseShellcheckOutput(result);

            expect(parsed.executeErrors).toBeDefined();
            expect(parsed.executeErrors).toHaveLength(1);
            expect(parsed.executeErrors?.[0]).toEqual({
                command: "shellcheck",
                exitCode: 127,
                message: "spawn shellcheck ENOENT",
            });
        });

        it("should handle timeout error", () => {
            const result: ExecutionResult = {
                command: "shellcheck",
                exitCode: null,
                stdout: "",
                stderr: "",
                error: {
                    type: ErrorType.Timeout,
                    message: "Command timed out",
                },
            };

            const parsed = parseShellcheckOutput(result);

            expect(parsed.executeErrors?.[0].message).toBe("Command timed out");
        });

        it("should handle both execution and linter errors", () => {
            const result: ExecutionResult = {
                command: "shellcheck",
                exitCode: 1,
                stdout: "script.sh:5:10: warning: Quote this [SC2086]",
                stderr: "",
                error: {
                    type: ErrorType.Execution,
                    message: "Partial execution error",
                },
            };

            const parsed = parseShellcheckOutput(result);

            expect(parsed.executeErrors).toHaveLength(1);
            expect(parsed.linterIssues).toHaveLength(1);
        });
    });

    describe("edge cases", () => {
        it("should handle invalid type (default to warning)", () => {
            const result: ExecutionResult = {
                command: "shellcheck",
                exitCode: 1,
                stdout: "script.sh:5:10: unknown: Some message [SC2086]",
                stderr: "",
            };

            const parsed = parseShellcheckOutput(result);

            expect(parsed.linterIssues).toBeUndefined();
        });

        it("should ignore lines that don't match format", () => {
            const result: ExecutionResult = {
                command: "shellcheck",
                exitCode: 0,
                stdout: `This is not a valid line
script.sh:5:10: warning: Quote this [SC2086]
Another invalid line`,
                stderr: "",
            };

            const parsed = parseShellcheckOutput(result);

            expect(parsed.linterIssues).toHaveLength(1);
            expect(parsed.linterIssues?.[0].message).toBe("Quote this");
        });

        it("should handle empty lines", () => {
            const result: ExecutionResult = {
                command: "shellcheck",
                exitCode: 0,
                stdout: "\n\n\n",
                stderr: "",
            };

            const parsed = parseShellcheckOutput(result);

            expect(parsed.linterIssues).toBeUndefined();
        });

        it("should handle zero-based line and column conversion", () => {
            const result: ExecutionResult = {
                command: "shellcheck",
                exitCode: 1,
                stdout: "script.sh:1:1: error: Some error [SC1000]",
                stderr: "",
            };

            const parsed = parseShellcheckOutput(result);

            expect(parsed.linterIssues?.[0]).toEqual({
                line: 0, // 1 - 1
                column: 0, // 1 - 1
                type: "error",
                message: "Some error",
                code: "SC1000",
            });
        });

        it("should handle large line numbers", () => {
            const result: ExecutionResult = {
                command: "shellcheck",
                exitCode: 1,
                stdout: "script.sh:1000:50: warning: Some warning [SC2086]",
                stderr: "",
            };

            const parsed = parseShellcheckOutput(result);

            expect(parsed.linterIssues?.[0]).toEqual({
                line: 999, // 1000 - 1
                column: 49, // 50 - 1
                type: "warning",
                message: "Some warning",
                code: "SC2086",
            });
        });
    });

    describe("message parsing", () => {
        it("should parse messages with colons", () => {
            const result: ExecutionResult = {
                command: "shellcheck",
                exitCode: 1,
                stdout: 'script.sh:5:10: warning: Use "foo" instead of \'bar\' [SC2086]',
                stderr: "",
            };

            const parsed = parseShellcheckOutput(result);

            expect(parsed.linterIssues?.[0].message).toBe(
                'Use "foo" instead of \'bar\'',
            );
        });

        it("should parse code with different SC numbers", () => {
            const codes = ["SC1000", "SC2086", "SC2039", "SC2154", "SC1090"];

            for (const code of codes) {
                const result: ExecutionResult = {
                    command: "shellcheck",
                    exitCode: 1,
                    stdout: `script.sh:5:10: warning: Some message [${code}]`,
                    stderr: "",
                };

                const parsed = parseShellcheckOutput(result);

                expect(parsed.linterIssues?.[0].code).toBe(code);
            }
        });
    });
});
