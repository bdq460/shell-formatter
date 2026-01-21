/**
 * 清理钩子接口
 * 服务如果实现此接口，将在容器清理时被调用
 */
export interface ICleanup {
    cleanup(): void | Promise<void>;
}

/**
 * 判断对象是否实现了 ICleanup 接口
 */
function hasCleanup(obj: any): obj is ICleanup {
    return obj && typeof obj.cleanup === "function";
}

/**
 * 依赖注入容器
 *
 * 轻量级依赖注入实现，用于管理服务实例和依赖关系
 * 特点：
 * - 单例模式：默认创建单例实例
 * - 延迟初始化：只在需要时创建实例
 * - 循环依赖检测：避免无限递归
 * - 自动依赖注入：通过构造函数注入
 * - 服务清理钩子：支持服务自定义清理逻辑
 */

import { logger } from "../utils/log";

/**
 * 清理钩子接口
 * 服务如果实现此接口，将在容器清理时被调用
 */

/**
 * 判断对象是否实现了 ICleanup 接口
 */

/**
 * 服务工厂函数类型
 */
type ServiceFactory<T> = () => T;

/**
 * 服务元数据
 */
interface ServiceMetadata<T> {
    /** 服务工厂函数 */
    factory: ServiceFactory<T>;
    /** 是否已创建实例 */
    instantiated: boolean;
    /** 服务实例 */
    instance?: T;
    /** 依赖列表（用于循环依赖检测） */
    dependencies: string[];
}

/**
 * 依赖注入容器
 */
export class DIContainer {
    /**
     * 清理所有已创建的服务
     * 调用所有实现了 ICleanup 接口的服务的 cleanup() 方法
     * @returns Promise，在所有清理操作完成后 resolve
     */

    private services = new Map<string, ServiceMetadata<any>>();
    private creatingStack = new Set<string>();

    /**
     * 注册服务（单例）
     * @param name 服务名称
     * @param factory 服务工厂函数
     * @param dependencies 依赖的服务名称列表
     */
    registerSingleton<T>(
        name: string,
        factory: ServiceFactory<T>,
        dependencies: string[] = [],
    ): void {
        if (this.services.has(name)) {
            logger.warn(
                `Service "${name}" is already registered, will be overwritten`,
            );
        }

        this.services.set(name, {
            factory: factory as ServiceFactory<unknown>,
            instantiated: false,
            dependencies,
        });

        logger.debug(`Registered singleton service: ${name}`);
    }

    /**
     * 注册服务（工厂模式 - 每次返回新实例）
     * @param name 服务名称
     * @param factory 服务工厂函数
     * @param dependencies 依赖的服务名称列表
     */
    registerTransient<T>(
        name: string,
        factory: ServiceFactory<T>,
        dependencies: string[] = [],
    ): void {
        if (this.services.has(name)) {
            logger.warn(
                `Service "${name}" is already registered, will be overwritten`,
            );
        }

        this.services.set(name, {
            factory: factory as ServiceFactory<unknown>,
            instantiated: false, // 总是 false，因为每次都创建新实例
            dependencies,
        });

        logger.debug(`Registered transient service: ${name}`);
    }

    /**
     * 解析并获取服务实例
     * @param name 服务名称
     * @returns 服务实例
     * @throws 如果服务不存在或检测到循环依赖
     */
    resolve<T>(name: string): T {
        const service = this.services.get(name);

        if (!service) {
            throw new Error(`Service "${name}" is not registered`);
        }

        // 检测循环依赖
        if (this.creatingStack.has(name)) {
            const cycle = Array.from(this.creatingStack).concat([name]).join(" -> ");
            throw new Error(`Circular dependency detected: ${cycle}`);
        }

        // 如果是单例且已实例化，直接返回
        if (service.instantiated && service.instance !== undefined) {
            logger.debug(`Resolving existing singleton: ${name}`);
            return service.instance as T;
        }

        // 创建新实例
        this.creatingStack.add(name);
        try {
            logger.debug(`Creating new instance: ${name}`);
            const instance = service.factory() as T;

            // 如果是单例，缓存实例
            if (service.instantiated === false) {
                service.instantiated = true;
                service.instance = instance;
            }

            return instance;
        } finally {
            this.creatingStack.delete(name);
        }
    }

