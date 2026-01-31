/**
 * 诊断集合管理
 *
 * 职责：创建和管理 VSCode 诊断集合
 */

import * as vscode from "vscode";
import { PackageInfo } from "../config";
import { logger } from "../utils/log";

/**
 * 创建诊断集合
 */
export function createDiagnosticCollection(): vscode.DiagnosticCollection {
    logger.info("Diagnostic collection created");
    return vscode.languages.createDiagnosticCollection(PackageInfo.extensionName);
}
