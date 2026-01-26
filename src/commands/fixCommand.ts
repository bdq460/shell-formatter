/**
 * 修复命令模块
 * 提供"修复所有问题"命令的实现
 *
 * 核心流程：
 * 1. 查找目标文档（从问题面板的 URI 或当前活动编辑器）
 * 2. 调用格式化工具生成修复操作
 * 3. 应用修复操作到文档
 * 4. 等待文档更新完成
 * 5. 重新诊断以获取最新的问题列表
 * 6. 更新诊断集合，确保问题面板显示最新状态
 * 7. 显示修复结果消息
 *
 * 关键设计：
 * - 使用 WorkspaceEdit 批量应用修复操作，确保原子性
 * - 等待 100ms 让文档更新完成，避免诊断时读到旧内容
 * - 修复后立即重新诊断，确保问题面板与实际文件状态同步
 */

import * as vscode from "vscode";
import { PackageInfo } from "../config";
import { diagnoseDocument } from "../diagnostics";
import { formatDocument } from "../formatters";
import { logger } from "../utils/log";

/**
 * 根据传入的 URI 查找文档
 *
 * 支持两种调用方式：
 * 1. 从问题面板点击修复时，会传入文档 URI
 * 2. 从命令面板执行命令时，没有 URI，使用当前活动编辑器
 *
 * 核心逻辑：
 * - 如果有 URI，从所有打开的文档中查找匹配的文档
 * - 如果没有 URI，使用当前活动编辑器的文档
 * - 如果都找不到，返回 undefined
 *
 * @param uri 可选的文档 URI
 * @returns 文档对象，如果未找到则返回 undefined
 */
function findDocument(uri?: vscode.Uri): vscode.TextDocument | undefined {
    if (uri) {
        // 场景 1: 从问题面板的修复命令调用
        // 问题面板中的每个问题都绑定了文档 URI
        return vscode.workspace.textDocuments.find(
            (doc) => doc.uri.toString() === uri.toString(),
        );
    } else if (vscode.window.activeTextEditor) {
        // 场景 2: 从命令面板调用（Ctrl+Shift+P -> Fix All Problems）
        // 使用当前活动编辑器的文档
        return vscode.window.activeTextEditor.document;
    }
    return undefined;
}

/**
 * 创建 WorkspaceEdit 对象并应用修复操作
 *
 * 核心逻辑：
 * 1. 创建 WorkspaceEdit 对象，用于批量编辑操作
 * 2. 将所有文本编辑操作添加到 WorkspaceEdit
 * 3. 应用 WorkspaceEdit，这是一个原子操作，要么全部成功，要么全部失败
 *
 * WorkspaceEdit 的优势：
 * - 支持多个文档的同时编辑
 * - 支持撤销/重做操作（作为单一操作）
 * - 自动处理文件变更通知
 *
 * @param document 文档对象
 * @param edits 编辑操作数组
 * @returns 是否成功应用编辑操作
 */
async function applyEdits(
    document: vscode.TextDocument,
    edits: vscode.TextEdit[],
): Promise<boolean> {
    // 创建 WorkspaceEdit 对象
    const edit = new vscode.WorkspaceEdit();

    // 将所有编辑操作添加到 WorkspaceEdit
    // 每个 TextEdit 指定了替换的范围和新文本
    for (const textEdit of edits) {
        edit.replace(document.uri, textEdit.range, textEdit.newText);
    }

    // 应用编辑操作
    // 这是一个异步操作，VSCode 会处理所有的文本替换
    return await vscode.workspace.applyEdit(edit);
}

/**
 * 等待文档更新并获取最新的文档对象
 *
 * 核心逻辑：
 * 1. 等待 100ms，让 VSCode 完成文档的更新
 * 2. 从 workspace.textDocuments 中重新获取文档对象
 * 3. 返回最新的文档对象，确保内容是最新的
 *
 * 为什么需要等待：
 * - applyEdit 是异步的，文档更新可能没有立即完成
 * - 如果立即诊断，可能读到旧的内容
 * - 100ms 的等待时间是基于经验值，大多数情况下足够
 *
 * @param originalUri 原始文档 URI
 * @returns 更新后的文档对象，如果未找到则返回 undefined
 */