    /**
     * 检查服务是否已注册
     * @param name 服务名称
     * @returns 是否已注册
     */
    has(name: string): boolean {
        return this.services.has(name);
    }

    /**
     * 重置所有服务（主要用于测试）
     * 清除所有实例，但保留注册
     */
    reset(): void {
        logger.info("Resetting DI container");

        for (const [, metadata] of this.services.entries()) {
            metadata.instantiated = false;
            metadata.instance = undefined;
        }

        this.creatingStack.clear();
    }

    /**
     * 清理所有已创建的服务
     * 调用所有实现了 ICleanup 接口的服务的 cleanup() 方法
     * @returns Promise，在所有清理操作完成后 resolve
     */
    async cleanup(): Promise<void> {
        logger.info("Cleaning up DI container services");
        const cleanupPromises: Promise<void>[] = [];

        for (const [name, metadata] of this.services.entries()) {
            // 只清理已实例化的服务
            if (metadata.instantiated && metadata.instance) {
                if (hasCleanup(metadata.instance)) {
                    try {
                        const result = metadata.instance.cleanup();
                        // 处理异步清理
                        if (
                            result &&
                            typeof (result as Promise<void>).then === "function"
                        ) {
                            cleanupPromises.push(result as Promise<void>);
                        }
                        logger.debug(`Cleaned up service: ${name}`);
                    } catch (error) {
                        logger.error(
                            `Error cleaning up service "${name}": ${String(error)}`,
                        );
                    }
                }
            }
        }

        // 等待所有异步清理操作完成
        if (cleanupPromises.length > 0) {
            try {
                await Promise.all(cleanupPromises);
                logger.info(
                    `${cleanupPromises.length} async cleanup operations completed`,
                );
            } catch (error) {
                logger.error(`Error during async cleanup: ${String(error)}`);
            }
        }

        logger.info("DI container cleanup completed");
    }

    /**
     * 清除所有服务注册和实例（主要用于测试）
     */
    clear(): void {
        logger.info("Clearing DI container");
        this.services.clear();
        this.creatingStack.clear();
    }

    /**
     * 获取所有已注册的服务名称
     * @returns 服务名称数组
     */
    getRegisteredServices(): string[] {
        return Array.from(this.services.keys());
    }

    /**
     * 获取服务统计信息（用于调试）
     * @returns 服务统计信息
     */
    getStats(): {
        total: number;
        instantiated: number;
        services: Array<{
            name: string;
            instantiated: boolean;
            dependencies: string[];
        }>;
    } {
        const services = Array.from(this.services.entries()).map(
            ([name, metadata]) => ({
                name,
                instantiated: metadata.instantiated,
                dependencies: metadata.dependencies,
            }),
        );

        return {
            total: services.length,
            instantiated: services.filter((s) => s.instantiated).length,
            services,
        };
    }
}

/**
 * 全局容器实例
 */
let globalContainer: DIContainer | null = null;

/**
 * 获取全局容器实例
 * @returns DI容器实例
 */
export function getContainer(): DIContainer {
    if (!globalContainer) {
        globalContainer = new DIContainer();
        logger.info("Global DI container initialized");
    }
    return globalContainer;
}

/**
 * 设置全局容器实例（主要用于测试）
 * @param container DI容器实例
 */
export function setContainer(container: DIContainer): void {
    globalContainer = container;
}

/**
 * 重置全局容器（主要用于测试）
 */
export function resetContainer(): void {
    if (globalContainer) {
        globalContainer.reset();
    }
}

/**
 * 清除全局容器（主要用于测试）
 */
export function clearContainer(): void {
    globalContainer = null;
}
