import { setLogger } from '../../../src/utils/log';

setLogger({
    debug: () => { },
    info: () => { },
    warn: () => { },
    error: () => { },
});

import {
    AlertLevel,
    getAlertManager,
    PerformanceAlert,
    PerformanceAlertManager,
    resetAlertManager,
    setAlertManager,
} from '../../../src/utils/performance/alert-manager';

describe('PerformanceAlertManager', () => {
    it('should register thresholds and trigger alerts', async () => {
        const manager = new PerformanceAlertManager(10);
        manager.registerThreshold({
            metricName: 'test_metric',
            lowThreshold: 10,
            mediumThreshold: 20,
            highThreshold: 30,
            criticalThreshold: 40,
        });

        const alerts: any[] = [];
        manager.onAlert((alert) => { alerts.push(alert); });

        manager.check('test_metric', 5);
        manager.check('test_metric', 15);
        manager.check('test_metric', 35);

        await new Promise<void>((resolve) => setImmediate(resolve));

        expect(alerts.length).toBe(2);
        expect(alerts[0].level).toBe(AlertLevel.LOW);
        expect(alerts[1].level).toBe(AlertLevel.HIGH);
    });

    it('should maintain alert history size', async () => {
        const manager = new PerformanceAlertManager(1);
        manager.registerThreshold({
            metricName: 'limit_metric',
            lowThreshold: 1,
        });

        manager.check('limit_metric', 2);
        manager.check('limit_metric', 3);

        await new Promise<void>((resolve) => setImmediate(resolve));

        expect(manager.getAlerts().length).toBe(1);
    });

    it('should track alert statistics', async () => {
        const manager = new PerformanceAlertManager(10);
        manager.registerThreshold({
            metricName: 'stat_metric',
            mediumThreshold: 5,
        });

        manager.check('stat_metric', 6);
        await new Promise<void>((resolve) => setImmediate(resolve));

        const stats = manager.getAlertStats();
        expect(stats.total).toBe(1);
        expect(stats.byLevel[AlertLevel.MEDIUM]).toBe(1);
        expect(stats.byMetric.stat_metric).toBe(1);
    });

    it('should handle alert handler errors', async () => {
        const manager = new PerformanceAlertManager(10);
        manager.registerThreshold({
            metricName: 'error_metric',
            lowThreshold: 1,
        });

        manager.onAlert(() => {
            throw new Error('handler error');
        });

        manager.check('error_metric', 2);
        await new Promise<void>((resolve) => setImmediate(resolve));

        expect(manager.getAlerts().length).toBe(1);
    });

    it('should allow managing global alert manager', () => {
        const manager = new PerformanceAlertManager(5);
        setAlertManager(manager);
        const globalManager = getAlertManager();
        expect(globalManager).toBe(manager);
        resetAlertManager();
        expect(globalManager.getAlerts()).toEqual([]);
    });

    it('should handle getAlerts with limit', () => {
        const manager = new PerformanceAlertManager();
        manager.registerThreshold({ metricName: 'test', lowThreshold: 1 });
        manager.check('test', 2);
        manager.check('test', 3);
        manager.check('test', 4);

        const limited = manager.getAlerts(2);
        expect(limited.length).toBe(2);
    });

    it('should not trigger alert for unconfigured metric', () => {
        const manager = new PerformanceAlertManager();
        manager.check('unconfigured', 9999);
        expect(manager.getAlerts().length).toBe(0);
    });

    it('should handle async alert handler errors', async () => {
        const manager = new PerformanceAlertManager();
        manager.registerThreshold({ metricName: 'async_error', lowThreshold: 1 });

        manager.onAlert(async () => {
            throw new Error('async handler error');
        });

        manager.check('async_error', 2);
        await new Promise<void>((resolve) => setImmediate(resolve));

        // 告警应该被记录，即使handler出错
        expect(manager.getAlerts().length).toBeGreaterThan(0);
    });

    it('should trigger alert for CRITICAL threshold', () => {
        const manager = new PerformanceAlertManager();
        manager.registerThreshold({
            metricName: 'critical_metric',
            criticalThreshold: 100,
        });

        const alerts: PerformanceAlert[] = [];
        manager.onAlert((alert) => {
            alerts.push(alert);
        });

        manager.check('critical_metric', 150);
        expect(alerts.length).toBe(1);
        expect(alerts[0].level).toBe(AlertLevel.CRITICAL);
    });

    it('should preserve global alert manager singleton', () => {
        // First call should create instance
        const manager1 = getAlertManager();
        // Second call should return same instance
        const manager2 = getAlertManager();
        expect(manager1).toBe(manager2);
    });
});
