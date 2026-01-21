/**
 * 性能监控模块
 * 提供性能指标收集和统计功能
 */

import { getAlertManager } from "./alertManager";

/**
 * 性能指标数据
 */
interface MetricData {
    /** 指标名称 */
    name: string;
    /** 指标值数组 */
    values: number[];
    /** 总计数 */
    count: number;
    /** 最小值 */
    min: number;
    /** 最大值 */
    max: number;
    /** 平均值 */
    avg: number;
}

/**
 * 性能监控器
 * 用于收集、记录和统计性能指标
 */
export class PerformanceMonitor {
    private static instance: PerformanceMonitor;
    private metrics: Map<string, number[]> = new Map();
    private isEnabled: boolean = true;

    /**
     * 获取 PerformanceMonitor 单例实例
     */
    static getInstance(): PerformanceMonitor {
        if (!PerformanceMonitor.instance) {
            PerformanceMonitor.instance = new PerformanceMonitor();
        }
        return PerformanceMonitor.instance;
    }

    /**
     * 启用性能监控
     */
    enable(): void {
        this.isEnabled = true;
    }

    /**
     * 禁用性能监控
     */
    disable(): void {
        this.isEnabled = false;
    }

    /**
     * 记录性能指标
     * @param name 指标名称
     * @param value 指标值（通常为毫秒）
     */
    recordMetric(name: string, value: number): void {
        if (!this.isEnabled) {
            return;
        }

        if (!this.metrics.has(name)) {
            this.metrics.set(name, []);
        }

        const values = this.metrics.get(name)!;
        values.push(value);
    }

    /**
     * 获取指标数据
     * @param name 指标名称
     * @returns 指标数据，如果指标不存在则返回 null
     */
    getMetric(name: string): MetricData | null {
        const values = this.metrics.get(name);
        if (!values || values.length === 0) {
            return null;
        }

        const count = values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);
        const avg = values.reduce((a, b) => a + b, 0) / count;

        return {
            name,
            values,
            count,
            min,
            max,
            avg,
        };
    }

    /**
     * 获取指标的平均值
     * @param name 指标名称
     * @returns 平均值，如果指标不存在则返回 null
     */
    getAverageMetric(name: string): number | null {
        const metric = this.getMetric(name);
        return metric ? metric.avg : null;
    }

    /**
     * 获取指标的总计数
     * @param name 指标名称
     * @returns 总计数，如果指标不存在则返回 null
     */
    getMetricCount(name: string): number | null {
        const values = this.metrics.get(name);
        return values ? values.length : null;
    }

    /**
     * 获取所有指标名称
     * @returns 指标名称数组
     */
    getAllMetricNames(): string[] {
        return Array.from(this.metrics.keys());
    }

    /**
     * 获取所有指标数据
     * @returns 指标数据数组
     */
    getAllMetrics(): MetricData[] {
        const result: MetricData[] = [];
        for (const name of this.getAllMetricNames()) {
            const metric = this.getMetric(name);
            if (metric) {
                result.push(metric);
            }
        }
        return result;
    }

    /**
     * 重置所有指标
     */
    reset(): void {
        this.metrics.clear();
    }

    /**
     * 重置指定指标
     * @param name 指标名称
     */
    resetMetric(name: string): void {
        this.metrics.delete(name);
    }

    /**
     * 生成性能报告
     * @returns 性能报告字符串
     */
    generateReport(): string {
        const metrics = this.getAllMetrics();
        if (metrics.length === 0) {
            return "No performance metrics collected.";
        }

        const lines: string[] = [];
        lines.push("=== Performance Report ===");
        lines.push("");

        for (const metric of metrics) {
            lines.push(`${metric.name}:`);
            lines.push(`  Count:  ${metric.count}`);
            lines.push(`  Avg:    ${metric.avg.toFixed(2)}ms`);
            lines.push(`  Min:    ${metric.min.toFixed(2)}ms`);
            lines.push(`  Max:    ${metric.max.toFixed(2)}ms`);
            lines.push("");
        }

        return lines.join("\n");
    }
}

/**
 * 性能计时器
 * 用于简化性能测量的辅助类
 */
export class PerformanceTimer {
    private name: string;
    private startTime: number;
    private monitor: PerformanceMonitor;

    /**
     * 创建性能计时器
     * @param name 指标名称
     * @param monitor 性能监控器（默认使用单例）
     */
    constructor(name: string, monitor?: PerformanceMonitor) {
        this.name = name;
        this.startTime = Date.now();
        this.monitor = monitor || PerformanceMonitor.getInstance();
    }

    /**
     * 停止计时并记录指标
     * @returns 耗时（毫秒）
     */
    stop(): number {
        const duration = Date.now() - this.startTime;
        this.monitor.recordMetric(this.name, duration);
        // 触发告警检查
        getAlertManager().check(this.name, duration);
        return duration;
    }

    /**
     * 停止计时并记录指标，同时返回可等待的 Promise
     * @returns 耗时的 Promise（毫秒）
     */
    async stopAsync(): Promise<number> {
        const duration = Date.now() - this.startTime;
        this.monitor.recordMetric(this.name, duration);
        // 触发告警检查
        getAlertManager().check(this.name, duration);
        return duration;
    }
}

/**
 * 创建性能计时器的便捷函数
 * @param name 指标名称
 * @returns 性能计时器
 */
export function startTimer(name: string): PerformanceTimer {
    return new PerformanceTimer(name);
}

/**
 * 性能装饰器工厂
 * 用于装饰函数，自动记录其执行时间
 * @param metricName 指标名称
 * @returns 方法装饰器
 */
export function performance(metricName: string): MethodDecorator {
    return function (
        _target: object,
        _propertyKey: string | symbol,
        descriptor: PropertyDescriptor,
    ): PropertyDescriptor {
        const originalMethod = descriptor.value as (
            ...args: unknown[]
        ) => Promise<unknown>;
        const monitor = PerformanceMonitor.getInstance();

        descriptor.value = async function (...args: unknown[]) {
            const timer = new PerformanceTimer(metricName, monitor);
            try {
                return await originalMethod.apply(this, args);
            } finally {
                timer.stop();
            }
        };

        return descriptor;
    };
}

// 导出单例实例
export const performanceMonitor = PerformanceMonitor.getInstance();
