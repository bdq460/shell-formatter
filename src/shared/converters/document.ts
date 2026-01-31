/**
 * 文档类型转换器
 *
 * 职责：
 * - 将 VSCode TextDocument 转换为领域 Document
 * - 将领域 Document 转换为 VSCode TextDocument（如需要）
 * - 提供类型转换的便捷方法
 *
 * 设计原则：
 * - 领域层使用 Document 类型，不依赖 VSCode
 * - 转换器负责与 VSCode 类型的转换
 * - 保持领域层的纯净性
 */

import * as vscode from "vscode";
import {
    Diagnostic,
    DiagnosticSeverity,
    Document,
    Position,
    Range,
    TextEdit,
} from "../../domain/types";

/**
 * 将 VSCode TextDocument 转换为领域 Document
 * @param document VSCode 文档对象
 * @returns 领域文档对象
 */
export function toDomainDocument(document: vscode.TextDocument): Document {
    return DocumentConverter.toDocument(document);
}

/**
 * 文档类型转换器
 */
export class DocumentConverter {
    /**
     * 将 VSCode TextDocument 转换为领域 Document
     * @param document VSCode 文档对象
     * @returns 领域文档对象
     */
    static toDocument(document: vscode.TextDocument): Document {
        return {
            uri: document.uri.toString(),
            content: document.getText(),
            languageId: document.languageId,
            fileName: document.fileName,
            lineCount: document.lineCount,
        };
    }

    /**
     * 将 VSCode Position 转换为领域 Position
     * @param position VSCode 位置对象
     * @returns 领域位置对象
     */
    static toPosition(position: vscode.Position): Position {
        return {
            line: position.line,
            character: position.character,
        };
    }

    /**
     * 将领域 Position 转换为 VSCode Position
     * @param position 领域位置对象
     * @returns VSCode 位置对象
     */
    static fromPosition(position: Position): vscode.Position {
        return new vscode.Position(position.line, position.character);
    }

    /**
     * 将 VSCode Range 转换为领域 Range
     * @param range VSCode 范围对象
     * @returns 领域范围对象
     */
    static toRange(range: vscode.Range): Range {
        return {
            start: this.toPosition(range.start),
            end: this.toPosition(range.end),
        };
    }

    /**
     * 将领域 Range 转换为 VSCode Range
     * @param range 领域范围对象
     * @returns VSCode 范围对象
     */
    static fromRange(range: Range): vscode.Range {
        return new vscode.Range(
            this.fromPosition(range.start),
            this.fromPosition(range.end),
        );
    }

    /**
     * 将 VSCode TextEdit 转换为领域 TextEdit
     * @param edit VSCode 文本编辑对象
     * @returns 领域文本编辑对象
     */
    static toTextEdit(edit: vscode.TextEdit): TextEdit {
        return {
            range: this.toRange(edit.range),
            newText: edit.newText,
        };
    }

    /**
     * 将领域 TextEdit 转换为 VSCode TextEdit
     * @param edit 领域文本编辑对象
     * @returns VSCode 文本编辑对象
     */
    static fromTextEdit(edit: TextEdit): vscode.TextEdit {
        return vscode.TextEdit.replace(
            this.fromRange(edit.range),
            edit.newText,
        );
    }

    /**
     * 将 VSCode DiagnosticSeverity 转换为领域 DiagnosticSeverity
     * @param severity VSCode 严重级别
     * @returns 领域严重级别
     */
    static toDiagnosticSeverity(
        severity: vscode.DiagnosticSeverity,
    ): DiagnosticSeverity {
        switch (severity) {
            case vscode.DiagnosticSeverity.Error:
                return DiagnosticSeverity.Error;
            case vscode.DiagnosticSeverity.Warning:
                return DiagnosticSeverity.Warning;
            case vscode.DiagnosticSeverity.Information:
                return DiagnosticSeverity.Information;
            case vscode.DiagnosticSeverity.Hint:
                return DiagnosticSeverity.Hint;
            default:
                return DiagnosticSeverity.Error;
        }
    }

