/**
 * 性能监控集成模块
 *
 * 为关键操作提供便捷的性能监控接口
 * 统一管理性能指标的记录和报告
 */

import { logger } from "../log";
import {
    AlertHandler,
    AlertLevel,
    AlertStats,
    PerformanceAlert,
    getAlertManager,
    resetAlertManager,
    setAlertManager,
} from "./alertManager";
import { PerformanceTimer, performanceMonitor, startTimer } from "./monitor";

/**
 * 性能监控装饰器
 * 用于装饰函数，自动记录其执行时间
 *
 * @param metricName 指标名称
 * @returns 方法装饰器
 */
export function measurePerformance(metricName: string): MethodDecorator {
    return function (
        _target: object,
        propertyKey: string | symbol,
        descriptor: PropertyDescriptor,
    ): PropertyDescriptor {
        const originalMethod = descriptor.value as (
            ...args: unknown[]
        ) => Promise<unknown>;

        descriptor.value = async function (...args: unknown[]) {
            const timer = new PerformanceTimer(metricName, performanceMonitor);
            logger.debug(`Starting ${metricName} for ${String(propertyKey)}`);

            try {
                return await originalMethod.apply(this, args);
            } finally {
                const duration = timer.stop();
                logger.debug(
                    `Completed ${metricName} for ${String(propertyKey)}: ${duration}ms`,
                );
            }
        };

        return descriptor;
    };
}

/**
 * 性能监控包装函数
 * 包装一个异步函数，记录其执行时间
 *
 * @param metricName 指标名称
 * @param fn 要包装的异步函数
 * @returns 包装后的异步函数
 */
export function wrapAsync<T>(
    metricName: string,
    fn: (...args: unknown[]) => Promise<T>,
): (...args: unknown[]) => Promise<T> {
    return async function (this: unknown, ...args: unknown[]): Promise<T> {
        const timer = new PerformanceTimer(metricName, performanceMonitor);
        logger.debug(`Starting ${metricName}`);

        try {
            const result = await fn.apply(this, args);
            const duration = timer.stop();
            logger.debug(`Completed ${metricName}: ${duration}ms`);
            return result;
        } catch (error) {
            const duration = timer.stop();
            logger.error(
                `Failed ${metricName} after ${duration}ms: ${String(error)}`,
            );
            throw error;
        }
    };
}

/**
 * 性能监控包装函数（使用 startTimer 便捷函数）
 * 包装一个异步函数，记录其执行时间
 *
 * @param metricName 指标名称
 * @param fn 要包装的异步函数
 * @returns 包装后的异步函数
 */
export function measureAsync<T>(
    metricName: string,
    fn: (...args: unknown[]) => Promise<T>,
): (...args: unknown[]) => Promise<T> {
    return async function (this: unknown, ...args: unknown[]): Promise<T> {
        const timer = startTimer(metricName);
        logger.debug(`Starting ${metricName}`);

        try {
            const result = await fn.apply(this, args);
            const duration = timer.stop();
            logger.debug(`Completed ${metricName}: ${duration}ms`);
            return result;
        } catch (error) {
            const duration = timer.stop();
            logger.error(
                `Failed ${metricName} after ${duration}ms: ${String(error)}`,
            );
            throw error;
        }
    };
}

/**
 * 同步函数性能监控包装
 * 包装一个同步函数，记录其执行时间
 *
 * @param metricName 指标名称
 * @param fn 要包装的同步函数
 * @returns 包装后的同步函数
 */
export function wrapSync<T>(
    metricName: string,
    fn: (...args: unknown[]) => T,
): (...args: unknown[]) => T {
    return function (this: unknown, ...args: unknown[]): T {
        const timer = new PerformanceTimer(metricName, performanceMonitor);
        logger.debug(`Starting ${metricName}`);

        try {
            const result = fn.apply(this, args);
            const duration = timer.stop();
            logger.debug(`Completed ${metricName}: ${duration}ms`);
            return result;
        } catch (error) {
            const duration = timer.stop();
            logger.error(
                `Failed ${metricName} after ${duration}ms: ${String(error)}`,
            );
            throw error;
        }
    };
}

/**
 * 性能监控上下文管理器
 * 使用 async/await 确保性能监控在函数执行前后正确记录
 *
 * @param metricName 指标名称
 * @returns 异步上下文管理器
 */
export class PerformanceScope {
    private timer: PerformanceTimer;
    private metricName: string;

    constructor(metricName: string) {
        this.metricName = metricName;
        this.timer = new PerformanceTimer(metricName, performanceMonitor);
        logger.debug(`Starting performance scope: ${metricName}`);
    }

    /**
     * 停止计时并记录
     */
    end(): number {
        const duration = this.timer.stop();
        logger.debug(`Ended performance scope ${this.metricName}: ${duration}ms`);
        return duration;
    }

    /**
     * 停止计时并记录（异步）
     */
    async endAsync(): Promise<number> {
        const duration = await this.timer.stopAsync();
        logger.debug(`Ended performance scope ${this.metricName}: ${duration}ms`);
        return duration;
    }
}

/**
 * 创建性能监控作用域
 * 推荐使用 with 语句或 try-finally 确保正确清理
 *
 * @param metricName 指标名称
 * @returns 性能监控作用域
 */
