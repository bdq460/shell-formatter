import { ShfmtTool } from "../../../../../src/infrastructure/shell-tools/shfmt/shfmt-tool";

const mockExecute = jest.fn();

jest.mock("../../../../../src/utils/executor", () => ({
    execute: (...args: unknown[]) => mockExecute(...args),
}));

const mockParse = jest.fn();

jest.mock("../../../../../src/infrastructure/shell-tools/shfmt/parser", () => ({
    parseShfmtOutput: (...args: unknown[]) => mockParse(...args),
}));

describe("ShfmtTool", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockExecute.mockResolvedValue({
            command: "shfmt",
            exitCode: 0,
            stdout: "ok",
            stderr: "",
        });
        mockParse.mockReturnValue({ formattedContent: "ok" });
    });

    it("should format with stdin when content provided", async () => {
        const tool = new ShfmtTool("shfmt");

        await tool.format("file.sh", {
            content: "echo test",
            indent: 2,
            binaryNextLine: true,
            caseIndent: true,
            spaceRedirects: true,
        });

        expect(mockExecute).toHaveBeenCalledWith("shfmt", {
            args: ["-i", "2", "-bn", "-ci", "-sr", "-"],
            token: undefined,
            stdin: "echo test",
        });
        expect(mockParse).toHaveBeenCalledWith(expect.any(Object), "format");
    });

    it("should check with file name when no content", async () => {
        const tool = new ShfmtTool("shfmt");

        await tool.check("file.sh", {
            indent: 4,
        });

        expect(mockExecute).toHaveBeenCalledWith("shfmt", {
            args: ["-i", "4", "-d", "file.sh"],
            token: undefined,
            stdin: undefined,
        });
        expect(mockParse).toHaveBeenCalledWith(expect.any(Object), "check");
    });

    it("should check with stdin when content provided", async () => {
        const tool = new ShfmtTool("shfmt");
        const token = { isCancellationRequested: false, onCancellationRequested: jest.fn() };

        await tool.check("file.sh", {
            content: "echo test",
            token,
        });

        expect(mockExecute).toHaveBeenCalledWith("shfmt", {
            args: ["-d", "-"],
            token,
            stdin: "echo test",
        });
        expect(mockParse).toHaveBeenCalledWith(expect.any(Object), "check");
    });

    it("should format with file name when no content", async () => {
        const tool = new ShfmtTool();

        await tool.format("file.sh", {
            indent: 2,
        });

        expect(mockExecute).toHaveBeenCalledWith("shfmt", {
            args: ["-i", "2", "file.sh"],
            token: undefined,
            stdin: undefined,
        });
    });

    it("should pass cancellation token to executor", async () => {
        const tool = new ShfmtTool("shfmt");
        const token = { isCancellationRequested: false, onCancellationRequested: jest.fn() };

        await tool.check("file.sh", { token });

        expect(mockExecute).toHaveBeenCalledWith("shfmt", {
            args: ["-d", "file.sh"],
            token,
            stdin: undefined,
        });
    });

    it("should build check args with format flags", async () => {
        const tool = new ShfmtTool("shfmt");

        await tool.check("file.sh", {
            binaryNextLine: true,
            caseIndent: true,
            spaceRedirects: true,
        });

        const callArgs = mockExecute.mock.calls[0][1].args;
        expect(callArgs).toContain("-bn");
        expect(callArgs).toContain("-ci");
        expect(callArgs).toContain("-sr");
        expect(callArgs).toContain("-d");
    });

    it("should omit indent flag when not provided", async () => {
        const tool = new ShfmtTool();

        await tool.format("file.sh", { binaryNextLine: true });

        const args = mockExecute.mock.calls[0][1].args;
        expect(args).not.toContain("-i");
        expect(args).toContain("-bn");
        expect(args).toContain("file.sh");
    });

    it("should use custom command path when provided", async () => {
        const tool = new ShfmtTool("/custom/shfmt");

        await tool.format("file.sh", { indent: 2 });

        expect(mockExecute).toHaveBeenCalledWith("/custom/shfmt", {
            args: ["-i", "2", "file.sh"],
            token: undefined,
            stdin: undefined,
        });
    });
});
