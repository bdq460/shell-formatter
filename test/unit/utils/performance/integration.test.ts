import { logger } from '../../../../src/utils/log';
import {
    AlertLevel,
    getAlertManager,
    resetAlertManager,
    setAlertManager,
} from '../../../../src/utils/performance/alert-manager';
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
    PerformanceScope,
    recordMetric,
    resetMetric,
    resetMetrics,
    setAlertThreshold,
    wrapAsync,
    wrapSync,
} from '../../../../src/utils/performance/integration';
import {
    performanceMonitor,
    startTimer,
} from '../../../../src/utils/performance/monitor';

jest.mock('../../../../src/utils/log', () => ({
    logger: {
        debug: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
    },
}));

const stopMock = jest.fn(() => 123);
const stopAsyncMock = jest.fn(async () => 456);

jest.mock('../../../../src/utils/performance/monitor', () => ({
    performanceMonitor: {
        recordMetric: jest.fn(),
        generateReport: jest.fn(() => 'report'),
        getAverageMetric: jest.fn(() => 42),
        getMetric: jest.fn(() => ({
            name: 'metric',
            values: [10],
            count: 1,
            min: 10,
            max: 10,
            avg: 10,
        })),
        getAllMetricNames: jest.fn(() => ['metric']),
        reset: jest.fn(),
        resetMetric: jest.fn(),
        enable: jest.fn(),
        disable: jest.fn(),
        isEnabled: true,
    },
    PerformanceTimer: class {
        name: string;
        monitor: unknown;
        constructor(name: string, monitor: unknown) {
            this.name = name;
            this.monitor = monitor;
        }
        stop() {
            return stopMock();
        }
        stopAsync() {
            return stopAsyncMock();
        }
    },
    startTimer: jest.fn(() => ({
        stop: stopMock,
    })),
}));

jest.mock('../../../../src/utils/performance/alert-manager', () => {
    const actual = jest.requireActual('../../../../src/utils/performance/alert-manager');
    return {
        ...actual,
        getAlertManager: jest.fn(),
        resetAlertManager: jest.fn(),
        setAlertManager: jest.fn(),
    };
});

