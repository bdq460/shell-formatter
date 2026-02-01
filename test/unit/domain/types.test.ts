/**
 * Domain Types Tests
 */

import {
    DiagnosticSeverity,
    Document,
    Position,
    Range,
    TextEdit,
    Diagnostic,
    PluginFormatOptions,
    PluginCheckOptions,
    PluginFormatResult,
    PluginCheckResult,
} from "../../../src/domain/types";

describe("Domain Types", () => {
    describe("DiagnosticSeverity", () => {
        it("should have correct enum values", () => {
            expect(DiagnosticSeverity.Error).toBe(0);
            expect(DiagnosticSeverity.Warning).toBe(1);
            expect(DiagnosticSeverity.Information).toBe(2);
            expect(DiagnosticSeverity.Hint).toBe(3);
        });
    });

    describe("Document interface", () => {
        it("should create valid document object", () => {
            const document: Document = {
                uri: "file:///test.sh",
                content: "#!/bin/bash\necho hello",
                languageId: "shellscript",
                fileName: "test.sh",
                lineCount: 2,
            };

            expect(document.uri).toBe("file:///test.sh");
            expect(document.content).toBe("#!/bin/bash\necho hello");
            expect(document.languageId).toBe("shellscript");
            expect(document.fileName).toBe("test.sh");
            expect(document.lineCount).toBe(2);
        });
    });

    describe("Position interface", () => {
        it("should create valid position object", () => {
            const position: Position = {
                line: 10,
                character: 5,
            };

            expect(position.line).toBe(10);
            expect(position.character).toBe(5);
        });
    });

    describe("Range interface", () => {
        it("should create valid range object", () => {
            const range: Range = {
                start: { line: 0, character: 0 },
                end: { line: 0, character: 10 },
            };

            expect(range.start.line).toBe(0);
            expect(range.start.character).toBe(0);
            expect(range.end.line).toBe(0);
            expect(range.end.character).toBe(10);
        });
    });

    describe("TextEdit interface", () => {
        it("should create valid text edit object", () => {
            const textEdit: TextEdit = {
                range: {
                    start: { line: 0, character: 0 },
                    end: { line: 0, character: 5 },
                },
                newText: "replacement",
            };

            expect(textEdit.newText).toBe("replacement");
            expect(textEdit.range.start.line).toBe(0);
        });
    });

    describe("Diagnostic interface", () => {
        it("should create valid diagnostic object", () => {
            const diagnostic: Diagnostic = {
                range: {
                    start: { line: 1, character: 0 },
                    end: { line: 1, character: 10 },
                },
                message: "Test error message",
                severity: DiagnosticSeverity.Error,
                code: "SC1000",
                source: "shellcheck",
            };

            expect(diagnostic.message).toBe("Test error message");
            expect(diagnostic.severity).toBe(DiagnosticSeverity.Error);
            expect(diagnostic.code).toBe("SC1000");
            expect(diagnostic.source).toBe("shellcheck");
        });

        it("should allow optional code and source", () => {
            const diagnostic: Diagnostic = {
                range: {
                    start: { line: 0, character: 0 },
                    end: { line: 0, character: 1 },
                },
                message: "Warning",
                severity: DiagnosticSeverity.Warning,
            };

            expect(diagnostic.code).toBeUndefined();
            expect(diagnostic.source).toBeUndefined();
        });
    });

    describe("PluginFormatOptions interface", () => {
        it("should create format options with token", () => {
            const options: PluginFormatOptions = {
                token: {
                    isCancellationRequested: false,
                    onCancellationRequested: jest.fn(),
                },
                timeout: 5000,
            };

            expect(options.token?.isCancellationRequested).toBe(false);
            expect(options.timeout).toBe(5000);
        });

        it("should create empty format options", () => {
            const options: PluginFormatOptions = {};
            expect(options).toBeDefined();
        });
    });

    describe("PluginCheckOptions interface", () => {
        it("should create check options with timeout", () => {
            const options: PluginCheckOptions = {
                timeout: 10000,
            };

            expect(options.timeout).toBe(10000);
        });
    });

    describe("PluginFormatResult interface", () => {
        it("should create valid format result", () => {
            const result: PluginFormatResult = {
                hasErrors: false,
                diagnostics: [],
                formattedContent: "formatted text",
                textEdits: [
                    {
                        range: {
                            start: { line: 0, character: 0 },
                            end: { line: 0, character: 10 },
                        },
                        newText: "formatted",
                    },
                ],
            };

            expect(result.hasErrors).toBe(false);
            expect(result.diagnostics).toHaveLength(0);
            expect(result.formattedContent).toBe("formatted text");
            expect(result.textEdits).toHaveLength(1);
        });
    });

    describe("PluginCheckResult interface", () => {
        it("should create valid check result", () => {
            const result: PluginCheckResult = {
                hasErrors: true,
                diagnostics: [
                    {
                        range: {
                            start: { line: 0, character: 0 },
                            end: { line: 0, character: 5 },
                        },
                        message: "Error found",
                        severity: DiagnosticSeverity.Error,
                    },
                ],
            };

            expect(result.hasErrors).toBe(true);
            expect(result.diagnostics).toHaveLength(1);
        });
    });
});
