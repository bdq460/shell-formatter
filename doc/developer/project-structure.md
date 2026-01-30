# 项目结构与核心配置

本文档详细介绍 Shell Formatter 项目的目录结构、核心配置文件及其作用，帮助开发者快速理解项目组织方式。

## 目录

- [项目概览](#项目概览)
- [目录结构详解](#目录结构详解)
- [核心配置文件](#核心配置文件)
- [配置文件关系图](#配置文件关系图)
- [开发工作流](#开发工作流)

---

## 项目概览

### 项目定位

Shell Formatter 是一个 VSCode 扩展，提供 Shell 脚本的格式化和诊断功能。

### 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| TypeScript | ^5.0 | 开发语言 |
| Node.js | >= 16.x | 运行时 |
| VSCode API | ^1.74.0 | 扩展框架 |
| Jest | ^29.7.0 | 测试框架 |
| ES Modules | - | 模块系统 |

---

## 目录结构详解

### 完整目录树

```text
shell_formatter/
├── .vscode/                    # VSCode 工作区配置
│   ├── launch.json            # 调试配置
│   ├── settings.json          # 编辑器设置
│   └── tasks.json             # 任务配置
│
├── doc/                        # 文档目录
│   ├── developer/             # 开发者文档
│   │   ├── architecture.md    # 架构设计
│   │   ├── getting-started.md # 快速开始
│   │   ├── plugin.md          # 插件机制
│   │   ├── test.md            # 测试指南
│   │   ├── project-structure.md # 本文档
│   │   └── monitor.md         # 性能监控
│   ├── tools/                 # 工具文档
│   │   ├── tsconfig.md        # TypeScript 配置
│   │   ├── npm.md             # npm 使用
│   │   ├── npm_test.md        # npm test 说明
│   │   ├── shellcheck.md      # shellcheck 工具
│   │   ├── shfmt.md           # shfmt 工具
│   │   └── spawn.md           # spawn API
│   ├── user/                  # 用户文档
│   │   └── README.md          # 用户手册
│   └── INDEX.md               # 文档索引
│
├── scripts/                    # 脚本目录
│   ├── safe-package.sh        # 安全打包脚本（处理 README 切换）
│   ├── manage-readme.sh       # README 备份/替换/恢复脚本
│   └── test-readme-backup.sh  # README 备份测试脚本
│
├── src/                        # 源代码目录
│   ├── commands/              # 命令实现
│   │   ├── formatCommand.ts
│   │   ├── fixCommand.ts
│   │   └── index.ts
│   ├── config/                # 配置管理
│   │   └── settingInfo.ts
│   ├── di/                    # 依赖注入容器
│   │   └── container.ts
│   ├── plugins/               # 插件目录
│   │   ├── shfmtPlugin.ts
│   │   ├── shellcheckPlugin.ts
│   │   └── index.ts
│   ├── utils/                 # 工具函数
│   │   ├── log.ts
│   │   ├── debounce.ts
│   │   ├── performance/
│   │   │   └── alertManager.ts
│   │   └── plugin/
│   │       ├── BasePlugin.ts
│   │       ├── PluginManager.ts
│   │       └── MessageBus.ts
│   └── extension.ts           # 扩展入口
│
├── test/                       # 测试目录
│   ├── tsconfig.json          # 测试专用 TS 配置
│   └── unit/                  # 单元测试
│       └── utils/
│           ├── log.test.ts
│           └── plugin/
│               └── PluginManager.test.ts
│
├── resources/                  # 资源文件
│   ├── icon.png               # 扩展图标
│   ├── language-configuration.json  # 语言配置
│   └── USER_README.md         # 用户文档（插件市场展示）
│
├── dist/                       # 编译输出（自动生成）
├── coverage/                   # 覆盖率报告（自动生成）
├── node_modules/               # 依赖包（自动生成）
│
├── .eslintrc.js               # ESLint 配置
├── .gitignore                 # Git 忽略规则
├── .markdownlintrc.json       # Markdown 检查配置
├── .vscodeignore              # VSCode 打包忽略
│
├── jest.config.js             # Jest 测试配置
├── package.json               # 项目配置
├── tsconfig.json              # TypeScript 主配置
│
├── LICENSE                    # 许可证
├── README.md                  # 项目说明
└── README_EN.md               # 英文说明
```

### 关键目录说明

#### `src/` - 源代码

| 子目录 | 说明 | 关键文件 |
|--------|------|----------|
| `commands/` | VSCode 命令实现 | `formatCommand.ts`, `fixCommand.ts` |
| `config/` | 配置管理 | `settingInfo.ts` |
| `di/` | 依赖注入容器 | `container.ts` |
| `plugins/` | 格式化/诊断插件 | `shfmtPlugin.ts`, `shellcheckPlugin.ts` |
| `utils/` | 通用工具函数 | `log.ts`, `debounce.ts`, `performance/` |

#### `test/` - 测试代码

| 子目录 | 说明 |
|--------|------|
| `unit/` | 单元测试 |
| `tsconfig.json` | 测试专用 TypeScript 配置 |

#### `doc/` - 文档

| 子目录 | 说明 |
|--------|------|
| `developer/` | 开发者文档 |
| `tools/` | 工具使用文档 |
| `user/` | 用户文档（`USER_README.md`） |
| `INDEX.md` | 文档索引和导航 |

#### `resources/` - 资源文件

| 文件 | 说明 |
|------|------|
| `icon.png` | 扩展图标（插件市场展示） |
| `language-configuration.json` | Shell 语言配置 |
| `USER_README.md` | 用户文档（发布时会复制到根目录） |

#### `scripts/` - 脚本目录

| 脚本 | 用途 |
|------|------|
| `safe-package.sh` | 安全打包脚本，自动处理 README 切换 |
| `manage-readme.sh` | README 备份/替换/恢复管理 |
| `test-readme-backup.sh` | 测试 README 备份功能 |

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
    "baseUrl": ".",
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
- `paths`: `#/*` → `./src/*` - 路径别名
- `include`: 只包含 `src/` 目录

### 3. test/tsconfig.json - 测试配置

**位置**: `test/` 目录

**作用**: 扩展主配置，用于测试环境

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

**与主配置的区别**:

- `rootDir`: 扩大到项目根目录（包含 src 和 test）
- `include`: 同时包含源代码和测试代码
- `outDir`: 输出到 `dist-test/`

### 4. jest.config.js - 测试框架配置

**位置**: 项目根目录

**作用**: 配置 Jest 测试框架

```javascript
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.test.ts'],
  moduleNameMapper: {
    '^#/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverage: true,
  coverageDirectory: 'coverage',
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: true, tsconfig: './test/tsconfig.json' }],
  },
};
```

**关键配置**:

- `preset`: 使用 ts-jest 支持 TypeScript
- `moduleNameMapper`: 路径别名映射（与 tsconfig 对应）
- `transform`: 使用 `test/tsconfig.json` 编译

### 5. .eslintrc.js - 代码检查配置

**位置**: 项目根目录

**作用**: 配置 ESLint 代码规范检查

```javascript
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
};
```

### 6. .vscode/launch.json - 调试配置

**位置**: `.vscode/` 目录

**作用**: 配置 VSCode 调试器

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
scripts/**
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

```text
代码中: import { x } from '#/utils/log';
    ↓
TypeScript: tsconfig.json paths → ./src/utils/log
    ↓
Jest: jest.config.js moduleNameMapper → <rootDir>/src/log
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
| `.vscode/launch.json` | 调试配置 | 低 |
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

- [快速开始指南](./getting-started.md) - 开发环境配置
- [测试指南](./test.md) - 测试体系详解
- [架构设计文档](./architecture.md) - 项目架构说明
- [TypeScript 配置详解](../tools/tsconfig.md) - tsconfig 完整说明
