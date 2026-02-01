/**
 * Shellcheck Tool Adapter Tests
 */

import { CheckToolOptions } from "../../../../src/domain/port";
import { ShellcheckToolAdapter } from "../../../../src/infrastructure/adapters/shellcheck-adapter";
import { ShellcheckTool } from "../../../../src/infrastructure/shell-tools/shellcheck/shellcheck-tool";
import { ToolCheckResult } from "../../../../src/infrastructure/shell-tools/types";

// Mock ShellcheckTool
jest.mock("../../../../src/infrastructure/shell-tools/shellcheck/shellcheck-tool");

describe("ShellcheckToolAdapter", () => {
    let mockShellcheckTool: jest.Mocked<ShellcheckTool>;
    let adapter: ShellcheckToolAdapter;

    beforeEach(() => {
        jest.clearAllMocks();

        mockShellcheckTool = {
            check: jest.fn(),
        } as unknown as jest.Mocked<ShellcheckTool>;

        (ShellcheckTool as jest.MockedClass<typeof ShellcheckTool>).mockImplementation(() => mockShellcheckTool);

        adapter = new ShellcheckToolAdapter("/usr/local/bin/shellcheck");
    });

    describe("check", () => {
        it("should check content successfully", async () => {
            const input = "#!/bin/bash\necho hello";
            const checkResult: ToolCheckResult = {
                executeErrors: [],
                formatIssues: [],
                linterIssues: [],
                syntaxErrors: [],
            };

            mockShellcheckTool.check.mockResolvedValue(checkResult);

            const result = await adapter.check(input);

            expect(result.hasErrors).toBe(false);
            expect(result.diagnostics).toEqual([]);
            expect(mockShellcheckTool.check).toHaveBeenCalledWith({ file: "-", content: input });
        });

        it("should check with options", async () => {
            const input = "#!/bin/bash\necho hello";
            const options: CheckToolOptions = {};
            const checkResult: ToolCheckResult = {
                executeErrors: [],
                formatIssues: [],
                linterIssues: [
                    {
                        line: 1,
                        column: 0,
                        type: "warning",
                        code: "SC2046",
                        message: "Quote this to prevent word splitting",
                    },
                ],
                syntaxErrors: [],
            };

            mockShellcheckTool.check.mockResolvedValue(checkResult);

            const result = await adapter.check(input, options);

            expect(result.hasErrors).toBe(false);
            expect(result.diagnostics).toHaveLength(1);
            expect(mockShellcheckTool.check).toHaveBeenCalledWith({ file: "-", content: input });
        });

        it("should default unknown linter severity to warning", async () => {
            const input = "#!/bin/bash\necho hello";
            const checkResult: ToolCheckResult = {
                executeErrors: [],
                formatIssues: [],
                linterIssues: [
                    { line: 1, column: 0, type: "unknown" as any, code: "SC9999", message: "Unknown" },
                ],
                syntaxErrors: [],
            };

            mockShellcheckTool.check.mockResolvedValue(checkResult);

            const result = await adapter.check(input);

            expect(result.hasErrors).toBe(false);
            expect(result.diagnostics).toHaveLength(1);
        });

        it("should convert execute and syntax errors to diagnostics", async () => {
            const input = "#!/bin/bash\necho hello";
            const checkResult: ToolCheckResult = {
                executeErrors: [
                    { command: "shellcheck", exitCode: 1, message: "fail" },
                ],
                syntaxErrors: [
                    { line: 0, column: 1, message: "syntax" },
                ],
                linterIssues: [],
                formatIssues: [],
            };

            mockShellcheckTool.check.mockResolvedValue(checkResult);

            const result = await adapter.check(input);

            expect(result.hasErrors).toBe(true);
            expect(result.diagnostics).toHaveLength(2);
        });

        it("should map linter issue severities", async () => {
            const input = "#!/bin/bash\necho hello";
            const checkResult: ToolCheckResult = {
                executeErrors: [],
                formatIssues: [],
                linterIssues: [
                    { line: 0, column: 0, type: "error", code: "SC1000", message: "err" },
                    { line: 0, column: 1, type: "info", code: "SC1001", message: "info" },
                ],
                syntaxErrors: [],
            };

            mockShellcheckTool.check.mockResolvedValue(checkResult);

            const result = await adapter.check(input);

            expect(result.hasErrors).toBe(true);
            expect(result.diagnostics).toHaveLength(2);
        });

        it("should handle check errors", async () => {
            const input = "#!/bin/bash\necho hello";
            mockShellcheckTool.check.mockRejectedValue(new Error("Check failed"));

            await expect(adapter.check(input)).rejects.toThrow("Check failed");
        });
    });

    describe("isAvailable", () => {
        it("should return true when tool is available", async () => {
            const checkResult: ToolCheckResult = {
                executeErrors: [],
                formatIssues: [],
                linterIssues: [],
                syntaxErrors: [],
            };
            mockShellcheckTool.check.mockResolvedValue(checkResult);

            const result = await adapter.isAvailable();

            expect(result).toBe(true);
            expect(mockShellcheckTool.check).toHaveBeenCalledWith({ file: "-", content: "# test" });
        });

        it("should return false when tool is not available", async () => {
            mockShellcheckTool.check.mockRejectedValue(new Error("Not found"));

            const result = await adapter.isAvailable();

            expect(result).toBe(false);
        });
    });
});
