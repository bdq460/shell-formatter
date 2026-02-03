/** @type {import('jest').Config} */
export default {
    // Jest 其他常用内置 token：
    // - < rootDir > - 项目根目录
    // - < cacheRoot > - Jest 缓存目录
    // - __filename - 当前测试文件的绝对路径
    // - __dirname - 当前测试文件所在目录的绝对路径
    // 这些 token 在运行时由 Jest 自动替换，无需手动配置。

    // 使用 ts-jest 预设
    preset: 'ts-jest/presets/default-esm',

    // 运行环境
    testEnvironment: 'node',

    // 测试文件匹配模式
    testMatch: [
        '**/test/**/*.test.ts',
        '**/__tests__/**/*.test.ts',
    ],

    // 模块名映射（支持 package.json imports 的内部别名）
    // Jest 的 moduleNameMapper 只在运行时有效，TS 类型检查由 package.json imports 解析。
    // 在此设置了映射, 则不再依赖 package.json 中的 imports 配置
    moduleNameMapper: {
        '^#/(.*)$': '<rootDir>/src/$1',
    },

    // 确保在测试前加载环境与探针
    // setupFilesAfterEnv 文件在 Jest 转换器运行之前就被加载了。
    // 使用.ts文件扩展名以确保文件可以被 ts-jest 处理。
    // 如使用.js文件扩展名, 则 jest 会尝试用自己的转换器去处理它, 导致无法识别 ES Module 语法。
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

    // 覆盖率收集
    collectCoverage: true,

    // 覆盖率收集配置
    collectCoverageFrom: [
        'src/application/**/*.ts',
        'src/domain/**/*.ts',
        'src/infrastructure/**/*.ts',
        'src/utils/**/*.ts',
        // 排除测试文件和示例文件
        '!src/**/test/**/*.ts',
        '!src/utils/**/*.example.ts',
        '!src/utils/**/example.ts',
    ],

    // 覆盖率输出目录
    coverageDirectory: 'coverage',

    // 覆盖率报告格式
    // - text: 以表格形式输出文本报告到控制台
    // - text-summary 输出摘要报告到控制台
    // - html: HTML 可视化报告, 输出位置: <coverageDirectory>/index.html
    // - json: JSON 格式报告, 输出位置: <coverageDirectory>/coverage-final.json
    // - json-summary: JSON摘要报告, 输出位置: <coverageDirectory>/coverage-summary.json
    // - lcov: Linux Code Coverage 格式（用于 CI/CD 集成、编辑器扩展）输出位置: <coverageDirectory>/lcov.infos
    coverageReporters: [
        'text',
        'text-summary',
        'json',
        'json-summary',
        'lcov',
        'html',
    ],

    // 覆盖率阈值（可选）
    // 目标：已测试代码达到高质量的覆盖率
    // 分支覆盖设置为90%，因为某些分支属于不常见的错误路径或日志调用
    // 函数覆盖设置为95%，因为某些内部辅助函数可能无需在单元测试中直接调用
    coverageThreshold: {
        global: {
            statements: 98,
            branches: 90,
            functions: 99,
            lines: 98,
        },
    },

    // ESM 支持
    extensionsToTreatAsEsm: ['.ts'],

    // 模块文件扩展名
    moduleFileExtensions: ['ts', 'js', 'json'],

    // 转换配置
    transform: {
        '^.+\.ts$': [
            'ts-jest',
            {
                useESM: true,
                tsconfig: './test/tsconfig.json',
            },
        ],
    },

    // 超时时间
    testTimeout: 10000,

    // 没有测试时通过
    passWithNoTests: true,

    // 详细输出
    verbose: true,
};
