/**
 * Test for utils/index.ts module exports
 *
 * This test ensures that all exports from utils/index.ts are properly imported
 * and available, which helps maintain the public API surface.
 */

import { DebounceManager } from '../../../src/utils/debounce';
import { logger, setLogger, resetLogger } from '../../../src/utils/log';
import * as perfIntegration from '../../../src/utils/performance/integration';
import * as perfMonitor from '../../../src/utils/performance/monitor';
import * as pluginSystem from '../../../src/utils/plugin';

// Test that all expected exports are available
describe('utils module exports', () => {
    beforeEach(() => {
        // Set up a default logger for tests
        resetLogger();
        setLogger({
            debug: () => {},
            info: () => {},
            warn: () => {},
            error: () => {},
        });
    });

    it('should export debounce manager', () => {
        expect(DebounceManager).toBeDefined();
        expect(typeof DebounceManager).toBe('function');
    });

    it('should export logger', () => {
        expect(logger).toBeDefined();
    });

    it('should export performance integration functions', () => {
        expect(perfIntegration.wrapAsync).toBeDefined();
        expect(perfIntegration.wrapSync).toBeDefined();
        expect(perfIntegration.measureAsync).toBeDefined();
        expect(perfIntegration.measurePerformance).toBeDefined();
        expect(perfIntegration.recordMetric).toBeDefined();
        expect(perfIntegration.getAllMetricNames).toBeDefined();
        expect(perfIntegration.getPerformanceReport).toBeDefined();
        expect(perfIntegration.getAverageMetric).toBeDefined();
        expect(perfIntegration.resetMetrics).toBeDefined();
        expect(perfIntegration.isPerformanceMonitoringEnabled).toBeDefined();
        expect(perfIntegration.enablePerformanceMonitoring).toBeDefined();
        expect(perfIntegration.disablePerformanceMonitoring).toBeDefined();
        expect(perfIntegration.createPerformanceScope).toBeDefined();
        expect(perfIntegration.onPerformanceAlert).toBeDefined();
        expect(perfIntegration.getPerformanceAlerts).toBeDefined();
        expect(perfIntegration.getAlertStats).toBeDefined();
    });

    it('should export performance monitor functions', () => {
        expect(perfMonitor.performanceMonitor).toBeDefined();
        expect(perfMonitor.startTimer).toBeDefined();
        expect(perfMonitor.PerformanceTimer).toBeDefined();
    });

    it('should export plugin system components', () => {
        expect(pluginSystem.PluginManager).toBeDefined();
        expect(pluginSystem.BasePlugin).toBeDefined();
        expect(pluginSystem.MessageBus).toBeDefined();
    });

    it('should export plugin types', () => {
        expect(pluginSystem.PluginLifecycleEvents).toBeDefined();
    });
});
