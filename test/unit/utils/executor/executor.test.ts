import { execute } from '../../../../src/utils/executor/executor';
import { ErrorType } from '../../../../src/utils/executor/types';

// Mock child_process.spawn
jest.mock('child_process');

import { spawn } from 'child_process';
import { EventEmitter } from 'events';

const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;

// Helper to create mock process
function createMockProcess(exitCode: number = 0, stdout: string = '', stderr: string = '') {
    const process = new EventEmitter() as any;
    process.stdin = new EventEmitter();
    process.stdout = new EventEmitter();
    process.stderr = new EventEmitter();
    process.killed = false;
    process.kill = jest.fn(() => {
        process.killed = true;
    });

    // Mock destroy methods
    process.stdout.destroy = jest.fn();
    process.stderr.destroy = jest.fn();
    process.stdin.destroy = jest.fn();
    process.stdin.write = jest.fn();
    process.stdin.end = jest.fn();

    // Simulate data events
    setTimeout(() => {
        if (stdout) {
            process.stdout.emit('data', stdout);
        }
        if (stderr) {
            process.stderr.emit('data', stderr);
        }
        process.emit('close', exitCode);
    }, 10);

    return process;
}

describe('execute function', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should execute command successfully', async () => {
        const mockProcess = createMockProcess(0, 'success output', '');
        mockSpawn.mockReturnValue(mockProcess);

        const result = await execute('test-cmd', { args: ['arg1', 'arg2'] });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('success output');
        expect(result.stderr).toBe('');
        expect(result.error).toBeUndefined();
        expect(mockSpawn).toHaveBeenCalledWith('test-cmd', ['arg1', 'arg2']);
    });

    it('should capture stderr output', async () => {
        const mockProcess = createMockProcess(1, '', 'error message');
        mockSpawn.mockReturnValue(mockProcess);

        const result = await execute('test-cmd', { args: [] });

        expect(result.exitCode).toBe(1);
        expect(result.stderr).toBe('error message');
    });

    it('should handle command not found error', async () => {
        const mockProcess = new EventEmitter() as any;
        mockProcess.stdin = new EventEmitter();
        mockProcess.stdout = new EventEmitter();
        mockProcess.stderr = new EventEmitter();
        mockProcess.killed = false;
        mockProcess.kill = jest.fn();
        mockProcess.stdout.destroy = jest.fn();
        mockProcess.stderr.destroy = jest.fn();
        mockProcess.stdin.destroy = jest.fn();

        const error = new Error('spawn ENOENT');
        (error as any).code = 'ENOENT';
        setTimeout(() => {
            mockProcess.emit('error', error);
        }, 10);

        mockSpawn.mockReturnValue(mockProcess);

        const result = await execute('nonexistent-cmd', { args: [] });

        expect(result.error?.type).toBe(ErrorType.Execution);
        expect(result.error?.code).toBe('ENOENT');
        expect(result.error?.message).toContain('not installed');
    });

    it('should handle timeout', async () => {
        const mockProcess = new EventEmitter() as any;
        mockProcess.stdin = new EventEmitter();
        mockProcess.stdout = new EventEmitter();
        mockProcess.stderr = new EventEmitter();
        mockProcess.killed = false;
        mockProcess.kill = jest.fn();
        mockProcess.stdout.destroy = jest.fn();
        mockProcess.stderr.destroy = jest.fn();
        mockProcess.stdin.destroy = jest.fn();

        mockSpawn.mockReturnValue(mockProcess);

        const result = await execute('slow-cmd', {
            args: [],
            timeout: 50,
        });

        expect(result.error?.type).toBe(ErrorType.Timeout);
        expect(result.error?.message).toContain('timed out');
    });

    it('should handle cancellation', async () => {
        const mockProcess = new EventEmitter() as any;
        mockProcess.stdin = new EventEmitter();
        mockProcess.stdout = new EventEmitter();
        mockProcess.stderr = new EventEmitter();
        mockProcess.killed = false;
        mockProcess.kill = jest.fn();
        mockProcess.stdout.destroy = jest.fn();
        mockProcess.stderr.destroy = jest.fn();
        mockProcess.stdin.destroy = jest.fn();

        mockSpawn.mockReturnValue(mockProcess);

        const cancelToken = {
            isCancellationRequested: false,
            onCancellationRequested: jest.fn((callback) => {
                setTimeout(() => {
                    (cancelToken as any).isCancellationRequested = true;
                    callback();
                }, 10);
                return { dispose: jest.fn() };
            }),
        };

        const result = await execute('cmd', { args: [], token: cancelToken });

        expect(result.error?.type).toBe(ErrorType.Cancelled);
    });

    it('should return error when cancellation requested before start', async () => {
        const cancelToken = {
            isCancellationRequested: true,
            onCancellationRequested: jest.fn(),
        };

        const result = await execute('cmd', { args: [], token: cancelToken });

        expect(result.error?.type).toBe(ErrorType.Cancelled);
        expect(mockSpawn).not.toHaveBeenCalled();
    });

    it('should write stdin when provided', async () => {
        const mockProcess = createMockProcess(0, '', '');
        mockSpawn.mockReturnValue(mockProcess);

        await execute('cmd', {
            args: [],
            stdin: 'input data',
        });

        expect(mockProcess.stdin.write).toHaveBeenCalledWith('input data');
        expect(mockProcess.stdin.end).toHaveBeenCalled();
    });

    it('should use default timeout of 30 seconds', async () => {
        jest.useFakeTimers();
        const mockProcess = new EventEmitter() as any;
        mockProcess.stdin = new EventEmitter();
        mockProcess.stdout = new EventEmitter();
        mockProcess.stderr = new EventEmitter();
        mockProcess.killed = false;
        mockProcess.kill = jest.fn();
        mockProcess.stdout.destroy = jest.fn();
        mockProcess.stderr.destroy = jest.fn();
        mockProcess.stdin.destroy = jest.fn();

        mockSpawn.mockReturnValue(mockProcess);

        const promise = execute('cmd', { args: [] });

        // Advance time by 30 seconds
        jest.advanceTimersByTime(30000);

        const result = await promise;

        expect(result.error?.type).toBe(ErrorType.Timeout);
        jest.useRealTimers();
    });

    it('should format command string correctly', async () => {
        const mockProcess = createMockProcess(0, '', '');
        mockSpawn.mockReturnValue(mockProcess);

        const result = await execute('cmd', { args: ['arg1', 'arg2', 'arg3'] });

        expect(result.command).toBe('cmd arg1 arg2 arg3');
    });

    it('should handle buffer concatenation for stdout', async () => {
        const mockProcess = new EventEmitter() as any;
        mockProcess.stdin = new EventEmitter();
        mockProcess.stdout = new EventEmitter();
        mockProcess.stderr = new EventEmitter();
        mockProcess.killed = false;
        mockProcess.kill = jest.fn();
        mockProcess.stdout.destroy = jest.fn();
        mockProcess.stderr.destroy = jest.fn();
        mockProcess.stdin.destroy = jest.fn();

        mockSpawn.mockReturnValue(mockProcess);

        setTimeout(() => {
            mockProcess.stdout.emit('data', Buffer.from('Hello '));
            mockProcess.stdout.emit('data', 'World');
            mockProcess.emit('close', 0);
        }, 10);

        const result = await execute('cmd', { args: [] });

        expect(result.stdout).toBe('Hello World');
    });

    it('should handle exit code properly', async () => {
        const mockProcess = createMockProcess(127, 'output', '');
        mockSpawn.mockReturnValue(mockProcess);

        const result = await execute('cmd', { args: [] });

        expect(result.exitCode).toBe(127);
    });

    it('should dispose cancellation token listener', async () => {
        const mockProcess = createMockProcess(0, '', '');
        const mockDispose = jest.fn();
        const cancelToken = {
            isCancellationRequested: false,
            onCancellationRequested: jest.fn(() => ({ dispose: mockDispose })),
        };

        mockSpawn.mockReturnValue(mockProcess);

        await execute('cmd', { args: [], token: cancelToken });

        expect(mockDispose).toHaveBeenCalled();
    });
});
