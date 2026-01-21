/**
 * shfmt 纯插件实现
 *
 * 直接使用 ShfmtTool，不依赖 Service 层
 * 实现统一的插件接口
 */

import * as vscode from "vscode";
import { PackageInfo, SettingInfo } from "../config";
import { PERFORMANCE_METRICS } from "../metrics";
import { ShfmtFormatOptions, ShfmtTool } from "../tools/shell/shfmt/shfmtTool";
import { logger } from "../utils/log";
import { startTimer } from "../utils/performance/monitor";
import { BaseFormatPlugin } from "./baseFormatPlugin";
import {
    PluginCheckOptions,
    PluginCheckResult,
    PluginFormatOptions,
    PluginFormatResult,
} from "./pluginInterface";

/**
 * shfmt 纯插件
 */
export class PureShfmtPlugin extends BaseFormatPlugin {
    name = "shfmt";
    displayName = "Shell Formatter";
    version = "1.0.0";
    description = "Format and check shell scripts using shfmt";

    private tool: ShfmtTool;
    private defaultShfmtOptions: ShfmtFormatOptions;
    private watcher?: vscode.FileSystemWatcher;
    constructor(shfmtPath: string, indent: number | undefined) {
        super();
        this.tool = new ShfmtTool(shfmtPath);
        this.defaultShfmtOptions = this.buildDefaultShfmtOptions();
        logger.info(
            `PureShfmtPlugin initialized with path: ${shfmtPath}, default indent: ${indent}`,
        );
    }

    buildDefaultShfmtOptions(): ShfmtFormatOptions {
        return {
            indent: SettingInfo.getRealTabSize(),
            binaryNextLine: true,
            caseIndent: true,
            spaceRedirects: true,
        };
    }

    /**
     * 检查 shfmt 是否可用
     */
    async isAvailable(): Promise<boolean> {
        try {
            await this.tool.check("-", {
                ...this.defaultShfmtOptions,
                content: "# test",
            });
            return true;
        } catch (error) {
            logger.warn(`shfmt is not available: ${String(error)}`);
            return false;
        }
    }

    /**
     * 格式化文档
     */
    async format(
        document: vscode.TextDocument,
        options: PluginFormatOptions,
    ): Promise<PluginFormatResult> {
        logger.debug(
            `PureShfmtPlugin.format called with options: ${JSON.stringify(options)}`,
        );

        const timer = startTimer(PERFORMANCE_METRICS.SHFMT_FORMAT_DURATION);
        try {
            const result = await this.tool.format("-", {
                ...this.defaultShfmtOptions,
                token: options.token,
                content: document.getText(),
            });

            timer.stop();
            logger.debug(`PureShfmtPlugin.format completed`);

            return this.createFormatResult(
                result,
                document,
                this.getDiagnosticSource(),
            );
        } catch (error) {
            timer.stop();
            logger.error(`PureShfmtPlugin.format failed: ${String(error)}`);
            return this.handleFormatError(document, error);
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
            `PureShfmtPlugin.check called with options: ${JSON.stringify(options)}`,
        );
        const timer = startTimer(PERFORMANCE_METRICS.SHFMT_DIAGNOSE_DURATION);
        try {
            const result = await this.tool.check("-", {
                ...this.defaultShfmtOptions,
                token: options.token,
                content: document.getText(),
            });

            timer.stop();
            logger.debug(`PureShfmtPlugin.check completed`);

            return this.createCheckResult(
                result,
                document,
                this.getDiagnosticSource(),
            );
        } catch (error) {
            timer.stop();
            logger.error(`PureShfmtPlugin.check failed: ${String(error)}`);
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
                        this.defaultShfmtOptions = this.buildDefaultShfmtOptions();
                        logger.debug(
                            `${this.name} reloaded default options with new indent`,
                        );
                    }
                },
            );
            logger.debug(`${this.name} subscribed to config:change messages`);
        }
    }

    /**
     * 插件停用时的钩子
     * 不仅清理文件系统监视器，也需要取消消息订阅
     */
    async onDeactivate(): Promise<void> {
        logger.info(`${this.name} plugin deactivated`);

        // 取消配置变更消息订阅
        if (this.messageBus && this.configChangeSubId) {
            this.messageBus.unsubscribe(this.configChangeSubId);
            this.configChangeSubId = undefined;
            logger.debug(`${this.name} unsubscribed from config:change messages`);
        }

        // 清理资源
        if (this.watcher) {
            this.watcher.dispose();
            this.watcher = undefined;
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
