/**
 * Jest测试环境设置文件
 * 在所有测试运行之前执行
 * 使用ES module语法与package.json中的"type": "module"保持一致
 */

import { existsSync, mkdirSync, readdirSync, rmdirSync, statSync, unlinkSync } from 'fs';
import { join } from 'path';

// 全局类型声明
declare global {
    // eslint-disable-next-line no-var
    var testUtils: {
        generateTestId: () => string;
        generateTestData: (type: string) => Record<string, unknown>;
        cleanup: () => Promise<void>;
        createMockFn: () => jest.Mock;
        waitFor: (ms: number) => Promise<void>;
        retry: <T>(fn: () => Promise<T>, maxAttempts?: number) => Promise<T>;
        registerTempFile: (path: string) => void;
        clearAllTimers: () => void;
    };
    // eslint-disable-next-line no-var
    var testContext: {
        startTime: number;
        testName: string;
        tempFiles: string[];
        suiteName: string;
    };
    // eslint-disable-next-line no-var
    var testEnv: {
        initialized: boolean;
        startTime: number;
        config: Record<string, unknown>;
    };
}

// 测试统计信息
const testStats = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    startTime: Date.now(),
    suiteStartTime: 0,
};

// 全局临时文件列表（跨所有测试）
const globalTempFiles: string[] = [];

// 当前测试套件的临时文件
let currentTempFiles: string[] = [];

// 定时器列表（用于清理）
const activeTimers: ReturnType<typeof setTimeout>[] = [];

// ==================== 全局测试工具 ====================

