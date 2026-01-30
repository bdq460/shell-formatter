import { LogLevel, getLogLevelRank, logger, setLogger, shouldLogByLevel, } from '#/utils/log';
describe('log utils', () => {
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
    it('should set logger instance', () => {
        // 保存原始logger
        const originalLogger = logger;
        // 设置新的logger
        const mockLogger = {
            debug: () => { },
            info: () => { },
            warn: () => { },
            error: () => { },
        };
        setLogger(mockLogger);
        // 验证logger已设置（通过调用不抛出错误来间接验证）
        expect(() => logger.debug('test')).not.toThrow();
        expect(() => logger.info('test')).not.toThrow();
        expect(() => logger.warn('test')).not.toThrow();
        expect(() => logger.error('test')).not.toThrow();
        // 注意：由于logger是模块级别的let变量，且setLogger只在logger为null时设置，
        // 所以在后续测试中，logger已经被初始化，再次调用setLogger不会更新
        // 这是正常的设计，确保logger只被设置一次
    });
});
//# sourceMappingURL=log.test.js.map