export function createPerformanceScope(metricName: string): PerformanceScope {
    return new PerformanceScope(metricName);
}

/**
 * 记录自定义指标
 * @param metricName 指标名称
 * @param value 指标值
 */
export function recordMetric(metricName: string, value: number): void {
    performanceMonitor.recordMetric(metricName, value);
    logger.debug(`Recorded metric ${metricName}: ${value}`);
}

/**
 * 获取性能报告
 * @returns 性能报告字符串
 */
export function getPerformanceReport(): string {
    return performanceMonitor.generateReport();
}

/**
 * 获取指定指标的平均值
 * @param metricName 指标名称
 * @returns 平均值，如果指标不存在则返回 null
 */
export function getAverageMetric(metricName: string): number | null {
    return performanceMonitor.getAverageMetric(metricName);
}

/**
 * 获取指定指标的统计信息
 * @param metricName 指标名称
 * @returns 指标数据，如果指标不存在则返回 null
 */
export function getMetricData(metricName: string) {
    return performanceMonitor.getMetric(metricName);
}

/**
 * 获取所有指标名称
 * @returns 指标名称数组
 */
export function getAllMetricNames(): string[] {
    return performanceMonitor.getAllMetricNames();
}

/**
 * 重置所有性能指标
 * 主要用于测试或重新开始性能监控
 */
export function resetMetrics(): void {
    logger.info("Resetting all performance metrics");
    performanceMonitor.reset();
}

/**
 * 重置指定指标
 * @param metricName 指标名称
 */
export function resetMetric(metricName: string): void {
    logger.info(`Resetting performance metric: ${metricName}`);
    performanceMonitor.resetMetric(metricName);
}

/**
 * 启用性能监控
 */
export function enablePerformanceMonitoring(): void {
    logger.info("Enabling performance monitoring");
    performanceMonitor.enable();
}

/**
 * 禁用性能监控
 */
export function disablePerformanceMonitoring(): void {
    logger.info("Disabling performance monitoring");
    performanceMonitor.disable();
}

/**
 * 检查性能监控是否启用
 * @returns 是否启用
 */
export function isPerformanceMonitoringEnabled(): boolean {
    // performanceMonitor 具有 isEnabled 属性，通过接口定义而不是类型转换
    const monitor = performanceMonitor as unknown as { isEnabled: boolean };
    return monitor.isEnabled ?? false;
}

/**
 * 性能告警相关函数
 */

/**
 * 启用性能告警
 * 默认告警阈值在 alertManager.ts 中定义
 */
export function enablePerformanceAlerts(): void {
    logger.info("Enabling performance alerts");
    // 告警管理器会在性能计时器停止时自动检查
}

/**
 * 禁用性能告警
 */
export function disablePerformanceAlerts(): void {
    logger.info("Disabling performance alerts");
    getAlertManager().clear();
}

/**
 * 注册告警处理器
 * 当性能超过阈值时，处理器会被调用
 *
 * @param handler 告警处理器
 *
 * 使用示例：
 * ```typescript
 * onPerformanceAlert((alert) => {
 *   console.log(`Performance alert: ${alert.metricName} = ${alert.value}ms`);
 * });
 * ```
 */
export function onPerformanceAlert(handler: AlertHandler): void {
    getAlertManager().onAlert(handler);
    logger.info(`Performance alert handler registered`);
}

/**
 * 设置告警阈值
 *
 * @param metricName 指标名称
 * @param threshold 阈值（毫秒）
 * @param level 告警级别（可选，默认 MEDIUM）
 *
 * 使用示例：
 * ```typescript
 * setAlertThreshold("format_duration", 2000, AlertLevel.MEDIUM);
 * ```
 */
export function setAlertThreshold(
    metricName: string,
    threshold: number,
    level: AlertLevel = AlertLevel.MEDIUM,
): void {
    logger.info(
        `Setting alert threshold for ${metricName}: ${threshold}ms (${level})`,
    );
    // 注意：这里需要扩展 alertManager 以支持单个阈值设置
    // 当前实现使用多个级别阈值，这里仅作为占位符
}

/**
 * 获取告警历史
 *
 * @param limit 限制返回的告警数量（可选）
 * @returns 告警列表
 *
 * 使用示例：
 * ```typescript
 * const alerts = getPerformanceAlerts(10);
 * console.log(`Recent alerts: ${alerts.length}`);
 * ```
 */
export function getPerformanceAlerts(limit?: number): PerformanceAlert[] {
    return getAlertManager().getAlerts(limit);
}

/**
 * 获取告警统计信息
 *
 * @returns 告警统计
 *
 * 使用示例：
 * ```typescript
 * const stats = getAlertStats();
 * console.log(`Total alerts: ${stats.total}`);
 * console.log(`Critical: ${stats.byLevel.CRITICAL}`);
 * ```
 */
export function getAlertStats(): AlertStats {
    return getAlertManager().getAlertStats();
}

/**
 * 清除告警历史
 */
export function clearAlertHistory(): void {
    logger.info("Clearing alert history");
    getAlertManager().clear();
}

/**
 * 设置全局告警管理器（主要用于测试）
 */
export { resetAlertManager, setAlertManager };
