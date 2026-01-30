import { setLogger } from '../../../../src/utils/log';
setLogger({
    debug: () => { },
    info: () => { },
    warn: () => { },
    error: () => { },
});
import { BasePlugin, MessageBus, } from '../../../../src/utils/plugin';
class TestPlugin extends BasePlugin {
    constructor() {
        super(...arguments);
        this.onActivateCalled = false;
        this.onDeactivateCalled = false;
    }
    get name() { return 'test-plugin'; }
    get displayName() { return 'Test Plugin'; }
    get version() { return '1.0.0'; }
    get description() { return 'Test plugin for unit tests'; }
    async isAvailable() { return true; }
    async onActivate() {
        this.onActivateCalled = true;
    }
    async onDeactivate() {
        this.onDeactivateCalled = true;
        await super.onDeactivate();
    }
    async testAsyncOperation() {
        return await this.safeExecute(async () => {
            return 'success';
        }, 'testAsyncOperation');
    }
    async testAsyncOperationWithError() {
        return await this.safeExecute(async () => {
            throw new Error('Test error');
        }, 'testAsyncOperationWithError');
    }
    async testAsyncOperationWithDefault() {
        return await this.safeExecuteWithDefault(async () => {
            throw new Error('Test error');
        }, 'default-value', 'testAsyncOperationWithDefault');
    }
    getTestDependencies() {
        return [
            { name: 'dep1', required: true },
            { name: 'dep2', required: false, version: '^1.0.0' },
        ];
    }
    getTestCapabilities() {
        return ['capability1', 'capability2'];
    }
}
describe('BasePlugin', () => {
    let plugin;
    let messageBus;
    beforeEach(() => {
        plugin = new TestPlugin();
        messageBus = new MessageBus();
    });
    describe('properties', () => {
        it('should have correct name', () => {
            expect(plugin.name).toBe('test-plugin');
        });
        it('should have correct displayName', () => {
            expect(plugin.displayName).toBe('Test Plugin');
        });
        it('should have correct version', () => {
            expect(plugin.version).toBe('1.0.0');
        });
        it('should have correct description', () => {
            expect(plugin.description).toBe('Test plugin for unit tests');
        });
    });
    describe('setMessageBus', () => {
        it('should set message bus instance', () => {
            plugin.setMessageBus(messageBus);
            // MessageBus 设置成功后可以正常使用
            expect(plugin).toBeDefined();
        });
    });
    describe('subscribeMessage', () => {
        beforeEach(() => {
            plugin.setMessageBus(messageBus);
        });
        it('should subscribe to message', async () => {
            const handler = jest.fn();
            plugin['subscribeMessage']('test:type', handler);
            await messageBus.publish('test:type', { data: 'test' });
            expect(handler).toHaveBeenCalledTimes(1);
        });
        it('should return subscription id', () => {
            const handler = jest.fn();
            const subscriptionId = plugin['subscribeMessage']('test:type', handler);
            expect(subscriptionId).toBeDefined();
            expect(typeof subscriptionId).toBe('string');
        });
        it('should support subscription options', async () => {
            const handler = jest.fn();
            plugin['subscribeMessage']('test:type', handler, { once: true });
            await messageBus.publish('test:type', { data: 'test1' });
            await messageBus.publish('test:type', { data: 'test2' });
            expect(handler).toHaveBeenCalledTimes(1);
        });
    });
    describe('unsubscribeMessage', () => {
        beforeEach(() => {
            plugin.setMessageBus(messageBus);
        });
        it('should unsubscribe message', async () => {
            const handler = jest.fn();
            const subscriptionId = plugin['subscribeMessage']('test:type', handler);
            plugin['unsubscribeMessage'](subscriptionId);
            await messageBus.publish('test:type', { data: 'test' });
            expect(handler).not.toHaveBeenCalled();
        });
        it('should return true when unsubscription succeeds', () => {
            const handler = jest.fn();
            const subscriptionId = plugin['subscribeMessage']('test:type', handler);
            const result = plugin['unsubscribeMessage'](subscriptionId);
            expect(result).toBe(true);
        });
        it('should return false when subscription does not exist', () => {
            const result = plugin['unsubscribeMessage']('non-existent-id');
            expect(result).toBe(false);
        });
        it('should return false when message bus is not available', () => {
            const pluginWithoutBus = new TestPlugin();
            const result = pluginWithoutBus['unsubscribeMessage']('some-id');
            expect(result).toBe(false);
        });
    });
    describe('publish', () => {
        beforeEach(() => {
            plugin.setMessageBus(messageBus);
        });
        it('should publish message', async () => {
            const handler = jest.fn();
            messageBus.subscribe('test:type', handler);
            const count = await plugin['publish']('test:type', { data: 'test' });
            expect(count).toBe(1);
            expect(handler).toHaveBeenCalledTimes(1);
        });
        it('should use plugin name as default source', async () => {
            const handler = jest.fn();
            messageBus.subscribe('test:type', handler);
            await plugin['publish']('test:type', { data: 'test' });
            const message = handler.mock.calls[0][0];
            expect(message.source).toBe('test-plugin');
        });
        it('should allow custom source', async () => {
            const handler = jest.fn();
            messageBus.subscribe('test:type', handler);
            await plugin['publish']('test:type', { data: 'test' }, 'custom-source');
            const message = handler.mock.calls[0][0];
            expect(message.source).toBe('custom-source');
        });
        it('should throw error when message bus is not initialized', async () => {
            const pluginWithoutBus = new TestPlugin();
            await expect(async () => {
                await pluginWithoutBus['publish']('test:type', { data: 'test' });
            }).rejects.toThrow();
        });
    });
    describe('publishMessage', () => {
        beforeEach(() => {
            plugin.setMessageBus(messageBus);
        });
        it('should publish full message', async () => {
            const handler = jest.fn();
            messageBus.subscribe('test:type', handler);
            const count = await plugin['publishMessage']({
                type: 'test:type',
                payload: { data: 'test' },
            });
            expect(count).toBe(1);
            expect(handler).toHaveBeenCalledTimes(1);
        });
        it('should use plugin name as default source', async () => {
            const handler = jest.fn();
            messageBus.subscribe('test:type', handler);
            await plugin['publishMessage']({
                type: 'test:type',
                payload: { data: 'test' },
            });
            const message = handler.mock.calls[0][0];
            expect(message.source).toBe('test-plugin');
        });
        it('should allow custom source', async () => {
            const handler = jest.fn();
            messageBus.subscribe('test:type', handler);
            await plugin['publishMessage']({
                type: 'test:type',
                payload: { data: 'test' },
                source: 'custom-source',
            });
            const message = handler.mock.calls[0][0];
            expect(message.source).toBe('custom-source');
        });
    });
    describe('publishLifecycleEvent', () => {
        beforeEach(() => {
            plugin.setMessageBus(messageBus);
        });
        it('should publish lifecycle event', async () => {
            const handler = jest.fn();
            messageBus.subscribe('plugin:activated', handler);
            const count = await plugin['publishLifecycleEvent']('plugin:activated', {
                capabilities: ['test-cap'],
            });
            expect(count).toBeGreaterThan(0);
            expect(handler).toHaveBeenCalled();
        });
        it('should include plugin name in payload', async () => {
            const handler = jest.fn();
            messageBus.subscribe('plugin:activated', handler);
            await plugin['publishLifecycleEvent']('plugin:activated', {});
            const payload = handler.mock.calls[0][0].payload;
            expect(payload.pluginName).toBe('test-plugin');
        });
    });
    describe('getDependencies', () => {
        it('should return empty array by default', () => {
            class EmptyPlugin extends BasePlugin {
                get name() { return 'empty-plugin'; }
                get displayName() { return 'Empty'; }
                get version() { return '1.0.0'; }
                get description() { return 'Empty'; }
                async isAvailable() { return true; }
            }
            const emptyPlugin = new EmptyPlugin();
            const deps = emptyPlugin.getDependencies?.();
            expect(deps).toEqual([]);
        });
        it('should return custom dependencies', () => {
            const deps = plugin.getTestDependencies();
            expect(deps).toHaveLength(2);
            expect(deps[0].name).toBe('dep1');
            expect(deps[0].required).toBe(true);
            expect(deps[1].name).toBe('dep2');
            expect(deps[1].required).toBe(false);
            expect(deps[1].version).toBe('^1.0.0');
        });
    });
    describe('getCapabilities', () => {
        it('should return empty array by default', () => {
            class EmptyPlugin extends BasePlugin {
                get name() { return 'empty-plugin'; }
                get displayName() { return 'Empty'; }
                get version() { return '1.0.0'; }
                get description() { return 'Empty'; }
                async isAvailable() { return true; }
            }
            const emptyPlugin = new EmptyPlugin();
            const caps = emptyPlugin.getCapabilities?.();
            expect(caps).toEqual([]);
        });
        it('should return custom capabilities', () => {
            const caps = plugin.getTestCapabilities();
            expect(caps).toEqual(['capability1', 'capability2']);
        });
    });
    describe('onDeactivate', () => {
        it('should automatically unsubscribe all messages', async () => {
            plugin.setMessageBus(messageBus);
            const handler1 = jest.fn();
            const handler2 = jest.fn();
            const handler3 = jest.fn();
            plugin['subscribeMessage']('type1', handler1);
            plugin['subscribeMessage']('type2', handler2);
            plugin['subscribeMessage']('type3', handler3);
            await plugin.onDeactivate();
            await messageBus.publish('type1', { data: 'test' });
            await messageBus.publish('type2', { data: 'test' });
            await messageBus.publish('type3', { data: 'test' });
            expect(handler1).not.toHaveBeenCalled();
            expect(handler2).not.toHaveBeenCalled();
            expect(handler3).not.toHaveBeenCalled();
        });
        it('should call custom onDeactivate', async () => {
            await plugin.onDeactivate();
            expect(plugin.onDeactivateCalled).toBe(true);
        });
    });
    describe('getMetadata', () => {
        it('should return plugin metadata', () => {
            const metadata = plugin.getMetadata();
            expect(metadata.name).toBe('test-plugin');
            expect(metadata.displayName).toBe('Test Plugin');
            expect(metadata.version).toBe('1.0.0');
            expect(metadata.description).toBe('Test plugin for unit tests');
        });
    });
    describe('safeExecute', () => {
        it('should execute operation successfully', async () => {
            const result = await plugin.testAsyncOperation();
            expect(result).toBe('success');
        });
        it('should handle errors and return undefined', async () => {
            const result = await plugin.testAsyncOperationWithError();
            expect(result).toBeUndefined();
        });
    });
    describe('safeExecuteWithDefault', () => {
        it('should return default value on error', async () => {
            const result = await plugin.testAsyncOperationWithDefault();
            expect(result).toBe('default-value');
        });
        it('should return operation result on success', async () => {
            const result = await plugin['safeExecuteWithDefault'](async () => 'success', 'default', 'test');
            expect(result).toBe('success');
        });
    });
    describe('integration', () => {
        it('should work with message bus', async () => {
            plugin.setMessageBus(messageBus);
            const receivedMessages = [];
            plugin['subscribeMessage']('test:type', (msg) => {
                receivedMessages.push(msg.payload);
            });
            await plugin['publish']('test:type', { data: 'test1' });
            await plugin['publish']('test:type', { data: 'test2' });
            expect(receivedMessages).toEqual([{ data: 'test1' }, { data: 'test2' }]);
        });
        it('should cleanup on deactivation', async () => {
            plugin.setMessageBus(messageBus);
            const handler = jest.fn();
            plugin['subscribeMessage']('test:type', handler);
            await plugin.onDeactivate();
            await messageBus.publish('test:type', { data: 'test' });
            expect(handler).not.toHaveBeenCalled();
        });
    });
    describe('MessageBus not initialized errors', () => {
        it('should throw error when subscribing without messageBus', () => {
            const pluginWithoutBus = new TestPlugin();
            expect(() => {
                pluginWithoutBus['subscribeMessage']('test:type', () => { });
            }).toThrow('MessageBus not initialized');
        });
        it('should throw error when publishing without messageBus', async () => {
            const pluginWithoutBus = new TestPlugin();
            await expect(async () => {
                await pluginWithoutBus['publish']('test:type', { data: 'test' });
            }).rejects.toThrow('MessageBus not initialized');
        });
        it('should throw error when publishingMessage without messageBus', async () => {
            const pluginWithoutBus = new TestPlugin();
            await expect(async () => {
                await pluginWithoutBus['publishMessage']({
                    type: 'test:type',
                    payload: { data: 'test' }
                });
            }).rejects.toThrow('MessageBus not initialized');
        });
    });
    describe('onActivate hook', () => {
        it('should support optional onActivate hook', async () => {
            class OptionalActivatePlugin extends BasePlugin {
                constructor() {
                    super(...arguments);
                    this.activateCalled = false;
                }
                get name() { return 'optional-activate'; }
                get displayName() { return 'Optional Activate'; }
                get version() { return '1.0.0'; }
                get description() { return 'Test plugin'; }
                async isAvailable() { return true; }
                async onActivate() {
                    this.activateCalled = true;
                }
            }
            const plugin = new OptionalActivatePlugin();
            await plugin.onActivate?.();
            expect(plugin.activateCalled).toBe(true);
        });
        it('should work without onActivate hook', async () => {
            class NoActivatePlugin extends BasePlugin {
                get name() { return 'no-activate'; }
                get displayName() { return 'No Activate'; }
                get version() { return '1.0.0'; }
                get description() { return 'Test plugin'; }
                async isAvailable() { return true; }
            }
            const plugin = new NoActivatePlugin();
            await plugin.onActivate?.();
            expect(plugin.onActivate).toBeUndefined();
        });
    });
});
//# sourceMappingURL=BasePlugin.test.js.map