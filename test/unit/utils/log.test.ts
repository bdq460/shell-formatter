import {
    LOG_LEVEL_VALUES,
    LogLevel,
    Logger,
    getLogLevelRank,
    logger,
    resetLogger,
    setLogger,
    shouldLogByLevel,
} from '../../../src/utils/log';

describe('log utils', () => {
    beforeEach(() => {
        // Reset logger state before each test
        resetLogger();
    });

    it('should map log levels to numeric ranks', () => {
        expect(getLogLevelRank(LogLevel.DEBUG)).toBe(0);
        expect(getLogLevelRank('info')).toBe(1);
        expect(getLogLevelRank('warn')).toBe(2);
        expect(getLogLevelRank('error')).toBe(3);
        expect(getLogLevelRank('unknown')).toBe(1);
    });

    it('should handle non-string log levels', () => {
        // 测试LogLevel枚举类型（非string）
        expect(getLogLevelRank(LogLevel.INFO)).toBe(1);
        expect(getLogLevelRank(LogLevel.WARN)).toBe(2);
        expect(getLogLevelRank(LogLevel.ERROR)).toBe(3);
    });

    it('should compare log levels correctly', () => {
        expect(shouldLogByLevel(LogLevel.DEBUG, LogLevel.INFO)).toBe(false);
        expect(shouldLogByLevel(LogLevel.INFO, LogLevel.INFO)).toBe(true);
        expect(shouldLogByLevel(LogLevel.WARN, LogLevel.INFO)).toBe(true);
    });

    it('should handle string comparison in shouldLogByLevel', () => {
        expect(shouldLogByLevel('debug', 'info')).toBe(false);
        expect(shouldLogByLevel('error', 'info')).toBe(true);
        expect(shouldLogByLevel('warn', 'warn')).toBe(true);
    });

    it('should return default rank for unknown log level', () => {
        expect(getLogLevelRank('invalid')).toBe(LOG_LEVEL_VALUES[LogLevel.INFO]);
    });

    it('should set logger instance', () => {
        const mockLogger: Logger = {
            debug: () => { },
            info: () => { },
            warn: () => { },
            error: () => { },
        };

        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        setLogger(mockLogger);

        expect(consoleSpy).toHaveBeenCalledWith("Set logger");

        consoleSpy.mockRestore();
    });

    it('should pass optionalParams to logger methods', () => {
        const mockDebug = jest.fn();
        const mockInfo = jest.fn();
        const mockWarn = jest.fn();
        const mockError = jest.fn();

        const mockLogger: Logger = {
            debug: mockDebug,
            info: mockInfo,
            warn: mockWarn,
            error: mockError,
        };

        setLogger(mockLogger);

        // Test debug with optional params
        logger.debug('debug message', { key: 'value' }, 123);
        expect(mockDebug).toHaveBeenCalledWith('debug message', { key: 'value' }, 123);

        // Test info with optional params
        logger.info('info message', 'extra info');
        expect(mockInfo).toHaveBeenCalledWith('info message', 'extra info');

        // Test warn with optional params
        logger.warn('warn message', new Error('warning error'));
        expect(mockWarn).toHaveBeenCalledWith('warn message', new Error('warning error'));

        // Test error with optional params
        logger.error('error message', { code: 500 }, 'details');
        expect(mockError).toHaveBeenCalledWith('error message', { code: 500 }, 'details');
    });

    it('should handle logger methods without optionalParams', () => {
        const mockDebug = jest.fn();
        const mockInfo = jest.fn();
        const mockWarn = jest.fn();
        const mockError = jest.fn();

        const mockLogger: Logger = {
            debug: mockDebug,
            info: mockInfo,
            warn: mockWarn,
            error: mockError,
        };

        setLogger(mockLogger);

        // Test without optional params
        logger.debug('debug message');
        expect(mockDebug).toHaveBeenCalledWith('debug message');

        logger.info('info message');
        expect(mockInfo).toHaveBeenCalledWith('info message');

        logger.warn('warn message');
        expect(mockWarn).toHaveBeenCalledWith('warn message');

        logger.error('error message');
        expect(mockError).toHaveBeenCalledWith('error message');
    });

    it('should not overwrite existing logger', () => {
        const mockLogger1: Logger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        };

        const mockLogger2: Logger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        };

        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        // First set should succeed
        setLogger(mockLogger1);
        expect(consoleSpy).toHaveBeenCalledWith("Set logger");
        expect(consoleSpy).toHaveBeenCalledWith("logger is null set by param");

        consoleSpy.mockClear();

        // Second set should not change the logger (logger is already set)
        setLogger(mockLogger2);
        // First call is always "Set logger"
        expect(consoleSpy).toHaveBeenCalledWith("Set logger");
        // But the second message should not appear since logger is already set
        expect(consoleSpy).not.toHaveBeenCalledWith("logger is null set by param");

        consoleSpy.mockRestore();
    });

    it('should have all log level values defined', () => {
        expect(LOG_LEVEL_VALUES[LogLevel.DEBUG]).toBe(0);
        expect(LOG_LEVEL_VALUES[LogLevel.INFO]).toBe(1);
        expect(LOG_LEVEL_VALUES[LogLevel.WARN]).toBe(2);
        expect(LOG_LEVEL_VALUES[LogLevel.ERROR]).toBe(3);
    });

    it('should handle case insensitivity in log level names', () => {
        expect(getLogLevelRank('DEBUG')).toBe(0);
        expect(getLogLevelRank('INFO')).toBe(1);
        expect(getLogLevelRank('WARN')).toBe(2);
        expect(getLogLevelRank('ERROR')).toBe(3);
    });

    it('should export logger object', () => {
        // Set a mock logger for this test
        const mockLogger: Logger = {
            debug: () => { },
            info: () => { },
            warn: () => { },
            error: () => { },
        };
        setLogger(mockLogger);
        expect(logger).toBeDefined();
    });

    it('should reset logger to undefined', () => {
        const mockLogger: Logger = {
            debug: () => { },
            info: () => { },
            warn: () => { },
            error: () => { },
        };

        setLogger(mockLogger);
        resetLogger();

        expect(logger).toBeUndefined();
    });

    it('should allow re-initialization after reset', () => {
        const mockLogger1: Logger = {
            debug: () => { },
            info: () => { },
            warn: () => { },
            error: () => { },
        };
        const mockLogger2: Logger = {
            debug: () => { },
            info: () => { },
            warn: () => { },
            error: () => { },
        };

        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        setLogger(mockLogger1);
        resetLogger();
        setLogger(mockLogger2);

        expect(consoleSpy).toHaveBeenCalledWith('logger is null set by param');

        consoleSpy.mockRestore();
    });
});
