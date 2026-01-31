/**
 * Test for executor module exports
 *
 * This test ensures that all exports from executor/index.ts are properly imported.
 */

import {
    ErrorType,
    execute
} from '../../../../src/utils/executor';

describe('executor module exports', () => {
    it('should export execute function', () => {
        expect(execute).toBeDefined();
        expect(typeof execute).toBe('function');
    });

    it('should have correct ErrorType values', () => {
        expect(ErrorType.Timeout).toBe('timeout');
        expect(ErrorType.Cancelled).toBe('cancelled');
        expect(ErrorType.Execution).toBe('execution');
    });
});
