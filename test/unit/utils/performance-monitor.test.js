import { setLogger } from '../../../src/utils/log';
setLogger({
    debug: () => { },
    info: () => { },
    warn: () => { },
    error: () => { },
});
import { PerformanceMonitor, performance, performanceMonitor, startTimer, } from '../../../src/utils/performance/monitor';
import { setAlertManager } from '../../../src/utils/performance/alertManager';
// Provide a lightweight alert manager mock to avoid side effects in timer checks
setAlertManager({
    check: () => { },
    clear: () => { },
});
describe('PerformanceMonitor', () => {
    beforeEach(() => {
        performanceMonitor.reset();
    });
    it('should record and return metrics', () => {
        performanceMonitor.recordMetric('render', 10);
        performanceMonitor.recordMetric('render', 20);
        const metric = performanceMonitor.getMetric('render');
        expect(metric).toBeTruthy();
        expect(metric.count).toBe(2);
        expect(metric.min).toBe(10);
        expect(metric.max).toBe(20);
        expect(Math.round(metric.avg)).toBe(15);
    });
    it('should return null for unknown metrics', () => {
        expect(performanceMonitor.getMetric('missing')).toBe(null);
        expect(performanceMonitor.getAverageMetric('missing')).toBe(null);
        expect(performanceMonitor.getMetricCount('missing')).toBe(null);
    });
    it('should list metric names and all metrics', () => {
        performanceMonitor.recordMetric('a', 1);
        performanceMonitor.recordMetric('b', 2);
        const names = performanceMonitor.getAllMetricNames();
        expect(names.includes('a')).toBe(true);
        expect(names.includes('b')).toBe(true);
        const metrics = performanceMonitor.getAllMetrics();
        expect(metrics.length).toBe(2);
    });
    it('should reset metrics', () => {
        performanceMonitor.recordMetric('a', 1);
        performanceMonitor.reset();
        expect(performanceMonitor.getMetric('a')).toBe(null);
    });
    it('should reset a specific metric', () => {
        performanceMonitor.recordMetric('a', 1);
        performanceMonitor.recordMetric('b', 2);
        performanceMonitor.resetMetric('a');
        expect(performanceMonitor.getMetric('a')).toBe(null);
        expect(performanceMonitor.getMetric('b')).toBeTruthy();
    });
    it('should generate report for empty metrics', () => {
        const report = performanceMonitor.generateReport();
        expect(report).toBe('No performance metrics collected.');
    });
    it('should disable and enable recording', () => {
        const monitor = PerformanceMonitor.getInstance();
        monitor.disable();
        monitor.recordMetric('disabled', 100);
        expect(monitor.getMetric('disabled')).toBe(null);
        monitor.enable();
        monitor.recordMetric('enabled', 10);
        expect(monitor.getMetric('enabled')).toBeTruthy();
    });
    it('should record metrics via timer', () => {
        const timer = startTimer('timer_metric');
        const duration = timer.stop();
        expect(duration).toBeGreaterThanOrEqual(0);
        expect(performanceMonitor.getMetric('timer_metric')).toBeTruthy();
    });
    it('should use performance decorator via descriptor', async () => {
        const testFn = async () => 123;
        const descriptor = {
            value: testFn,
            writable: true,
            enumerable: true,
            configurable: true,
        };
        const decoratedDescriptor = performance('perf_decorator')({}, 'method', descriptor);
        const result = await decoratedDescriptor.value();
        expect(result).toBe(123);
        // 验证装饰器记录了性能指标
        const metric = performanceMonitor.getMetric('perf_decorator');
        expect(metric).toBeTruthy();
        expect(metric.count).toBeGreaterThanOrEqual(1);
    });
    it('should return null for getMetricCount on non-existent metric', () => {
        expect(performanceMonitor.getMetricCount('non_existent')).toBe(null);
    });
    it('should return correct count for existing metric', () => {
        performanceMonitor.recordMetric('count_test', 10);
        performanceMonitor.recordMetric('count_test', 20);
        expect(performanceMonitor.getMetricCount('count_test')).toBe(2);
    });
});
//# sourceMappingURL=performance-monitor.test.js.map