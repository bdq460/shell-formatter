/**
 * shellcheck 纯插件实现
 *
 * 直接使用 ShellcheckTool，不依赖 Service 层
 * 实现统一的插件接口
 */
import * as vscode from "vscode";
import { PackageInfo } from "../config";
import { PERFORMANCE_METRICS } from "../metrics";
import { ShellcheckTool } from "../tools/shell/shellcheck/shellcheckTool";
import { logger } from "../utils";
import { startTimer } from "../utils/performance/monitor";
import { BaseFormatPlugin } from "./baseFormatPlugin";
import { PluginCheckOptions, PluginCheckResult } from "./pluginInterface";

/**
 * shellcheck 纯插件
 * 注意：shellcheck 只提供检查功能，不提供格式化功能
 */
export class PureShellcheckPlugin extends BaseFormatPlugin {
    name = "shellcheck";
    displayName = "ShellCheck";
    version = "1.0.0";
    description = "Check shell scripts for common errors using shellcheck";

    private tool: ShellcheckTool;

    constructor(shellcheckPath: string) {
        super();
        this.tool = new ShellcheckTool(shellcheckPath);
        logger.info(
            `PureShellcheckPlugin initialized with path: ${shellcheckPath}`,
        );
    }

    /**
     * 检查 shellcheck 是否可用
     */
    async isAvailable(): Promise<boolean> {
        try {
            await this.tool.check({ file: "-", content: "# test" });
            return true;
        } catch (error) {
            logger.warn(`shellcheck is not available: ${String(error)}`);
            return false;
        }
    }

    /**
     * 检查文档
     */
    async check(
        document: vscode.TextDocument,
        options: PluginCheckOptions,
    ): Promise<PluginCheckResult> {
        logger.debug(
            `PureShellcheckPlugin.check called with options: ${JSON.stringify(options)}`,
        );

        const timer = startTimer(PERFORMANCE_METRICS.SHELLCHECK_DIAGNOSE_DURATION);
        try {
            const result = await this.tool.check({
                file: "-",
                token: options.token,
                content: document.getText(),
            });

            timer.stop();
            logger.debug(`PureShellcheckPlugin.check completed`);

            return this.createCheckResult(
                result,
                document,
                this.getDiagnosticSource(),
            );
        } catch (error) {
            timer.stop();
            logger.error(`PureShellcheckPlugin.check failed: ${String(error)}`);
            return this.handleCheckError(document, error);
        }
    }

    /**
     * 获取支持的文件扩展名
     */
    getSupportedExtensions(): string[] {
        return PackageInfo.fileExtensions;
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
                (msg: any) => {
                    logger.debug(`${this.name} received config:change message`);
                },
            );
            logger.debug(`${this.name} subscribed to config:change messages`);
        }
    }

    /**
     * 插件停用时的钩子
     * 取消配置变更消息订阅
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
