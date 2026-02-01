describe("shell-tools/index exports", () => {
    it("should export shell tool APIs", async () => {
        const tools = await import("../../../../src/infrastructure/shell-tools/index");

        expect(tools.ShfmtTool).toBeDefined();
        expect(tools.ShellcheckTool).toBeDefined();
        expect(tools.parseShfmtOutput).toBeDefined();
        expect(tools.parseShellcheckOutput).toBeDefined();
    });
});
