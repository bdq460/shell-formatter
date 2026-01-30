import { setLogger } from '../../../../src/utils/log';

setLogger({
    debug: () => { },
    info: () => { },
    warn: () => { },
    error: () => { },
});

import {
    IPlugin,
    Message,
    PluginDependency,
    PluginLifecycleEvents,
    PluginManager,
    PluginManagerConfig,
} from '../../../../src/utils/plugin';

class TestPlugin implements IPlugin {
    name = 'test-plugin';
    displayName = 'Test Plugin';
    version = '1.0.0';
    description = 'Test plugin';

    activated = false;
    deactivated = false;

    async isAvailable(): Promise<boolean> {
        return true;
    }

    async onActivate(): Promise<void> {
        this.activated = true;
    }

    async onDeactivate(): Promise<void> {
        this.deactivated = true;
    }
}

class UnavailablePlugin implements IPlugin {
    name = 'unavailable-plugin';
    displayName = 'Unavailable Plugin';
    version = '1.0.0';
    description = 'Unavailable plugin';

    async isAvailable(): Promise<boolean> {
        return false;
    }
}

class PluginWithDependencies extends TestPlugin {
    name = 'plugin-with-deps';

    getDependencies(): PluginDependency[] {
        return [
            { name: 'test-plugin', required: true },
            { name: 'optional-dep', required: false },
        ];
    }
}

class FailingActivatePlugin extends TestPlugin {
    name = 'failing-activate';

    async onActivate(): Promise<void> {
        throw new Error('Activation failed');
    }
}

class FailingDeactivatePlugin extends TestPlugin {
    name = 'failing-deactivate';

    async onDeactivate(): Promise<void> {
        throw new Error('Deactivation failed');
    }
}

class ErrorPlugin implements IPlugin {
    name = 'error-plugin';
    displayName = 'Error Plugin';
    version = '1.0.0';
    description = 'Error plugin';
    async isAvailable(): Promise<boolean> {
        throw new Error('Check failed');
    }
}

