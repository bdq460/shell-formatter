/**
 * Diagnose Document Usecase Tests
 */

import { diagnoseDocument } from "../../../../src/application/usecases/diagnose-document";
import { PluginManager } from "../../../../src/domain/plugin-manager";
import { IFormatPlugin } from "../../../../src/domain/plugin-interface";
import { Diagnostic, DiagnosticSeverity, Document, PluginCheckResult } from "../../../../src/domain/types";
import { setLogger } from "../../../../src/utils/log";

// Mock dependencies
jest.mock("../../../../src/utils/di/container", () => ({
    getContainer: jest.fn().mockReturnValue({
        resolve: jest.fn(),
    }),
    ServiceNames: {
        PLUGIN_MANAGER: "pluginManager",
    },
}));

jest.mock("../../../../src/utils/performance/monitor", () => ({
    startTimer: jest.fn().mockReturnValue({
        stop: jest.fn(),
    }),
}));

jest.mock("../../../../src/config", () => ({
    PackageInfo: {
        diagnosticSource: "shell-formatter",
    },
}));

import { getContainer } from "../../../../src/utils/di/container";

describe("Diagnose Document Usecase", () => {
    const mockDocument: Document = {
        uri: "file:///test.sh",
        content: "#!/bin/bash\necho hello",
        languageId: "shellscript",
        fileName: "test.sh",
        lineCount: 2,
    };

    const mockDiagnostics: Diagnostic[] = [
        {
            range: {
                start: { line: 1, character: 0 },
                end: { line: 1, character: 10 },
            },
            message: "Quote this to prevent word splitting",
            severity: DiagnosticSeverity.Warning,
            code: "SC2046",
            source: "shellcheck",
        },
    ];

    const mockCheckResult: PluginCheckResult = {
        hasErrors: false,
        diagnostics: mockDiagnostics,
    };

    const mockPlugin: IFormatPlugin = {
        name: "shellcheck",
        displayName: "ShellCheck",
        version: "1.0.0",
        description: "Shell script analyzer",
        format: jest.fn(),
        check: jest.fn(),
        getSupportedExtensions: jest.fn().mockReturnValue([".sh", ".bash"]),
        isAvailable: jest.fn().mockResolvedValue(true),
        onActivate: jest.fn(),
        onDeactivate: jest.fn(),
    };

    let mockPluginManager: jest.Mocked<PluginManager>;

    beforeEach(() => {
        jest.clearAllMocks();

        // Set up logger
        setLogger({
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        });

        // Create mock PluginManager
        mockPluginManager = {
            getAvailablePlugins: jest.fn(),
            check: jest.fn(),
        } as unknown as jest.Mocked<PluginManager>;

        // Mock container.resolve to return mock PluginManager
        (getContainer as jest.Mock).mockReturnValue({
            resolve: jest.fn().mockReturnValue(mockPluginManager),
        });
    });

    describe("diagnoseDocument", () => {
        it("should diagnose document successfully", async () => {
            mockPluginManager.getAvailablePlugins.mockResolvedValue([mockPlugin]);
            mockPluginManager.check.mockResolvedValue(mockCheckResult);

            const result = await diagnoseDocument(mockDocument);

            expect(result).toEqual(mockDiagnostics);
            expect(mockPluginManager.getAvailablePlugins).toHaveBeenCalled();
            expect(mockPluginManager.check).toHaveBeenCalledWith(mockDocument, expect.objectContaining({
                token: undefined,
            }));
        });

        it("should return empty array when no plugins available", async () => {
            mockPluginManager.getAvailablePlugins.mockResolvedValue([]);

            const result = await diagnoseDocument(mockDocument);

            expect(result).toEqual([]);
            expect(mockPluginManager.check).not.toHaveBeenCalled();
        });

        it("should handle cancellation token", async () => {
            const mockToken = {
                isCancellationRequested: false,
                onCancellationRequested: jest.fn().mockReturnValue(undefined) as jest.Mock,
            };

            mockPluginManager.getAvailablePlugins.mockResolvedValue([mockPlugin]);
            mockPluginManager.check.mockResolvedValue(mockCheckResult);

            const result = await diagnoseDocument(mockDocument, mockToken);

            expect(result).toEqual(mockDiagnostics);
            expect(mockPluginManager.check).toHaveBeenCalledWith(mockDocument, expect.objectContaining({
                token: mockToken,
            }));
        });

        it("should handle errors gracefully", async () => {
            mockPluginManager.getAvailablePlugins.mockRejectedValue(new Error("Plugin error"));

            const result = await diagnoseDocument(mockDocument);

            expect(result).toHaveLength(1);
            expect(result[0].source).toBe("shell-formatter");
            expect(result[0].severity).toBe(0); // DiagnosticSeverity.Error
        });

        it("should merge diagnostics from multiple plugins", async () => {
            const shellcheckDiagnostics: Diagnostic[] = [
                {
                    range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } },
                    message: "Shellcheck warning",
                    severity: DiagnosticSeverity.Warning,
                },
            ];

            const shfmtDiagnostics: Diagnostic[] = [
                {
                    range: { start: { line: 1, character: 0 }, end: { line: 1, character: 5 } },
                    message: "Format issue",
                    severity: DiagnosticSeverity.Information,
                },
            ];

            const mockPlugin1: IFormatPlugin = {
                ...mockPlugin,
                name: "shellcheck",
                check: jest.fn().mockResolvedValue({ hasErrors: false, diagnostics: shellcheckDiagnostics }),
            };
            const mockPlugin2: IFormatPlugin = {
                ...mockPlugin,
                name: "shfmt",
                check: jest.fn().mockResolvedValue({ hasErrors: false, diagnostics: shfmtDiagnostics }),
            };

            mockPluginManager.getAvailablePlugins.mockResolvedValue([mockPlugin1, mockPlugin2]);
            mockPluginManager.check.mockResolvedValue({
                hasErrors: false,
                diagnostics: [...shellcheckDiagnostics, ...shfmtDiagnostics],
            });

            const result = await diagnoseDocument(mockDocument);

            expect(result).toHaveLength(2);
            expect(result[0].message).toBe("Shellcheck warning");
            expect(result[1].message).toBe("Format issue");
        });
    });
});
