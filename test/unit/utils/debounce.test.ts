import { DebounceManager } from '../../../src/utils/debounce';

describe('DebounceManager', () => {
    it('should execute the latest debounce callback', (done) => {
        const manager = new DebounceManager();
        let count = 0;

        manager.debounce('doc', () => {
            count += 1;
        }, 20);

        manager.debounce('doc', () => {
            count += 1;
        }, 20);

        setTimeout(() => {
            expect(count).toBe(1);
            expect(manager.getActiveCount()).toBe(0);
            done();
        }, 60);
    });

    it('should cancel a scheduled debounce', (done) => {
        const manager = new DebounceManager();
        let called = false;

        manager.debounce('doc', () => {
            called = true;
        }, 20);

        manager.cancel('doc');

        setTimeout(() => {
            expect(called).toBe(false);
            expect(manager.getActiveCount()).toBe(0);
            done();
        }, 60);
    });

    it('should clear all timers', (done) => {
        const manager = new DebounceManager();
        let called = 0;

        manager.debounce('a', () => {
            called += 1;
        }, 20);
        manager.debounce('b', () => {
            called += 1;
        }, 20);

        manager.clearAll();

        setTimeout(() => {
            expect(called).toBe(0);
            expect(manager.getActiveCount()).toBe(0);
            done();
        }, 60);
    });

    it('should reflect active timer count', () => {
        const manager = new DebounceManager();
        manager.debounce('a', () => { }, 50);
        manager.debounce('b', () => { }, 50);
        expect(manager.getActiveCount()).toBe(2);
        manager.clearAll();
    });

    it('should handle cancel on non-existent key', () => {
        const manager = new DebounceManager();
        // 不应抛出错误
        expect(() => manager.cancel('non-existent')).not.toThrow();
        expect(manager.getActiveCount()).toBe(0);
    });

    it('should replace existing debounce with same key', (done) => {
        const manager = new DebounceManager();
        const callLog: string[] = [];

        manager.debounce('replace_key', () => {
            callLog.push('first');
        }, 30);

        setTimeout(() => {
            manager.debounce('replace_key', () => {
                callLog.push('second');
            }, 20);
        }, 15);

        setTimeout(() => {
            // 只有第二个callback应该执行
            expect(callLog).toEqual(['second']);
            done();
        }, 80);
    });

    it('should clear timer even if callback throws', () => {
        jest.useFakeTimers();
        const manager = new DebounceManager();

        manager.debounce('throw_key', () => {
            throw new Error('boom');
        }, 10);

        expect(() => {
            jest.advanceTimersByTime(10);
        }).toThrow('boom');

        expect(manager.getActiveCount()).toBe(0);
        jest.useRealTimers();
    });

    it('should use default delay when not provided', () => {
        jest.useFakeTimers();
        const manager = new DebounceManager();
        const callback = jest.fn();

        manager.debounce('default_delay', callback);

        jest.advanceTimersByTime(299);
        expect(callback).not.toHaveBeenCalled();

        jest.advanceTimersByTime(1);
        expect(callback).toHaveBeenCalledTimes(1);
        expect(manager.getActiveCount()).toBe(0);
        jest.useRealTimers();
    });

    it('should clear all safely when empty', () => {
        const manager = new DebounceManager();
        expect(() => manager.clearAll()).not.toThrow();
        expect(manager.getActiveCount()).toBe(0);
    });
});