describe('PluginManager', () => {
    let manager: PluginManager;

    beforeEach(() => {
        manager = new PluginManager();
    });

    describe('constructor', () => {
        it('should create manager with default config', () => {
            expect(manager).toBeDefined();
            expect(manager.getMessageBus()).toBeDefined();
        });

        it('should accept custom configuration', () => {
            const config: PluginManagerConfig = {
                throwOnActivationError: true,
                throwOnDeactivationError: true,
                messageBusConfig: { enableLogging: true },
            };
            const customManager = new PluginManager(config);
            expect(customManager).toBeDefined();
        });
    });

    describe('register', () => {
        it('should register plugin', () => {
            const plugin = new TestPlugin();
            manager.register(plugin);

            expect(manager.get('test-plugin')).toBe(plugin);
        });

        it('should inject message bus', () => {
            const plugin = new TestPlugin();
            manager.register(plugin);

            // Plugin is registered successfully
            expect(manager.get('test-plugin')).toBe(plugin);
        });

        it('should call setMessageBus when provided', () => {
            const pluginWithBus = {
                name: 'custom-plugin',
                displayName: 'Custom Plugin',
                version: '1.0.0',
                description: 'Custom plugin',
                isAvailable: async () => true,
                setMessageBus: jest.fn(),
            } as unknown as IPlugin;

            manager.register(pluginWithBus);

            expect(pluginWithBus.setMessageBus).toHaveBeenCalledTimes(1);
        });

        it('should overwrite existing plugin', () => {
            const plugin1 = new TestPlugin();
            const plugin2 = new TestPlugin();

            manager.register(plugin1);
            manager.register(plugin2);

            expect(manager.get('test-plugin')).toBe(plugin2);
        });
    });

    describe('unregister', () => {
        it('should unregister plugin', async () => {
            const plugin = new TestPlugin();
            manager.register(plugin);

            await manager.unregister('test-plugin');

            expect(manager.get('test-plugin')).toBeUndefined();
        });

        it('should call onDeactivate hook', async () => {
            const plugin = new TestPlugin();
            manager.register(plugin);
            await manager.activate('test-plugin');

            await manager.unregister('test-plugin');

            expect(plugin.deactivated).toBe(true);
        });

        it('should handle non-existent plugin gracefully', async () => {
            await expect(manager.unregister('non-existent')).resolves.not.toThrow();
        });

        it('should throw error on deactivation failure when configured', async () => {
            const config: PluginManagerConfig = { throwOnDeactivationError: true };
            const errorManager = new PluginManager(config);
            const plugin = new FailingDeactivatePlugin();

            errorManager.register(plugin);

            await expect(errorManager.unregister('failing-deactivate')).rejects.toThrow('Deactivation failed');
        });
    });

    describe('get', () => {
        it('should get registered plugin', () => {
            const plugin = new TestPlugin();
            manager.register(plugin);

            expect(manager.get('test-plugin')).toBe(plugin);
        });

        it('should return undefined for non-existent plugin', () => {
            expect(manager.get('non-existent')).toBeUndefined();
        });
    });

    describe('has', () => {
        it('should return true for registered plugin', () => {
            const plugin = new TestPlugin();
            manager.register(plugin);

            expect(manager.has('test-plugin')).toBe(true);
        });

        it('should return false for non-existent plugin', () => {
            expect(manager.has('non-existent')).toBe(false);
        });
    });

    describe('getAll', () => {
        it('should return all registered plugins', () => {
            const plugin1 = new TestPlugin();
            const plugin2 = new UnavailablePlugin();

            manager.register(plugin1);
            manager.register(plugin2);

            const allPlugins = manager.getAll();
            expect(allPlugins).toHaveLength(2);
            expect(allPlugins).toContain(plugin1);
            expect(allPlugins).toContain(plugin2);
        });

        it('should return empty array when no plugins', () => {
            const allPlugins = manager.getAll();
            expect(allPlugins).toEqual([]);
        });
    });

    describe('getAvailablePlugins', () => {
        it('should return available plugins', async () => {
            const plugin1 = new TestPlugin();
            const plugin2 = new UnavailablePlugin();

            manager.register(plugin1);
            manager.register(plugin2);

            const availablePlugins = await manager.getAvailablePlugins();
            expect(availablePlugins).toHaveLength(1);
            expect(availablePlugins[0].name).toBe('test-plugin');
        });

        it('should handle isAvailable errors gracefully', async () => {
            const plugin = new ErrorPlugin();
            manager.register(plugin);

            const availablePlugins = await manager.getAvailablePlugins();
            expect(availablePlugins).not.toContain(plugin);
        });
    });

    describe('activate', () => {
        beforeEach(() => {
            const plugin = new TestPlugin();
            manager.register(plugin);
        });

        it('should activate plugin', async () => {
            const success = await manager.activate('test-plugin');
            expect(success).toBe(true);
            expect(manager.isActive('test-plugin')).toBe(true);
        });

        it('should call onActivate hook', async () => {
            const plugin = manager.get('test-plugin') as TestPlugin;
            await manager.activate('test-plugin');

            expect(plugin.activated).toBe(true);
        });

        it('should return false for non-existent plugin', async () => {
            const success = await manager.activate('non-existent');
            expect(success).toBe(false);
        });

        it('should fail when plugin is unavailable', async () => {
            const plugin = new UnavailablePlugin();
            manager.register(plugin);

            const success = await manager.activate('unavailable-plugin');
            expect(success).toBe(false);
            expect(manager.isActive('unavailable-plugin')).toBe(false);
        });

        it('should fail when required dependencies are not activated', async () => {
            const plugin = new PluginWithDependencies();
            manager.register(plugin);

            const success = await manager.activate('plugin-with-deps');
            expect(success).toBe(false);
        });

        it('should succeed when dependencies are activated', async () => {
            const depPlugin = new TestPlugin();
            depPlugin.name = 'optional-dep';
            manager.register(depPlugin);
            await manager.activate('test-plugin');

            const plugin = new PluginWithDependencies();
            manager.register(plugin);

            const success = await manager.activate('plugin-with-deps');
            expect(success).toBe(true);
        });

        it('should handle activation failure gracefully', async () => {
            const plugin = new FailingActivatePlugin();
            manager.register(plugin);

            const success = await manager.activate('failing-activate');
            expect(success).toBe(true); // Still marks as active
            expect(plugin.activated).toBe(false);
        });

        it('should throw error on activation failure when configured', async () => {
            const config: PluginManagerConfig = { throwOnActivationError: true };
            const errorManager = new PluginManager(config);
            const plugin = new FailingActivatePlugin();

            errorManager.register(plugin);

            await expect(errorManager.activate('failing-activate')).rejects.toThrow('Activation failed');
        });

        it('should reactivate plugin if already active', async () => {
            await manager.activate('test-plugin');
            const plugin = manager.get('test-plugin') as TestPlugin;
            plugin.activated = false;

            await manager.activate('test-plugin');

            expect(plugin.activated).toBe(true);
            expect(manager.isActive('test-plugin')).toBe(true);
        });

        it('should handle errors when deactivating before reactivation', async () => {
            class ThrowingDeactivatePlugin extends TestPlugin {
                name = 'throwing-deactivate';
                async onDeactivate(): Promise<void> {
                    throw new Error('Deactivate failed');
                }
            }

            const plugin = new ThrowingDeactivatePlugin();
            manager.register(plugin);
            await manager.activate('throwing-deactivate');

            await expect(manager.activate('throwing-deactivate')).resolves.toBe(true);
        });

        it('should publish lifecycle events', async () => {
            const messageBus = manager.getMessageBus();
            const events: Message[] = [];

            messageBus.subscribe(PluginLifecycleEvents.BEFORE_ACTIVATE, (msg: Message) => { events.push(msg); });
            messageBus.subscribe(PluginLifecycleEvents.ACTIVATED, (msg: Message) => { events.push(msg); });

            await manager.activate('test-plugin');

            expect(events.length).toBe(2);
            expect(events[0].type).toBe(PluginLifecycleEvents.BEFORE_ACTIVATE);
            expect(events[1].type).toBe(PluginLifecycleEvents.ACTIVATED);
        });

        it('should publish activation failed event', async () => {
            const plugin = new UnavailablePlugin();
            manager.register(plugin);

            const messageBus = manager.getMessageBus();
            const failedEvents: Message[] = [];

            messageBus.subscribe(PluginLifecycleEvents.ACTIVATION_FAILED, (msg: Message) => { failedEvents.push(msg); });

            await manager.activate('unavailable-plugin');

            expect(failedEvents.length).toBe(1);
            expect(failedEvents[0].payload.error).toContain('not available');
        });
    });

    describe('deactivate', () => {
        beforeEach(async () => {
            const plugin = new TestPlugin();
            manager.register(plugin);
            await manager.activate('test-plugin');
        });

        it('should deactivate plugin', async () => {
            const success = await manager.deactivate('test-plugin');
            expect(success).toBe(true);
            expect(manager.isActive('test-plugin')).toBe(false);
        });

        it('should call onDeactivate hook', async () => {
            const plugin = manager.get('test-plugin') as TestPlugin;
            await manager.deactivate('test-plugin');

            expect(plugin.deactivated).toBe(true);
        });

        it('should return false for non-existent plugin', async () => {
            const success = await manager.deactivate('non-existent');
            expect(success).toBe(false);
        });

        it('should return false for already inactive plugin', async () => {
            await manager.deactivate('test-plugin');
            const success = await manager.deactivate('test-plugin');
            expect(success).toBe(false);
        });

        it('should handle deactivation failure gracefully', async () => {
            const plugin = new FailingDeactivatePlugin();
            manager.register(plugin);
            await manager.activate('failing-deactivate');

            const success = await manager.deactivate('failing-deactivate');
            expect(success).toBe(true);
            expect(manager.isActive('failing-deactivate')).toBe(false);
        });

        it('should throw error on deactivation failure when configured', async () => {
            const config: PluginManagerConfig = { throwOnDeactivationError: true };
            const errorManager = new PluginManager(config);
            const plugin = new FailingDeactivatePlugin();

            errorManager.register(plugin);
            await errorManager.activate('failing-deactivate');

            await expect(errorManager.deactivate('failing-deactivate')).rejects.toThrow('Deactivation failed');
        });

        it('should publish lifecycle events', async () => {
            const messageBus = manager.getMessageBus();
            const events: Message[] = [];

            messageBus.subscribe(PluginLifecycleEvents.BEFORE_DEACTIVATE, (msg: Message) => { events.push(msg); });
            messageBus.subscribe(PluginLifecycleEvents.DEACTIVATED, (msg: Message) => { events.push(msg); });

            await manager.deactivate('test-plugin');

            expect(events.length).toBe(2);
            expect(events[0].type).toBe(PluginLifecycleEvents.BEFORE_DEACTIVATE);
            expect(events[1].type).toBe(PluginLifecycleEvents.DEACTIVATED);
        });

        it('should publish deactivation failed event', async () => {
            const plugin = new FailingDeactivatePlugin();
            manager.register(plugin);
            await manager.activate('failing-deactivate');

            const messageBus = manager.getMessageBus();
            const failedEvents: Message[] = [];

            messageBus.subscribe(PluginLifecycleEvents.DEACTIVATION_FAILED, (msg: Message) => { failedEvents.push(msg); });

            await manager.deactivate('failing-deactivate');

            expect(failedEvents.length).toBe(1);
            expect(failedEvents[0].payload.error).toContain('Deactivation failed');
        });
    });

    describe('deactivateAll', () => {
        it('should deactivate all active plugins', async () => {
            const plugin1 = new TestPlugin();
            const plugin2 = new UnavailablePlugin();

            manager.register(plugin1);
            manager.register(plugin2);

            await manager.activate('test-plugin');

            await manager.deactivateAll();

            expect(manager.isActive('test-plugin')).toBe(false);
        });
    });

    describe('activateMultiple', () => {
        beforeEach(() => {
            manager.register(new TestPlugin());
            manager.register(new UnavailablePlugin());
        });

        it('should activate multiple plugins', async () => {
            const successCount = await manager.activateMultiple(['test-plugin', 'unavailable-plugin']);
            expect(successCount).toBe(1);
        });

        it('should activate all available plugins', async () => {
            const plugin2 = new UnavailablePlugin();
            plugin2.name = 'plugin2';
            plugin2.isAvailable = async () => true;
            manager.register(plugin2);

            const successCount = await manager.activateMultiple(['test-plugin', 'plugin2']);
            expect(successCount).toBe(2);
        });
    });

    describe('reactivate', () => {
        beforeEach(() => {
            manager.register(new TestPlugin());
            manager.register(new UnavailablePlugin());
        });

        it('should deactivate all then activate selected', async () => {
            await manager.activate('test-plugin');

            const successCount = await manager.reactivate(['test-plugin']);

            expect(successCount).toBe(1);
            expect(manager.isActive('test-plugin')).toBe(true);
        });
    });

    describe('isActive', () => {
        it('should return true for active plugin', async () => {
            const plugin = new TestPlugin();
            manager.register(plugin);
            await manager.activate('test-plugin');

            expect(manager.isActive('test-plugin')).toBe(true);
        });

        it('should return false for inactive plugin', () => {
            const plugin = new TestPlugin();
            manager.register(plugin);

            expect(manager.isActive('test-plugin')).toBe(false);
        });
    });

    describe('getActivePluginNames', () => {
        it('should return names of active plugins', async () => {
            const plugin1 = new TestPlugin();
            const plugin2 = new UnavailablePlugin();

            manager.register(plugin1);
            manager.register(plugin2);

            await manager.activate('test-plugin');

            const activeNames = manager.getActivePluginNames();
            expect(activeNames).toContain('test-plugin');
            expect(activeNames).not.toContain('unavailable-plugin');
        });
    });

    describe('getStats', () => {
        it('should return plugin statistics', async () => {
            const plugin1 = new TestPlugin();
            const plugin2 = new UnavailablePlugin();

            manager.register(plugin1);
            manager.register(plugin2);

            await manager.activate('test-plugin');

            const stats = manager.getStats();

            expect(stats.total).toBe(2);
            expect(stats.active).toBe(1);
            expect(stats.plugins).toHaveLength(2);
        });
    });

    describe('clear', () => {
        it('should clear all plugins', () => {
            const plugin1 = new TestPlugin();
            const plugin2 = new UnavailablePlugin();

            manager.register(plugin1);
            manager.register(plugin2);

            manager.clear();

            expect(manager.getAll()).toEqual([]);
            expect(manager.getActivePluginNames()).toEqual([]);
        });
    });

    describe('getMessageBus', () => {
        it('should return message bus instance', () => {
            const messageBus = manager.getMessageBus();
            expect(messageBus).toBeDefined();
        });

        it('should return same instance', () => {
            const bus1 = manager.getMessageBus();
            const bus2 = manager.getMessageBus();
            expect(bus1).toBe(bus2);
        });
    });

    describe('publishMessage', () => {
        it('should publish simple message', async () => {
            const messageBus = manager.getMessageBus();
            const handler = jest.fn();
            messageBus.subscribe('test:type', handler);

            await manager.publishMessage('test:type', { data: 'test' });

            expect(handler).toHaveBeenCalled();
        });

        it('should publish message with custom source', async () => {
            const messageBus = manager.getMessageBus();
            const handler = jest.fn();
            messageBus.subscribe('test:type', handler);

            await manager.publishMessage('test:type', { data: 'test' }, 'custom-source');

            const message = handler.mock.calls[0][0];
            expect(message.source).toBe('custom-source');
        });
    });

    describe('publishMessageWithMetadata', () => {
        it('should publish full message', async () => {
            const messageBus = manager.getMessageBus();
            const handler = jest.fn();
            messageBus.subscribe('test:type', handler);

            await manager.publishMessageWithMetadata({
                type: 'test:type',
                payload: { data: 'test' },
                source: 'test-source',
                timestamp: Date.now(),
            });

            expect(handler).toHaveBeenCalled();
        });
    });
});
