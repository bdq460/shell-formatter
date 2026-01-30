import { setLogger } from '../../../src/utils/log';

setLogger({
    debug: () => { },
    info: () => { },
    warn: () => { },
    error: () => { },
});

import {
    clearAlertHistory,
    createPerformanceScope,
    disablePerformanceAlerts,
    disablePerformanceMonitoring,
    enablePerformanceAlerts,
    enablePerformanceMonitoring,
    getAlertStats,
    getAllMetricNames,
    getAverageMetric,
    getMetricData,
    getPerformanceAlerts,
    getPerformanceReport,
    isPerformanceMonitoringEnabled,
    measureAsync,
    measurePerformance,
    onPerformanceAlert,
    recordMetric,
    resetAlertManager,
    resetMetric,
    resetMetrics,
    setAlertManager,
    setAlertThreshold,
    wrapAsync,
    wrapSync,
} from '../../../src/utils/performance/integration';

setAlertManager({
    check: () => { },
    clear: () => { },
    onAlert: () => { },
    getAlerts: () => [],
    getAlertStats: () => ({
        total: 0,
        byLevel: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
        byMetric: {},
    }),
} as any);

describe('performance integration', () => {
    beforeEach(() => {
        resetMetrics();
    });

    it('should wrap async functions and return result', async () => {
        const wrapped = wrapAsync<number>('async_metric', async (value: unknown) => (value as number) + 1);
        const result = await wrapped(1);
        expect(result).toBe(2);
    });

    it('should wrap sync functions and return result', () => {
        const wrapped = wrapSync<number>('sync_metric', (value: unknown) => (value as number) * 2);
        const result = wrapped(3);
        expect(result).toBe(6);
    });

    it('should measure async functions using measureAsync', async () => {
        const wrapped = measureAsync('measure_metric', async () => 'ok');
        const result = await wrapped();
        expect(result).toBe('ok');
    });

    it('should record metrics and report', () => {
        recordMetric('custom', 12);
        const report = getPerformanceReport();
        expect(report.includes('custom')).toBe(true);
        expect(getAverageMetric('custom')).toBe(12);
        expect(getMetricData('custom')).toBeTruthy();
        expect(getAllMetricNames().includes('custom')).toBe(true);
    });

    it('should reset specific metrics', () => {
        recordMetric('a', 1);
        recordMetric('b', 2);
        resetMetric('a');
        expect(getMetricData('a')).toBe(null);
        expect(getMetricData('b')).toBeTruthy();
    });

    it('should handle performance scope', async () => {
        const scope = createPerformanceScope('scope_metric');
        const duration = scope.end();
        expect(duration).toBeGreaterThanOrEqual(0);

        const asyncScope = createPerformanceScope('scope_metric_async');
        const durationAsync = await asyncScope.endAsync();
        expect(durationAsync).toBeGreaterThanOrEqual(0);
    });

    it('should toggle monitoring enabled state', () => {
        disablePerformanceMonitoring();
        expect(isPerformanceMonitoringEnabled()).toBe(false);
        enablePerformanceMonitoring();
        expect(isPerformanceMonitoringEnabled()).toBe(true);
    });

    it('should expose alert APIs', () => {
        const alerts = getPerformanceAlerts(5);
        const stats = getAlertStats();
        clearAlertHistory();
        expect(Array.isArray(alerts)).toBe(true);
        expect(stats.total >= 0).toBe(true);
    });

    it('should handle errors in wrapAsync', async () => {
        const wrapped = wrapAsync<void>('error_async', async () => {
            throw new Error('test error');
        });
        await expect(wrapped()).rejects.toThrow('test error');
    });

    it('should handle errors in measureAsync', async () => {
        const wrapped = measureAsync('error_measure', async () => {
            throw new Error('measure error');
        });
        await expect(wrapped()).rejects.toThrow('measure error');
    });

    it('should handle errors in wrapSync', () => {
        const wrapped = wrapSync<void>('error_sync', () => {
            throw new Error('sync error');
        });
        expect(() => wrapped()).toThrow('sync error');
    });

    it('should use measurePerformance decorator via descriptor', async () => {
        const testFn = async () => 'result';
        const descriptor: PropertyDescriptor = {
            value: testFn,
            writable: true,
            enumerable: true,
            configurable: true,
        };

        const decoratedDescriptor = measurePerformance('decorator_metric')(
            {},
            'testMethod',
            descriptor,
        ) as PropertyDescriptor;

        const result = await decoratedDescriptor.value();
        expect(result).toBe('result');
        // 验证指标已记录
        expect(getAllMetricNames().includes('decorator_metric')).toBe(true);
    });

    it('should call alert-related functions', () => {
        enablePerformanceAlerts();
        disablePerformanceAlerts();
        onPerformanceAlert(() => { });
        setAlertThreshold('test_metric', 1000);
        // 这些函数主要是logger调用，验证不抛出错误即可
        expect(true).toBe(true);
    });

    it('should export and call alert manager functions', () => {
        // 验证重新导出的函数能够被调用
        const mockAlertManager = {
            check: () => { },
            clear: () => { },
            onAlert: () => { },
            getAlerts: () => [],
            getAlertStats: () => ({
                total: 0,
                byLevel: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
                byMetric: {},
            }),
        };

        setAlertManager(mockAlertManager as any);
        resetAlertManager();

        // 验证函数存在且可调用
        expect(typeof setAlertManager).toBe('function');
        expect(typeof resetAlertManager).toBe('function');
    });
});
