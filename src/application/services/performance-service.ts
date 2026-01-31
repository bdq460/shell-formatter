/**
 * 性能监控服务
 *
 * 职责：提供性能监控和报告功能
 * 属于应用层服务，协调性能监控的各个方面
 */

import { logger } from "../../utils/log";

/**
 * 性能指标接口
 */
export interface PerformanceMetrics {
    /** 插件加载耗时 */
    pluginLoadDuration: number;
    /** 插件执行格式化耗时 */
    pluginExecuteFormatDuration: number;
    /** 插件执行检查耗时 */
    pluginExecuteCheckDuration: number;
    /** shfmt 格式化耗时 */
    shfmtFormatDuration: number;
    /** shfmt 诊断耗时 */
    shfmtDiagnoseDuration: number;
    /** shellcheck 诊断耗时 */
    shellcheckDiagnoseDuration: number;
    /** Provider Code Actions 耗时 */
    providerCodeActionsDuration: number;
    /** DI 容器重新初始化耗时 */
    diContainerReinitializationDuration: number;
    /** 配置变更处理耗时 */
    configurationChangeHandlerDuration: number;
    /** 文档保存诊断耗时 */
    documentSaveDiagnosisDuration: number;
}

/**
 * 性能指标存储
 */
const metrics: Partial<PerformanceMetrics> = {};

/**
 * 性能计时器
 */
class PerformanceTimer {
    private startTime: number = 0;
    private metricName: keyof PerformanceMetrics;

    constructor(metricName: keyof PerformanceMetrics) {
        this.metricName = metricName;
        this.startTime = Date.now();
    }

    /**
     * 停止计时并记录结果
     */
    stop(): void {
        const duration = Date.now() - this.startTime;
        metrics[this.metricName] = duration;
        logger.debug(`Performance: ${String(this.metricName)} = ${duration}ms`);
    }
}

/**
 * 性能指标名称常量
 */
export const PERFORMANCE_METRICS: Record<
    string,
    keyof PerformanceMetrics
> = {
    PLUGIN_LOAD_DURATION: "pluginLoadDuration",
    PLUGIN_EXECUTE_FORMAT_DURATION: "pluginExecuteFormatDuration",
    PLUGIN_EXECUTE_CHECK_DURATION: "pluginExecuteCheckDuration",
    SHFMT_FORMAT_DURATION: "shfmtFormatDuration",
    SHFMT_DIAGNOSE_DURATION: "shfmtDiagnoseDuration",
    SHELLCHECK_DIAGNOSE_DURATION: "shellcheckDiagnoseDuration",
    PROVIDER_CODE_ACTIONS_DURATION: "providerCodeActionsDuration",
    DI_CONTAINER_REINITIALIZATION_DURATION:
        "diContainerReinitializationDuration",
    CONFIGURATION_CHANGE_HANDLER_DURATION: "configurationChangeHandlerDuration",
    DOCUMENT_SAVE_DIAGNOSIS_DURATION: "documentSaveDiagnosisDuration",
};

/**
 * 开始性能计时
 *
 * @param metricName 性能指标名称
 * @returns 计时器实例
 */
export function startTimer(metricName: keyof PerformanceMetrics): PerformanceTimer {
    return new PerformanceTimer(metricName);
}

/**
 * 显示性能报告
 *
 * 显示当前收集的所有性能指标，按类别分组
 */
export function showPerformanceReport(): void {
    logger.info("=== Performance Report ===");

    const entries = Object.entries(metrics);
    if (entries.length === 0) {
        logger.info("No performance metrics collected yet");
        return;
    }

    // 按类别分组
    const categories: Record<string, Array<[string, number]>> = {
        "Core Operations": [],
        "Plugin Execution": [],
        "System Lifecycle": [],
        "Event Handlers": [],
        Other: [],
    };

    for (const [name, value] of entries) {
        switch (name) {
            case "shfmtFormatDuration":
            case "shfmtDiagnoseDuration":
            case "shellcheckDiagnoseDuration":
                categories["Core Operations"].push([name, value]);
                break;
            case "pluginExecuteFormatDuration":
            case "pluginExecuteCheckDuration":
                categories["Plugin Execution"].push([name, value]);
                break;
            case "pluginLoadDuration":
            case "diContainerReinitializationDuration":
                categories["System Lifecycle"].push([name, value]);
                break;
            case "configurationChangeHandlerDuration":
            case "documentSaveDiagnosisDuration":
            case "providerCodeActionsDuration":
                categories["Event Handlers"].push([name, value]);
                break;
            default:
                categories.Other.push([name, value]);
        }
    }

    // 输出分类报告
    for (const [category, items] of Object.entries(categories)) {
        if (items.length === 0) continue;

        logger.info(`\n--- ${category} ---`);
        for (const [name, value] of items) {
            logger.info(`  ${name}: ${value}ms`);
        }

        // 计算类别总计
        const total = items.reduce((sum, [, v]) => sum + v, 0);
        logger.info(`  Total: ${total}ms`);
    }

    logger.info("\n=========================");
}

/**
 * 重置性能指标
 */
export function resetPerformanceMetrics(): void {
    Object.keys(metrics).forEach((key) => {
        delete (metrics as Record<string, number>)[key];
    });
    logger.info("Performance metrics reset");
}

/**
 * 获取性能指标
 *
 * @returns 当前性能指标的副本
 */
export function getPerformanceMetrics(): Partial<PerformanceMetrics> {
    return { ...metrics };
}