describe('performance integration', () => {
    const mockAlertManager = {
        onAlert: jest.fn(),
        clear: jest.fn(),
        getAlerts: jest.fn(() => [{ id: '1' }]),
        getAlertStats: jest.fn(() => ({ total: 1, byLevel: {}, byMetric: {} })),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (getAlertManager as jest.Mock).mockReturnValue(mockAlertManager);
        (performanceMonitor as any).isEnabled = true;
    });

    it('should measure performance with decorator', async () => {
        const original = jest.fn(async () => 'ok');
        const descriptor = { value: original } as PropertyDescriptor;

        measurePerformance('metric')({}, 'run', descriptor);
        const result = await (descriptor.value as () => Promise<string>)();

        expect(result).toBe('ok');
        expect(stopMock).toHaveBeenCalled();
        expect(logger.debug).toHaveBeenCalledWith(
            expect.stringContaining('Starting metric'),
        );
    });

    it('should stop timer when decorated method throws', async () => {
        const original = jest.fn(async () => {
            throw new Error('decorator fail');
        });
        const descriptor = { value: original } as PropertyDescriptor;

        measurePerformance('metric')({}, 'run', descriptor);

        await expect((descriptor.value as () => Promise<string>)()).rejects.toThrow('decorator fail');
        expect(stopMock).toHaveBeenCalled();
        expect(logger.debug).toHaveBeenCalledWith(
            expect.stringContaining('Completed metric'),
        );
    });

    it('should wrap async function success and failure', async () => {
        const fn = jest.fn(async (...args: unknown[]) => (args[0] as number) + 1);
        const wrapped = wrapAsync('metric', fn as (...args: unknown[]) => Promise<number>);

        const value = await wrapped(1);
        expect(value).toBe(2);
        expect(stopMock).toHaveBeenCalled();

        const errorFn = jest.fn(async () => {
            throw new Error('fail');
        });
        const wrappedError = wrapAsync('metric', errorFn);

        await expect(wrappedError()).rejects.toThrow('fail');
        expect(logger.error).toHaveBeenCalledWith(
            expect.stringContaining('Failed metric'),
        );
    });

    it('should measure async function via startTimer', async () => {
        const fn = jest.fn(async () => 'done');
        const wrapped = measureAsync('metric', fn);

        const value = await wrapped();
        expect(value).toBe('done');
        expect(startTimer).toHaveBeenCalledWith('metric');
        expect(stopMock).toHaveBeenCalled();

        const errorFn = jest.fn(async () => {
            throw new Error('boom');
        });
        const wrappedError = measureAsync('metric', errorFn);

        await expect(wrappedError()).rejects.toThrow('boom');
        expect(logger.error).toHaveBeenCalledWith(
            expect.stringContaining('Failed metric'),
        );
    });

    it('should wrap sync function success and failure', () => {
        const fn = jest.fn((...args: unknown[]) => (args[0] as number) + 1);
        const wrapped = wrapSync('metric', fn as (...args: unknown[]) => number);

        expect(wrapped(1)).toBe(2);
        expect(stopMock).toHaveBeenCalled();

        const errorFn = jest.fn(() => {
            throw new Error('sync fail');
        });
        const wrappedError = wrapSync('metric', errorFn);

        expect(() => wrappedError()).toThrow('sync fail');
        expect(logger.error).toHaveBeenCalledWith(
            expect.stringContaining('Failed metric'),
        );
    });

    it('should handle performance scope end and endAsync', async () => {
        const scope = new PerformanceScope('scope');
        expect(scope.end()).toBe(123);

        const asyncScope = createPerformanceScope('scope');
        await expect(asyncScope.endAsync()).resolves.toBe(456);
    });

    it('should record and query metrics', () => {
        recordMetric('metric', 10);
        expect(performanceMonitor.recordMetric).toHaveBeenCalledWith('metric', 10);
        expect(logger.debug).toHaveBeenCalledWith(
            expect.stringContaining('Recorded metric'),
        );

        expect(getPerformanceReport()).toBe('report');
        expect(getAverageMetric('metric')).toBe(42);
        expect(getMetricData('metric')).toEqual(
            expect.objectContaining({ name: 'metric' }),
        );
        expect(getAllMetricNames()).toEqual(['metric']);
    });

    it('should reset metrics and toggle monitoring', () => {
        resetMetrics();
        expect(performanceMonitor.reset).toHaveBeenCalled();
        expect(logger.info).toHaveBeenCalledWith(
            expect.stringContaining('Resetting all performance metrics'),
        );

        resetMetric('metric');
        expect(performanceMonitor.resetMetric).toHaveBeenCalledWith('metric');

        enablePerformanceMonitoring();
        expect(performanceMonitor.enable).toHaveBeenCalled();

        disablePerformanceMonitoring();
        expect(performanceMonitor.disable).toHaveBeenCalled();

        (performanceMonitor as any).isEnabled = false;
        expect(isPerformanceMonitoringEnabled()).toBe(false);
        (performanceMonitor as any).isEnabled = undefined;
        expect(isPerformanceMonitoringEnabled()).toBe(false);
        (performanceMonitor as any).isEnabled = true;
        expect(isPerformanceMonitoringEnabled()).toBe(true);
    });

    it('should manage alerts and handlers', () => {
        enablePerformanceAlerts();
        expect(logger.info).toHaveBeenCalledWith(
            expect.stringContaining('Enabling performance alerts'),
        );

        disablePerformanceAlerts();
        expect(mockAlertManager.clear).toHaveBeenCalled();

        onPerformanceAlert(jest.fn());
        expect(mockAlertManager.onAlert).toHaveBeenCalled();
        expect(logger.info).toHaveBeenCalledWith(
            expect.stringContaining('Performance alert handler registered'),
        );

        setAlertThreshold('metric', 100);
        expect(logger.info).toHaveBeenCalledWith(
            expect.stringContaining(AlertLevel.MEDIUM),
        );

        setAlertThreshold('metric', 200, AlertLevel.CRITICAL);
        expect(logger.info).toHaveBeenCalledWith(
            expect.stringContaining(AlertLevel.CRITICAL),
        );

        expect(getPerformanceAlerts()).toEqual([{ id: '1' }]);
        expect(getAlertStats()).toEqual(
            expect.objectContaining({ total: 1 }),
        );

        clearAlertHistory();
        expect(mockAlertManager.clear).toHaveBeenCalled();
    });

    it('should forward alert limit parameter', () => {
        const limit = 5;
        getPerformanceAlerts(limit);
        expect(mockAlertManager.getAlerts).toHaveBeenCalledWith(limit);
    });

    it('should expose alert manager helpers', () => {
        expect(typeof resetAlertManager).toBe('function');
        expect(typeof setAlertManager).toBe('function');
    });
});
