describe("infrastructure/index exports", () => {
    it("should export infrastructure APIs", async () => {
        const infra = await import("../../../src/infrastructure/index");

        expect(infra.ShfmtToolAdapter).toBeDefined();
        expect(infra.ShellcheckToolAdapter).toBeDefined();
        expect(infra.ShfmtTool).toBeDefined();
        expect(infra.ShellcheckTool).toBeDefined();
    });
});
