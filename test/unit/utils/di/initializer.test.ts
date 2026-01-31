/**
 * Test for DI container initializer exports
 *
 * This test ensures that ServiceNames constants are properly exported.
 */

import { ServiceNames, ServiceName } from '../../../../src/utils/di/initializer';

describe('DI container initializer', () => {
    it('should export all service name constants', () => {
        expect(ServiceNames.SHFMT_TOOL).toBe('shfmtTool');
        expect(ServiceNames.SHELLCHECK_TOOL).toBe('shellcheckTool');
        expect(ServiceNames.PLUGIN_MANAGER).toBe('pluginManager');
        expect(ServiceNames.SHFMT_PLUGIN).toBe('shfmtPlugin');
        expect(ServiceNames.SHELLCHECK_PLUGIN).toBe('shellcheckPlugin');
        expect(ServiceNames.PERFORMANCE_SERVICE).toBe('performanceService');
        expect(ServiceNames.PLUGIN_STATUS_SERVICE).toBe('pluginStatusService');
    });

    it('should export ServiceName type', () => {
        const serviceName: ServiceName = ServiceNames.PLUGIN_MANAGER;
        expect(serviceName).toBe('pluginManager');
    });

    it('should have all expected service names', () => {
        const expectedServices = [
            'shfmtTool',
            'shellcheckTool',
            'pluginManager',
            'shfmtPlugin',
            'shellcheckPlugin',
            'performanceService',
            'pluginStatusService',
        ];

        const actualServices = Object.values(ServiceNames);
        expectedServices.forEach(service => {
            expect(actualServices).toContain(service);
        });
    });

    it('should have correct constant values', () => {
        // ServiceNames is declared with 'as const', making properties readonly at type level
        // TypeScript 'as const' is a compile-time feature and doesn't enforce at runtime
        // We can verify that values are correct
        expect(ServiceNames.SHFMT_TOOL).toBe('shfmtTool');
        expect(ServiceNames.SHELLCHECK_TOOL).toBe('shellcheckTool');
        expect(ServiceNames.PLUGIN_MANAGER).toBe('pluginManager');
        expect(ServiceNames.SHFMT_PLUGIN).toBe('shfmtPlugin');
        expect(ServiceNames.SHELLCHECK_PLUGIN).toBe('shellcheckPlugin');
        expect(ServiceNames.PERFORMANCE_SERVICE).toBe('performanceService');
        expect(ServiceNames.PLUGIN_STATUS_SERVICE).toBe('pluginStatusService');
    });
});
