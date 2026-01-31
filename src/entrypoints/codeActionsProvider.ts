/**
 * Code Actions 提供者
 *
 * 职责：注册 VSCode Code Actions 提供者，处理快速修复
 */

import * as vscode from "vscode";
import { PackageInfo } from "../config";
import { logger } from "../utils/log";
import {
    startTimer,
    PERFORMANCE_METRICS,
} from "../application/services/performance-service";

/**
 * ShellFormat Code Action 提供者
 *
 * @param diagnosticCollection VSCode 诊断集合
 */
export class ShellFormatCodeActionProvider
    implements vscode.CodeActionProvider {
    constructor(private diagnosticCollection: vscode.DiagnosticCollection) { }
    /**
     * 提供 Code Actions
     * provideCodeActions 的调用机制
     * 触发时机
     * VS Code 会在以下情况调用 provideCodeActions：
     * 1. 右键点击代码 → 显示上下文菜单
     * 2. 点击灯泡图标 💡 → 显示快速修复选项
     * 3. 按 Cmd+. / Ctrl+. → 显示快速修复面板
     * 4. 保存文件时（如果配置了 editor.codeActionsOnSave）
     * 5. 编辑器焦点变化时（VS Code 可能会预先获取）
     */
    public provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range | vscode.Selection,
        context: vscode.CodeActionContext,
        _token: vscode.CancellationToken,
    ): vscode.ProviderResult<(vscode.CodeAction | vscode.Command)[]> {
        const timer = startTimer(
            PERFORMANCE_METRICS.PROVIDER_CODE_ACTIONS_DURATION,
        );
        logger.info(`Code Actions requested for ${document.fileName}`);

        const actions: vscode.CodeAction[] = [];

        // 调试信息：详细上下文
        logger.debug(`Trigger kind: ${context.triggerKind}`);
        logger.debug(
            `Requested range: [${range.start.line}, ${range.start.character}] - [${range.end.line}, ${range.end.character}]`,
        );
        if (context.only) {
            logger.debug(`Code action kind filter: ${context.only.value}`);
        }

        // 从 DiagnosticCollection 获取当前文档的所有诊断
        const documentDiagnostics =
            this.diagnosticCollection.get(document.uri) || [];

        logger.debug(
            `Document has ${documentDiagnostics.length} total diagnostics`,
        );

        // 检查是否有来自本扩展的诊断
        const matchingDiagnostics = documentDiagnostics.filter(
            (d: vscode.Diagnostic) => d.source === PackageInfo.diagnosticSource,
        );

        // 如果没有来自本扩展的诊断问题，则不提供任何操作
        if (matchingDiagnostics.length === 0) {
            logger.debug("No matching diagnostics from this extension");
            timer.stop();
            return actions;
        }

        logger.info(
            `Found ${matchingDiagnostics.length} diagnostics from this extension`,
        );

        // 策略：
        // - "Fix all problems with shell-format" 支持 SourceFixAll（"Fix All" 命令）
        // - "Fix this issue with shell-format" 只在 context.diagnostics 有诊断时显示（光标在错误位置）

        // 如果 context.only 是 SourceFixAll，则返回 FixAll action
        if (
            context.only &&
            context.only.contains(vscode.CodeActionKind.SourceFixAll)
        ) {
            logger.debug(`SourceFixAll requested, providing Fix All action`);
            const fixAllAction = new vscode.CodeAction(
                PackageInfo.codeActionFixAllTitle,
                vscode.CodeActionKind.SourceFixAll,
            );
            fixAllAction.command = {
                title: PackageInfo.codeActionFixAllTitle,
                command: PackageInfo.commandFixAllProblems,
                arguments: [document.uri],
            };
            actions.push(fixAllAction);

            timer.stop();
            logger.info(`Provided SourceFixAll action for ${document.fileName}`);
            return actions;
        }

        // 如果 context.diagnostics 有来自本扩展的诊断，创建 "Fix this issue"
        if (context.diagnostics && context.diagnostics.length > 0) {
            // 检查 context.diagnostics 是否有来自本扩展的诊断
            const contextMatchingDiagnostics = context.diagnostics.filter(
                (d) => d.source === PackageInfo.diagnosticSource,
            );
            if (contextMatchingDiagnostics.length > 0) {
                logger.debug(
                    `Providing QuickFix for ${contextMatchingDiagnostics.length} diagnostics`,
                );
                // 只为第一个匹配的诊断创建 QuickFix，避免重复
                const diagnostic = contextMatchingDiagnostics[0];
                const fixThisAction = new vscode.CodeAction(
                    PackageInfo.codeActionQuickFixTitle,
                    vscode.CodeActionKind.QuickFix,
                );
                // 关联当前诊断问题
                fixThisAction.diagnostics = [diagnostic];
                fixThisAction.isPreferred = true;
                fixThisAction.command = {
                    title: PackageInfo.codeActionQuickFixTitle,
                    command: PackageInfo.commandFixAllProblems,
                    arguments: [document.uri],
                };
                actions.push(fixThisAction);
            } else {
                logger.debug("Context has diagnostics but none from this extension");
            }
        }

        // 为整个文档提供独立的 QuickFix: "Fix all problems with shell-format"
        // 不关联任何特定诊断，这样会在右键菜单中单独显示
        const fixAllAction = new vscode.CodeAction(
            PackageInfo.codeActionFixAllTitle,
            vscode.CodeActionKind.QuickFix,
        );
        fixAllAction.command = {
            title: PackageInfo.codeActionFixAllTitle,
            command: PackageInfo.commandFixAllProblems,
            arguments: [document.uri],
        };
        actions.push(fixAllAction);

        timer.stop();
        logger.info(
            `Provided ${actions.length} code actions for ${document.fileName}`,
        );

        return actions;
    }
}


/**
 * 注册 Code Actions 提供者
 *
 * @param diagnosticCollection VSCode 诊断集合
 */
export function registerCodeActionsProvider(
    diagnosticCollection: vscode.DiagnosticCollection,
): vscode.Disposable {
    // registerCodeActionsProvider与CodeActionsProvider工作机制参考文档:
    // - 官方文档:https://code.visualstudio.com/api/references/vscode-api#CodeActionKind
    // - 本地文档:doc/vscode/extension-api.md
    logger.info("Registering code actions provider!");

    return vscode.languages.registerCodeActionsProvider(
        PackageInfo.languageId,
        new ShellFormatCodeActionProvider(diagnosticCollection),
        {
            providedCodeActionKinds: [
                vscode.CodeActionKind.QuickFix,
                vscode.CodeActionKind.SourceFixAll.append(PackageInfo.extensionName),
            ],
        },
    );
}
