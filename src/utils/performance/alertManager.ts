/**
 * 性能告警管理器
 *
 * 职责：
 * - 监控性能指标，超过阈值时触发告警
 * - 支持多级别告警（LOW, MEDIUM, HIGH, CRITICAL）
 * - 提供告警统计和查询功能
 *
 * 使用场景：
 * - 监控格式化、诊断等关键操作的性能
 * - 及时发现性能瓶颈并告警
 * - 收集性能数据用于分析和优化
 */

import { logger } from "../log";

/**
 * 告警级别
 */
export enum AlertLevel {
    LOW = "LOW",
    MEDIUM = "MEDIUM",
    HIGH = "HIGH",
    CRITICAL = "CRITICAL",
}

/**
 * 性能告警
 */
export interface PerformanceAlert {
    /** 告警 ID */
    id: string;

    /** 指标名称 */
    metricName: string;

    /** 指标值 */
    value: number;

    /** 阈值 */
    threshold: number;

    /** 告警级别 */
    level: AlertLevel;

    /** 告警时间 */
    timestamp: number;

    /** 告警消息 */
    message: string;
}

/**
 * 告警阈值配置
 */
export interface AlertThresholdConfig {
    /** 指标名称 */
    metricName: string;

    /** 低级别阈值 */
    lowThreshold?: number;

    /** 中级别阈值 */
    mediumThreshold?: number;

    /** 高级别阈值 */
    highThreshold?: number;

    /** 严重级别阈值 */
    criticalThreshold?: number;
}

/**
 * 告警处理器
 *
 * 类型说明：
 * - 接收 PerformanceAlert 类型的告警对象
 * - 返回 void 或 Promise<void>（支持同步和异步）
 */
export type AlertHandler = (alert: PerformanceAlert) => void | Promise<void>;

/**
 * 告警统计
 */
export interface AlertStats {
    /** 总告警数 */
    total: number;

    /** 按级别统计 */
    byLevel: Record<AlertLevel, number>;

    /** 按指标统计 */
    byMetric: Record<string, number>;
}

/**
 * 性能告警管理器
 */
export class PerformanceAlertManager {
    /** 告警处理器列表 */
    private handlers: AlertHandler[] = [];

    /** 告警历史 */
    private alerts: PerformanceAlert[] = [];

    /** 阈值配置 */
    private thresholds = new Map<string, AlertThresholdConfig>();

    /** 最大告警历史记录数 */
    private maxHistorySize: number = 1000;

    /** 告警统计 */
    private stats: AlertStats = {
        total: 0,
        byLevel: {
            [AlertLevel.LOW]: 0,
            [AlertLevel.MEDIUM]: 0,
            [AlertLevel.HIGH]: 0,
            [AlertLevel.CRITICAL]: 0,
        },
        byMetric: {},
    };

    constructor(maxHistorySize: number = 1000) {
        this.maxHistorySize = maxHistorySize;
        this.initializeDefaultThresholds();
        logger.info("PerformanceAlertManager initialized");
    }

    /**
     * 注册告警阈值
     */
    registerThreshold(config: AlertThresholdConfig): void {
        this.thresholds.set(config.metricName, config);
        logger.debug(`Registered threshold for metric: ${config.metricName}`);
    }

    /**
     * 检查指标并触发告警
     */
    check(metricName: string, value: number): void {
        const config = this.thresholds.get(metricName);
        if (!config) {
            return; // 没有配置阈值，不检查
        }

        const alert = this.createAlert(metricName, value, config);
        if (alert) {
            this.triggerAlert(alert);
        }
    }

    /**
     * 注册告警处理器
     */
    onAlert(handler: AlertHandler): void {
        this.handlers.push(handler);
        logger.debug(`Alert handler registered, total: ${this.handlers.length}`);
    }

    /**
     * 获取告警历史
     */
    getAlerts(limit?: number): PerformanceAlert[] {
        if (limit !== undefined) {
            return this.alerts.slice(-limit);
        }
        return [...this.alerts];
    }

    /**
     * 获取告警统计
     */
    getAlertStats(): AlertStats {
        return {
            total: this.stats.total,
            byLevel: { ...this.stats.byLevel },
            byMetric: { ...this.stats.byMetric },
        };
    }

    /**
     * 清除告警历史
     */
    clear(): void {
        this.alerts = [];
        this.stats = {
            total: 0,
            byLevel: {
                [AlertLevel.LOW]: 0,
                [AlertLevel.MEDIUM]: 0,
                [AlertLevel.HIGH]: 0,
                [AlertLevel.CRITICAL]: 0,
            },
            byMetric: {},
        };
        logger.info("Alert history cleared");
    }

