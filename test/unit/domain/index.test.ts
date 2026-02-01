jest.mock("../../../src/utils/log", () => ({
    logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

jest.mock("../../../src/config/setting-info", () => ({
    SettingInfo: {
        isShfmtEnabled: jest.fn(() => false),
        isShellcheckEnabled: jest.fn(() => false),
    },
}));

describe("domain/index exports", () => {
    it("should export domain APIs", async () => {
        const domain = await import("../../../src/domain/index");

        expect(domain.PluginManager).toBeDefined();
        expect(domain.initializePlugins).toBeDefined();
        expect(domain.activatePlugins).toBeDefined();
        expect(domain.BasePlugin).toBeDefined();
        expect(domain.PureShfmtPlugin).toBeDefined();
        expect(domain.PureShellcheckPlugin).toBeDefined();
    });
});
