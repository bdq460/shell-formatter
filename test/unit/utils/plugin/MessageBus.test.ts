import { setLogger } from '../../../../src/utils/log';

const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
};

setLogger(mockLogger);

import {
    Message,
    MessageBus,
    MessageBusConfig,
    MessageBusStats,
} from '../../../../src/utils/plugin';

describe('MessageBus', () => {
    let messageBus: MessageBus;

    beforeEach(() => {
        messageBus = new MessageBus();
    });

    describe('subscribe', () => {
        it('should subscribe to message type', () => {
            const handler = jest.fn();
            const subscriptionId = messageBus.subscribe('test:type', handler);

            expect(subscriptionId).toBeDefined();
            expect(typeof subscriptionId).toBe('string');
            expect(handler).not.toHaveBeenCalled();
        });

        it('should subscribe with options', () => {
            const handler = jest.fn();
            const options = { once: true, priority: 10 };
            const subscriptionId = messageBus.subscribe('test:type', handler, options);

            expect(subscriptionId).toBeDefined();
        });

        it('should enforce max subscriptions limit', () => {
            const config: MessageBusConfig = { maxSubscriptions: 2 };
            const limitedBus = new MessageBus(config);

            const handler1 = jest.fn();
            const handler2 = jest.fn();
            const handler3 = jest.fn();

            limitedBus.subscribe('type1', handler1);
            limitedBus.subscribe('type2', handler2);

            expect(() => limitedBus.subscribe('type3', handler3)).toThrow('Maximum subscription limit');
        });

        it('should handle zero maxSubscriptions (no limit)', () => {
            const config: MessageBusConfig = { maxSubscriptions: 0 };
            const unlimitedBus = new MessageBus(config);

            const handler = jest.fn();
            for (let i = 0; i < 100; i++) {
                unlimitedBus.subscribe(`type${i}`, handler);
            }

            // 应该没有限制
            expect(() => unlimitedBus.subscribe('type100', handler)).not.toThrow();
        });
    });

    describe('once', () => {
        it('should subscribe for single message', async () => {
            const handler = jest.fn();
            messageBus.once('test:type', handler);

            await messageBus.publish('test:type', { data: 'test1' });
            await messageBus.publish('test:type', { data: 'test2' });

            expect(handler).toHaveBeenCalledTimes(1);
        });
    });

    describe('unsubscribe', () => {
        it('should unsubscribe by subscription id', async () => {
            const handler = jest.fn();
            const subscriptionId = messageBus.subscribe('test:type', handler);

            messageBus.unsubscribe(subscriptionId);
            await messageBus.publish('test:type', { data: 'test' });

            expect(handler).not.toHaveBeenCalled();
        });

        it('should return true when subscription exists', () => {
            const handler = jest.fn();
            const subscriptionId = messageBus.subscribe('test:type', handler);

            const result = messageBus.unsubscribe(subscriptionId);
            expect(result).toBe(true);
        });

        it('should return false when subscription does not exist', () => {
            const result = messageBus.unsubscribe('non-existent-id');
            expect(result).toBe(false);
        });
    });

    describe('unsubscribeAll', () => {
        it('should unsubscribe all subscriptions for a type', async () => {
            const handler1 = jest.fn();
            const handler2 = jest.fn();
            const handler3 = jest.fn();

            messageBus.subscribe('type1', handler1);
            messageBus.subscribe('type1', handler2);
            messageBus.subscribe('type2', handler3);

            const count = messageBus.unsubscribeAll('type1');
            expect(count).toBe(2);

            await messageBus.publish('type1', { data: 'test' });
            await messageBus.publish('type2', { data: 'test' });

            expect(handler1).not.toHaveBeenCalled();
            expect(handler2).not.toHaveBeenCalled();
            expect(handler3).toHaveBeenCalled();
        });

        it('should return 0 when type has no subscriptions', () => {
            const count = messageBus.unsubscribeAll('non-existent');
            expect(count).toBe(0);
        });
    });

    describe('clear', () => {
        it('should clear all subscriptions', async () => {
            const handler1 = jest.fn();
            const handler2 = jest.fn();

            messageBus.subscribe('type1', handler1);
            messageBus.subscribe('type2', handler2);

            messageBus.clear();

            await messageBus.publish('type1', { data: 'test' });
            await messageBus.publish('type2', { data: 'test' });

            expect(handler1).not.toHaveBeenCalled();
            expect(handler2).not.toHaveBeenCalled();
        });
    });

    describe('publish', () => {
        it('should publish message to subscribers', async () => {
            const handler = jest.fn();
            messageBus.subscribe('test:type', handler);

            await messageBus.publish('test:type', { data: 'test' });

            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'test:type',
                    payload: { data: 'test' },
                })
            );
        });

        it('should publish message to multiple subscribers', async () => {
            const handler1 = jest.fn();
            const handler2 = jest.fn();
            const handler3 = jest.fn();

            messageBus.subscribe('test:type', handler1);
            messageBus.subscribe('test:type', handler2);
            messageBus.subscribe('test:type', handler3);

            await messageBus.publish('test:type', { data: 'test' });

            expect(handler1).toHaveBeenCalledTimes(1);
            expect(handler2).toHaveBeenCalledTimes(1);
            expect(handler3).toHaveBeenCalledTimes(1);
        });

        it('should handle async handlers', async () => {
            const handler = jest.fn(async (msg: Message) => {
                await new Promise((resolve) => setTimeout(resolve, 10));
                return msg.payload;
            });

            messageBus.subscribe('test:type', handler);
            await messageBus.publish('test:type', { data: 'test' });

            expect(handler).toHaveBeenCalledTimes(1);
        });

        it('should not publish to subscribers of other types', async () => {
            const handler1 = jest.fn();
            const handler2 = jest.fn();

            messageBus.subscribe('type1', handler1);
            messageBus.subscribe('type2', handler2);

            await messageBus.publish('type1', { data: 'test' });

            expect(handler1).toHaveBeenCalledTimes(1);
            expect(handler2).not.toHaveBeenCalled();
        });

        it('should return 0 when no subscribers', async () => {
            const count = await messageBus.publish('non-existent', { data: 'test' });
            expect(count).toBe(0);
        });

        it('should include message id and timestamp', async () => {
            const handler = jest.fn();
            messageBus.subscribe('test:type', handler);

            const startTime = Date.now();
            await messageBus.publish('test:type', { data: 'test' });
            const endTime = Date.now();

            const message = handler.mock.calls[0][0] as Message;
            expect(message.id).toBeDefined();
            expect(typeof message.id).toBe('string');
            expect(message.timestamp).toBeGreaterThanOrEqual(startTime);
            expect(message.timestamp).toBeLessThanOrEqual(endTime);
        });
    });

    describe('publishMessage', () => {
        it('should publish full message object', async () => {
            const handler = jest.fn();
            messageBus.subscribe('test:type', handler);

            await messageBus.publishMessage({
                type: 'test:type',
                payload: { data: 'test' },
                source: 'test-source',
            });

            expect(handler).toHaveBeenCalledTimes(1);
            const message = handler.mock.calls[0][0] as Message;
            expect(message.source).toBe('test-source');
        });

        it('should add message id if not provided', async () => {
            const handler = jest.fn();
            messageBus.subscribe('test:type', handler);

            await messageBus.publishMessage({
                type: 'test:type',
                payload: { data: 'test' },
            });

            const message = handler.mock.calls[0][0] as Message;
            expect(message.id).toBeDefined();
        });
    });

    describe('priority handling', () => {
        it('should process handlers in priority order (higher first)', async () => {
            const executionOrder: number[] = [];

            const handler1 = jest.fn(() => { executionOrder.push(1); });
            const handler2 = jest.fn(() => { executionOrder.push(2); });
            const handler3 = jest.fn(() => { executionOrder.push(3); });

            messageBus.subscribe('test:type', handler1, { priority: 10 });
            messageBus.subscribe('test:type', handler2, { priority: 30 });
            messageBus.subscribe('test:type', handler3, { priority: 20 });

            await messageBus.publish('test:type', { data: 'test' });

            expect(executionOrder).toEqual([2, 3, 1]);
        });

        it('should default priority to 0', async () => {
            const executionOrder: number[] = [];

            const handler1 = jest.fn(() => { executionOrder.push(1); });
            const handler2 = jest.fn(() => { executionOrder.push(2); });

            messageBus.subscribe('test:type', handler1);
            messageBus.subscribe('test:type', handler2, { priority: 10 });

            await messageBus.publish('test:type', { data: 'test' });

            expect(executionOrder).toEqual([2, 1]);
        });
    });

    describe('filter', () => {
        it('should filter messages based on filter function', async () => {
            const handler1 = jest.fn();
            const handler2 = jest.fn();

            messageBus.subscribe('test:type', handler1, {
                filter: (msg: Message) => (msg.payload as any).value > 5,
            });
            messageBus.subscribe('test:type', handler2);

            await messageBus.publish('test:type', { value: 3 });
            await messageBus.publish('test:type', { value: 10 });

            expect(handler1).toHaveBeenCalledTimes(1);
            expect(handler2).toHaveBeenCalledTimes(2);
        });

        it('should handle filter errors gracefully', async () => {
            const handler = jest.fn();

            messageBus.subscribe('test:type', handler, {
                filter: () => {
                    throw new Error('Filter error');
                },
            });

            await messageBus.publish('test:type', { data: 'test' });

            expect(handler).not.toHaveBeenCalled();
        });
    });

    describe('error handling', () => {
        it('should handle handler errors gracefully', async () => {
            const errorHandler = jest.fn();
            const handler = jest.fn(() => {
                throw new Error('Handler error');
            });

            messageBus.subscribe('test:type', handler, {
                errorHandler,
            });

            await messageBus.publish('test:type', { data: 'test' });

            expect(handler).toHaveBeenCalled();
            expect(errorHandler).toHaveBeenCalled();
        });

        it('should handle error handler errors gracefully', async () => {
            const handler = jest.fn(() => {
                throw new Error('Handler error');
            });

            messageBus.subscribe('test:type', handler, {
                errorHandler: () => {
                    throw new Error('Error handler error');
                },
            });

            await messageBus.publish('test:type', { data: 'test' });

            expect(handler).toHaveBeenCalled();
        });
    });

    describe('timeout handling', () => {
        it('should timeout handler if configured', async () => {
            const config: MessageBusConfig = { handlerTimeout: 100 };
            const timedOutBus = new MessageBus(config);

            const handler = jest.fn(() => new Promise<void>((resolve) => setTimeout(resolve, 200)));
            const errorHandler = jest.fn((_error: Error, _message: Message) => { });

            timedOutBus.subscribe('test:type', handler, { errorHandler });

            await timedOutBus.publish('test:type', { data: 'test' });

            expect(errorHandler).toHaveBeenCalled();
        });
    });

    describe('getSubscriberCount', () => {
        it('should return subscriber count for message type', () => {
            const handler1 = jest.fn();
            const handler2 = jest.fn();

            expect(messageBus.getSubscriberCount('test:type')).toBe(0);

            messageBus.subscribe('test:type', handler1);
            expect(messageBus.getSubscriberCount('test:type')).toBe(1);

            messageBus.subscribe('test:type', handler2);
            expect(messageBus.getSubscriberCount('test:type')).toBe(2);
        });

        it('should return 0 for non-existent type', () => {
            expect(messageBus.getSubscriberCount('non-existent')).toBe(0);
        });
    });

    describe('hasSubscribers', () => {
        it('should return true when subscribers exist', () => {
            const handler = jest.fn();
            messageBus.subscribe('test:type', handler);

            expect(messageBus.hasSubscribers('test:type')).toBe(true);
        });

        it('should return false when no subscribers', () => {
            expect(messageBus.hasSubscribers('non-existent')).toBe(false);
        });
    });

    describe('getStats', () => {
        it('should return correct statistics', async () => {
            const handler = jest.fn();
            messageBus.subscribe('test:type', handler);

            await messageBus.publish('test:type', { data: 'test1' });
            await messageBus.publish('test:type', { data: 'test2' });

            const stats: MessageBusStats = messageBus.getStats();
            expect(stats.totalSubscriptions).toBe(1);
            expect(stats.messageTypeCount).toBe(1);
            expect(stats.messagesSent).toBe(2);
            expect(stats.messagesProcessed).toBe(2);
            expect(stats.failures).toBe(0);
        });
    });

    describe('resetStats', () => {
        it('should reset statistics', async () => {
            const handler = jest.fn();
            messageBus.subscribe('test:type', handler);

            await messageBus.publish('test:type', { data: 'test' });

            messageBus.resetStats();

            const stats = messageBus.getStats();
            expect(stats.messagesSent).toBe(0);
            expect(stats.messagesProcessed).toBe(0);
            expect(stats.failures).toBe(0);
        });
    });

    describe('getMessageTypes', () => {
        it('should return all subscribed message types', () => {
            const handler1 = jest.fn();
            const handler2 = jest.fn();

            messageBus.subscribe('type1', handler1);
            messageBus.subscribe('type2', handler2);

            const types = messageBus.getMessageTypes();
            expect(types).toContain('type1');
            expect(types).toContain('type2');
            expect(types.length).toBe(2);
        });

        it('should return empty array when no subscriptions', () => {
            const types = messageBus.getMessageTypes();
            expect(types).toEqual([]);
        });
    });

    describe('configuration', () => {
        it('should accept custom configuration', () => {
            const config: MessageBusConfig = {
                enableLogging: true,
                enableMetrics: false,
                maxSubscriptions: 100,
                handlerTimeout: 5000,
            };

            const bus = new MessageBus(config);
            expect(bus).toBeDefined();
        });

        it('should use default configuration when none provided', () => {
            const bus = new MessageBus();
            expect(bus).toBeDefined();
        });
    });

    describe('unsubscribeAll', () => {
        it('should return count of unsubscribed subscriptions', async () => {
            const handler1 = jest.fn();
            const handler2 = jest.fn();

            messageBus.subscribe('test:type', handler1);
            messageBus.subscribe('test:type', handler2);

            const count = messageBus.unsubscribeAll('test:type');

            expect(count).toBe(2);
        });

        it('should handle non-existent type', () => {
            const count = messageBus.unsubscribeAll('non-existent');
            expect(count).toBe(0);
        });
    });

    describe('error handling in handlers', () => {
        it('should continue processing other handlers after error', async () => {
            const handler1 = jest.fn(() => { throw new Error('Handler 1 error'); });
            const handler2 = jest.fn();

            messageBus.subscribe('test:type', handler1);
            messageBus.subscribe('test:type', handler2);

            await messageBus.publish('test:type', { data: 'test' });

            expect(handler1).toHaveBeenCalled();
            expect(handler2).toHaveBeenCalled();
        });
    });

    describe('enableLogging: true', () => {
        let loggingMessageBus: MessageBus;
        const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

        beforeEach(() => {
            loggingMessageBus = new MessageBus({ enableLogging: true });
            consoleLogSpy.mockClear();
            mockLogger.debug.mockClear();
            mockLogger.warn.mockClear();
        });

        afterAll(() => {
            consoleLogSpy.mockRestore();
        });

        it('should log subscribe action', () => {
            loggingMessageBus.subscribe('test', () => { });
            expect(mockLogger.debug).toHaveBeenCalledWith(
                expect.stringContaining('Subscribed to "test"'),
            );
        });

        it('should log unsubscribe action', () => {
            const id = loggingMessageBus.subscribe('test', () => { });
            mockLogger.debug.mockClear();
            loggingMessageBus.unsubscribe(id);
            expect(mockLogger.debug).toHaveBeenCalledWith(
                expect.stringContaining('Unsubscribed from "test"'),
            );
        });

        it('should log warning for subscription not found', () => {
            loggingMessageBus.unsubscribe('non-existent-id');
            expect(mockLogger.warn).toHaveBeenCalledWith(
                expect.stringContaining('Subscription not found: non-existent-id'),
            );
        });

        it('should log unsubscribeAll action', () => {
            loggingMessageBus.subscribe('test', () => { });
            loggingMessageBus.subscribe('test', () => { });
            consoleLogSpy.mockClear();
            loggingMessageBus.unsubscribeAll('test');
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('Unsubscribed 2 subscriptions from "test"'),
            );
        });

        it('should log clear action', () => {
            loggingMessageBus.subscribe('test1', () => { });
            loggingMessageBus.subscribe('test2', () => { });
            consoleLogSpy.mockClear();
            loggingMessageBus.clear();
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('Cleared 2 subscriptions'),
            );
        });

        it('should log publish message', () => {
            loggingMessageBus.subscribe('test', () => { });
            consoleLogSpy.mockClear();
            loggingMessageBus.publish('test', { data: 'test' });
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('Publishing message type "test"'),
            );
        });

        it('should log no subscribers message', () => {
            consoleLogSpy.mockClear();
            loggingMessageBus.publish('test', { data: 'test' });
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('No subscribers for message type "test"'),
            );
        });

        it('should log message processing', async () => {
            loggingMessageBus.subscribe('test', () => { });
            consoleLogSpy.mockClear();
            await loggingMessageBus.publish('test', { data: 'test' });
            const logged = consoleLogSpy.mock.calls
                .map(call => String(call[0]))
                .some(message => message.includes('processed by'));
            expect(logged).toBe(true);
        });
    });
});
