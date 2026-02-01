/**
 * Shfmt Tool Adapter Tests
 */

import { CheckToolOptions, FormatToolOptions } from "../../../../src/domain/port";
import { DiagnosticSeverity } from "../../../../src/domain/types";
import { ShfmtToolAdapter } from "../../../../src/infrastructure/adapters/shfmt-adapter";
import { ShfmtTool } from "../../../../src/infrastructure/shell-tools/shfmt/shfmt-tool";
import { ToolCheckResult } from "../../../../src/infrastructure/shell-tools/types";

// Mock ShfmtTool
jest.mock("../../../../src/infrastructure/shell-tools/shfmt/shfmt-tool");

describe("ShfmtToolAdapter", () => {
    let mockShfmtTool: jest.Mocked<ShfmtTool>;
    let adapter: ShfmtToolAdapter;

    beforeEach(() => {
        jest.clearAllMocks();

        mockShfmtTool = {
            format: jest.fn(),
            check: jest.fn(),
        } as unknown as jest.Mocked<ShfmtTool>;

        (ShfmtTool as jest.MockedClass<typeof ShfmtTool>).mockImplementation(() => mockShfmtTool);

        adapter = new ShfmtToolAdapter("/usr/local/bin/shfmt", { tabSize: 4 });
    });

    describe("format", () => {
        it("should format content successfully", async () => {
            const input = "#!/bin/bash\necho hello";
            const expectedContent = "#!/bin/bash\necho \"hello\"";

            mockShfmtTool.format.mockResolvedValue({ formattedContent: expectedContent });

            const result = await adapter.format(input);

            expect(result.formattedContent).toBe(expectedContent);
            expect(result.hasErrors).toBe(false);
            expect(result.diagnostics).toEqual([]);
            expect(result.textEdits).toHaveLength(1);
            expect(mockShfmtTool.format).toHaveBeenCalledWith("-", expect.objectContaining({ content: input }));
        });

        it("should format with options", async () => {
            const input = "#!/bin/bash\necho hello";
            const expectedContent = "#!/bin/bash\necho \"hello\"";
            const options: FormatToolOptions = { indent: 2 };

            mockShfmtTool.format.mockResolvedValue({ formattedContent: expectedContent });

            const result = await adapter.format(input, options);

            expect(result.formattedContent).toBe(expectedContent);
            expect(result.hasErrors).toBe(false);
            expect(result.diagnostics).toEqual([]);
            expect(result.textEdits).toHaveLength(1);
            expect(mockShfmtTool.format).toHaveBeenCalledWith("-", expect.objectContaining({ content: input, indent: 2 }));
        });

        it("should handle format errors", async () => {
            const input = "#!/bin/bash\necho hello";
            mockShfmtTool.format.mockRejectedValue(new Error("Format failed"));

            await expect(adapter.format(input)).rejects.toThrow("Format failed");
        });

        it("should throw when formattedContent is missing", async () => {
            const input = "#!/bin/bash\necho hello";

            mockShfmtTool.format.mockResolvedValue({
                executeErrors: [
                    { command: "shfmt", exitCode: 1, message: "no output" },
                ],
            });

            await expect(adapter.format(input)).rejects.toThrow(
                "Format failed: no content returned",
            );
        });

        it("should handle syntax errors in format result", async () => {
            const input = "#!/bin/bash\necho hello";
            const expectedContent = "#!/bin/bash\necho \"hello\"";

            mockShfmtTool.format.mockResolvedValue({
                formattedContent: expectedContent,
                syntaxErrors: [
                    {
                        line: 1,
                        column: 5,
                        message: "Syntax error",
                    },
                ],
            });

            const result = await adapter.format(input);

            expect(result.hasErrors).toBe(true);
            expect(result.diagnostics).toHaveLength(1);
            expect(result.diagnostics[0].severity).toBe(DiagnosticSeverity.Error);
            expect(result.diagnostics[0].message).toBe("Syntax error");
            expect(result.textEdits).toHaveLength(0); // 有错误时不应该生成 textEdits
        });

        it("should handle format issues in format result", async () => {
            const input = "#!/bin/bash\necho hello";
            const expectedContent = "#!/bin/bash\necho \"hello\"";

            mockShfmtTool.format.mockResolvedValue({
                formattedContent: expectedContent,
                formatIssues: [
                    {
                        line: 1,
                        column: 5,
                        rangeLength: 5,
                        message: "Format issue",
                    },
                ],
            });

            const result = await adapter.format(input);

            expect(result.hasErrors).toBe(false); // Format issues are warnings, not errors
            expect(result.diagnostics).toHaveLength(1);
            expect(result.diagnostics[0].severity).toBe(DiagnosticSeverity.Warning);
            expect(result.diagnostics[0].message).toBe("Format issue");
            expect(result.textEdits).toHaveLength(1); // 有 warnings 仍然生成 textEdits
        });

        it("should default format issue message in format result", async () => {
            const input = "#!/bin/bash\necho hello";
            const expectedContent = "#!/bin/bash\necho \"hello\"";

            mockShfmtTool.format.mockResolvedValue({
                formattedContent: expectedContent,
                formatIssues: [
                    { line: 0, column: 0 } as any,
                ],
            });

            const result = await adapter.format(input);

            expect(result.diagnostics[0].message).toBe("Format issue");
        });

        it("should not create edits when formattedContent is empty", async () => {
            const input = "#!/bin/bash\necho hello";

            mockShfmtTool.format.mockResolvedValue({
                formattedContent: "",
            });

            const result = await adapter.format(input);

            expect(result.textEdits).toEqual([]);
        });

        it("should handle execute errors in format result", async () => {
            const input = "#!/bin/bash\necho hello";
            const expectedContent = "#!/bin/bash\necho \"hello\"";

            mockShfmtTool.format.mockResolvedValue({
                formattedContent: expectedContent,
                executeErrors: [
                    { command: "shfmt", exitCode: 1, message: "failed" },
                ],
            });

            const result = await adapter.format(input);

            expect(result.hasErrors).toBe(true);
            expect(result.textEdits).toHaveLength(0);
            expect(result.diagnostics[0].message).toContain("failed");
        });
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

            mockShfmtTool.check.mockResolvedValue(checkResult);

            const result = await adapter.check(input);

            expect(result.hasErrors).toBe(false);
            expect(mockShfmtTool.check).toHaveBeenCalledWith("-", expect.objectContaining({ content: input }));
        });

        it("should check with options", async () => {
            const input = "#!/bin/bash\necho hello";
            const options: CheckToolOptions = {};
            const checkResult: ToolCheckResult = {
                executeErrors: [],
                formatIssues: [
                    {
                        line: 1,
                        column: 0,
                        rangeLength: 10,
                        message: "Format issue",
                    },
                ],
                linterIssues: [],
                syntaxErrors: [],
            };

            mockShfmtTool.check.mockResolvedValue(checkResult);

            const result = await adapter.check(input, options);

            expect(result.hasErrors).toBe(false);
            expect(result.diagnostics).toHaveLength(1);
        });

        it("should default format issue message and range length", async () => {
            const input = "#!/bin/bash\necho hello";
            const checkResult: ToolCheckResult = {
                executeErrors: [],
                formatIssues: [
                    {
                        line: 1,
                        column: 0,
                    } as any,
                ],
                linterIssues: [],
                syntaxErrors: [],
            };

            mockShfmtTool.check.mockResolvedValue(checkResult);

            const result = await adapter.check(input, {});

            expect(result.diagnostics[0].message).toBe("Format issue");
        });

        it("should handle check errors", async () => {
            const input = "#!/bin/bash\necho hello";
            mockShfmtTool.check.mockRejectedValue(new Error("Check failed"));

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
            mockShfmtTool.check.mockResolvedValue(checkResult);

            const result = await adapter.isAvailable();

            expect(result).toBe(true);
        });

        it("should return false when tool is not available", async () => {
            mockShfmtTool.check.mockRejectedValue(new Error("Not found"));

            const result = await adapter.isAvailable();

            expect(result).toBe(false);
        });
    });
});