    /**
     * 初始化默认阈值配置
     */
    private initializeDefaultThresholds(): void {
        const defaults: AlertThresholdConfig[] = [
            {
                metricName: "diagnose_one_doc_duration",
                criticalThreshold: 10000, // 10秒
                highThreshold: 5000, // 5秒
                mediumThreshold: 3000, // 3秒
            },
            {
                metricName: "diagnose_all_docs_duration",
                criticalThreshold: 60000, // 60秒
                highThreshold: 30000, // 30秒
                mediumThreshold: 20000, // 20秒
            },
            {
                metricName: "format_duration",
                criticalThreshold: 5000, // 5秒
                highThreshold: 3000, // 3秒
                mediumThreshold: 2000, // 2秒
            },
            {
                metricName: "shfmt_format_duration",
                criticalThreshold: 3000, // 3秒
                highThreshold: 2000, // 2秒
                mediumThreshold: 1000, // 1秒
            },
            {
                metricName: "shfmt_diagnose_duration",
                criticalThreshold: 5000, // 5秒
                highThreshold: 3000, // 3秒
                mediumThreshold: 2000, // 2秒
            },
            {
                metricName: "shellcheck_diagnose_duration",
                criticalThreshold: 10000, // 10秒
                highThreshold: 5000, // 5秒
                mediumThreshold: 3000, // 3秒
            },
            {
                metricName: "plugin_load_duration",
                criticalThreshold: 10000, // 10秒
                highThreshold: 5000, // 5秒
                mediumThreshold: 2000, // 2秒
            },
            {
                metricName: "service_init_duration",
                criticalThreshold: 10000, // 10秒
                highThreshold: 5000, // 5秒
                mediumThreshold: 3000, // 3秒
            },
        ];

        defaults.forEach((config) => this.registerThreshold(config));
        logger.info(
            `Initialized ${defaults.length} default threshold configurations`,
        );
    }

    /**
     * 创建告警
     */
    private createAlert(
        metricName: string,
        value: number,
        config: AlertThresholdConfig,
    ): PerformanceAlert | null {
        let level: AlertLevel | null = null;

        // 从高到低检查阈值
        if (config.criticalThreshold && value >= config.criticalThreshold) {
            level = AlertLevel.CRITICAL;
        } else if (config.highThreshold && value >= config.highThreshold) {
            level = AlertLevel.HIGH;
        } else if (config.mediumThreshold && value >= config.mediumThreshold) {
            level = AlertLevel.MEDIUM;
        } else if (config.lowThreshold && value >= config.lowThreshold) {
            level = AlertLevel.LOW;
        }

        if (!level) {
            return null; // 未超过阈值
        }

        const threshold =
            config.criticalThreshold ||
            config.highThreshold ||
            config.mediumThreshold ||
            config.lowThreshold!;

        return {
            id: this.generateAlertId(),
            metricName,
            value,
            threshold,
            level,
            timestamp: Date.now(),
            message: `Performance alert: ${metricName} = ${value}ms (threshold: ${threshold}ms, level: ${level})`,
        };
    }

    /**
     * 触发告警
     */
    private async triggerAlert(alert: PerformanceAlert): Promise<void> {
        // 添加到历史
        this.alerts.push(alert);

        // 更新统计
        this.stats.total++;
        this.stats.byLevel[alert.level]++;
        this.stats.byMetric[alert.metricName] =
            (this.stats.byMetric[alert.metricName] || 0) + 1;

        // 限制历史大小
        if (this.alerts.length > this.maxHistorySize) {
            this.alerts.shift();
        }

        // 记录日志
        logger.warn(`[PerformanceAlert] ${alert.message}`);

        // 通知处理器
        for (const handler of this.handlers) {
            try {
                const result = handler(alert);
                if (result instanceof Promise) {
                    await result;
                }
            } catch (error) {
                logger.error(`Error in alert handler: ${String(error)}`);
            }
        }
    }

    /**
     * 生成告警 ID
     */
    private generateAlertId(): string {
        return `alert_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    }
}

/**
 * 全局告警管理器实例
 */
let globalAlertManager: PerformanceAlertManager | null = null;

/**
 * 获取全局告警管理器
 */
export function getAlertManager(): PerformanceAlertManager {
    if (!globalAlertManager) {
        globalAlertManager = new PerformanceAlertManager();
    }
    return globalAlertManager;
}

/**
 * 设置全局告警管理器（主要用于测试）
 */
export function setAlertManager(manager: PerformanceAlertManager): void {
    globalAlertManager = manager;
}

/**
 * 重置全局告警管理器（主要用于测试）
 */
export function resetAlertManager(): void {
    if (globalAlertManager) {
        globalAlertManager.clear();
    }
}
