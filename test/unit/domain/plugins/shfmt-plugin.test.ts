/**
 * PureShfmtPlugin Tests
 */

import {
    Document,
    PluginCheckOptions,
    PluginFormatOptions,
} from "../../../../src/domain/plugin-interface";
import { PureShfmtPlugin } from "../../../../src/domain/plugins/shfmt-plugin";

// Mock logger
jest.mock("../../../../src/utils/log", () => ({
    logger: {
        error: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
    },
}));

// Mock utils/plugin
jest.mock("../../../../src/utils/plugin", () => ({
    BasePluginBase: class {
        constructor() { }
        onActivate?: any;
        onDeactivate?: any;
        messageBus?: any;
    },
}));

describe("PureShfmtPlugin", () => {
    let plugin: PureShfmtPlugin;
    let mockTool: any;
    let mockConfig: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockTool = {
            format: jest.fn(),
            check: jest.fn(),
            isAvailable: jest.fn(),
        };

        mockConfig = {
            tabSize: 4,
            diagnosticSource: "shfmt",
            fileExtensions: [".sh", ".bash"],
        };

        plugin = new PureShfmtPlugin(mockTool, mockConfig);
        (plugin as any).messageBus = {
            subscribe: jest.fn().mockReturnValue("sub-id-1"),
            unsubscribe: jest.fn(),
        };
    });

    describe("plugin metadata", () => {
        it("should have correct name", () => {
            expect(plugin.name).toBe("shfmt");
        });

        it("should have correct display name", () => {
            expect(plugin.displayName).toBe("Shell Formatter");
        });

        it("should have version", () => {
            expect(plugin.version).toBeDefined();
        });

        it("should have description", () => {
            expect(plugin.description).toBeDefined();
        });
    });

    describe("isAvailable", () => {
        it("should return true when tool is available", async () => {
            mockTool.isAvailable.mockResolvedValue(true);

            const result = await plugin.isAvailable();
            expect(result).toBe(true);
            expect(mockTool.isAvailable).toHaveBeenCalled();
        });

        it("should return false when tool is not available", async () => {
            mockTool.isAvailable.mockResolvedValue(false);

            const result = await plugin.isAvailable();
            expect(result).toBe(false);
        });
    });

    describe("format", () => {
        let document: Document;

        beforeEach(() => {
            document = {
                uri: "test.sh",
                content: "echo hello",
                languageId: "shell",
                fileName: "test.sh",
                lineCount: 1,
            };
        });

        it("should format content successfully", async () => {
            const formattedContent = '#!/bin/bash\necho "hello"\n';
            const mockResult = {
                hasErrors: false,
                diagnostics: [],
                textEdits: [
                    {
                        range: {
                            start: { line: 0, character: 0 },
                            end: { line: 1, character: 0 },
                        },
                        newText: formattedContent,
                    },
                ],
                formattedContent,
            };

            mockTool.format.mockResolvedValue(mockResult);

            const options: PluginFormatOptions = {};
            const result = await plugin.format(document, options);

            expect(result).toEqual(mockResult);
            expect(mockTool.format).toHaveBeenCalledWith("echo hello", {
                indent: 4,
                token: undefined,
            });
        });

        it("should pass token from options", async () => {
            const mockResult = {
                hasErrors: false,
                diagnostics: [],
                textEdits: [],
            };
            mockTool.format.mockResolvedValue(mockResult);

            const options: PluginFormatOptions = {
                token: { isCancellationRequested: false, onCancellationRequested: jest.fn() },
            };

            await plugin.format(document, options);

            expect(mockTool.format).toHaveBeenCalledWith(
                "echo hello",
                expect.objectContaining({
                    token: options.token,
                }),
            );
        });

        it("should use tabSize from config", async () => {
            const mockResult = {
                hasErrors: false,
                diagnostics: [],
                textEdits: [],
            };
            mockTool.format.mockResolvedValue(mockResult);

            await plugin.format(document, {});

            expect(mockTool.format).toHaveBeenCalledWith(
                "echo hello",
                expect.objectContaining({
                    indent: 4,
                }),
            );
        });

        it("should handle format errors", async () => {
            const error = new Error("Format failed");
            mockTool.format.mockRejectedValue(error);

            const result = await plugin.format(document, {});

            expect(result.hasErrors).toBe(true);
            expect(result.diagnostics).toHaveLength(1);
            expect(result.diagnostics[0].message).toBe("Error: Format failed");
        });

        it("should log format errors", async () => {
            const { logger } = require("../../../../src/utils/log");
            mockTool.format.mockRejectedValue(new Error("Test error"));

            await plugin.format(document, {});

            expect(logger.error).toHaveBeenCalledWith(
                expect.stringContaining("Test error"),
            );
        });

        it("should handle errors without message", async () => {
            mockTool.format.mockRejectedValue(null);

            const result = await plugin.format(document, {});

            expect(result.hasErrors).toBe(true);
        });
    });

    describe("check", () => {
        let document: Document;

        beforeEach(() => {
            document = {
                uri: "test.sh",
                content: "echo hello",
                languageId: "shell",
                fileName: "test.sh",
                lineCount: 1,
            };
        });

        it("should check content successfully", async () => {
            const mockResult = {
                hasErrors: false,
                diagnostics: [],
            };
            mockTool.check.mockResolvedValue(mockResult);

            const options: PluginCheckOptions = {};
            const result = await plugin.check(document, options);

            expect(result).toEqual(mockResult);
            expect(mockTool.check).toHaveBeenCalledWith("echo hello", {
                token: undefined,
            });
        });

        it("should pass token from options", async () => {
            const mockResult = {
                hasErrors: false,
                diagnostics: [],
            };
            mockTool.check.mockResolvedValue(mockResult);

            const options: PluginCheckOptions = {
                token: { isCancellationRequested: false, onCancellationRequested: jest.fn() },
            };

            await plugin.check(document, options);

            expect(mockTool.check).toHaveBeenCalledWith(
                "echo hello",
                expect.objectContaining({
                    token: options.token,
                }),
            );
        });

        it("should handle check errors", async () => {
            const error = new Error("Check failed");
            mockTool.check.mockRejectedValue(error);

            const result = await plugin.check(document, {});

            expect(result.hasErrors).toBe(true);
            expect(result.diagnostics).toHaveLength(1);
            expect(result.diagnostics[0].message).toBe("Error: Check failed");
        });

        it("should log check errors", async () => {
            const { logger } = require("../../../../src/utils/log");
            mockTool.check.mockRejectedValue(new Error("Test error"));

            await plugin.check(document, {});

            expect(logger.error).toHaveBeenCalledWith(
                expect.stringContaining("Test error"),
            );
        });
    });

    describe("getSupportedExtensions", () => {
        it("should return file extensions from config", () => {
            const extensions = plugin.getSupportedExtensions();
            expect(extensions).toEqual([".sh", ".bash"]);
        });
    });

    describe("getDiagnosticSource", () => {
        it("should return diagnostic source from config", () => {
            const source = plugin.getDiagnosticSource();
            expect(source).toBe("shfmt");
        });
    });

    describe("getDependencies", () => {
        it("should return empty array (no dependencies)", () => {
            const dependencies = plugin.getDependencies();
            expect(dependencies).toEqual([]);
        });
    });

    describe("getCapabilities", () => {
        it("should return capabilities array", () => {
            const capabilities = plugin.getCapabilities();

            expect(capabilities).toContain("format:shfmt");
            expect(capabilities).toContain("check:shfmt");
            expect(capabilities).toContain("extensions:.sh,.bash");
        });
    });

    describe("onActivate", () => {
        it("should subscribe to config change messages", async () => {
            await plugin.onActivate();

            expect((plugin as any).messageBus.subscribe).toHaveBeenCalledWith(
                "config:change",
                expect.any(Function),
            );
        });

        it("should save subscription ID", async () => {
            await plugin.onActivate();

            expect((plugin as any).configChangeSubId).toBe("sub-id-1");
        });

        it("should update config on indent change", async () => {
            await plugin.onActivate();

            const subscribeCallback = (plugin as any).messageBus.subscribe.mock.calls[0][1];

            subscribeCallback({
                payload: { indent: 2 },
            });

            expect((plugin as any).pluginConfig.tabSize).toBe(2);
        });

        it("should not update config for other properties", async () => {
            await plugin.onActivate();

            const subscribeCallback = (plugin as any).messageBus.subscribe.mock.calls[0][1];

            subscribeCallback({
                payload: { otherProp: "value" },
            });

            expect((plugin as any).pluginConfig.tabSize).toBe(4);
        });
    });

    describe("onDeactivate", () => {
        it("should unsubscribe from config change messages", async () => {
            await plugin.onActivate();
            await plugin.onDeactivate();

            expect((plugin as any).messageBus.unsubscribe).toHaveBeenCalledWith(
                "sub-id-1",
            );
        });

        it("should clear subscription ID", async () => {
            await plugin.onActivate();
            await plugin.onDeactivate();

            expect((plugin as any).configChangeSubId).toBeUndefined();
        });

        it("should handle unsubscribe when no subscription exists", async () => {
            (plugin as any).configChangeSubId = undefined;

            await expect(plugin.onDeactivate()).resolves.not.toThrow();
        });
    });
});
