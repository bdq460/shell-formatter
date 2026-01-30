# 核心配置与工程规范

本文档详细介绍 Shell Formatter 项目的核心配置文件、配置关系与开发工作流，帮助开发者掌握构建与测试的工程规范。

## 目录

- [核心配置文件](#核心配置文件)
- [README 管理流程](#readme-管理流程)
- [配置文件关系图](#配置文件关系图)
- [开发工作流](#开发工作流)
- [配置文件速查表](#配置文件速查表)
- [相关文档](#相关文档)

---

## 核心配置文件

### 1. package.json - 项目配置

**位置**: 项目根目录

**作用**: 定义项目元数据、依赖、脚本和 VSCode 扩展配置

**关键字段**:

```json
{
  "name": "shell-formatter",
  "displayName": "Shell Formatter",
  "version": "1.0.1",
  "type": "module",
  "imports": {
    "#*": "./src/*"
  },
  "main": "./dist/extension.js",
  "engines": {
    "vscode": "^1.74.0"
  },
  "scripts": {
    "compile": "tsc -p ./",
    "test": "jest --coverage",
    "test:watch": "jest --watch"
  },
  "contributes": {
    "commands": [...],
    "configuration": {...}
  }
}
```

**重要说明**:

- `"type": "module"` - 使用 ES Modules
- `"main"` - 扩展入口文件（编译后的 JS）
- `"engines.vscode"` - 最低支持的 VSCode 版本
- `"contributes"` - 向 VSCode 注册的功能

### 2. tsconfig.json - TypeScript 主配置

**位置**: 项目根目录

**作用**: 配置 TypeScript 编译选项，用于生产构建

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "./dist",
    "rootDir": "./src",
    "resolvePackageJsonImports": true,
    "paths": {
      "#/*": ["./src/*"]
    },
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", ".vscode-test", "dist", "test", "coverage"]
}
```

**关键配置**:

- `rootDir`: `./src` - 源代码根目录
- `outDir`: `./dist` - 编译输出目录
- `paths`: `#/*` → `./src/*` - 路径别名（TS 7+ 推荐，相对于配置文件）
- `include`: 只包含 `src/` 目录

### 3. test/tsconfig.json - 测试配置

**位置**: `test/` 目录

**作用**: 扩展主配置，用于测试环境

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "types": ["jest", "node"],
    "rootDir": "../",
    "outDir": "../dist-test",
    "noEmit": true,
    "paths": {
      "#/*": ["../src/*"]
    }
  },
  "include": ["../src/**/*", "../test/**/*"],
  "exclude": ["node_modules", "dist", "dist-test", "coverage"]
}
```

**与主配置的区别**:

- `rootDir`: 扩大到项目根目录（包含 src 和 test）
- `types`: 添加 `jest` 与 `node` 的类型声明
- `paths`: 使用相对于配置文件的路径 `"../src/*"`（TS 7+ 推荐方式）
- `include`: 同时包含源代码和测试代码
- `noEmit`: 测试阶段只做类型检查
- `outDir`: 输出目录仍保持为 `dist-test/`（但 `noEmit` 为 true）

### 4. jest.config.js - 测试框架配置

**位置**: 项目根目录

**作用**: 配置 Jest 测试框架

```javascript
export default {
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
  moduleNameMapper: {
    '^#utils/(.*)$': '<rootDir>/src/utils/$1',
  },

  // 覆盖率收集
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

  // ESM 支持
  extensionsToTreatAsEsm: ['.ts'],
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
```

**关键配置**:

- `preset`: 使用 ts-jest 支持 TypeScript
- `moduleNameMapper`: 运行时路径别名（当前仅映射 `#utils/*`）
- `transform`: 使用 `test/tsconfig.json` 编译

### 5. .eslintrc.js - 代码检查配置

**位置**: 项目根目录

**作用**: 配置 ESLint 代码规范检查

```javascript
export default {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  env: {
    mocha: true,
    node: true
  },
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
  }
};
```

### 6. .vscode/launch.json - 调试配置（可选）

**位置**: `.vscode/` 目录

**作用**: 本地调试配置（仓库未默认跟踪，可自行创建）

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run Extension",
      "type": "extensionHost",
      "request": "launch",
      "args": ["--extensionDevelopmentPath=${workspaceFolder}"],
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "preLaunchTask": "${defaultBuildTask}"
    }
  ]
}
```

### 7. .vscodeignore - 打包忽略

**位置**: 项目根目录

**作用**: 告诉 VSCode 打包时忽略哪些文件

```text
.vscode/**
.vscode-test/**
src/**
test/**
out/**
script/**
.gitignore
.yarnrc
webpack.config.js
vsc-extension-quickstart.md
**/tsconfig.json
**/.eslintrc.json
**/*.map
**/*.ts
```

### 8. resources/USER_README.md - 用户文档

**位置**: `resources/` 目录

**作用**: 插件市场的用户说明文档，发布时会被复制到根目录作为 `README.md`

**内容特点**:

- 面向终端用户，非开发者
- 包含功能介绍、安装说明、配置指南
- 双语（中英文）说明
- 会在 VSCode 插件市场展示

**与开发者文档的区别**:

| 文档 | 位置 | 受众 | 内容 |
|------|------|------|------|
| `USER_README.md` | `resources/` | 终端用户 | 功能说明、使用指南 |
| `README.md` | 根目录 | 开发者 | 项目概述、架构设计 |
| `doc/developer/*.md` | `doc/developer/` | 开发者 | 详细开发文档 |

---

## README 管理流程

**README 管理流程**:

```text
开发阶段
    ↓
根目录 README.md (开发者文档)
resources/USER_README.md (用户文档)
    ↓
打包时
    ↓
safe-package.sh 脚本
    ↓
备份 README.md → README.md.bak
复制 USER_README.md → README.md
    ↓
发布到插件市场
    ↓
恢复 README.md.bak → README.md
```

**相关脚本**:

- `scripts/manage-readme.sh` - README 备份/替换/恢复
- `scripts/safe-package.sh` - 安全打包（自动处理 README）

---

## 配置文件关系图

### 编译流程

```text
开发阶段
    ↓
src/*.ts (TypeScript 源码)
    ↓
tsconfig.json (编译配置)
    ↓
tsc (TypeScript 编译器)
    ↓
dist/*.js (JavaScript 输出)
    ↓
VSCode 加载扩展
```

### 测试流程

```text
test/*.test.ts (测试代码)
    ↓
test/tsconfig.json (测试编译配置)
    ↓
ts-jest (Jest 预设)
    ↓
jest.config.js (Jest 配置)
    ↓
Jest (测试运行器)
    ↓
测试结果 + 覆盖率报告
```

### 配置继承关系

```text
test/tsconfig.json
    ↓ extends
tsconfig.json (主配置)
    ↓ 被引用
jest.config.js (通过 tsconfig 选项)
```

### 路径别名映射

#### # 导入（imports / paths / Jest）统一说明

项目使用 `#` 前缀作为内部模块别名，分别由运行时与编译/测试阶段配置解析：

**注意事项**：

- `package.json` 的 `imports` 使用 `#*`（不带斜杠），`tsconfig.json` 的 `paths` 使用 `#/*`（带斜杠）。
- 代码里应写 `#/` 前缀，例如 `#/utils/log`。
- TypeScript 编译后，`import` 的模块标识符保持原样（`#/utils/log` 仍带斜杠）。
- Node.js 运行时会用 `imports` 的 `#*` 匹配并解析该带斜杠的标识符。

**多配置项匹配规则**：

- `imports` 与 `paths` 都遵循“**优先匹配更具体的模式**”的规则（如 `#utils/*` 优先于 `#*`）。
- 当多个规则都能匹配时，优先选择**更具体**的那条；因此建议把更细的别名单独列出。
- `jest.config.js` 的 `moduleNameMapper` 也是类似逻辑，建议先写更具体的正则。
- `paths` 的值可以是**数组**，编译时会按数组顺序依次尝试，**命中第一个存在的路径即停止**。
- 如果数组中的多个路径都存在，**始终优先使用排在前面的路径**，因此请把首选路径放在前面。

```json
// package.json（Node.js 运行时）
{
  "type": "module",
  "imports": {
    "#*": "./src/*",
    "#utils/*": "./src/utils/*" // 更具体的别名, #/utils/ 优先匹配
  }
}
```

```json
// tsconfig.json（TypeScript 编译时）
{
  "compilerOptions": {
    "moduleResolution": "bundler",
      "#/*": ["./src/*"],
      "#utils/*": ["./src/utils/*"] // 更具体的别名, #/utils/ 优先匹配
    }
}
```

**示例：`paths` 多路径与冲突处理**

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "#/*": [
        "./src/*",
        "./generated/*"  // 备选路径：仅当 src 不存在时才会使用
      ],
      "#utils/*": [
        "./src/utils/*",
        "./shared/utils/*" // 与 src/utils 同名时，优先使用前者
      ]
    }
  }
}
```

**解析顺序说明**：

1. 先匹配更具体的 key：`#utils/*` 优先于 `#*`。
2. 再按该 key 的数组顺序依次尝试，命中第一个存在的路径即停止。

```json
// test/tsconfig.json（测试编译时）
{
  "compilerOptions": {
    "paths": {
      "#/*": ["../src/*"]
    }
  }
}
```

```javascript
// jest.config.js（Jest 运行时）
export default {
  moduleNameMapper: {
    '^#/(.*)$': '<rootDir>/src/$1',
    '^#utils/(.*)$': '<rootDir>/src/utils/$1'
  }
};
```

**注意**：当前 Jest 仅映射 `#utils/*`。如果测试代码使用 `#/` 前缀，请补充 `^#/(.*)$` 映射或统一改用 `#utils/*`。

```text
代码中: import { x } from '#/utils/log';
  ↓
TypeScript: tsconfig.json paths → ./src/utils/log
  ↓
Node.js: package.json imports → ./src/utils/log
  ↓
Jest: jest.config.js moduleNameMapper → <rootDir>/src/utils/log
  ↓
实际文件: src/utils/log.ts
```

---

## 开发工作流

### 1. 初始化项目

```bash
# 克隆项目
git clone <repository-url>
cd shell-formatter

# 安装依赖
npm install
```

### 2. 开发循环

```bash
# 1. 启动监听模式（自动编译）
npm run watch

# 2. 在另一个终端运行测试
npm run test:watch

# 3. 按 F5 启动调试
```

### 3. 代码检查

```bash
# TypeScript 类型检查
npm run compile

# ESLint 代码检查
npm run lint

# Markdown 格式检查
npm run lint:md
```

### 4. 构建和打包

```bash
# 编译生产代码
npm run compile

# 打包扩展
npm run package:extension

# 安装到本地 VSCode
npm run install:extension
```

### 5. 发布前检查清单

- [ ] 所有测试通过 (`npm test`)
- [ ] 代码检查通过 (`npm run lint`)
- [ ] 类型检查通过 (`npm run compile`)
- [ ] 版本号已更新 (`package.json`)
- [ ] `USER_README.md` 已更新（如功能有变更）
- [ ] CHANGELOG 已更新

---

## 配置文件速查表

### 构建和开发配置

| 文件 | 用途 | 修改频率 |
|------|------|----------|
| `package.json` | 项目配置、依赖、脚本 | 中 |
| `tsconfig.json` | TypeScript 编译配置 | 低 |
| `test/tsconfig.json` | 测试编译配置 | 低 |
| `jest.config.js` | 测试框架配置 | 低 |
| `.eslintrc.js` | 代码规范配置 | 低 |
| `.vscode/launch.json` | 调试配置（可选，本地自建） | 低 |
| `.vscodeignore` | 打包忽略配置 | 低 |

### 文档和脚本

| 文件/目录 | 用途 | 修改频率 |
|-----------|------|----------|
| `resources/USER_README.md` | 用户文档（插件市场） | 中（功能变更时） |
| `scripts/safe-package.sh` | 安全打包脚本 | 低 |
| `scripts/manage-readme.sh` | README 管理脚本 | 低 |
| `doc/developer/*.md` | 开发者文档 | 中 |
| `doc/tools/*.md` | 工具文档 | 低 |

---

## 相关文档

- [环境准备与调试](01-setup.md) - 开发环境配置
- [测试体系与实践](08-testing.md) - 测试体系详解
- [架构与核心设计](05-architecture.md) - 项目架构说明
- [TypeScript 配置详解](../tools/tsconfig.md) - tsconfig 完整说明