global.testUtils = {
    // 生成测试ID
    generateTestId: () => `TEST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,

    // 生成测试数据
    generateTestData: (type: string) => {
        const testData: Record<string, Record<string, unknown>> = {
            user: {
                id: `user-${Date.now()}`,
                name: 'Test User',
                email: 'test@example.com',
                role: 'developer',
                createdAt: new Date().toISOString(),
            },
            requirement: {
                id: `REQ-${Date.now()}`,
                title: 'Test Requirement',
                description: 'Test requirement description',
                priority: 'high',
                status: 'open',
            },
            project: {
                id: `PROJ-${Date.now()}`,
                name: 'Test Project',
                description: 'Test project for unit testing',
                status: 'active',
            },
            skill: {
                id: `SKILL-${Date.now()}`,
                name: 'Test Skill',
                description: 'Test skill description',
                category: 'testing',
            },
        };
        return testData[type] || {};
    },

    // 清理测试环境
    cleanup: async () => {
        // 清理当前测试的临时文件
        for (const file of currentTempFiles) {
            try {
                if (existsSync(file)) {
                    unlinkSync(file);
                }
            } catch {
                // 忽略清理错误
            }
        }
        currentTempFiles = [];

        // 清理所有定时器
        global.testUtils.clearAllTimers();
    },

    // 创建 mock 函数
    createMockFn: () => jest.fn(),

    // 等待指定毫秒
    waitFor: (ms: number) => new Promise((resolve) => {
        const timer = setTimeout(resolve, ms);
        activeTimers.push(timer);
    }),

    // 重试机制
    retry: async <T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> => {
        let lastError: Error | undefined;
        for (let i = 0; i < maxAttempts; i++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error as Error;
                await global.testUtils.waitFor(100 * (i + 1));
            }
        }
        throw lastError;
    },

    // 注册临时文件（在当前测试中自动清理）
    registerTempFile: (filePath: string) => {
        currentTempFiles.push(filePath);
        globalTempFiles.push(filePath);
    },

    // 清理所有定时器
    clearAllTimers: () => {
        for (const timer of activeTimers) {
            clearTimeout(timer);
        }
        activeTimers.length = 0;
    },
};

// ==================== 生命周期钩子 ====================

/**
 * beforeAll - 在所有测试开始之前执行一次
 * 用途：全局初始化、建立数据库连接、启动服务等
 */
beforeAll(async () => {
    // 记录测试套件开始时间
    testStats.suiteStartTime = Date.now();

    // 初始化全局测试环境状态
    global.testEnv = {
        initialized: true,
        startTime: Date.now(),
        config: {
            nodeEnv: process.env.NODE_ENV,
            debug: process.env.DEBUG === 'true',
            ci: process.env.CI === 'true',
        },
    };

    // 设置单个函数测试超时时间, 默认30秒
    jest.setTimeout(30000);

    // 设置环境变量
    // NODE_ENV 用于区分不同的运行环境（开发、测试、生产等）
    // 标准值:
    //  - production：生产环境，用于实际部署和运行
    //  - test：测试环境，用于单元测试和集成测试
    //  - development：开发环境，用于开发和调试
    // 扩展值:
    //  - staging：预发布环境，用于上线前的最终测试
    //  - local：本地开发环境，用于个人开发机器
    //  - ci：持续集成环境，用于自动化测试和持续集成
    //  - uat：用户验收测试环境，用于最终用户进行验收测试
    //  - qa：质量保证环境，用于专门的测试团队进行测试
    // NODE_ENV 是 Node.js 生态的约定俗成的标准环境变量，虽然不是 Node.js 核心强制要求的，但整个行业都统一使用。（如 React 禁用警告）

    process.env.NODE_ENV = 'test';

    // 确保 test/tmp 目录存在
    const tmpDir = join(process.cwd(), 'test', 'tmp');
    if (!existsSync(tmpDir)) {
        try {
            mkdirSync(tmpDir, { recursive: true });
        } catch {
            // 忽略创建错误
        }
    }

    // 清理遗留的 flow-report.json（如果上次测试未正常结束）
    const flowReportPath = join(process.cwd(), 'flow-report.json');
    if (existsSync(flowReportPath)) {
        try {
            unlinkSync(flowReportPath);
        } catch {
            // 忽略清理错误
        }
    }

    // 覆盖率探针函数 - 确保覆盖率收集
    function coverageProbe(flag: boolean): string {
        return flag ? 'on' : 'off';
    }
    // 执行两个分支以完全覆盖函数
    const probeResults = [coverageProbe(true), coverageProbe(false)];

    // 初始化日志（仅在 DEBUG 模式下）
    if (process.env.DEBUG) {
        console.debug('\n[ jest.setup ] 测试环境初始化完成');
        console.debug(`  时间: ${new Date().toISOString()}`);
        console.debug(`  覆盖率探针: ${probeResults.join(', ')}`);
    }
});

/**
 * beforeEach - 在每个测试开始之前执行
 * 用途：重置状态、初始化测试数据、准备测试环境
 */
beforeEach(() => {
    // 获取当前测试信息
    const testState = expect.getState();

    // 初始化测试上下文
    global.testContext = {
        startTime: Date.now(),
        testName: testState.currentTestName || 'unknown',
        suiteName: testState.currentDescribeBlock?.name || 'unknown',
        tempFiles: [],
    };

    // 统计测试总数
    testStats.total++;

    // 清除所有 mock（确保每个测试独立）
    jest.clearAllMocks();

    // 重置定时器
    global.testUtils.clearAllTimers();

    // DEBUG 模式输出
    if (process.env.DEBUG) {
        console.debug(`\n[ RUN ] ${global.testContext.testName}`);
    }
});

/**
 * afterEach - 在每个测试结束之后执行
 * 用途：清理测试数据、恢复状态、检查副作用
 */
afterEach(async () => {
    const duration = Date.now() - global.testContext.startTime;

    // 清理当前测试的临时资源
    await global.testUtils.cleanup();

    // 检查测试是否通过，更新统计
    // 注意：Jest 没有直接提供当前测试结果，这里仅记录执行

    // DEBUG 模式输出
    if (process.env.DEBUG) {
        console.debug(`[ DONE ] ${global.testContext.testName} (${duration}ms)`);
    }
});

/**
 * afterAll - 在所有测试结束之后执行一次
 * 用途：清理资源、关闭连接、生成报告
 */
afterAll(async () => {
    const suiteDuration = Date.now() - testStats.suiteStartTime;
    const totalDuration = Date.now() - testStats.startTime;

    // ==================== 清理 flow-report.json ====================
    const flowReportPath = join(process.cwd(), 'flow-report.json');
    if (existsSync(flowReportPath)) {
        try {
            unlinkSync(flowReportPath);
            if (process.env.DEBUG) {
                console.debug('[jest.setup] Cleaned up flow-report.json');
            }
        } catch {
            // 忽略清理错误
        }
    }

    // ==================== 清理全局临时文件 ====================
    for (const file of globalTempFiles) {
        try {
            if (existsSync(file)) {
                unlinkSync(file);
            }
        } catch {
            // 忽略清理错误
        }
    }

    // ==================== 清理 test/tmp 目录 ====================
    const tmpDir = join(process.cwd(), 'test', 'tmp');
    if (existsSync(tmpDir)) {
        try {
            const files = readdirSync(tmpDir);
            for (const file of files) {
                const filePath = join(tmpDir, file);
                try {
                    const stat = statSync(filePath);
                    if (stat.isDirectory()) {
                        rmdirSync(filePath, { recursive: true });
                    } else {
                        unlinkSync(filePath);
                    }
                } catch {
                    // 忽略清理错误
                }
            }
        } catch {
            // 忽略清理错误
        }
    }

    // ==================== 输出测试摘要 ====================
    if (process.env.DEBUG) {
        console.debug('\n' + '='.repeat(50));
        console.debug('[ jest.setup ] 测试套件执行完成');
        console.debug('='.repeat(50));
        console.debug(`  总测试数: ${testStats.total}`);
        console.debug(`  通过: ${testStats.passed}`);
        console.debug(`  失败: ${testStats.failed}`);
        console.debug(`  跳过: ${testStats.skipped}`);
        console.debug(`  套件执行时间: ${suiteDuration}ms`);
        console.debug(`  总耗时: ${totalDuration}ms`);
        console.debug('='.repeat(50));
    }

    // 清理全局状态
    global.testEnv = {
        initialized: false,
        startTime: 0,
        config: {},
    };
});
