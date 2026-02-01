import {
    getAllPluginStatus,
    isPluginAvailable,
    showPluginStatus,
} from "../../../../src/application/services/plugin-status-service";

const mockResolve = jest.fn();
const mockGetContainer = jest.fn(() => ({ resolve: mockResolve }));

jest.mock("../../../../src/utils/di/container", () => ({
    getContainer: () => mockGetContainer(),
    ServiceNames: { PLUGIN_MANAGER: "pluginManager" },
}));

jest.mock("../../../../src/utils/log", () => ({
    logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

describe("plugin-status-service", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should return statuses for registered plugins", async () => {
        const shfmt = {
            name: "shfmt",
            displayName: "Shfmt",
            version: "1.0.0",
            description: "desc",
            isAvailable: jest.fn().mockResolvedValue(true),
            getCapabilities: jest.fn().mockReturnValue(["format:shfmt"]),
            getDependencies: jest.fn().mockReturnValue([{ name: "dep" }]),
        };
        const shellcheck = {
            name: "shellcheck",
            displayName: "Shellcheck",
            version: "1.0.0",
            description: "desc",
            isAvailable: jest.fn().mockResolvedValue(false),
            getCapabilities: jest.fn().mockReturnValue(["check:shellcheck"]),
            getDependencies: jest.fn().mockReturnValue([]),
        };

        const pluginManager = {
            getStats: jest.fn().mockReturnValue({ total: 2, active: 1 }),
            getActivePluginNames: jest.fn().mockReturnValue(["shfmt"]),
            get: jest.fn((name: string) =>
                name === "shfmt" ? shfmt : name === "shellcheck" ? shellcheck : undefined,
            ),
        };

        mockResolve.mockReturnValue(pluginManager);

        const statuses = await getAllPluginStatus();

        expect(statuses).toHaveLength(2);
        expect(statuses[0].name).toBe("shfmt");
        expect(statuses[0].active).toBe(true);
        expect(statuses[1].name).toBe("shellcheck");
        expect(statuses[1].available).toBe(false);
    });

    it("should log plugin status summary", async () => {
        const { logger } = require("../../../../src/utils/log");
        const pluginManager = {
            getStats: jest.fn().mockReturnValue({ total: 0, active: 0 }),
            getActivePluginNames: jest.fn().mockReturnValue([]),
            get: jest.fn(),
        };
        mockResolve.mockReturnValue(pluginManager);

        await showPluginStatus();

        expect(logger.info).toHaveBeenCalledWith("=== Plugin Status ===");
        expect(logger.info).toHaveBeenCalledWith("No active plugins");
    });

    it("should log active plugin names", async () => {
        const { logger } = require("../../../../src/utils/log");
        const pluginManager = {
            getStats: jest.fn().mockReturnValue({ total: 2, active: 1 }),
            getActivePluginNames: jest.fn().mockReturnValue(["shfmt"]),
            get: jest.fn(),
        };
        mockResolve.mockReturnValue(pluginManager);

        await showPluginStatus();

        expect(logger.info).toHaveBeenCalledWith("Active plugin names: shfmt");
    });

    it("should return false when plugin not found", async () => {
        const pluginManager = {
            get: jest.fn().mockReturnValue(undefined),
        };
        mockResolve.mockReturnValue(pluginManager);

        const result = await isPluginAvailable("unknown");

        expect(result).toBe(false);
    });

    it("should return availability when plugin exists", async () => {
        const plugin = { isAvailable: jest.fn().mockResolvedValue(true) };
        const pluginManager = {
            get: jest.fn().mockReturnValue(plugin),
        };
        mockResolve.mockReturnValue(pluginManager);

        const result = await isPluginAvailable("shfmt");

        expect(result).toBe(true);
        expect(plugin.isAvailable).toHaveBeenCalled();
    });

    it("should return empty capabilities and dependencies when missing", async () => {
        const shfmt = {
            name: "shfmt",
            displayName: "Shfmt",
            version: "1.0.0",
            description: "desc",
            isAvailable: jest.fn().mockResolvedValue(true),
        };

        const pluginManager = {
            getStats: jest.fn().mockReturnValue({ total: 1, active: 0 }),
            getActivePluginNames: jest.fn().mockReturnValue([]),
            get: jest.fn((name: string) => (name === "shfmt" ? shfmt : undefined)),
        };

        mockResolve.mockReturnValue(pluginManager);

        const statuses = await getAllPluginStatus();

        expect(statuses).toHaveLength(1);
        expect(statuses[0].capabilities).toEqual([]);
        expect(statuses[0].dependencies).toEqual([]);
    });
});
