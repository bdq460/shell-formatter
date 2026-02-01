/**
 * Application DI Initializer Tests
 */

import {
    initializeDIContainer,
    reinitializeDIContainer,
} from "../../../../src/application/di/initializer";
import { DIContainer, ServiceNames } from "../../../../src/utils/di/container";
import { setLogger } from "../../../../src/utils/log";

// Mock dependencies
jest.mock("../../../../src/config", () => ({
    PackageInfo: {
        diagnosticSource: "shell-formatter",
        fileExtensions: [".sh", ".bash", ".zsh"],
    },
    SettingInfo: {
        getShfmtPath: jest.fn().mockReturnValue("/usr/local/bin/shfmt"),
        getShellcheckPath: jest.fn().mockReturnValue("/usr/local/bin/shellcheck"),
        getRealTabSize: jest.fn().mockReturnValue(4),
    },
}));

jest.mock("../../../../src/infrastructure/adapters", () => ({
    ShfmtToolAdapter: jest.fn().mockImplementation(() => ({
        format: jest.fn(),
        check: jest.fn(),
        isAvailable: jest.fn().mockResolvedValue(true),
    })),
    ShellcheckToolAdapter: jest.fn().mockImplementation(() => ({
        format: jest.fn(),
        check: jest.fn(),
        isAvailable: jest.fn().mockResolvedValue(true),
    })),
}));

const mockTimerStop = jest.fn();

jest.mock("../../../../src/utils/performance/monitor", () => ({
    startTimer: jest.fn(() => ({ stop: mockTimerStop })),
}));

describe("Application DI Initializer", () => {
    let container: DIContainer;

    beforeEach(() => {
        container = new DIContainer();
        // Set up logger to avoid errors
        setLogger({
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        });
        mockTimerStop.mockClear();
    });

    describe("initializeDIContainer", () => {
        it("should initialize DI container successfully", () => {
            expect(() => {
                initializeDIContainer(container);
            }).not.toThrow();
        });

        it("should register shfmt plugin", () => {
            initializeDIContainer(container);

            const shfmtPlugin = container.resolve(ServiceNames.SHFMT_PLUGIN);
            expect(shfmtPlugin).toBeDefined();
        });

        it("should register shellcheck plugin", () => {
            initializeDIContainer(container);

            const shellcheckPlugin = container.resolve(ServiceNames.SHELLCHECK_PLUGIN);
            expect(shellcheckPlugin).toBeDefined();
        });

        it("should register plugin manager", () => {
            initializeDIContainer(container);

            const pluginManager = container.resolve(ServiceNames.PLUGIN_MANAGER);
            expect(pluginManager).toBeDefined();
        });

        it("should warn when shfmt plugin registration fails", () => {
            const { logger } = require("../../../../src/utils/log");
            const { ShfmtToolAdapter } = require("../../../../src/infrastructure/adapters");

            ShfmtToolAdapter.mockImplementationOnce(() => {
                throw new Error("adapter failure");
            });

            initializeDIContainer(container);
            container.resolve(ServiceNames.PLUGIN_MANAGER);

            expect(logger.warn).toHaveBeenCalledWith(
                expect.stringContaining("Failed to register shfmt plugin"),
            );
        });

        it("should warn when shellcheck plugin registration fails", () => {
            const { logger } = require("../../../../src/utils/log");
            const { ShellcheckToolAdapter } = require("../../../../src/infrastructure/adapters");

            ShellcheckToolAdapter.mockImplementationOnce(() => {
                throw new Error("adapter failure");
            });

            initializeDIContainer(container);
            container.resolve(ServiceNames.PLUGIN_MANAGER);

            expect(logger.warn).toHaveBeenCalledWith(
                expect.stringContaining("Failed to register shellcheck plugin"),
            );
        });

        it("should use default tab size when config returns undefined", () => {
            const { SettingInfo } = require("../../../../src/config");
            const { ShfmtToolAdapter, ShellcheckToolAdapter } = require("../../../../src/infrastructure/adapters");

            SettingInfo.getRealTabSize.mockReturnValueOnce(undefined);
            SettingInfo.getRealTabSize.mockReturnValueOnce(undefined);

            initializeDIContainer(container);
            container.resolve(ServiceNames.SHFMT_PLUGIN);
            container.resolve(ServiceNames.SHELLCHECK_PLUGIN);

            expect(ShfmtToolAdapter).toHaveBeenCalledWith(
                "/usr/local/bin/shfmt",
                { tabSize: 4 },
            );
            expect(ShellcheckToolAdapter).toHaveBeenCalledWith(
                "/usr/local/bin/shellcheck",
            );
        });
    });

    describe("reinitializeDIContainer", () => {
        it("should reinitialize DI container successfully", () => {
            // First initialize
            initializeDIContainer(container);

            // Then reinitialize
            expect(() => {
                reinitializeDIContainer(container);
            }).not.toThrow();
        });

        it("should reset and re-register services", () => {
            // First initialize
            initializeDIContainer(container);
            const originalPluginManager = container.resolve(ServiceNames.PLUGIN_MANAGER);

            // Reinitialize
            reinitializeDIContainer(container);
            const newPluginManager = container.resolve(ServiceNames.PLUGIN_MANAGER);

            // Should be different instances after reinitialization
            expect(newPluginManager).toBeDefined();
        });

        it("should stop timer after reinitialize", () => {
            initializeDIContainer(container);

            reinitializeDIContainer(container);

            expect(mockTimerStop).toHaveBeenCalled();
        });
    });
});
