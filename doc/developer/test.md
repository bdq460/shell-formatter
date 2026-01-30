# Shell Formatter 测试体系指南

本文档全面介绍 Shell Formatter 项目的测试体系架构、配置原理和最佳实践。帮助新手快速理解测试配置的功能，掌握测试编写方法，建立完整的测试思维。

## 目录

- [测试体系概述](#测试体系概述)
- [核心概念](#核心概念)
- [配置文件详解](#配置文件详解)
- [测试执行流程](#测试执行流程)
- [编写测试代码](#编写测试代码)
- [运行测试](#运行测试)
- [最佳实践](#最佳实践)
- [常见问题](#常见问题)
- [相关文档](#相关文档)

---

## 测试体系概述

### 为什么要测试？

测试是保障代码质量的核心手段：

- **发现 Bug**: 在开发阶段捕获问题，避免流入生产环境
- **防止回归**: 确保新功能不会破坏已有功能
- **文档作用**: 测试用例本身就是代码的使用示例
- **重构信心**: 有测试保护，可以放心重构代码
- **设计验证**: 测试驱动设计，确保代码可测试、可维护

### 本项目的测试特点

| 特性 | 说明 |
|------|------|
| **测试框架** | Jest - 功能完整，生态丰富 |
| **语言支持** | TypeScript - 类型安全，IDE 友好 |
| **模块系统** | ES Modules - 现代标准，Tree-shaking 友好 |
| **覆盖率** | 内置支持，多格式输出 |
| **路径别名** | `#/` 映射到 `src/`，简化导入 |

### 测试类型

```text
测试/
├── 单元测试 (Unit Tests)
│   └── 测试单个函数、类的行为
│   └── 位置: test/unit/
│
└── 集成测试 (Integration Tests)
    └── 测试多个模块的协作
    └── 位置: test/integration/
```

---

## 核心概念

### 1. TypeScript 编译配置分离

**为什么需要两个 tsconfig？**

```text
项目/
├── tsconfig.json          # 生产配置: 只编译 src/
└── test/
    └── tsconfig.json      # 测试配置: 编译 src/ + test/
```

| 配置 | 用途 | 编译范围 | 输出目录 |
|------|------|----------|----------|
| `tsconfig.json` | 生产构建 | `src/**/*.ts` | `dist/` |
| `test/tsconfig.json` | 测试运行 | `src/**/*.ts` + `test/**/*.ts` | `dist-test/` |

**核心区别**:

- 生产配置只关注源代码，输出干净的生产包
- 测试配置需要同时编译源代码和测试代码，确保类型检查通过
- 分离配置避免测试代码混入生产构建

### 2. 路径别名 `#/`

**什么是路径别名？**

传统导入（麻烦且易错）:

```typescript
import { logger } from '../../../src/utils/log';
// 层级深，难以维护，重构时容易出错
```

路径别名导入（清晰简洁）:

```typescript
import { logger } from '#/utils/log';
// 无论文件在哪，都使用统一的路径前缀
```

**配置原理**:

TypeScript 配置 (`tsconfig.json`):

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "#/*": ["./src/*"]
    }
  }
}
```

Jest 配置 (`jest.config.js`):

```javascript
module.exports = {
  moduleNameMapper: {
    '^#/(.*)$': '<rootDir>/src/$1'
  }
};
```

**映射关系**:

```text
#/utils/log     →    src/utils/log
#/plugin/Manager    →    src/plugin/Manager
```

### 3. Jest 与 ts-jest

**Jest** 是测试框架，提供:

- 测试运行器 (runner)
- 断言库 (expect)
- Mock 功能 (jest.fn())
- 覆盖率收集 (coverage)

**ts-jest** 是 Jest 的预设 (preset)，提供:

- TypeScript 编译支持
- ES Modules 支持
- 类型检查集成

**工作流程**:

```text
测试文件 (.test.ts)
       ↓
  ts-jest 编译
       ↓
  Jest 执行
       ↓
  输出结果 + 覆盖率
```

---

## 配置文件详解

### 1. 主配置: `tsconfig.json`

**位置**: 项目根目录

**完整配置**:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "baseUrl": ".",
    "paths": {
      "#/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", ".vscode-test", "dist", "test", "coverage"]
}
```

**关键配置项解析**:

| 配置项 | 值 | 作用 |
|--------|-----|------|
| `target` | ES2020 | 编译目标为 ES2020，兼容 Node.js 14+ |
| `module` | ESNext | 使用 ES 模块系统 (import/export) |
| `rootDir` | ./src | 源代码根目录 |
| `outDir` | ./dist | 编译输出目录 |
| `baseUrl` | . | 路径别名的基础目录 |
| `paths` | {"#/*": ["./src/*"]} | 路径别名映射 |
| `include` | src/**/*.ts | 只包含 src 目录的 TypeScript 文件 |
| `strict` | true | 启用所有严格类型检查 |

**输出结构**:

```text
src/
├── utils/
│   └── log.ts
└── extension.ts

编译后 →

dist/
├── utils/
│   └── log.js
└── extension.js
```

### 2. 测试配置: `test/tsconfig.json`

**位置**: `test/` 目录下

**完整配置**:

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "rootDir": "../",
    "outDir": "../dist-test",
    "baseUrl": "../",
    "paths": {
      "#/*": ["./src/*"]
    }
  },
  "include": ["../src/**/*", "./**/*"],
  "exclude": ["node_modules", "../dist", "../dist-test", "../coverage"]
}
```

**关键设计点**:

1. **继承主配置** (`extends`):
   - 自动继承所有编译选项
   - 只需覆盖测试特有的配置

2. **扩大 rootDir** (`"../"`):
   - 从 `src/` 扩大到项目根目录
   - 确保能包含 `src/` 和 `test/` 两个目录

3. **调整路径别名** (`baseUrl` 和 `paths`):
   - `baseUrl` 改为 `"../"`（相对于 test/ 目录）
   - `paths` 保持 `"./src/*"`（相对于 baseUrl）
   - 确保 `#/utils/log` 正确解析到 `src/utils/log`

4. **包含测试文件** (`include`):
   - `"../src/**/*"`: 源代码
   - `"./**/*"`: 测试代码（test/ 目录下的所有文件）

**输出结构**:

```text
项目根目录/
├── src/
│   └── utils/
│       └── log.ts
└── test/
    └── unit/
        └── utils/
            └── log.test.ts

编译后 →

dist-test/
├── src/
│   └── utils/
│       └── log.js
└── test/
    └── unit/
        └── utils/
            └── log.test.js
```

### 3. Jest 配置: `jest.config.js`

**位置**: 项目根目录

**完整配置**:

```javascript
export default {
  // 使用 ts-jest 预设，支持 TypeScript 和 ES Modules
  preset: 'ts-jest/presets/default-esm',

  // 运行环境: Node.js
  testEnvironment: 'node',

  // 测试文件匹配模式
  testMatch: [
    '**/test/**/*.test.ts',
    '**/__tests__/**/*.test.ts',
  ],

  // 路径别名映射（与 tsconfig.json 对应）
  moduleNameMapper: {
    '^#/(.*)$': '<rootDir>/src/$1',
  },

  // 覆盖率配置
  collectCoverage: true,
  collectCoverageFrom: [
    'src/utils/**/*.ts',
    '!src/utils/**/*.example.ts',
    '!src/utils/**/example.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'json',
    'json-summary',
    'lcov',
    'html',
  ],
  coverageThreshold: {
    global: {
      statements: 99,
      branches: 90,
      functions: 100,
      lines: 99,
    },
  },

  // ES Modules 支持
  extensionsToTreatAsEsm: ['.ts'],

  // 文件扩展名
  moduleFileExtensions: ['ts', 'js', 'json'],

  // TypeScript 转换配置
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: './test/tsconfig.json',
      },
    ],
  },

  // 超时设置
  testTimeout: 10000,

  // 没有测试时通过（避免空测试套件报错）
  passWithNoTests: true,

  // 详细输出
  verbose: true,
};
```

**关键配置解析**:

| 配置项 | 说明 |
|--------|------|
| `preset` | 使用 `ts-jest/presets/default-esm` 支持 TypeScript + ES Modules |
| `testMatch` | 匹配 `test/**/*.test.ts` 文件 |
| `moduleNameMapper` | 将 `#/` 映射到 `src/`，与 tsconfig 保持一致 |
| `collectCoverage` | 开启覆盖率收集 |
| `coverageThreshold` | 设置覆盖率阈值，不满足时测试失败 |
| `transform` | 使用 ts-jest 转换 `.ts` 文件，指定使用 `test/tsconfig.json` |

### 4. NPM 脚本: `package.json`

**相关脚本**:

```json
{
  "scripts": {
    "compile": "tsc -p ./",
    "test": "jest --coverage",
    "test:watch": "jest --watch",
    "test:no-coverage": "jest"
  }
}
```

**脚本说明**:

| 脚本 | 命令 | 作用 |
|------|------|------|
| `npm run compile` | `tsc -p ./` | 编译 TypeScript 到 dist/ |
| `npm test` | `jest --coverage` | 运行测试并生成覆盖率报告 |
| `npm run test:watch` | `jest --watch` | 监听模式，文件变化自动重跑测试 |
| `npm run test:no-coverage` | `jest` | 快速运行测试，不生成覆盖率 |

---

## 测试执行流程

### 完整执行流程图

```text
开发者执行: npm test
       ↓
1. package.json 调用 jest --coverage
       ↓
2. jest.config.js 加载配置
       ↓
3. Jest 扫描 testMatch 匹配的文件
       ↓
4. 对每个 .test.ts 文件:
   a. ts-jest 使用 test/tsconfig.json 编译 TypeScript
   b. 类型检查（如有错误会报错）
   c. 转换为 JavaScript
       ↓
5. Jest 执行编译后的测试代码
       ↓
6. 收集测试结果和覆盖率数据
       ↓
7. 输出测试报告到控制台
       ↓
8. 生成覆盖率报告到 coverage/ 目录
```

### 路径解析流程

**测试文件中导入 `#/utils/log`**:

```typescript
// test/unit/utils/log.test.ts
import { logger } from '#/utils/log';
```

**解析过程**:

1. **TypeScript 编译阶段**:

   ```text
   #/utils/log
       ↓ (tsconfig.json paths 映射)
   ./src/utils/log
       ↓ (baseUrl: .)
   /project/src/utils/log.ts
   ```

2. **Jest 运行阶段**:

   ```text
   #/utils/log
       ↓ (jest.config.js moduleNameMapper)
   <rootDir>/src/utils/log
       ↓ (<rootDir> = 项目根目录)
   /project/src/utils/log.ts
   ```

**关键点**: TypeScript 和 Jest 的路径映射必须保持一致！

---

## 编写测试代码

### 1. 文件结构规范

```text
test/
├── unit/                          # 单元测试
│   └── utils/                     # 对应 src/utils/
│       ├── log.test.ts            # 测试 src/utils/log.ts
│       ├── debounce.test.ts       # 测试 src/utils/debounce.ts
│       └── plugin/                # 对应 src/utils/plugin/
│           ├── PluginManager.test.ts
│           └── BasePlugin.test.ts
│
└── integration/                   # 集成测试（如有）
    └── extension.test.ts
```

**命名规则**:

- 测试文件: `*.test.ts`
- 目录结构: 与 `src/` 目录对应
- 一个源文件对应一个测试文件

### 2. 基本测试结构

```typescript
// test/unit/utils/log.test.ts

// 1. 导入被测试的模块
import {
  LogLevel,
  getLogLevelRank,
  logger,
  shouldLogByLevel,
} from '#/utils/log';

// 2. 使用 describe 定义测试套件
describe('log utils', () => {

  // 3. 使用 it 定义单个测试用例
  it('should map log levels to numeric ranks', () => {
    // 4. 准备测试数据
    const debugRank = getLogLevelRank(LogLevel.DEBUG);
    const infoRank = getLogLevelRank(LogLevel.INFO);

    // 5. 使用 expect 进行断言
    expect(debugRank).toBe(0);
    expect(infoRank).toBe(1);
  });

  it('should compare log levels correctly', () => {
    // 测试日志级别比较
    expect(shouldLogByLevel(LogLevel.DEBUG, LogLevel.INFO)).toBe(false);
    expect(shouldLogByLevel(LogLevel.INFO, LogLevel.INFO)).toBe(true);
    expect(shouldLogByLevel(LogLevel.WARN, LogLevel.INFO)).toBe(true);
  });
});
```

### 3. 常用断言方法

```typescript
// 基本相等
expect(value).toBe(expected);           // 严格相等 (===)
expect(value).toEqual(expected);        // 深度相等（对象比较）

// 真假值
expect(value).toBeTruthy();             // 真值
expect(value).toBeFalsy();              // 假值
expect(value).toBeNull();               // null
expect(value).toBeUndefined();          // undefined

// 数值比较
expect(value).toBeGreaterThan(5);
expect(value).toBeGreaterThanOrEqual(5);
expect(value).toBeLessThan(5);
expect(value).toBeLessThanOrEqual(5);

// 字符串
expect(text).toMatch(/pattern/);        // 正则匹配
expect(text).toContain('substring');    // 包含子串

// 数组
expect(array).toContain(item);          // 包含元素
expect(array).toHaveLength(5);          // 长度检查

// 错误
expect(() => {
  throwError();
}).toThrow(Error);

// 否定（not）
expect(value).not.toBe(expected);
expect(array).not.toContain(item);
```

### 4. 异步测试

**方式 1: async/await（推荐）**

```typescript
it('should handle async operation', async () => {
  const result = await asyncFunction();
  expect(result).toBe('expected');
});
```

**方式 2: done 回调**

```typescript
it('should handle async operation', (done) => {
  asyncFunction().then((result) => {
    expect(result).toBe('expected');
    done();  // 必须调用 done 表示完成
  });
});
```

**方式 3: resolves/rejects**

```typescript
it('should resolve with value', async () => {
  await expect(asyncFunction()).resolves.toBe('value');
});

it('should reject with error', async () => {
  await expect(asyncFunction()).rejects.toThrow('error');
});
```

### 5. 测试生命周期钩子

```typescript
describe('MyClass', () => {
  let instance: MyClass;

  // 每个测试前执行
  beforeEach(() => {
    instance = new MyClass();
  });

  // 每个测试后执行
  afterEach(() => {
    instance.cleanup();
  });

  // 所有测试前执行一次
  beforeAll(() => {
    console.log('测试套件开始');
  });

  // 所有测试后执行一次
  afterAll(() => {
    console.log('测试套件结束');
  });

  it('should work correctly', () => {
    expect(instance.isReady()).toBe(true);
  });
});
```

### 6. Mock 和 Spy

**Mock 函数**:

```typescript
it('should call the callback', () => {
  const mockFn = jest.fn();

  myFunction(mockFn);

  expect(mockFn).toHaveBeenCalled();
  expect(mockFn).toHaveBeenCalledTimes(1);
  expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
});
```

**Mock 返回值**:

```typescript
const mockFn = jest.fn();
mockFn.mockReturnValue('mocked');
mockFn.mockResolvedValue('async mocked');  // 返回 Promise
```

**Mock 模块**:

```typescript
jest.mock('#/utils/someModule', () => ({
  myFunction: jest.fn(() => 'mocked-value'),
}));
```

**Spy（监听原函数）**:

```typescript
it('should call console.log', () => {
  const spy = jest.spyOn(console, 'log').mockImplementation(() => {});

  logger.info('test message');

  expect(spy).toHaveBeenCalledWith('test message');

  spy.mockRestore();  // 恢复原函数
});
```

---

## 运行测试

### 常用命令

```bash
# 运行所有测试（带覆盖率）
npm test

# 监听模式（文件变化自动重跑）
npm run test:watch

# 快速运行（不带覆盖率）
npm run test:no-coverage

# 运行特定文件
npx jest test/unit/utils/log.test.ts

# 运行匹配名称的测试
npx jest --testNamePattern="should map log levels"

# 只运行失败的测试
npx jest --onlyFailures

# 清除缓存后运行
npx jest --clearCache && npm test
```

### 查看覆盖率报告

```bash
# 运行测试后，打开 HTML 报告
open coverage/index.html  # macOS
start coverage/index.html  # Windows
```

**覆盖率指标说明**:

- **Statements**: 语句覆盖率（执行过的代码行数比例）
- **Branches**: 分支覆盖率（if/else、switch 等分支执行情况）
- **Functions**: 函数覆盖率（被调用过的函数比例）
- **Lines**: 行覆盖率（与 Statements 类似，但计算方式略有不同）

### 测试输出示例

```text
 PASS  test/unit/utils/log.test.ts
  log utils
    ✓ should map log levels to numeric ranks
    ✓ should handle non-string log levels
    ✓ should compare log levels correctly
    ✓ should set logger instance

 PASS  test/unit/utils/plugin/PluginManager.test.ts
  PluginManager
    ✓ should register a plugin
    ✓ should activate all plugins
    ✓ should handle plugin errors

Test Suites: 2 passed, 2 total
Tests:       10 passed, 10 total
Snapshots:   0 total
Time:        2.1s
Ran all test suites.

Coverage summary
Statements   : 99.5% ( 200/201 )
Branches     : 92.3% ( 85/92 )
Functions    : 100% ( 45/45 )
Lines        : 99.5% ( 198/199 )
```

---

## 最佳实践

### ✅ 应该做的

1. **测试命名清晰**

   ```typescript
   // ✅ 好: 描述期望的行为
   it('should return error when input is invalid', () => {});

   // ❌ 差: 太笼统
   it('test input', () => {});
   ```

2. **一个测试一个断言点**

   ```typescript
   // ✅ 好: 每个测试验证一个概念
   it('should calculate sum correctly', () => {
     expect(add(2, 3)).toBe(5);
   });

   it('should handle negative numbers', () => {
     expect(add(-2, -3)).toBe(-5);
   });
   ```

3. **使用 beforeEach 初始化状态**

   ```typescript
   describe('Counter', () => {
     let counter: Counter;

     beforeEach(() => {
       counter = new Counter();  // 每个测试前新建实例
     });

     it('should start at 0', () => {
       expect(counter.value).toBe(0);
     });

     it('should increment', () => {
       counter.increment();
       expect(counter.value).toBe(1);
     });
   });
   ```

4. **及时清理资源**

   ```typescript
   afterEach(() => {
     jest.clearAllMocks();  // 清除所有 mock
     jest.restoreAllMocks();  // 恢复所有 spy
   });
   ```

5. **测试边界条件**

   ```typescript
   it('should handle empty array', () => {});
   it('should handle single element', () => {});
   it('should handle maximum value', () => {});
   it('should handle null input', () => {});
   ```

### ❌ 不应该做的

1. **测试相互依赖**

   ```typescript
   // ❌ 坏: 测试 2 依赖测试 1 的状态
   it('test 1', () => { global.value = 1; });
   it('test 2', () => { expect(global.value).toBe(1); });  // 不要这样！
   ```

2. **过度 Mock**

   ```typescript
   // ❌ 坏: Mock 了所有依赖，测试失去意义
   jest.mock('./everything');
   ```

3. **忽略异步处理**

   ```typescript
   // ❌ 坏: 没有等待异步操作
   it('async test', () => {
     asyncFunction();  // 忘记 await！
   });
   ```

4. **测试实现细节而非行为**

   ```typescript
   // ❌ 坏: 测试内部实现
   expect(object.internalArray.length).toBe(3);

   // ✅ 好: 测试外部行为
   expect(object.getItems()).toHaveLength(3);
   ```

---

## 常见问题

### Q1: 导入路径别名 `#/` 报错怎么办？

**问题**: `Cannot find module '#/utils/log' or its corresponding type declarations.`

**解决方案**:

1. 检查 `tsconfig.json` 的 `paths` 配置:

   ```json
   {
     "compilerOptions": {
       "baseUrl": ".",
       "paths": {
         "#/*": ["./src/*"]
       }
     }
   }
   ```

2. 检查 `jest.config.js` 的 `moduleNameMapper`:

   ```javascript
   module.exports = {
     moduleNameMapper: {
       '^#/(.*)$': '<rootDir>/src/$1'
     }
   };
   ```

3. 重启 VSCode 的 TypeScript 服务:
   - Cmd+Shift+P → "TypeScript: Restart TS Server"

### Q2: 测试超时了怎么办？

**解决方案**:

```typescript
// 为单个测试设置超时
it('slow test', async () => {
  // 测试代码
}, 10000);  // 10 秒超时

// 或在 jest.config.js 中全局设置
testTimeout: 10000,
```

### Q3: 如何测试私有方法？

**解决方案**:

```typescript
// 使用索引访问（TypeScript 需要 as any）
const result = (myObject as any).privateMethod();

// 或者只测试公共接口（推荐）
// 如果私有方法很重要，考虑是否应该改为 protected 或 public
```

### Q4: 覆盖率报告在哪里查看？

**解决方案**:

```bash
# 运行测试后
open coverage/index.html  # macOS
start coverage/index.html  # Windows

# 或者查看命令行输出
# npm test 会自动输出文本格式的覆盖率摘要
```

### Q5: 如何调试测试？

**解决方案**:

```bash
# 使用 VSCode 调试
# 1. 在测试代码中设置断点
# 2. 创建 .vscode/launch.json:
{
  "type": "node",
  "request": "launch",
  "name": "Debug Jest Tests",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand"],
  "console": "integratedTerminal"
}

# 3. 按 F5 启动调试
```

### Q6: 为什么测试通过了但覆盖率不达标？

**原因**: `coverageThreshold` 设置了最低覆盖率要求。

**解决方案**:

1. 增加测试覆盖更多代码
2. 或调整阈值（不推荐）:

   ```javascript
   coverageThreshold: {
     global: {
       statements: 80,  // 降低要求
       branches: 80,
       functions: 80,
       lines: 80,
     },
   }
   ```

---

## 相关文档

**项目文档**:

- [项目结构与核心配置](./project-structure.md) - 目录结构和配置文件详解
- [TypeScript 配置详解](../tools/tsconfig.md) - tsconfig 完整说明
- [快速开始指南](./getting-started.md) - 开发环境配置

**外部文档**:

- [Jest 官方文档](https://jestjs.io/)
- [ts-jest 文档](https://kulshekhar.github.io/ts-jest/)
- [TypeScript 官方文档](https://www.typescriptlang.org/)
- [Node.js ES Modules](https://nodejs.org/api/esm.html)
