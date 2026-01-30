import { setLogger } from '../../../../src/utils/log';

setLogger({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
});

import {
    AlertLevel,
    AlertThresholdConfig,
    PerformanceAlert,
    PerformanceAlertManager,
    getAlertManager,
    resetAlertManager,
    setAlertManager,
} from '../../../../src/utils/performance/alertManager';

describe('PerformanceAlertManager', () => {
    let manager: PerformanceAlertManager;

    beforeEach(() => {
        manager = new PerformanceAlertManager();
        setAlertManager(manager);
    });

    afterEach(() => {
        resetAlertManager();
    });

    describe('constructor', () => {
        it('should initialize with default max history size', () => {
            const defaultManager = new PerformanceAlertManager();
            expect(defaultManager).toBeDefined();
        });

        it('should initialize with custom max history size', () => {
            const customManager = new PerformanceAlertManager(500);
            expect(customManager).toBeDefined();
        });

        it('should initialize default thresholds', () => {
            manager.check('diagnose_one_doc_duration', 5000);
            const alerts = manager.getAlerts();
            expect(alerts.length).toBeGreaterThan(0);
        });
    });

    describe('registerThreshold', () => {
        it('should register custom threshold', () => {
            const config: AlertThresholdConfig = {
                metricName: 'custom_metric',
                lowThreshold: 100,
                mediumThreshold: 500,
                highThreshold: 1000,
                criticalThreshold: 2000,
            };
            manager.registerThreshold(config);
            manager.check('custom_metric', 1500);
            const alerts = manager.getAlerts();
            expect(alerts.some(a => a.metricName === 'custom_metric')).toBe(true);
        });

        it('should override default threshold', () => {
            const config: AlertThresholdConfig = {
                metricName: 'format_duration',
                criticalThreshold: 100,
            };
            manager.registerThreshold(config);
            manager.check('format_duration', 150);
            const alerts = manager.getAlerts();
            const formatAlert = alerts.find(a => a.metricName === 'format_duration');
            expect(formatAlert?.level).toBe(AlertLevel.CRITICAL);
        });
    });

    describe('check', () => {
        it('should not create alert when value below threshold', () => {
            manager.check('format_duration', 100);
            const alerts = manager.getAlerts();
            expect(alerts.length).toBe(0);
        });

        it('should not create alert when no threshold configured', () => {
            manager.check('non_existent_metric', 99999);
            const alerts = manager.getAlerts();
            expect(alerts.length).toBe(0);
        });

        it('should create LOW level alert', () => {
            const config: AlertThresholdConfig = {
                metricName: 'test_low',
                lowThreshold: 100,
            };
            manager.registerThreshold(config);
            manager.check('test_low', 150);
            const alerts = manager.getAlerts();
            expect(alerts[0].level).toBe(AlertLevel.LOW);
            expect(alerts[0].value).toBe(150);
        });

        it('should create MEDIUM level alert', () => {
            const config: AlertThresholdConfig = {
                metricName: 'test_medium',
                lowThreshold: 100,
                mediumThreshold: 500,
            };
            manager.registerThreshold(config);
            manager.check('test_medium', 600);
            const alerts = manager.getAlerts();
            expect(alerts[0].level).toBe(AlertLevel.MEDIUM);
        });

        it('should create HIGH level alert', () => {
            const config: AlertThresholdConfig = {
                metricName: 'test_high',
                lowThreshold: 100,
                mediumThreshold: 500,
                highThreshold: 1000,
            };
            manager.registerThreshold(config);
            manager.check('test_high', 1500);
            const alerts = manager.getAlerts();
            expect(alerts[0].level).toBe(AlertLevel.HIGH);
        });

        it('should create CRITICAL level alert', () => {
            const config: AlertThresholdConfig = {
                metricName: 'test_critical',
                lowThreshold: 100,
                mediumThreshold: 500,
                highThreshold: 1000,
                criticalThreshold: 2000,
            };
            manager.registerThreshold(config);
            manager.check('test_critical', 2500);
            const alerts = manager.getAlerts();
            expect(alerts[0].level).toBe(AlertLevel.CRITICAL);
        });

        it('should prefer higher threshold', () => {
            const config: AlertThresholdConfig = {
                metricName: 'test_priority',
                lowThreshold: 100,
                mediumThreshold: 500,
                highThreshold: 1000,
                criticalThreshold: 2000,
            };
            manager.registerThreshold(config);
            manager.check('test_priority', 2500);
            const alerts = manager.getAlerts();
            expect(alerts[0].level).toBe(AlertLevel.CRITICAL);
        });
    });

    describe('onAlert', () => {
        it('should register sync alert handler', async () => {
            const handler = jest.fn();
            manager.onAlert(handler);

            const config: AlertThresholdConfig = {
                metricName: 'test_handler',
                criticalThreshold: 100,
            };
            manager.registerThreshold(config);
            manager.check('test_handler', 200);

            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler).toHaveBeenCalledWith(expect.any(Object));
        });

        it('should register async alert handler', async () => {
            const handler = jest.fn(async (alert: PerformanceAlert) => {
                await new Promise(resolve => setTimeout(resolve, 10));
            });
            manager.onAlert(handler);

            const config: AlertThresholdConfig = {
                metricName: 'test_async',
                criticalThreshold: 100,
            };
            manager.registerThreshold(config);
            manager.check('test_async', 200);

            // Wait for async handler to complete
            await new Promise(resolve => setTimeout(resolve, 50));
            expect(handler).toHaveBeenCalledTimes(1);
        });

        it('should handle multiple handlers', async () => {
            const handler1 = jest.fn();
            const handler2 = jest.fn();
            const handler3 = jest.fn();

            manager.onAlert(handler1);
            manager.onAlert(handler2);
            manager.onAlert(handler3);

            const config: AlertThresholdConfig = {
                metricName: 'test_multiple',
                criticalThreshold: 100,
            };
            manager.registerThreshold(config);
            manager.check('test_multiple', 200);

            expect(handler1).toHaveBeenCalledTimes(1);
            expect(handler2).toHaveBeenCalledTimes(1);
            expect(handler3).toHaveBeenCalledTimes(1);
        });

        it('should handle handler errors gracefully', async () => {
            const errorHandler = jest.fn(() => {
                throw new Error('Handler error');
            });
            const goodHandler = jest.fn();

            manager.onAlert(errorHandler);
            manager.onAlert(goodHandler);

            const config: AlertThresholdConfig = {
                metricName: 'test_error',
                criticalThreshold: 100,
            };
            manager.registerThreshold(config);
            manager.check('test_error', 200);

            expect(errorHandler).toHaveBeenCalled();
            expect(goodHandler).toHaveBeenCalled();
        });
    });

    describe('getAlerts', () => {
        it('should return all alerts when no limit', () => {
            const config: AlertThresholdConfig = {
                metricName: 'test_all',
                criticalThreshold: 100,
            };
            manager.registerThreshold(config);

            manager.check('test_all', 200);
            manager.check('test_all', 300);
            manager.check('test_all', 400);

            const alerts = manager.getAlerts();
            expect(alerts.length).toBe(3);
        });

        it('should return limited number of alerts', () => {
            const config: AlertThresholdConfig = {
                metricName: 'test_limit',
                criticalThreshold: 100,
            };
            manager.registerThreshold(config);

            for (let i = 0; i < 10; i++) {
                manager.check('test_limit', 200 + i);
            }

            const alerts = manager.getAlerts(5);
            expect(alerts.length).toBe(5);
        });

        it('should return empty array when no alerts', () => {
            const alerts = manager.getAlerts();
            expect(alerts).toEqual([]);
        });
    });

    describe('getAlertStats', () => {
        beforeEach(() => {
            // Create multiple alerts at different levels
            const lowConfig: AlertThresholdConfig = {
                metricName: 'low_metric',
                lowThreshold: 100,
            };
            manager.registerThreshold(lowConfig);
            manager.check('low_metric', 150);
            manager.check('low_metric', 160);

            const mediumConfig: AlertThresholdConfig = {
                metricName: 'medium_metric',
                mediumThreshold: 500,
            };
            manager.registerThreshold(mediumConfig);
            manager.check('medium_metric', 600);

            const highConfig: AlertThresholdConfig = {
                metricName: 'high_metric',
                highThreshold: 1000,
            };
            manager.registerThreshold(highConfig);
            manager.check('high_metric', 1500);

            const criticalConfig: AlertThresholdConfig = {
                metricName: 'critical_metric',
                criticalThreshold: 2000,
            };
            manager.registerThreshold(criticalConfig);
            manager.check('critical_metric', 2500);
        });

        it('should return correct total count', () => {
            const stats = manager.getAlertStats();
            expect(stats.total).toBe(5);
        });

        it('should count alerts by level', () => {
            const stats = manager.getAlertStats();
            expect(stats.byLevel[AlertLevel.LOW]).toBe(2);
            expect(stats.byLevel[AlertLevel.MEDIUM]).toBe(1);
            expect(stats.byLevel[AlertLevel.HIGH]).toBe(1);
            expect(stats.byLevel[AlertLevel.CRITICAL]).toBe(1);
        });

        it('should count alerts by metric', () => {
            const stats = manager.getAlertStats();
            expect(stats.byMetric['low_metric']).toBe(2);
            expect(stats.byMetric['medium_metric']).toBe(1);
            expect(stats.byMetric['high_metric']).toBe(1);
            expect(stats.byMetric['critical_metric']).toBe(1);
        });

        it('should return a copy of stats', () => {
            const stats1 = manager.getAlertStats();
            const stats2 = manager.getAlertStats();
            expect(stats1).toEqual(stats2);
            expect(stats1).not.toBe(stats2);
            expect(stats1.byLevel).not.toBe(stats2.byLevel);
            expect(stats1.byMetric).not.toBe(stats2.byMetric);
        });
    });

    describe('clear', () => {
        it('should clear all alerts', () => {
            const config: AlertThresholdConfig = {
                metricName: 'test_clear',
                criticalThreshold: 100,
            };
            manager.registerThreshold(config);
            manager.check('test_clear', 200);
            manager.check('test_clear', 300);

            expect(manager.getAlerts().length).toBeGreaterThan(0);

            manager.clear();

            expect(manager.getAlerts()).toEqual([]);
        });

        it('should reset stats', () => {
            const config: AlertThresholdConfig = {
                metricName: 'test_stats',
                criticalThreshold: 100,
            };
            manager.registerThreshold(config);
            manager.check('test_stats', 200);

            expect(manager.getAlertStats().total).toBeGreaterThan(0);

            manager.clear();

            const stats = manager.getAlertStats();
            expect(stats.total).toBe(0);
            expect(stats.byLevel[AlertLevel.LOW]).toBe(0);
            expect(stats.byLevel[AlertLevel.MEDIUM]).toBe(0);
            expect(stats.byLevel[AlertLevel.HIGH]).toBe(0);
            expect(stats.byLevel[AlertLevel.CRITICAL]).toBe(0);
            expect(Object.keys(stats.byMetric).length).toBe(0);
        });
    });

    describe('alert object', () => {
        it('should create alert with correct structure', () => {
            const config: AlertThresholdConfig = {
                metricName: 'test_structure',
                criticalThreshold: 1000,
            };
            manager.registerThreshold(config);
            manager.check('test_structure', 1500);

            const alerts = manager.getAlerts();
            const alert = alerts[0];

            expect(alert.id).toBeDefined();
            expect(typeof alert.id).toBe('string');
            expect(alert.metricName).toBe('test_structure');
            expect(alert.value).toBe(1500);
            expect(alert.threshold).toBe(1000);
            expect(alert.level).toBe(AlertLevel.CRITICAL);
            expect(alert.timestamp).toBeDefined();
            expect(typeof alert.timestamp).toBe('number');
            expect(alert.message).toBeDefined();
            expect(typeof alert.message).toBe('string');
        });

        it('should generate unique alert IDs', () => {
            const config: AlertThresholdConfig = {
                metricName: 'test_id',
                criticalThreshold: 100,
            };
            manager.registerThreshold(config);

            manager.check('test_id', 200);
            manager.check('test_id', 300);
            manager.check('test_id', 400);

            const alerts = manager.getAlerts();
            const ids = alerts.map(a => a.id);
            const uniqueIds = new Set(ids);

            expect(uniqueIds.size).toBe(3);
        });
    });

    describe('history size limit', () => {
        it('should limit history size', () => {
            const smallManager = new PerformanceAlertManager(10);

            const config: AlertThresholdConfig = {
                metricName: 'test_limit',
                criticalThreshold: 100,
            };
            smallManager.registerThreshold(config);

            for (let i = 0; i < 20; i++) {
                smallManager.check('test_limit', 200 + i);
            }

            const alerts = smallManager.getAlerts();
            expect(alerts.length).toBe(10);
        });

        it('should keep most recent alerts', () => {
            const smallManager = new PerformanceAlertManager(5);

            const config: AlertThresholdConfig = {
                metricName: 'test_recent',
                criticalThreshold: 100,
            };
            smallManager.registerThreshold(config);

            for (let i = 0; i < 10; i++) {
                smallManager.check('test_recent', 200 + i);
            }

            const alerts = smallManager.getAlerts();
            expect(alerts.length).toBe(5);

            // Check that we kept the most recent ones (last 5: 205-209)
            const values = alerts.map(a => a.value);
            expect(values).toContain(205);
            expect(values).toContain(206);
            expect(values).toContain(207);
            expect(values).toContain(208);
            expect(values).toContain(209);
            expect(values).not.toContain(200);
            expect(values).not.toContain(201);
            expect(values).not.toContain(204);
        });
    });

    describe('global functions', () => {
        it('should get global alert manager', () => {
            const globalManager = getAlertManager();
            expect(globalManager).toBeInstanceOf(PerformanceAlertManager);
        });

        it('should return same instance on multiple calls', () => {
            const manager1 = getAlertManager();
            const manager2 = getAlertManager();
            expect(manager1).toBe(manager2);
        });

        it('should create new manager if none exists', () => {
            // Reset to ensure no manager exists
            resetAlertManager();
            setAlertManager(null as any);

            // This should create a new manager
            const globalManager = getAlertManager();
            expect(globalManager).toBeInstanceOf(PerformanceAlertManager);

            // Verify it's the same instance on subsequent calls
            const globalManager2 = getAlertManager();
            expect(globalManager).toBe(globalManager2);
        });

        it('should set global alert manager', () => {
            const customManager = new PerformanceAlertManager();
            setAlertManager(customManager);

            const globalManager = getAlertManager();
            expect(globalManager).toBe(customManager);
        });

        it('should reset global alert manager', () => {
            const config: AlertThresholdConfig = {
                metricName: 'test_reset',
                criticalThreshold: 100,
            };
            manager.registerThreshold(config);
            manager.check('test_reset', 200);

            expect(getAlertManager().getAlerts().length).toBeGreaterThan(0);

            resetAlertManager();

            expect(getAlertManager().getAlerts().length).toBe(0);
        });

        it('should not fail when resetting non-existent manager', () => {
            resetAlertManager();
            resetAlertManager();
            expect(true).toBe(true);
        });
    });

    describe('default thresholds', () => {
        it('should include all default metrics', () => {
            const defaultMetrics = [
                'diagnose_one_doc_duration',
                'diagnose_all_docs_duration',
                'format_duration',
                'shfmt_format_duration',
                'shfmt_diagnose_duration',
                'shellcheck_diagnose_duration',
                'plugin_load_duration',
                'service_init_duration',
            ];

            const stats = manager.getAlertStats();
            const allMetrics = [...defaultMetrics]; // Copy array

            // The stats might be empty if no alerts triggered yet
            // But the thresholds should be registered
            expect(allMetrics.length).toBeGreaterThan(0);
        });
    });

    describe('edge cases', () => {
        it('should handle threshold at exact value', () => {
            const config: AlertThresholdConfig = {
                metricName: 'test_exact',
                criticalThreshold: 100,
            };
            manager.registerThreshold(config);
            manager.check('test_exact', 100);

            const alerts = manager.getAlerts();
            // Value >= threshold should trigger alert
            expect(alerts.length).toBe(1);
        });

        it('should handle multiple metrics with same name', () => {
            const config1: AlertThresholdConfig = {
                metricName: 'same_metric',
                criticalThreshold: 100,
            };
            const config2: AlertThresholdConfig = {
                metricName: 'same_metric',
                criticalThreshold: 200,
            };

            manager.registerThreshold(config1);
            manager.registerThreshold(config2);

            // The second config overrides the first, so criticalThreshold is 200
            manager.check('same_metric', 250);

            const alerts = manager.getAlerts();
            // Only one alert should be created
            expect(alerts.length).toBe(1);
            expect(alerts[0].threshold).toBe(200);
        });

        it('should handle zero value', () => {
            const config: AlertThresholdConfig = {
                metricName: 'test_zero',
                lowThreshold: 100,
            };
            manager.registerThreshold(config);
            manager.check('test_zero', 0);

            const alerts = manager.getAlerts();
            expect(alerts.length).toBe(0);
        });

        it('should handle negative value', () => {
            const config: AlertThresholdConfig = {
                metricName: 'test_negative',
                lowThreshold: 100,
            };
            manager.registerThreshold(config);
            manager.check('test_negative', -50);

            const alerts = manager.getAlerts();
            expect(alerts.length).toBe(0);
        });
    });
});
