/**
 * 插件默认配置信息工具类
 * 统一管理从 package.json 读取的默认配置值
 */

import * as vscode from "vscode";
import { PackageInfo } from "./packageInfo";

/**
 * 日志配置接口
 */
interface LogConfig {
    enabled: boolean;
    level: string;
    format: string;
}

/**
 * 配置缓存接口
 * 缓存从 settings.json 读取的配置值
 */
interface ConfigCache {
    tabSize: number | string;
    log: LogConfig;
    onError: string;
    plugins: {
        shfmt: { enabled: boolean; path: string };
        shellcheck: { enabled: boolean; path: string };
    };
}

/**
 * 配置管理工具
 *
 * 提供对 VSCode 工作区配置的统一访问接口，支持：
 * - shfmt 可执行文件路径配置
 * - shfmt 参数配置（支持字符串和数组两种格式）
 * - tab 缩进配置（数字空格或 tab 字符）
 * - 错误处理方式配置
 * - 配置变更检测
 *
 * 优先使用用户配置，若用户未配置则使用 package.json 中定义的默认值
 *
 * 缓存机制：
 * - SettingInfo 内部缓存配置值
 * - 配置变化时调用 refreshCache() 刷新缓存
 * - 业务代码只关注配置变化后的刷新逻辑
 */
export class SettingInfo {
    // 缓存配置节名称
    private static configSection: string = PackageInfo.extensionName;

    // 配置缓存（缓存从 settings.json 读取的值）
    private static configCache: ConfigCache | null = null;

    /**
     * 初始化或刷新配置缓存
     *
     * 使用场景：
     * - 首次调用时初始化缓存
     * - 配置变化后刷新缓存
     *
     * 业务代码职责：
     * - 监听 onDidChangeConfiguration 事件
     * - 判断配置是否变化
     * - 如果变化，调用 SettingInfo.refreshCache()
     */
    static refreshCache(): void {
        this.configCache = {
            tabSize: this.getTabSizeImpl(),
            log: this.getLogImpl(),
            onError: this.getOnErrorImpl(),
            plugins: this.getPluginsImpl(),
        };
    }

    /**
     * 确保缓存已初始化
     */
    private static ensureCacheInitialized(): void {
        if (!this.configCache) {
            this.refreshCache();
        }
    }

    /**
     * 获取配置对象
     * @param section 配置节，默认为扩展名称
     * @returns VSCode 配置对象
     */
    private static getConfig(section?: string): vscode.WorkspaceConfiguration {
        return vscode.workspace.getConfiguration(section || this.configSection);
    }

    // ==================== 内部实现：从 VSCode 读取配置（不使用缓存） ====================

    private static getLogImpl(): LogConfig {
        const config = this.getConfig();
        return config.get<LogConfig>("log", PackageInfo.defaultLog);
    }

    private static getTabSizeImpl(): number | string {
        const config = this.getConfig();
        return config.get<number | string>("tabSize", PackageInfo.defaultTabSize);
    }

    private static getOnErrorImpl(): string {
        const config = this.getConfig();
        return config.get<string>("onError", PackageInfo.defaultOnError);
    }

    private static getPluginsImpl(): {
        shfmt: { enabled: boolean; path: string };
        shellcheck: { enabled: boolean; path: string };
    } {
        const config = this.getConfig();
        return config.get("plugins", {
            shfmt: { enabled: true, path: PackageInfo.defaultShfmtPath },
            shellcheck: { enabled: true, path: PackageInfo.defaultShellCheckPath },
        });
    }

    /**
     * 获取当前缓存快照
     * @returns 当前缓存的配置快照，用于服务层判断配置是否变化
     */
    static getConfigSnapshot(): ConfigCache {
        this.ensureCacheInitialized();
        return this.configCache!;
    }

    // ==================== 配置变更检测 ====================

    // ==================== 插件配置 ====================

    /**
     * 获取 shfmt 插件是否启用
     * @returns 是否启用 shfmt 插件，默认为 true
     */
    static isShfmtEnabled(): boolean {
        this.ensureCacheInitialized();
        return this.configCache!.plugins.shfmt.enabled;
    }

    /**
     * 获取 shellcheck 插件是否启用
     * @returns 是否启用 shellcheck 插件，默认为 true
     */
    static isShellcheckEnabled(): boolean {
        this.ensureCacheInitialized();
        return this.configCache!.plugins.shellcheck.enabled;
    }

    /**
     * 获取 shfmt 可执行文件路径
     * @returns shfmt 可执行文件的路径，优先使用用户配置，否则使用默认值 'shfmt'
     */
    static getShfmtPath(): string {
        this.ensureCacheInitialized();
        return this.configCache!.plugins.shfmt.path;
    }

