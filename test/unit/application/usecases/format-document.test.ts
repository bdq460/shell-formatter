/**
 * Format Document Usecase Tests
 */

import { formatDocument } from "../../../../src/application/usecases/format-document";
import { PluginManager } from "../../../../src/domain/plugin-manager";
import { IFormatPlugin } from "../../../../src/domain/plugin-interface";
import { Document, PluginFormatResult, TextEdit } from "../../../../src/domain/types";
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

import { getContainer } from "../../../../src/utils/di/container";

describe("Format Document Usecase", () => {
    const mockDocument: Document = {
        uri: "file:///test.sh",
        content: "#!/bin/bash\necho hello",
        languageId: "shellscript",
        fileName: "test.sh",
        lineCount: 2,
    };

    const mockTextEdits: TextEdit[] = [
        {
            range: {
                start: { line: 1, character: 0 },
                end: { line: 1, character: 10 },
            },
            newText: "echo \"hello\"",
        },
    ];

    const mockFormatResult: PluginFormatResult = {
        hasErrors: false,
        diagnostics: [],
        textEdits: mockTextEdits,
    };

    const mockPlugin: IFormatPlugin = {
        name: "shfmt",
        displayName: "shfmt",
        version: "1.0.0",
        description: "Shell formatter",
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
            format: jest.fn(),
        } as unknown as jest.Mocked<PluginManager>;

        // Mock container.resolve to return mock PluginManager
        (getContainer as jest.Mock).mockReturnValue({
            resolve: jest.fn().mockReturnValue(mockPluginManager),
        });
    });

    describe("formatDocument", () => {
        it("should format document successfully", async () => {
            mockPluginManager.getAvailablePlugins.mockResolvedValue([mockPlugin]);
            mockPluginManager.format.mockResolvedValue(mockFormatResult);

            const result = await formatDocument(mockDocument);

            expect(result).toEqual(mockTextEdits);
            expect(mockPluginManager.getAvailablePlugins).toHaveBeenCalled();
            expect(mockPluginManager.format).toHaveBeenCalledWith(mockDocument, expect.objectContaining({
                token: undefined,
            }));
        });

        it("should return empty array when no plugins available", async () => {
            mockPluginManager.getAvailablePlugins.mockResolvedValue([]);

            const result = await formatDocument(mockDocument);

            expect(result).toEqual([]);
            expect(mockPluginManager.format).not.toHaveBeenCalled();
        });

        it("should handle cancellation token", async () => {
            const mockToken = {
                isCancellationRequested: false,
                onCancellationRequested: jest.fn().mockReturnValue(undefined) as jest.Mock,
            };

            mockPluginManager.getAvailablePlugins.mockResolvedValue([mockPlugin]);
            mockPluginManager.format.mockResolvedValue(mockFormatResult);

            const result = await formatDocument(mockDocument, { token: mockToken });

            expect(result).toEqual(mockTextEdits);
            expect(mockPluginManager.format).toHaveBeenCalledWith(mockDocument, expect.objectContaining({
                token: mockToken,
            }));
        });

        it("should handle errors gracefully", async () => {
            mockPluginManager.getAvailablePlugins.mockRejectedValue(new Error("Plugin error"));

            const result = await formatDocument(mockDocument);

            expect(result).toEqual([]);
        });

        it("should return empty array when result has no textEdits", async () => {
            mockPluginManager.getAvailablePlugins.mockResolvedValue([mockPlugin]);
            mockPluginManager.format.mockResolvedValue({
                hasErrors: false,
                diagnostics: [],
                textEdits: undefined,
            } as unknown as PluginFormatResult);

            const result = await formatDocument(mockDocument);

            expect(result).toEqual([]);
        });
    });
});
