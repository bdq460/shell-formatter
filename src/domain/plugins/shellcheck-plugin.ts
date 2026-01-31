/**
 * shellcheck 纯插件实现
 *
 * 使用端口接口（ICheckTool），不直接依赖基础设施
 * 实现统一的插件接口
 * 使用领域类型，不依赖 VSCode
 *
 * 架构改进：
 * - 通过构造函数注入 ICheckTool 和 IPluginConfig
 * - 不再直接依赖 ShellcheckTool 和 PackageInfo
 * - 遵循依赖倒置原则
 */

import { logger } from "../../utils/log";
import {
    Document,
    PluginCheckOptions,
    PluginCheckResult,
} from "../plugin-interface";
import { ICheckTool, IPluginConfig } from "../port";
import { BasePlugin } from "./base-plugin";

/**
 * shellcheck 纯插件
 * 注意：shellcheck 只提供检查功能，不提供格式化功能
 *
 * 通过端口接口与工具交互，不直接依赖具体实现
 */
export class PureShellcheckPlugin extends BasePlugin {
    name = "shellcheck";
    displayName = "ShellCheck";
    version = "1.0.0";
    description = "Check shell scripts for common errors using shellcheck";

    private tool: ICheckTool;
    protected pluginConfig: IPluginConfig;

    /**
     * 构造函数
     * @param tool 检查工具（通过端口接口注入）
     * @param config 插件配置（通过接口注入，而非直接依赖 PackageInfo）
     */
    constructor(tool: ICheckTool, config: IPluginConfig) {
        super();
        this.tool = tool;
        this.pluginConfig = config;
        logger.info(
            `PureShellcheckPlugin initialized with diagnosticSource: ${config.diagnosticSource}`,
        );
    }

    /**
     * 检查 shellcheck 是否可用
     */
    async isAvailable(): Promise<boolean> {
        return this.tool.isAvailable();
    }

    /**
     * 检查文档
     */
    async check(
        document: Document,
        options: PluginCheckOptions,
    ): Promise<PluginCheckResult> {
        logger.debug(
            `PureShellcheckPlugin.check called with options: ${JSON.stringify(options)}`,
        );

        try {
            const result = await this.tool.check(document.content, {
                token: options.token,
            });

            logger.debug(`PureShellcheckPlugin.check completed`);

            return result;
        } catch (error) {
            logger.error(`PureShellcheckPlugin.check failed: ${String(error)}`);
            return this.handleCheckError(document, error);
        }
    }

    /**
     * 插件激活时的钩子
     * 订阅配置变更消息
     */
    async onActivate(): Promise<void> {
        logger.info(`${this.name} plugin activated`);

        // 订阅配置变更消息
        if (this.messageBus) {
            this.configChangeSubId = this.messageBus.subscribe(
                "config:change",
                () => {
                    logger.debug(`${this.name} received config:change message`);
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
     * shellcheck 不依赖于其他插件
     */
    getDependencies() {
        return [];
    }
}
