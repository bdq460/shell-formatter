/**
 * Test for executor types exports
 *
 * This test ensures that all types and enums from types.ts are properly exported.
 */

import {
    Disposable,
    CancellationToken,
    ExecutorOptions,
    ExecutionResult,
    ExecutionError,
    ErrorType,
} from '../../../../src/utils/executor/types';

describe('executor types', () => {
    describe('ErrorType enum', () => {
        it('should export all error types', () => {
            expect(ErrorType.Timeout).toBe('timeout');
            expect(ErrorType.Cancelled).toBe('cancelled');
            expect(ErrorType.Execution).toBe('execution');
        });

        it('should have correct number of error types', () => {
            const errorTypes = Object.values(ErrorType);
            expect(errorTypes).toHaveLength(3);
        });
    });

    describe('Type definitions', () => {
        it('should define Disposable interface', () => {
            const disposable: Disposable = {
                dispose: () => {
                    // Test implementation
                },
            };
            expect(typeof disposable.dispose).toBe('function');
        });

        it('should define CancellationToken interface', () => {
            const token: CancellationToken = {
                isCancellationRequested: false,
                onCancellationRequested: () => ({
                    dispose: () => {
                        // Test implementation
                    },
                }),
            };
            expect(typeof token.isCancellationRequested).toBe('boolean');
            expect(typeof token.onCancellationRequested).toBe('function');
        });

        it('should define ExecutorOptions interface', () => {
            const options: ExecutorOptions = {
                args: ['arg1', 'arg2'],
                token: undefined,
                stdin: 'test input',
                timeout: 5000,
            };
            expect(Array.isArray(options.args)).toBe(true);
            expect(options.stdin).toBe('test input');
            expect(options.timeout).toBe(5000);
        });

        it('should define ExecutionResult interface', () => {
            const result: ExecutionResult = {
                command: 'test command',
                exitCode: 0,
                stdout: 'output',
                stderr: '',
                error: {
                    type: ErrorType.Timeout,
                    message: 'test error',
                },
            };
            expect(result.command).toBe('test command');
            expect(result.exitCode).toBe(0);
            expect(result.error?.type).toBe(ErrorType.Timeout);
        });

        it('should define ExecutionError interface', () => {
            const error: ExecutionError = {
                type: ErrorType.Execution,
                code: 'ENOENT',
                message: 'command not found',
            };
            expect(error.type).toBe(ErrorType.Execution);
            expect(error.code).toBe('ENOENT');
            expect(error.message).toBe('command not found');
        });
    });

    describe('Optional properties', () => {
        it('should allow ExecutorOptions without optional fields', () => {
            const options: ExecutorOptions = {
                args: ['arg1'],
            };
            expect(options.args).toEqual(['arg1']);
            expect(options.token).toBeUndefined();
            expect(options.stdin).toBeUndefined();
            expect(options.timeout).toBeUndefined();
        });

        it('should allow ExecutionResult without error', () => {
            const result: ExecutionResult = {
                command: 'test',
                exitCode: 0,
                stdout: 'output',
                stderr: '',
            };
            expect(result.error).toBeUndefined();
        });
    });
});
