import {
    clearContainer,
    DIContainer,
    getContainer,
    resetContainer,
    setContainer,
} from '../../../../src/utils/di/container';
import { setLogger } from '../../../../src/utils/log';

const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
};

class TestCleanupService {
    public cleaned = false;
    cleanup(): void {
        this.cleaned = true;
    }
}

class AsyncCleanupService {
    public cleaned = false;
    async cleanup(): Promise<void> {
        await Promise.resolve();
        this.cleaned = true;
    }
}

describe('DIContainer', () => {
    beforeAll(() => {
        setLogger(mockLogger);
    });

    beforeEach(() => {
        clearContainer();
        jest.clearAllMocks();
    });

    it('should register and resolve singleton service', () => {
        const container = new DIContainer();
        const factory = jest.fn(() => ({ value: 1 }));

        container.registerSingleton('test', factory);

        const instance1 = container.resolve<{ value: number }>('test');
        const instance2 = container.resolve<{ value: number }>('test');

        expect(instance1).toBe(instance2);
        expect(factory).toHaveBeenCalledTimes(1);
    });

    it('should register and resolve transient service', () => {
        const container = new DIContainer();
        const factory = jest.fn(() => ({ value: Math.random() }));

        container.registerTransient('test', factory);

        const instance1 = container.resolve<{ value: number }>('test');
        const instance2 = container.resolve<{ value: number }>('test');

        expect(instance1).not.toBe(instance2);
        expect(factory).toHaveBeenCalledTimes(2);
    });

    it('should warn when registering duplicate service', () => {
        const container = new DIContainer();

        container.registerSingleton('duplicate', () => ({ a: 1 }));
        container.registerSingleton('duplicate', () => ({ a: 2 }));

        expect(container.resolve<{ a: number }>('duplicate').a).toBe(2);
        expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should throw when resolving missing service', () => {
        const container = new DIContainer();
        expect(() => container.resolve('missing')).toThrow(
            'Service "missing" is not registered',
        );
    });

    it('should detect circular dependency', () => {
        const container = new DIContainer();
        container.registerSingleton('A', () => container.resolve('B'));
        container.registerSingleton('B', () => container.resolve('A'));

        expect(() => container.resolve('A')).toThrow('Circular dependency detected');
    });

    it('should reset instantiated services', () => {
        const container = new DIContainer();
        const factory = jest.fn(() => ({ value: 1 }));

        container.registerSingleton('test', factory);
        container.resolve('test');
        container.reset();

        container.resolve('test');
        expect(factory).toHaveBeenCalledTimes(2);
    });

    it('should cleanup instantiated services', async () => {
        const container = new DIContainer();
        container.registerSingleton('cleanup', () => new TestCleanupService());
        container.registerSingleton('asyncCleanup', () => new AsyncCleanupService());

        const service = container.resolve<TestCleanupService>('cleanup');
        const asyncService = container.resolve<AsyncCleanupService>('asyncCleanup');

        await container.cleanup();

        expect(service.cleaned).toBe(true);
        expect(asyncService.cleaned).toBe(true);
    });

    it('should clear services and stack', () => {
        const container = new DIContainer();
        container.registerSingleton('test', () => ({ value: 1 }));

        container.clear();
        expect(container.getRegisteredServices()).toEqual([]);
    });

    it('should provide stats', () => {
        const container = new DIContainer();
        container.registerSingleton('one', () => ({ value: 1 }), ['dep']);
        container.registerSingleton('two', () => ({ value: 2 }));

        container.resolve('one');

        const stats = container.getStats();
        expect(stats.total).toBe(2);
        expect(stats.instantiated).toBe(1);
        expect(stats.services).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ name: 'one', dependencies: ['dep'], instantiated: true }),
                expect.objectContaining({ name: 'two', dependencies: [], instantiated: false }),
            ]),
        );
    });
});

describe('global container helpers', () => {
    beforeEach(() => {
        clearContainer();
        jest.clearAllMocks();
    });

    it('should create and return global container', () => {
        const container = getContainer();
        expect(container).toBeInstanceOf(DIContainer);
    });

    it('should set global container', () => {
        const container = new DIContainer();
        setContainer(container);
        expect(getContainer()).toBe(container);
    });

    it('should reset global container', () => {
        const container = getContainer();
        container.registerSingleton('test', () => ({ value: 1 }));
        container.resolve('test');

        resetContainer();
        const instance = container.resolve<{ value: number }>('test');
        expect(instance.value).toBe(1);
    });

    it('should clear global container instance', () => {
        getContainer();
        clearContainer();
        const fresh = getContainer();
        expect(fresh).toBeInstanceOf(DIContainer);
    });
});