    /**
     * 将领域 DiagnosticSeverity 转换为 VSCode DiagnosticSeverity
     * @param severity 领域严重级别
     * @returns VSCode 严重级别
     */
    static fromDiagnosticSeverity(
        severity: DiagnosticSeverity,
    ): vscode.DiagnosticSeverity {
        switch (severity) {
            case DiagnosticSeverity.Error:
                return vscode.DiagnosticSeverity.Error;
            case DiagnosticSeverity.Warning:
                return vscode.DiagnosticSeverity.Warning;
            case DiagnosticSeverity.Information:
                return vscode.DiagnosticSeverity.Information;
            case DiagnosticSeverity.Hint:
                return vscode.DiagnosticSeverity.Hint;
            default:
                return vscode.DiagnosticSeverity.Error;
        }
    }

    /**
     * 将 VSCode Diagnostic 转换为领域 Diagnostic
     * @param diagnostic VSCode 诊断对象
     * @returns 领域诊断对象
     */
    static toDiagnostic(diagnostic: vscode.Diagnostic): Diagnostic {
        // 处理 code 可能是复杂对象的情况
        let code: string | number | undefined;
        if (diagnostic.code !== undefined) {
            if (typeof diagnostic.code === 'string' || typeof diagnostic.code === 'number') {
                code = diagnostic.code;
            } else if (typeof diagnostic.code === 'object' && diagnostic.code !== null) {
                // 处理 { value: string | number; target: Uri; } 类型
                const codeValue = (diagnostic.code as any).value;
                if (typeof codeValue === 'string' || typeof codeValue === 'number') {
                    code = codeValue;
                }
            }
        }

        return {
            range: this.toRange(diagnostic.range),
            message: diagnostic.message,
            severity: this.toDiagnosticSeverity(diagnostic.severity),
            code,
            source: diagnostic.source,
        };
    }

    /**
     * 将领域 Diagnostic 转换为 VSCode Diagnostic
     * @param diagnostic 领域诊断对象
     * @returns VSCode 诊断对象
     */
    static fromDiagnostic(diagnostic: Diagnostic): vscode.Diagnostic {
        const vscodeDiagnostic = new vscode.Diagnostic(
            this.fromRange(diagnostic.range),
            diagnostic.message,
            this.fromDiagnosticSeverity(diagnostic.severity),
        );
        if (diagnostic.code !== undefined) {
            // 只接受 string 或 number 类型的 code
            if (typeof diagnostic.code === 'string' || typeof diagnostic.code === 'number') {
                vscodeDiagnostic.code = diagnostic.code;
            }
            // 如果是对象，尝试提取 value 属性
            else if (typeof diagnostic.code === 'object' && diagnostic.code !== null) {
                const codeValue = (diagnostic.code as any).value;
                if (typeof codeValue === 'string' || typeof codeValue === 'number') {
                    vscodeDiagnostic.code = codeValue;
                }
            }
        }
        if (diagnostic.source !== undefined) {
            vscodeDiagnostic.source = diagnostic.source;
        }
        return vscodeDiagnostic;
    }

    /**
     * 批量转换 VSCode Diagnostic 数组为领域 Diagnostic 数组
     * @param diagnostics VSCode 诊断数组
     * @returns 领域诊断数组
     */
    static toDiagnostics(diagnostics: vscode.Diagnostic[]): Diagnostic[] {
        return diagnostics.map((d) => this.toDiagnostic(d));
    }

    /**
     * 批量转换领域 Diagnostic 数组为 VSCode Diagnostic 数组
     * @param diagnostics 领域诊断数组
     * @returns VSCode 诊断数组
     */
    static fromDiagnostics(diagnostics: Diagnostic[]): vscode.Diagnostic[] {
        return diagnostics.map((d) => this.fromDiagnostic(d));
    }

    /**
     * 批量转换 VSCode TextEdit 数组为领域 TextEdit 数组
     * @param edits VSCode 文本编辑数组
     * @returns 领域文本编辑数组
     */
    static toTextEdits(edits: vscode.TextEdit[]): TextEdit[] {
        return edits.map((e) => this.toTextEdit(e));
    }

    /**
     * 批量转换领域 TextEdit 数组为 VSCode TextEdit 数组
     * @param edits 领域文本编辑数组
     * @returns VSCode 文本编辑数组
     */
    static fromTextEdits(edits: TextEdit[]): vscode.TextEdit[] {
        return edits.map((e) => this.fromTextEdit(e));
    }
}
