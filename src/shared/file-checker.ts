import * as vscode from "vscode";
import { PackageInfo } from "../config/package-info";
import { logger } from "../utils/log";

/**
 * 检查是否应该跳过该文件
 *
 * 对于不符合要求的文件，返回 true 表示跳过
 *
 * 1. 文件必须是 shell 语言文件
 * 2. 文件名必须有合法的后缀名（见 PackageInfo.fileExtensions）
 * 3. 文件的uri.schema必须是 file 或 git 协议的文件
 * 4. 如果文件名以 .git 结尾，则去掉 .git 后缀再进行检查, 要满足上述条件
 *
 * vscode的uri.schema文件协议都有什么?
 *
 * file: 内置, 磁盘上的实际文件, 如: file:///path/to/file.sh
 * untitled: 内置, 未保存的新文件, 如: untitled:Untitled-1
 * output: 输出通道, 如: output:extension-name
 * git: 内置 Git, Git版本控制相关, 如: git:/path/to/file.sh
 * git-index: 内置 Git, Git索引中的内容, 如: git-index:/path/to/file.sh
 * debug: 内置, 调试源文件, 如: debug:/path/to/file.sh
 * vscode-notebook-cell: 内置, Notebook 单元格, 如: vscode-notebook://...
 * vscode-vfs: 内置, 虚拟文件系统, 如: vscode-vfs://...
 * genie-diff: 第三方扩展, 用于自定义 diff 视图, 如: genie-diff://...
 *
 * @param document 文档对象
 * @returns 如果应该跳过返回 true，否则返回 false
 */
// 参数是否即可以以是vscode.TextDocument也可以是uri?
export function shouldSkipUri(uri: vscode.Uri): boolean {

    // 如果uri为空，直接跳过
    if (!uri) {
        logger.debug(`Skipping file with empty uri`);
        return true;
    }

    let fileName = uri.fsPath.split('/').pop() || '';

    // 如果文件以.git结尾, 则删除.git再进行检查
    const gitSuffix = /\.git$/;
    if (gitSuffix.test(fileName)) {
        logger.debug(`Found .git suffix in file name: ${fileName}, removing .git suffix for check`);
        fileName = fileName.replace(gitSuffix, '');
    }

    // 合法后缀名
    const validFileSuffixes = PackageInfo.fileExtensions;
    const hasValidSuffix = validFileSuffixes.some(ext => fileName.endsWith(ext));
    if (!hasValidSuffix) {
        logger.debug(`Skipping file with invalid suffix: ${uri.toString()}`);
        return true;
    }

    // 跳过uri.scheme不是file或git的文件
    // 否则当插件修改文件时, 会产生geine-diff等协议的uri, 导致用于diff校验的文件被错误处理
    // 从而生成校验结果提示, 但此提示不会跟随文件的关闭而关闭, 从而导致错误提示一直存在的问题。
    if (uri.scheme !== 'file' && uri.scheme !== 'git') {
        logger.debug(`Skipping file with non-file/git scheme: ${uri.toString()}`);
        return true;
    }

    logger.debug(`File passed all checks, will not skip: ${uri.toString()}`);

    return false;
}

export function shouldSkipFile(document: vscode.TextDocument): boolean {

    if (!document) {
        logger.debug(`Skipping file with empty document`);
        return true;
    }

    // 只处理 shell 语言文件
    if (document.languageId !== PackageInfo.languageId) {
        logger.debug(`Skipping file with non-shell language: ${document.fileName}`);
        return true
    }

    return shouldSkipUri(document.uri);

    // const baseName = document.fileName

    // // 跳过 Git 冲突文件、临时文件等
    // const skipPatterns = [
    //     /\.git$/, // Git 冲突文件
    //     /\.swp$/, // Vim 临时文件
    //     /\.swo$/, // Vim 交换文件
    //     /~$/, // 备份文件
    //     /\.tmp$/, // 临时文件
    //     /\.bak$/, // 备份文件
    //     /^extension-output-/, // VSCode 扩展开发输出文件
    // ];

    // let result = false
    // result = skipPatterns.some((pattern) => pattern.test(baseName));

    // 跳过uri.scheme不是file或git的文件
    // if (document.uri.scheme !== 'file' && document.uri.scheme !== 'git') {
    //     logger.info(`Skipping file with non - file / git scheme: ${document.uri.toString()} `);
    //     result = true;
    // }

    // 记录document的fileName, uri, isUntitled, isDirty, isClosed, 已json格式输出, uri的内容要非常详细
    // 格式
    // {
    //    fileName: document.fileName,
    //    uri: document.uri.toString(),
    //    uri: {
    //       scheme: document.uri.scheme,
    //       authority: document.uri.authority,
    //       path: document.uri.path,
    //       query: document.uri.query,
    //       fragment: document.uri.fragment
    //       fsPath: document.uri.fsPath
    //    },
    //    isUntitled: document.isUntitled,
    //    isDirty: document.isDirty,
    //    isClosed: document.isClosed
    //    checkResult: result
    // }

    // logger.info(`File check for skipping:
    //     ${JSON.stringify({
    //     fileName: document.fileName,
    //     uri: {
    //         string: document.uri.toString(),
    //         scheme: document.uri.scheme,
    //         authority: document.uri.authority,
    //         path: document.uri.path,
    //         query: document.uri.query,
    //         fragment: document.uri.fragment,
    //         fsPath: document.uri.fsPath,
    //     },
    //     isUntitled: document.isUntitled,
    //     isDirty: document.isDirty,
    //     isClosed: document.isClosed,
    //     checkResult: result,
    // }, null, 2)}`);

    // return result;
}
