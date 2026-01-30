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

    // 模块名映射（支持 TypeScript 路径别名）
    // 将 #/ 映射到 <rootDir>
    // Jest的moduleNameMapper只在运行时有效，但TypeScript编译器和IDE的类型检查需要在tsconfig.json中配置路径映射。
    // 需要在tsconfig.json中添加paths配置, 参考: https://github.com/facebook/jest/issues/10175
    moduleNameMapper: {
        '^#/(.*)$': '<rootDir>/src/$1',
    },

    // 覆盖率收集
    collectCoverage: true,

    // 覆盖率收集配置
    collectCoverageFrom: [
        'src/utils/**/*.ts',
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
            statements: 99,
            branches: 90,
            functions: 100,
            lines: 99,
        },
    },

    // ESM 支持
    extensionsToTreatAsEsm: ['.ts'],

    // 模块文件扩展名
    moduleFileExtensions: ['ts', 'js', 'json'],

    // 转换配置
    transform: {
        '^.+\\.ts$': [
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
