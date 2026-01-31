/**
 * 性能监控服务
 *
 * 职责：
 * - 提供性能计时器的便捷访问
 * - 提供具有业务逻辑的性能分析功能
 *
 * 使用场景：
 * - 启动性能计时
 * - 生成性能摘要和健康检查报告
 *
 * 注意：
 * - 性能指标名称常量从 domain 层导入（PERFORMANCE_METRICS）
 * - utils/performance/integration.ts 提供的通用工具函数应直接从 utils 层导入
 */

import { t } from "../../i18n";
import { logger } from "../../utils/log";
import {
    getAllMetricNames,
    getMetricData,
    isPerformanceMonitoringEnabled,
} from "../../utils/performance/integration";
import { MetricData, startTimer as utilsStartTimer } from "../../utils/performance/monitor";

// 重新导出 domain 层的性能指标常量和 MetricData
export { PERFORMANCE_METRICS } from "../../shared/performance-metrics";
export type { MetricData };

/**
 * 性能统计信息
 */
export interface PerformanceStats {
    /** 总指标数 */
    totalMetrics: number;
    /** 所有指标数据 */
    metrics: MetricData[];
    /** 监控是否启用 */
    monitoringEnabled: boolean;
}

/**
 * 创建性能计时器
 *
 * @param metricName 指标名称
 * @returns 性能计时器
 */
export function startTimer(metricName: string) {
    logger.debug(`Starting timer for metric: ${metricName}`);
    return utilsStartTimer(metricName);
}

/**
 * 获取性能统计信息
 *
 * @returns 性能统计信息
 */
export async function getPerformanceStats(): Promise<PerformanceStats> {
    const metricNames = getAllMetricNames();
    const metrics: MetricData[] = [];

    for (const name of metricNames) {
        const metric = getMetricData(name);
        if (metric) {
            metrics.push(metric);
        }
    }

    return {
        totalMetrics: metricNames.length,
        metrics,
        monitoringEnabled: isPerformanceMonitoringEnabled(),
    };
}

/**
 * 获取性能摘要（用于快速查看）
 *
 * @returns 性能摘要文本
 */
export async function getPerformanceSummary(): Promise<string> {
    const stats = await getPerformanceStats();

    const lines: string[] = [];
    lines.push(t("performance.summaryTitle"));
    lines.push("");
    lines.push(t("performance.monitoring", {
        status: stats.monitoringEnabled ? t("common.enabled") : t("common.disabled")
    }));
    lines.push(t("performance.totalMetrics", { count: stats.totalMetrics }));
    lines.push("");

    if (stats.metrics.length > 0) {
        lines.push(t("performance.topMetrics"));
        const sortedMetrics = [...stats.metrics]
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        for (const metric of sortedMetrics) {
            lines.push(t("performance.metricLine", {
                name: metric.name,
                count: metric.count,
                avg: metric.avg.toFixed(2)
            }));
        }
        lines.push("");
    }

    lines.push("========================");

    return lines.join("\n");
}

/**
 * 检查系统性能健康状况
 *
 * @returns 健康状态字符串
 */
export async function checkPerformanceHealth(): Promise<string> {
    const stats = await getPerformanceStats();

    const issues: string[] = [];

    // 检查是否有超过阈值的指标
    for (const metric of stats.metrics) {
        if (metric.avg > 5000) {
            issues.push(
                `Metric "${metric.name}" has high average (${metric.avg.toFixed(2)}ms)`,
            );
        }
    }

    if (issues.length === 0) {
        return "Performance health: OK (no issues detected)";
    }

    return `Performance health: ISSUES DETECTED\n${issues.map((i) => `  - ${i}`).join("\n")}`;
}

/**
 * 生成并显示性能报告
 *
 * @param showContent 显示内容的回调函数（用于输出报告内容）
 */
export async function showPerformanceReport(showContent: (content: string) => void): Promise<void> {
    const {
        getPerformanceReport,
        getAlertStats,
    } = await import("../../utils/performance/integration");

    const report = getPerformanceReport();
    const stats = await getPerformanceStats();
    const alertStats = getAlertStats();
    const summary = await getPerformanceSummary();

    const lines: string[] = [];
    lines.push("=".repeat(60));
    lines.push(t("performance.title"));
    lines.push("=".repeat(60));
    lines.push("");
    lines.push(t("performance.reportGenerated", { date: new Date().toLocaleString() }));
    lines.push("");
    lines.push(summary);
    lines.push("");
    lines.push(t("performance.detailedReport"));
    lines.push("");
    lines.push(t("performance.totalMetricsLabel", { count: stats.totalMetrics }));
    lines.push(t("performance.totalAlerts", { count: alertStats.total }));
    lines.push("");
    lines.push(report);
    lines.push("=".repeat(60));

    const content = lines.join("\n");
    showContent(content);

    logger.info(t("performance.reportGeneratedLog"));
}
