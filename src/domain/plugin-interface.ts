/**
 * 插件接口定义
 *
 * 定义格式化工具和检查工具的插件接口
 * 支持动态加载和扩展不同的格式化工具
 *
 * 架构：
 * - IFormatPlugin 扩展 IPlugin（通用插件机制）
 * - 使用领域类型（Document, TextEdit, Diagnostic 等），不依赖 VSCode
 * - 通过适配器层进行 VSCode 类型和领域类型的转换
 *
 * 设计原则：
 * 1. 领域层不依赖外部框架（VSCode、浏览器等）
 * 2. 可在 CLI、Web、桌面应用等多种场景使用
 * 3. 通过适配器层与 VSCode 集成
 */

import { IPlugin } from "../utils/plugin";
import {
    Document,
    PluginCheckOptions,
    PluginCheckResult,
    PluginFormatOptions,
    PluginFormatResult,
} from "./types";

// 重新导出领域类型
export {
    DiagnosticSeverity,
    Disposable
} from "./types";

export type {
    CancellationToken,
    Diagnostic,
    Document,
    PluginCheckOptions,
    PluginCheckResult,
    PluginCommonOptions,
    PluginCommonResult,
    PluginFormatOptions,
    PluginFormatResult,
    Position,
    Range,
    TextEdit
} from "./types";

/**
 * 格式化和检查插件接口
 *
 * 扩展通用插件接口，添加格式化和检查方法
 * 使用领域类型，不依赖 VSCode
 */
export interface IFormatPlugin extends IPlugin {
    /**
     * 格式化内容
     * @param document 文档对象（领域类型）
     * @param options 格式化选项
     * @returns 格式化结果（包含 TextEdit 数组）
     */
    format?(
        document: Document,
        options: PluginFormatOptions,
    ): Promise<PluginFormatResult>;

    /**
     * 检查内容
     * @param document 文档对象（领域类型）
     * @param options 检查选项
     * @returns 检查结果
     */
    check(
        document: Document,
        options: PluginCheckOptions,
    ): Promise<PluginCheckResult>;

    /**
     * 获取插件支持的文件扩展名
     * @returns 文件扩展名数组（如 ['.sh', '.bash']）
     */
    getSupportedExtensions(): string[];
}