async function getUpdatedDocument(originalUri: vscode.Uri): Promise<vscode.TextDocument | undefined> {
    // 等待文档更新完成
    // 100ms 是一个经验值，大多数情况下足够让 VSCode 完成文档更新
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 获取更新后的文档（确保使用最新的文档内容）
    // workspace.textDocuments 包含所有在编辑器中打开的文档
    return vscode.workspace.textDocuments.find(
        (doc) => doc.uri.toString() === originalUri.toString(),
    );
}

/**
 * 更新诊断信息
 *
 * 核心逻辑：
 * 1. 调用诊断引擎对文档进行诊断
 * 2. 将诊断结果更新到诊断集合中
 * 3. 返回剩余的诊断数量，用于显示结果消息
 *
 * 诊断更新策略：
 * - 使用 document.uri 作为键，更新或创建诊断
 * - 如果 diagnostics 为空数组，会清除之前的所有诊断
 * - 这确保问题面板显示的是最新的问题列表
 *
 * @param document 文档对象
 * @param diagnosticCollection 诊断集合
 * @returns 更新后的诊断数量
 */
async function updateDiagnostics(
    document: vscode.TextDocument,
    diagnosticCollection: vscode.DiagnosticCollection,
): Promise<number> {
    // 对文档进行诊断
    // diagnoseDocument 会调用所有的诊断插件（shfmt、shellcheck）
    const diagnostics = await diagnoseDocument(document, undefined);

    // 更新诊断集合
    // VSCode 会自动更新问题面板，显示最新的诊断信息
    diagnosticCollection.set(document.uri, diagnostics);

    // 记录日志并返回诊断数量
    logger.info(`Re-diagnosed after fix: ${diagnostics.length} diagnostics remain`);
    return diagnostics.length;
}

/**
 * 显示修复结果消息
 *
 * 核心逻辑：
 * - 如果所有问题都已修复，显示成功消息（绿色提示）
 * - 如果仍有问题，显示警告消息（黄色提示），告知剩余问题数量
 *
 * 消息类型选择：
 * - showInformationMessage: 用于成功场景，绿色图标
 * - showWarningMessage: 用于部分成功场景，黄色图标，提醒用户检查
 *
 * @param appliedFixCount 应用的修复数量
 * @param remainingDiagCount 剩余的诊断数量
 */
function showResultMessage(appliedFixCount: number, remainingDiagCount: number): void {
    if (remainingDiagCount === 0) {
        // 所有问题都已修复
        vscode.window.showInformationMessage("All problems fixed successfully.");
    } else {
        // 部分修复成功，但仍有问题
        vscode.window.showWarningMessage(
            `${appliedFixCount} fix(es) applied, but ${remainingDiagCount} problem(s) remain. Check the Problems panel.`,
        );
    }
}

/**
 * 处理有修复操作的情况
 *
 * 核心逻辑：
 * 1. 应用修复操作到文档
 * 2. 等待文档更新完成
 * 3. 重新诊断以获取最新状态
 * 4. 更新诊断集合
 * 5. 显示修复结果
 *
 * 完整流程说明：
 * - applyEdits: 将修复操作应用到文档
 * - getUpdatedDocument: 等待并获取更新后的文档
 * - updateDiagnostics: 重新诊断并更新诊断集合
 * - showResultMessage: 显示修复结果给用户
 *
 * 为什么需要这个函数：
 * - 分离有修复和无修复的逻辑，提高代码可读性
 * - 将完整的修复流程封装在一个函数中
 *
 * @param document 文档对象
 * @param edits 编辑操作数组
 * @param diagnosticCollection 诊断集合
 */
