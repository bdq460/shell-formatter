/**
 * 领域层端口（Ports）
 *
 * 定义领域层与外部世界交互的接口
 * 遵循依赖倒置原则，领域层定义接口，基础设施层实现
 *
 * 架构位置：领域层边界
 * 依赖方向：基础设施层 → 领域层端口
 */

import type { PluginCheckResult, PluginFormatResult } from "../types";

// 重新导出类型，方便 adapters 使用
export type { PluginCheckResult, PluginFormatResult } from "../types";

// 格式化工具端口
export interface IFormatTool {
    /**
     * 格式化文档内容
     * @param content 文档内容
     * @param options 格式化选项
     * @returns 格式化结果（包含格式化内容和诊断信息）
     */
    format(content: string, options?: FormatToolOptions): Promise<PluginFormatResult>;

    /**
     * 检查文档内容
     * @param content 文档内容
     * @param options 检查选项
     * @returns 检查结果
     */
    check(content: string, options?: CheckToolOptions): Promise<PluginCheckResult>;

    /**
     * 检查工具是否可用
     */
    isAvailable(): Promise<boolean>;
}

// 检查工具端口（仅检查，不格式化）
export interface ICheckTool {
    /**
     * 检查文档内容
     * @param content 文档内容
     * @param options 检查选项
     * @returns 检查结果
     */
    check(content: string, options?: CheckToolOptions): Promise<PluginCheckResult>;

    /**
     * 检查工具是否可用
     */
    isAvailable(): Promise<boolean>;
}

/**
 * 格式化工具选项
 */
export interface FormatToolOptions {
    /** 缩进大小 */
    indent?: number;
    /** 取消令牌 */
    token?: import("../types").CancellationToken;
}

/**
 * 检查工具选项
 */
export interface CheckToolOptions {
    /** 取消令牌 */
    token?: import("../types").CancellationToken;
}

/**
 * 插件配置接口
 * 通过构造函数注入，避免直接依赖 config 模块
 */
export interface IPluginConfig {
    /** 缩进大小 */
    tabSize: number;
    /** 诊断源名称 */
    diagnosticSource: string;
    /** 支持的文件扩展名 */
    fileExtensions: string[];
    /** 其他插件特定配置 */
    [key: string]: unknown;
}
