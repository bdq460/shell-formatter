/**
 * 插件接口定义
 *
 * 定义格式化工具和检查工具的插件接口
 * 支持动态加载和扩展不同的格式化工具
 *
 * 架构：
 * - IFormatPlugin 扩展 IPlugin（通用插件机制）
 * - 添加 VSCode 特定的格式化和检查方法
 */

import { Diagnostic, TextDocument, TextEdit } from "vscode";
import { CancellationToken } from "../tools/executor/types";
import { IPlugin } from "../utils/plugin";

/**
 * 通用格式化选项
 */
export interface PluginCommondOptions {
    /** 取消令牌 */
    token?: CancellationToken;
    /** 超时时间（毫秒） */
    timeout?: number;
}

/**
 * 通用格式化选项（兼容性别名）
 * 使用插件特定的参数接口
 */
export interface PluginFormatOptions extends PluginCommondOptions { }

/**
 * 通用检查选项（兼容性别名）
 * 使用插件特定的参数接口
 */
export interface PluginCheckOptions extends PluginCommondOptions { }

export interface PluginCommonResult {
    /** 是否有错误 */
    hasErrors: boolean;
    /** 诊断信息, 执行过程中的错误信息 */
    diagnostics: Diagnostic[];
}

/**
 * 检查结果
 */
export interface PluginCheckResult extends PluginCommonResult { }

/**
 * 格式化结果
 */
export interface PluginFormatResult extends PluginCommonResult {
    /** 格式化编辑列表, 如果为空, 表示没有格式变化 */
    textEdits: TextEdit[];
}

/**
 * 格式化和检查插件接口
 *
 * 扩展通用插件接口，添加 VSCode 特定的格式化和检查方法
 */
export interface IFormatPlugin extends IPlugin {
    /**
     * 格式化内容
     * @param document 文档对象
     * @param options 格式化选项
     * @returns 格式化后的 TextEdit 数组
     */
    format?(
        document: TextDocument,
        options: PluginFormatOptions,
    ): Promise<PluginFormatResult>;

    /**
     * 检查内容
     * @param document 文档对象
     * @param options 检查选项
     * @returns 检查结果
     */
    check(
        document: TextDocument,
        options: PluginCheckOptions,
    ): Promise<PluginCheckResult>;

    /**
     * 获取插件支持的文件扩展名
     * @returns 文件扩展名数组（如 ['.sh', '.bash']）
     */
    getSupportedExtensions(): string[];
}