async function handleFixesApplied(
    document: vscode.TextDocument,
    edits: vscode.TextEdit[],
    diagnosticCollection: vscode.DiagnosticCollection,
): Promise<void> {
    logger.info(`Applying ${edits.length} formatting fix(es)`);

    // 步骤 1: 应用修复操作
    const editSuccess = await applyEdits(document, edits);
    if (!editSuccess) {
        logger.error("Failed to apply formatting edits");
        return;
    }

    // 步骤 2: 等待文档更新并获取最新文档
    const updatedDocument = await getUpdatedDocument(document.uri);
    if (!updatedDocument) {
        logger.error("Failed to get updated document after fix");
        return;
    }

    // 步骤 3: 重新诊断并更新诊断集合
    const remainingDiagCount = await updateDiagnostics(
        updatedDocument,
        diagnosticCollection,
    );

    // 步骤 4: 显示修复结果
    showResultMessage(edits.length, remainingDiagCount);
}

/**
 * 处理无修复操作的情况
 *
 * 核心逻辑：
 * 1. 直接对文档进行诊断
 * 2. 更新诊断集合
 * 3. 根据诊断结果显示相应消息
 *
 * 可能的场景：
 * - 文档本身没有问题，不需要修复
 * - 文档有问题，但格式化工具无法自动修复（如语法错误）
 * - 格式化工具返回空数组，表示无需修改
 *
 * 为什么需要这个函数：
 * - 与有修复的情况分离，逻辑更清晰
 * - 提供更详细的诊断信息
 *
 * @param document 文档对象
 * @param diagnosticCollection 诊断集合
 */
async function handleNoFixes(
    document: vscode.TextDocument,
    diagnosticCollection: vscode.DiagnosticCollection,
): Promise<void> {
    logger.info("No formatting fixes return.");

    // 对文档进行诊断
    // 即使没有修复操作，也需要重新诊断，因为诊断可能已经过期
    const diagnostics = await diagnoseDocument(document, undefined);

    // 更新诊断集合
    diagnosticCollection.set(document.uri, diagnostics);

    if (diagnostics.length > 0) {
        // 有诊断问题，但无法通过格式化修复
        logger.info("No formatting fixes needed, but diagnostics found.");
        vscode.window.showWarningMessage(
            "Formatting failed with warnings. Check the Problems panel.",
        );
    } else {
        // 没有任何问题
        logger.info("No formatting fixes needed.");
    }
}

/**
 * 注册修复所有问题命令
 *
 * 命令入口点，负责处理用户触发的修复命令
 *
 * 触发方式：
 * 1. 点击问题面板中的"Fix all problems with shell-formatter"链接
 * 2. 在编辑器中右键 -> Source Actions -> Fix All
 * 3. 通过命令面板 (Ctrl+Shift+P) 搜索 "shell-formatter: Fix all problems"
 *
 * 完整流程：
 * 1. 查找目标文档（从 URI 或活动编辑器）
 * 2. 调用格式化工具生成修复操作
 * 3. 如果有修复操作，调用 handleFixesApplied
 * 4. 如果没有修复操作，调用 handleNoFixes
 *
 * @param diagnosticCollection VSCode 诊断集合，用于更新诊断信息
 * @returns 可释放的资源对象，VSCode 在扩展停用时自动清理
 */
export function registerFixAllCommand(
    diagnosticCollection: vscode.DiagnosticCollection,
): vscode.Disposable {
    logger.info("Registering fix all problems command");

    return vscode.commands.registerCommand(
        PackageInfo.commandFixAllProblems,
        async (uri?: vscode.Uri) => {
            // 记录命令触发
            logger.info(`Start fix all problems! URI: ${uri}`);

            // 步骤 1: 查找目标文档
            const document = findDocument(uri);
            if (!document) {
                logger.info("Fix all problems command triggered! No document found");
                return;
            }

            logger.info(`Start fix all problems for: ${document.fileName}`);

            // 步骤 2: 生成修复操作
            // formatDocument 会调用 shfmt 格式化工具
            // 使用 content 模式，确保修复基于当前编辑器中的内容，与诊断保持一致
            logger.info("Generating fixes by invoking format document");
            const edits = await formatDocument(document, undefined, undefined);

            // 步骤 3: 根据修复数量处理不同情况
            if (edits && edits.length > 0) {
                // 有修复操作：应用修复并更新诊断
                await handleFixesApplied(document, edits, diagnosticCollection);
            } else if (edits && edits.length === 0) {
                // 无修复操作：直接诊断并更新
                await handleNoFixes(document, diagnosticCollection);
            }
        },
    );
}