    /**
     * 获取 shellcheck 可执行文件路径
     * @returns shellcheck 可执行文件的路径，优先使用用户配置，否则使用默认值 'shellcheck'
     */
    static getShellcheckPath(): string {
        this.ensureCacheInitialized();
        return this.configCache!.plugins.shellcheck.path;
    }

    // ==================== log 配置 ====================
    static getLog(): LogConfig {
        this.ensureCacheInitialized();
        return this.configCache!.log;
    }

    // ==================== tabSize 配置 ====================

    /**
     * 获取 tab 缩进配置
     * @returns tab 缩进配置：数字表示空格数，字符串 'tab' 表示使用 tab 字符
     */
    private static getTabSize(): number | string {
        this.ensureCacheInitialized();
        return this.configCache!.tabSize;
    }

    /**
     * 获取 实际tab 缩进配置
     * @returns tab 缩进配置
     */
    static getRealTabSize(): number | undefined {
        const tabSetting = this.getTabSize();
        if (tabSetting === "ignore") {
            return undefined;
        } else if (typeof tabSetting === "number" && tabSetting >= 0) {
            // 使用空格缩进
            return tabSetting;
        }
        // 设置为 'vscode'或其他未知值, 默认使用 vscode 缩进
        // @todo editor.tabSize也要缓存起来的吧?
        return vscode.workspace.getConfiguration("editor").get<number>("tabSize");
    }

    // ==================== 错误处理配置 ====================

    /**
     * 获取错误处理方式
     *
     * 控制当格式化失败时的行为：
     * - 'showProblem': 在问题面板显示错误
     * - 'ignore': 忽略错误
     *
     * @returns 错误处理方式，默认为 'showProblem'
     */
    static getOnErrorSetting(): string {
        this.ensureCacheInitialized();
        return this.configCache!.onError;
    }

    // ==================== 配置变更检测 ====================

    /**
     * 配置键列表：影响诊断的配置项
     * 这些配置变化后需要重新诊断所有文件
     */
    static readonly DIAGNOSTIC_RELEVANT_CONFIG_KEYS = [
        "shell-format.plugins.shfmt",
        "shell-format.plugins.shellcheck",
        "shell-format.tabSize",
        "shell-format.onError",
    ] as const;

    /**
     * 配置键列表：影响插件行为的配置项（包括诊断和非诊断配置）
     * 这些配置变化后需要重新初始化插件组件
     */
    static readonly EXTENSION_RELEVANT_CONFIG_KEYS = [
        ...this.DIAGNOSTIC_RELEVANT_CONFIG_KEYS,
        "shell-format.log",
    ] as const;

    /**
     * 检查配置是否影响诊断结果
     *
     * 用于配置变更事件处理，判断是否需要重新诊断所有 shell 脚本
     *
     * 优化：
     * - 细粒度检测：只检测真正影响诊断结果的配置项
     * - 避免不必要的重新诊断
     * - 提升配置变化的响应速度
     *
     * @param event - VSCode 配置变更事件对象
     * @returns 如果变更影响诊断结果返回 true，否则返回 false
     */
    static isDiagnosticConfigChanged(
        event: vscode.ConfigurationChangeEvent,
    ): boolean {
        // 细粒度检测：检查影响诊断的配置项
        for (const key of this.DIAGNOSTIC_RELEVANT_CONFIG_KEYS) {
            if (event.affectsConfiguration(key)) {
                return true;
            }
        }

        // 特殊处理：tabSize 设置为 'vscode' 时，需要监听 editor.tabSize 变化
        if (
            this.getTabSize() === "vscode" &&
            event.affectsConfiguration("editor.tabSize")
        ) {
            return true;
        }

        return false;
    }

    /**
     * 检查扩展的配置是否发生变化
     *
     * 用于配置变更事件处理，判断是否需要重新初始化插件组件
     * 包括：服务实例、诊断缓存、日志输出等
     *
     * @param event - VSCode 配置变更事件对象
     * @returns 如果扩展相关配置发生变化返回 true，否则返回 false
     */
    static isConfigurationChanged(
        event: vscode.ConfigurationChangeEvent,
    ): boolean {
        // 检查所有影响插件行为的配置项
        for (const key of this.EXTENSION_RELEVANT_CONFIG_KEYS) {
            if (event.affectsConfiguration(key)) {
                return true;
            }
        }

        // 特殊处理：tabSize 设置为 'vscode' 时，需要监听 editor.tabSize 变化
        if (
            this.getTabSize() === "vscode" &&
            event.affectsConfiguration("editor.tabSize")
        ) {
            return true;
        }

        return false;
    }
}
