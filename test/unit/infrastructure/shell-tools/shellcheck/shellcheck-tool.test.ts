import { ShellcheckTool } from "../../../../../src/infrastructure/shell-tools/shellcheck/shellcheck-tool";

const mockExecute = jest.fn();

jest.mock("../../../../../src/utils/executor", () => ({
    execute: (...args: unknown[]) => mockExecute(...args),
}));

const mockParse = jest.fn();

jest.mock("../../../../../src/infrastructure/shell-tools/shellcheck/parser", () => ({
    parseShellcheckOutput: (...args: unknown[]) => mockParse(...args),
}));

describe("ShellcheckTool", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockExecute.mockResolvedValue({
            command: "shellcheck",
            exitCode: 0,
            stdout: "",
            stderr: "",
        });
        mockParse.mockReturnValue({});
    });

    it("should use default args and file", async () => {
        const tool = new ShellcheckTool("shellcheck");

        await tool.check({ file: "file.sh" });

        expect(mockExecute).toHaveBeenCalledWith("shellcheck", {
            args: ["-f", "gcc", "file.sh"],
            token: undefined,
            stdin: undefined,
        });
        expect(mockParse).toHaveBeenCalled();
    });

    it("should use custom args when provided", async () => {
        const tool = new ShellcheckTool("shellcheck");

        await tool.check({ file: "file.sh", commandArgs: ["-x"] });

        expect(mockExecute).toHaveBeenCalledWith("shellcheck", {
            args: ["-x", "file.sh"],
            token: undefined,
            stdin: undefined,
        });
    });

    it("should use stdin when content provided", async () => {
        const tool = new ShellcheckTool("shellcheck");

        await tool.check({ file: "file.sh", content: "echo test" });

        expect(mockExecute).toHaveBeenCalledWith("shellcheck", {
            args: ["-f", "gcc", "-"],
            token: undefined,
            stdin: "echo test",
        });
    });

    it("should pass token and custom args with stdin", async () => {
        const tool = new ShellcheckTool();
        const token = { isCancellationRequested: false, onCancellationRequested: jest.fn() };

        await tool.check({ file: "file.sh", content: "echo test", commandArgs: ["-x"], token });

        expect(mockExecute).toHaveBeenCalledWith("shellcheck", {
            args: ["-x", "-"],
            token,
            stdin: "echo test",
        });
    });
});
