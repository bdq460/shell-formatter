import { activatePlugins, initializePlugins } from "#/domain/plugin-initializer";

const mockResolve = jest.fn();
const mockGetContainer = jest.fn(() => ({ resolve: mockResolve }));

jest.mock("../../../src/utils/di/container", () => ({
    getContainer: () => mockGetContainer(),
    ServiceNames: { PLUGIN_MANAGER: "pluginManager" },
}));

jest.mock("../../../src/config/setting-info", () => ({
    SettingInfo: {
        isShfmtEnabled: jest.fn(),
        isShellcheckEnabled: jest.fn(),
    },
}));

const mockTimerStop = jest.fn();

jest.mock("../../../src/utils/performance/monitor", () => ({
    startTimer: jest.fn(() => ({ stop: mockTimerStop })),
}));

jest.mock("../../../src/shared/performance-metrics", () => ({
    PERFORMANCE_METRICS: { PLUGIN_LOAD_DURATION: "plugin.load" },
}));

jest.mock("../../../src/utils/log", () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

describe("plugin-initializer", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockTimerStop.mockClear();
    });

    it("should activate enabled plugins", async () => {
        const { SettingInfo } = require("../../../src/config/setting-info");
        SettingInfo.isShfmtEnabled.mockReturnValue(true);
        SettingInfo.isShellcheckEnabled.mockReturnValue(false);

        const pluginManager = {
            activateMultiple: jest.fn().mockResolvedValue(1),
            getStats: jest.fn().mockReturnValue({ total: 1, active: 1 }),
        };
        mockResolve.mockReturnValue(pluginManager);

        await activatePlugins();

        expect(pluginManager.activateMultiple).toHaveBeenCalledWith(["shfmt"]);
    });

    it("should warn when no plugins enabled", async () => {
        const { SettingInfo } = require("../../../src/config/setting-info");
        SettingInfo.isShfmtEnabled.mockReturnValue(false);
        SettingInfo.isShellcheckEnabled.mockReturnValue(false);

        const pluginManager = {
            activateMultiple: jest.fn(),
            getStats: jest.fn().mockReturnValue({ total: 0, active: 0 }),
        };
        mockResolve.mockReturnValue(pluginManager);

        await activatePlugins();

        expect(pluginManager.activateMultiple).not.toHaveBeenCalled();
    });

    it("should initialize plugins and activate", async () => {
        const pluginManager = {
            activateMultiple: jest.fn().mockResolvedValue(0),
            getStats: jest.fn().mockReturnValue({ total: 0, active: 0 }),
        };
        mockResolve.mockReturnValue(pluginManager);

        await initializePlugins();

        expect(mockResolve).toHaveBeenCalled();
        expect(mockTimerStop).toHaveBeenCalled();
    });

    it("should activate both plugins when enabled", async () => {
        const { SettingInfo } = require("../../../src/config/setting-info");
        SettingInfo.isShfmtEnabled.mockReturnValue(true);
        SettingInfo.isShellcheckEnabled.mockReturnValue(true);

        const pluginManager = {
            activateMultiple: jest.fn().mockResolvedValue(2),
            getStats: jest.fn().mockReturnValue({ total: 2, active: 2 }),
        };
        mockResolve.mockReturnValue(pluginManager);

        await activatePlugins();

        expect(pluginManager.activateMultiple).toHaveBeenCalledWith(["shfmt", "shellcheck"]);
    });

    it("should throw when activateMultiple fails", async () => {
        const { SettingInfo } = require("../../../src/config/setting-info");
        SettingInfo.isShfmtEnabled.mockReturnValue(true);
        SettingInfo.isShellcheckEnabled.mockReturnValue(false);

        const pluginManager = {
            activateMultiple: jest.fn().mockRejectedValue(new Error("boom")),
            getStats: jest.fn().mockReturnValue({ total: 1, active: 0 }),
        };
        mockResolve.mockReturnValue(pluginManager);

        await expect(activatePlugins()).rejects.toThrow("boom");
    });

    it("should throw when initializePlugins fails", async () => {
        mockResolve.mockImplementation(() => {
            throw new Error("resolve failed");
        });

        await expect(initializePlugins()).rejects.toThrow("resolve failed");
        expect(mockTimerStop).toHaveBeenCalled();
    });
});
