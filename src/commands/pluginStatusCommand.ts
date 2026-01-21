/**
 * 插件状态命令模块
 * 提供查看插件状态的命令
 */

import * as vscode from "vscode";
import { SettingInfo } from "../config";
import { getContainer, ServiceNames } from "../di";
import { PluginManager } from "../plugins";
import { logger } from "../utils/log";

/**
 * 注册插件状态命令
 */
export function registerPluginStatusCommand(): vscode.Disposable {
    logger.info("Registering plugin status command");
    return vscode.commands.registerCommand(
        "shell-format.showPluginStatus",
        async () => {
            logger.info("Show plugin status command triggered");
            showPluginStatus();
        },
    );
}

/**
 * 显示插件状态
 */
function showPluginStatus(): void {
    const container = getContainer();
    const pluginManager = container.resolve<PluginManager>(
        ServiceNames.PLUGIN_MANAGER,
    );
    const stats = pluginManager.getStats();

    // 构建状态报告
    const report: string[] = [];
    report.push("=".repeat(60));
    report.push("Shell Format - Plugin Status");
    report.push("=".repeat(60));
    report.push("");

    // 配置状态
    report.push("Configuration:");
    report.push(
        `  shfmt: ${SettingInfo.isShfmtEnabled() ? "Enabled" : "Disabled"}`,
    );
    report.push(
        `  shellcheck: ${SettingInfo.isShellcheckEnabled() ? "Enabled" : "Disabled"}`,
    );
    report.push("");

    // 注册插件
    report.push(`Registered Plugins: ${stats.total}`);
    report.push("-".repeat(60));

    if (stats.plugins.length === 0) {
        report.push("  No plugins registered");
    } else {
        for (const plugin of stats.plugins) {
            const status = plugin.active ? "✓ Active" : "✗ Inactive";
            report.push(
                `  ${plugin.name} (${plugin.displayName} v${plugin.version}) - ${status}`,
            );
        }
    }

    report.push("");
    report.push(`Active Plugins: ${stats.active}`);
    report.push("=".repeat(60));

    // 创建输出通道显示状态报告
    const outputChannel = vscode.window.createOutputChannel(
        "Shell Format Plugin Status",
    );
    outputChannel.appendLine(report.join("\n"));
    outputChannel.show();

    logger.info("Plugin status displayed");
}
