/**
 * Domain Base Plugin Tests
 */

import {
    Document,
    PluginCheckOptions,
    PluginFormatOptions,
} from "../../../../src/domain/plugin-interface";
import { BasePlugin } from "../../../../src/domain/plugins/base-plugin";

// Mock logger
jest.mock("../../../../src/utils/log", () => ({
    logger: {
        error: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
    },
}));

// Mock dependencies
jest.mock("../../../../src/utils/plugin", () => ({
    BasePluginBase: jest.fn().mockImplementation(() => ({
        name: "",
        version: "",
        description: "",
    })),
}));

describe("BasePlugin", () => {
    let mockConfig: any;
    let mockTool: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockConfig = {
            tabSize: 4,
            diagnosticSource: "test-plugin",
            fileExtensions: [".sh", ".bash"],
        };

        mockTool = {
            format: jest.fn(),
            check: jest.fn(),
            isAvailable: jest.fn(),
        };
    });

    describe("getDiagnosticSource", () => {
        it("should return diagnostic source from config", () => {
            const plugin = createTestPlugin(mockConfig);
            expect(plugin.getDiagnosticSource()).toBe("test-plugin");
        });
    });

    describe("getSupportedExtensions", () => {
        it("should return file extensions from config", () => {
            const plugin = createTestPlugin(mockConfig);
            expect(plugin.getSupportedExtensions()).toEqual([".sh", ".bash"]);
        });
    });

    describe("getDependencies", () => {
        it("should return empty array by default", () => {
            const plugin = createTestPlugin(mockConfig);
            expect(plugin.getDependencies()).toEqual([]);
        });
    });

    describe("getCapabilities", () => {
        it("should return capabilities array", () => {
            const plugin = createTestPlugin({
                ...mockConfig,
                diagnosticSource: "formatter",
            });
            const capabilities = plugin.getCapabilities();

            expect(capabilities).toContain("format:test-plugin");
            expect(capabilities).toContain("check:test-plugin");
            expect(capabilities).toContain("extensions:.sh,.bash");
        });
    });

    describe("handleCheckError", () => {
        it("should return PluginCheckResult with error diagnostic", () => {
            const plugin = createTestPlugin(mockConfig);
            const document: Document = {
                uri: "test.sh",
                content: "echo hello",
                languageId: "shell",
                fileName: "test.sh",
                lineCount: 1,
            };

            const result = plugin["handleCheckError"](document, new Error("Test error"));

            expect(result.hasErrors).toBe(true);
            expect(result.diagnostics).toHaveLength(1);
            expect(result.diagnostics[0].message).toBe("Error: Test error");
            expect(result.diagnostics[0].severity).toBe(0); // Error
            expect(result.diagnostics[0].source).toBe("test-plugin");
            expect(result.diagnostics[0].code).toBe("execution-error");
        });

        it("should log error message", () => {
            const plugin = createTestPlugin(mockConfig);
            const { logger } = require("../../../../src/utils/log");
            const document: Document = {
                uri: "test.sh",
                content: "echo hello",
                languageId: "shell",
                fileName: "test.sh",
                lineCount: 1,
            };

            plugin["handleCheckError"](document, new Error("Test error"));

            expect(logger.error).toHaveBeenCalledWith(
                expect.stringContaining("Test error"),
            );
        });

        it("should handle error objects without message", () => {
            const plugin = createTestPlugin(mockConfig);
            const document: Document = {
                uri: "test.sh",
                content: "echo hello",
                languageId: "shell",
                fileName: "test.sh",
                lineCount: 1,
            };

            const result = plugin["handleCheckError"](document, { some: "object" });

            expect(result.hasErrors).toBe(true);
            expect(result.diagnostics[0].message).toContain("[object Object]");
        });
    });

    describe("handleFormatError", () => {
        it("should return PluginFormatResult with error diagnostic", () => {
            const plugin = createTestPlugin(mockConfig);
            const document: Document = {
                uri: "test.sh",
                content: "echo hello",
                languageId: "shell",
                fileName: "test.sh",
                lineCount: 1,
            };

            const result = plugin["handleFormatError"](document, new Error("Test error"));

            expect(result.hasErrors).toBe(true);
            expect(result.diagnostics).toHaveLength(1);
            expect(result.diagnostics[0].message).toBe("Error: Test error");
            expect(result.textEdits).toEqual([]);
        });

        it("should log error message", () => {
            const plugin = createTestPlugin(mockConfig);
            const { logger } = require("../../../../src/utils/log");
            const document: Document = {
                uri: "test.sh",
                content: "echo hello",
                languageId: "shell",
                fileName: "test.sh",
                lineCount: 1,
            };

            plugin["handleFormatError"](document, new Error("Test error"));

            expect(logger.error).toHaveBeenCalled();
        });
    });

    describe("createFormatResult", () => {
        it("should create TextEdit when content changes and no errors", () => {
            const plugin = createTestPlugin(mockConfig);
            const document: Document = {
                uri: "test.sh",
                content: "echo hello",
                languageId: "shell",
                fileName: "test.sh",
                lineCount: 1,
            };

            const result = plugin["createFormatResult"](
                'echo "hello"',
                document,
                [],
            );

            expect(result.hasErrors).toBe(false);
            expect(result.diagnostics).toEqual([]);
            expect(result.textEdits).toHaveLength(1);
            expect(result.textEdits[0].newText).toBe('echo "hello"');
            expect(result.textEdits[0].range.start).toEqual({ line: 0, character: 0 });
            expect(result.textEdits[0].range.end).toEqual({
                line: 1,
                character: 0,
            });
        });

        it("should not create TextEdit when content is same", () => {
            const plugin = createTestPlugin(mockConfig);
            const document: Document = {
                uri: "test.sh",
                content: "echo hello",
                languageId: "shell",
                fileName: "test.sh",
                lineCount: 1,
            };

            const result = plugin["createFormatResult"]("echo hello", document, []);

            expect(result.textEdits).toEqual([]);
        });

        it("should not create TextEdit when content is undefined", () => {
            const plugin = createTestPlugin(mockConfig);
            const document: Document = {
                uri: "test.sh",
                content: "echo hello",
                languageId: "shell",
                fileName: "test.sh",
                lineCount: 1,
            };

            const result = plugin["createFormatResult"](undefined, document, []);

            expect(result.textEdits).toEqual([]);
        });

        it("should not create TextEdit when has errors", () => {
            const plugin = createTestPlugin(mockConfig);
            const { DiagnosticSeverity } = require("../../../../src/domain/types");
            const document: Document = {
                uri: "test.sh",
                content: "echo hello",
                languageId: "shell",
                fileName: "test.sh",
                lineCount: 1,
            };

            const result = plugin["createFormatResult"](
                'echo "hello"',
                document,
                [
                    {
                        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } },
                        message: "Error",
                        severity: DiagnosticSeverity.Error,
                    },
                ],
            );

            expect(result.hasErrors).toBe(true);
            expect(result.textEdits).toEqual([]);
        });

        it("should create TextEdit with diagnostics (warnings)", () => {
            const plugin = createTestPlugin(mockConfig);
            const { DiagnosticSeverity } = require("../../../../src/domain/types");
            const document: Document = {
                uri: "test.sh",
                content: "echo hello",
                languageId: "shell",
                fileName: "test.sh",
                lineCount: 1,
            };

            const result = plugin["createFormatResult"](
                'echo "hello"',
                document,
                [
                    {
                        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } },
                        message: "Warning",
                        severity: DiagnosticSeverity.Warning,
                    },
                ],
            );

            expect(result.hasErrors).toBe(false); // Warnings are not errors
            expect(result.textEdits).toHaveLength(1);
        });

        it("should handle multi-line document", () => {
            const plugin = createTestPlugin(mockConfig);
            const document: Document = {
                uri: "test.sh",
                content: "line1\nline2\nline3",
                languageId: "shell",
                fileName: "test.sh",
                lineCount: 3,
            };

            const result = plugin["createFormatResult"]("line1\nline2\nline3\n", document, []);

            expect(result.textEdits[0].range.end).toEqual({
                line: 3,
                character: 0,
            });
        });
    });

    describe("abstract methods", () => {
        it("should require check method to be implemented", () => {
            const plugin = createTestPlugin(mockConfig);
            const document: Document = {
                uri: "test.sh",
                content: "echo hello",
                languageId: "shell",
                fileName: "test.sh",
                lineCount: 1,
            };

            expect(plugin.check).toBeDefined();
        });

        it("should require format method to be optional", () => {
            const plugin = createTestPlugin(mockConfig);
            expect(plugin.format).toBeDefined();
        });

        it("should require isAvailable method to be implemented", () => {
            const plugin = createTestPlugin(mockConfig);
            expect(plugin.isAvailable).toBeDefined();
        });

        it("should require pluginConfig to be defined in subclass", () => {
            const plugin = createTestPlugin(mockConfig);
            expect(plugin["pluginConfig"]).toBeDefined();
        });
    });
});

// Helper function to create test plugin instance
function createTestPlugin(config: any) {
    class TestPlugin extends BasePlugin {
        name = "test-plugin";
        displayName = "Test Plugin";
        version = "1.0.0";
        description = "A test plugin";

        protected pluginConfig = config;

        async isAvailable(): Promise<boolean> {
            return true;
        }

        async check(document: Document, options: PluginCheckOptions) {
            return { hasErrors: false, diagnostics: [] };
        }

        async format?(document: Document, options: PluginFormatOptions) {
            return {
                hasErrors: false,
                diagnostics: [],
                textEdits: [],
            };
        }
    }

    return new TestPlugin();
}
