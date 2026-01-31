/**
 * LoggerService 单元测试
 *
 * 测试 VSCode 日志服务的核心功能
 */

import {
    getLoggerService,
    initializeLoggerService,
    LoggerService,
    LogLevel,
} from '../../../src/shared/logger';

// Mock vscode 模块
const mockOutputChannel = {
    appendLine: jest.fn(),
    show: jest.fn(),
    dispose: jest.fn(),
};

jest.mock('vscode', () => ({
    window: {
        createOutputChannel: jest.fn(() => mockOutputChannel),
    },
}));

// Mock config 模块
jest.mock('#/config', () => ({
    PackageInfo: {
        displayName: 'Shell Formatter',
    },
}));

// Mock utils/log 模块
const mockSetLogger = jest.fn();
jest.mock('#/utils/log', () => ({
    setLogger: mockSetLogger,
}));

describe('LoggerService', () => {
    let loggerService: LoggerService;

    beforeEach(() => {
        jest.clearAllMocks();
        loggerService = new LoggerService();
    });

    describe('constructor', () => {
        it('should create output channel with display name', () => {
            const { createOutputChannel } = require('vscode').window;
            expect(createOutputChannel).toHaveBeenCalledWith('Shell Formatter');
        });

        it('should set default log level to INFO', () => {
            const newLogger = new LoggerService();
            newLogger.debug('test');
            newLogger.info('test');
            expect(mockOutputChannel.appendLine).toHaveBeenCalledTimes(1);
        });
    });

    describe('setLogLevel', () => {
        it('should change log level to DEBUG', () => {
            loggerService.setLogLevel(LogLevel.DEBUG);
            loggerService.debug('debug message');
            expect(mockOutputChannel.appendLine).toHaveBeenCalled();
        });

        it('should change log level to WARN', () => {
            loggerService.setLogLevel(LogLevel.WARN);
            loggerService.debug('debug message');
            loggerService.info('info message');
            loggerService.warn('warn message');
            expect(mockOutputChannel.appendLine).toHaveBeenCalledTimes(1);
        });

        it('should change log level to ERROR', () => {
            loggerService.setLogLevel(LogLevel.ERROR);
            loggerService.debug('debug');
            loggerService.info('info');
            loggerService.warn('warn');
            loggerService.error('error');
            expect(mockOutputChannel.appendLine).toHaveBeenCalledTimes(1);
        });
    });

    describe('debug', () => {
        it('should log debug message when level is DEBUG', () => {
            loggerService.setLogLevel(LogLevel.DEBUG);
            loggerService.debug('Debug message');
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('[DEBUG]'),
            );
        });

        it('should not log debug message when level is INFO', () => {
            loggerService.setLogLevel(LogLevel.INFO);
            loggerService.debug('Debug message');
            expect(mockOutputChannel.appendLine).not.toHaveBeenCalled();
        });

        it('should format log message with timestamp', () => {
            loggerService.setLogLevel(LogLevel.DEBUG);
            loggerService.debug('Test message');
            const call = mockOutputChannel.appendLine.mock.calls[0][0];
            expect(call).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        });
    });

    describe('info', () => {
        it('should log info message when level is DEBUG', () => {
            loggerService.setLogLevel(LogLevel.DEBUG);
            loggerService.info('Info message');
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('[INFO]'),
            );
        });

        it('should log info message when level is INFO', () => {
            loggerService.setLogLevel(LogLevel.INFO);
            loggerService.info('Info message');
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('[INFO]'),
            );
        });

        it('should log info message when level is WARN', () => {
            loggerService.setLogLevel(LogLevel.WARN);
            loggerService.info('Info message');
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('[INFO]'),
            );
        });

        it('should not log info message when level is ERROR', () => {
            loggerService.setLogLevel(LogLevel.ERROR);
            loggerService.info('Info message');
            expect(mockOutputChannel.appendLine).not.toHaveBeenCalled();
        });
    });

    describe('warn', () => {
        it('should log warn message when level is DEBUG', () => {
            loggerService.setLogLevel(LogLevel.DEBUG);
            loggerService.warn('Warn message');
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('[WARN]'),
            );
        });

        it('should log warn message when level is INFO', () => {
            loggerService.setLogLevel(LogLevel.INFO);
            loggerService.warn('Warn message');
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('[WARN]'),
            );
        });

        it('should log warn message when level is WARN', () => {
            loggerService.setLogLevel(LogLevel.WARN);
            loggerService.warn('Warn message');
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('[WARN]'),
            );
        });

        it('should not log warn message when level is ERROR', () => {
            loggerService.setLogLevel(LogLevel.ERROR);
            loggerService.warn('Warn message');
            expect(mockOutputChannel.appendLine).not.toHaveBeenCalled();
        });
    });

    describe('error', () => {
        it('should log error message for all log levels', () => {
            const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
            for (const level of levels) {
                jest.clearAllMocks();
                loggerService.setLogLevel(level);
                loggerService.error('Error message');
                expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                    expect.stringContaining('[ERROR]'),
                );
            }
        });
    });

    describe('show', () => {
        it('should call outputChannel.show', () => {
            loggerService.show();
            expect(mockOutputChannel.show).toHaveBeenCalled();
        });
    });

    describe('dispose', () => {
        it('should call outputChannel.dispose', () => {
            loggerService.dispose();
            expect(mockOutputChannel.dispose).toHaveBeenCalled();
        });
    });

    describe('log filtering', () => {
        it('should filter messages based on log level', () => {
            loggerService.setLogLevel(LogLevel.WARN);

            loggerService.debug('debug');
            loggerService.info('info');
            loggerService.warn('warn 1');
            loggerService.error('error 1');

            expect(mockOutputChannel.appendLine).toHaveBeenCalledTimes(2);
            expect(mockOutputChannel.appendLine).toHaveBeenNthCalledWith(
                1,
                expect.stringContaining('[WARN]'),
            );
            expect(mockOutputChannel.appendLine).toHaveBeenNthCalledWith(
                2,
                expect.stringContaining('[ERROR]'),
            );
        });
    });

    describe('message formatting', () => {
        it('should include timestamp in correct ISO format', () => {
            loggerService.setLogLevel(LogLevel.INFO);
            const beforeLog = Date.now();
            loggerService.info('Test message');
            const afterLog = Date.now();

            const callArg = mockOutputChannel.appendLine.mock.calls[0][0];
            const match = callArg.match(
                /\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\.\d+Z\]/,
            );
            expect(match).toBeTruthy();

            const timestampStr = match[1];
            const timestamp = Date.parse(timestampStr);
            expect(timestamp).toBeGreaterThanOrEqual(beforeLog - 1000);
            expect(timestamp).toBeLessThanOrEqual(afterLog + 1000);
        });

        it('should include log level in message', () => {
            loggerService.setLogLevel(LogLevel.INFO);
            loggerService.info('Test message');

            const callArg = mockOutputChannel.appendLine.mock.calls[0][0];
            expect(callArg).toContain('[INFO]');
        });

        it('should include the message content', () => {
            loggerService.setLogLevel(LogLevel.INFO);
            const message = 'This is a test message';
            loggerService.info(message);

            const callArg = mockOutputChannel.appendLine.mock.calls[0][0];
            expect(callArg).toContain(message);
        });
    });

    describe('initializeLoggerService', () => {
        it('should create new instance on first call', () => {
            const service1 = initializeLoggerService();
            const service2 = initializeLoggerService();
            expect(service1).toBe(service2);
        });

        it('should call setLogger with the instance', () => {
            initializeLoggerService();
            expect(mockSetLogger).toHaveBeenCalled();
        });

        it('should return the logger service instance', () => {
            const service = initializeLoggerService();
            expect(service).toBeInstanceOf(LoggerService);
        });
    });

    describe('getLoggerService', () => {
        it('should return initialized logger service', () => {
            initializeLoggerService();
            const service = getLoggerService();
            expect(service).toBeInstanceOf(LoggerService);
        });

        it('should throw error if not initialized', () => {
            const { createOutputChannel } = require('vscode').window;
            jest.mocked(createOutputChannel).mockClear();

            expect(() => getLoggerService()).toThrow(
                'LoggerService not initialized. Call initializeLoggerService() first.',
            );
        });

        it('should return same instance on multiple calls', () => {
            initializeLoggerService();
            const service1 = getLoggerService();
            const service2 = getLoggerService();
            expect(service1).toBe(service2);
        });
    });

    describe('integration scenarios', () => {
        it('should handle multiple log levels in sequence', () => {
            loggerService.setLogLevel(LogLevel.DEBUG);
            loggerService.debug('debug 1');
            loggerService.info('info 1');
            loggerService.warn('warn 1');
            loggerService.error('error 1');

            expect(mockOutputChannel.appendLine).toHaveBeenCalledTimes(4);
        });

        it('should handle dynamic log level changes', () => {
            loggerService.setLogLevel(LogLevel.INFO);
            loggerService.debug('debug');
            expect(mockOutputChannel.appendLine).not.toHaveBeenCalled();

            loggerService.setLogLevel(LogLevel.DEBUG);
            loggerService.debug('debug');
            expect(mockOutputChannel.appendLine).toHaveBeenCalled();

            loggerService.setLogLevel(LogLevel.ERROR);
            loggerService.debug('debug');
            expect(mockOutputChannel.appendLine).toHaveBeenCalledTimes(1);
        });

        it('should handle empty messages', () => {
            loggerService.setLogLevel(LogLevel.INFO);
            loggerService.info('');
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('[INFO]'),
            );
        });

        it('should handle special characters in messages', () => {
            loggerService.setLogLevel(LogLevel.INFO);
            const message = 'Test with "quotes", $variables, and \n newlines';
            loggerService.info(message);
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining(message),
            );
        });
    });
});
