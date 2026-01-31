/**
 * 插件状态命令模块
 * 提供查看插件状态的命令注册
 */

import * as vscode from "vscode";
import { getAllPluginStatus } from "../../application";
import { PackageInfo, SettingInfo } from "../../config";
import { t } from "../../i18n";
import { logger } from "../../utils/log";

/**
 * 显示插件状态
 */
async function showPluginStatus(): Promise<void> {
    // 通过 application 层获取插件状态
    const statuses = await getAllPluginStatus();

    const report: string[] = [];
    report.push("=".repeat(60));
    report.push(t("pluginStatus.title"));
    report.push("=".repeat(60));
    report.push("");

    // 配置状态
    report.push(t("pluginStatus.configuration"));
    report.push(
        t("pluginStatus.shfmt", {
            status: SettingInfo.isShfmtEnabled() ? t("common.enabled") : t("common.disabled")
        })
    );
    report.push(
        t("pluginStatus.shellcheck", {
            status: SettingInfo.isShellcheckEnabled() ? t("common.enabled") : t("common.disabled")
        })
    );
    report.push("");

    // 注册插件
    report.push(t("pluginStatus.registeredPlugins", { count: statuses.length }));
    report.push("-".repeat(60));

    if (statuses.length === 0) {
        report.push(t("pluginStatus.noPluginsRegistered"));
    } else {
        for (const plugin of statuses) {
            const status = plugin.active ? `✓ ${t("common.active")}` : `✗ ${t("common.inactive")}`;
            report.push(
                t("pluginStatus.pluginLine", {
                    name: plugin.name,
                    displayName: plugin.displayName,
                    version: plugin.version,
                    status
                })
            );
        }
    }

    report.push("");
    const activeCount = statuses.filter(p => p.active).length;
    report.push(t("pluginStatus.activePlugins", { count: activeCount }));
    report.push("=".repeat(60));

    // 创建输出通道显示状态报告
    const outputChannel = vscode.window.createOutputChannel(
        "Shell Formatter Plugin Status",
    );
    outputChannel.appendLine(report.join("\n"));
    outputChannel.show();

    logger.info(t("pluginStatus.statusDisplayed"));
}

/**
 * 注册插件状态命令
 */
export function registerPluginStatusCommand(): vscode.Disposable {
    logger.info("Registering plugin status command");
    return vscode.commands.registerCommand(
        PackageInfo.commandShowPluginStatus,
        async () => {
            logger.info("Show plugin status command triggered");
            await showPluginStatus();
        },
    );
}
