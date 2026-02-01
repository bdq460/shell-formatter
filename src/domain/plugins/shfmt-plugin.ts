/**
 * shfmt 纯插件实现
 *
 * 使用端口接口（IFormatTool），不直接依赖基础设施
 * 实现统一的插件接口
 * 使用领域类型，不依赖 VSCode
 *
 * 架构改进：
 * - 通过构造函数注入 IFormatTool 和 IPluginConfig
 * - 不再直接依赖 ShfmtTool 和 SettingInfo
 * - 遵循依赖倒置原则
 */

import { logger } from "../../utils/log";
import {
    Document,
    PluginCheckOptions,
    PluginCheckResult,
    PluginFormatOptions,
    PluginFormatResult,
} from "../plugin-interface";
import { IFormatTool, IPluginConfig } from "../port";
import { BasePlugin } from "./base-plugin";

/**
 * shfmt 纯插件
 *
 * 通过端口接口与工具交互，不直接依赖具体实现
 */
export class PureShfmtPlugin extends BasePlugin {
    name = "shfmt";
    displayName = "Shell Formatter";
    version = "1.0.0";
    description = "Format and check shell scripts using shfmt";

    private tool: IFormatTool;
    protected pluginConfig: IPluginConfig;

    /**
     * 构造函数
     * @param tool 格式化工具（通过端口接口注入）
     * @param config 插件配置（通过接口注入，而非直接依赖 SettingInfo）
     */
    constructor(tool: IFormatTool, config: IPluginConfig) {
        super();
        this.tool = tool;
        this.pluginConfig = config;
        logger.info(
            `PureShfmtPlugin initialized with diagnosticSource: ${config.diagnosticSource}`,
        );
    }

    /**
     * 检查 shfmt 是否可用
     */
    async isAvailable(): Promise<boolean> {
        return this.tool.isAvailable();
    }

    /**
     * 格式化文档
     */
    async format(
        document: Document,
        options: PluginFormatOptions,
    ): Promise<PluginFormatResult> {
        logger.debug(
            `PureShfmtPlugin.format called with options: ${JSON.stringify(options)}`,
        );

        try {
            const result = await this.tool.format(document.content, {
                indent: this.pluginConfig.tabSize,
                token: options.token,
            });

            logger.debug(`PureShfmtPlugin.format completed`);

            // 直接返回工具的结果，因为已经包含了 diagnostics 和 textEdits
            return result;
        } catch (error) {
            logger.error(`PureShfmtPlugin.format failed: ${String(error)}`);
            return this.handleFormatError(document, error);
        }
    }

    /**
     * 检查文档
     */
    async check(
        document: Document,
        options: PluginCheckOptions,
    ): Promise<PluginCheckResult> {
        logger.debug(
            `PureShfmtPlugin.check called with options: ${JSON.stringify(options)}`,
        );

        try {
            const result = await this.tool.check(document.content, {
                token: options.token,
            });

            logger.debug(`PureShfmtPlugin.check completed`);

            return result;
        } catch (error) {
            logger.error(`PureShfmtPlugin.check failed: ${String(error)}`);
            return this.handleCheckError(document, error);
        }
    }

    /**
     * 插件激活时的钩子
     * 示例：订阅配置变更消息
     */
    async onActivate(): Promise<void> {
        logger.info(`${this.name} plugin activated`);

        // 订阅配置变更消息
        if (this.messageBus) {
            this.configChangeSubId = this.messageBus.subscribe(
                "config:change",
                (msg: any) => {
                    logger.debug(`${this.name} received config:change message`);
                    // 处理配置变更
                    if (msg.payload?.indent !== undefined) {
                        this.pluginConfig = {
                            ...this.pluginConfig,
                            tabSize: msg.payload.indent,
                        };
                        logger.debug(
                            `${this.name} reloaded config with new indent: ${msg.payload.indent}`,
                        );
                    }
                },
            );
            logger.debug(`${this.name} subscribed to config:change messages`);
        }
    }

    /**
     * 插件停用时的钩子
     * 取消消息订阅
     */
    async onDeactivate(): Promise<void> {
        logger.info(`${this.name} plugin deactivated`);

        // 取消配置变更消息订阅
        if (this.messageBus && this.configChangeSubId) {
            this.messageBus.unsubscribe(this.configChangeSubId);
            this.configChangeSubId = undefined;
            logger.debug(`${this.name} unsubscribed from config:change messages`);
        }
    }

    /**
     * 获取插件依赖
     * shfmt 不依赖于其他插件
     */
    getDependencies() {
        return [
            // 示例：如果 shfmt 需要 shellcheck 来检验，可以这样声明
            // { name: 'shellcheck', required: false }
        ];
    }
}
