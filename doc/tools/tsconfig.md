# TypeScript 配置完整参考

## 目录

- [关于 TypeScript](#关于-typescript)
  - [简介](#简介)
  - [版本历史](#版本历史)
  - [安装与基本使用](#安装与基本使用)
- [配置项总览](#配置项总览)
- [统一配置示例](#统一配置示例)
- [编译选项详解](#编译选项详解)
  - [模块相关选项](#模块相关选项)
  - [类型检查选项](#类型检查选项)
  - [输出相关选项](#输出相关选项)
  - [路径解析选项](#路径解析选项)
  - [其他选项](#其他选项)
- [项目结构选项](#项目结构选项)
- [高级配置](#高级配置)
- [常见问题](#常见问题)

## 关于 TypeScript

### 简介

TypeScript 是 JavaScript 的超集，添加了静态类型检查，编译为纯 JavaScript。核心优势：类型安全、IDE 智能支持、代码可维护性、渐进式采用、现代化语法。

### 版本历史

| 版本 | 时间 | 主要特性 |
|------|------|----------|
| 1.x | 2012-2014 | 基本类型注解、接口、类、泛型 |
| 2.x | 2016-2018 | 联合/交叉类型、null/undefined 检查、映射类型 |
| 3.x | 2018-2020 | 元组、项目引用、`unknown` 类型、增量编译 |
| 4.x | 2020-2022 | 拼写检查、模板字面量类型、标签元组类型 |
| 5.0 | 2023-03 | 装饰器标准化、`const` 类型参数、`bundler` 解析 |
| 5.1-5.6 | 2023-2024 | 改进的类型推断、资源管理、性能优化 |
| 7.x | 未来版本 | 据称将用Go语言重写编译器，目标是实现10倍的编译速度提升，并带来一些破坏性变更（如默认启用严格模式） |

**重要说明**: TypeScript 目前最高版本为 5.x 系列，不存在 TypeScript 7。

### 安装与基本使用

```bash
# 安装
npm install -D typescript

# 编译
# tsc是 TypeScript Compiler 的缩写
tsc

# 监听模式
# 监听文件变化，自动编译
tsc --watch

# 仅类型检查
# 不生成输出文件(), 加快编译速度, 推荐在 CI 中使用
tsc --noEmit
```

## 配置项总览

### compilerOptions - 编译器选项

| 选项 | 类型 | 默认值 | 说明 | 关联配置 |
|------|------|--------|------|----------|
| **模块相关** | | | | |
| target | string | ES3 | 编译目标 JS 版本 | lib, module |
| module | string | - | 模块系统代码格式 | moduleResolution |
| moduleResolution | enum | - | 模块解析策略 | baseUrl, paths |
| esModuleInterop | boolean | false | CommonJS 默认导入支持 | - |
| resolveJsonModule | boolean | false | 允许导入 JSON 文件 | - |
| **类型检查** | | | | |
| strict | boolean | false | 启用所有严格检查 | 下方所有 strict* 选项 |
| strictNullChecks | boolean | false | 严格 null 检查 | - |
| noImplicitAny | boolean | false | 禁止隐式 any | - |
| strictFunctionTypes | boolean | false | 严格函数类型 | - |
| strictBindCallApply | boolean | false | 严格 bind/call/apply | - |
| strictPropertyInitialization | boolean | false | 严格属性初始化 | - |
| noImplicitThis | boolean | false | 禁止隐式 this | - |
| alwaysStrict | boolean | false | 始终使用严格模式 | - |
| noUnusedLocals | boolean | false | 未使用局部变量报错 | - |
| noUnusedParameters | boolean | false | 未使用参数报错 | - |
| noImplicitReturns | boolean | false | 隐式返回报错 | - |
| noFallthroughCasesInSwitch | boolean | false | switch 穿透检查 | - |
| **输出相关** | | | | |
| outDir | string | - | 输出目录 | rootDir |
| rootDir | string | - | 输入根目录 | include, outDir |
| sourceMap | boolean | false | 生成 source map | - |
| declaration | boolean | false | 生成 .d.ts 文件 | declarationMap |
| declarationMap | boolean | false | 生成声明 source map | - |
| removeComments | boolean | false | 移除注释 | - |
| noEmit | boolean | false | 是否生成输出文件 | - |
| incremental | boolean | false | 增量编译 | tsBuildInfoFile |
| tsBuildInfoFile | string | .tsbuildinfo | 增量编译缓存文件 | incremental |
| **路径解析** | | | | |
| baseUrl | string | - | 模块解析基准路径 | paths |
| paths | object | - | 路径映射 | baseUrl, moduleResolution |
| **类型定义** | | | | |
| types | string[] | - | 包含的类型声明 | typeRoots |
| typeRoots | string[] | - | 类型声明搜索目录 | types |
| lib | string[] | - | 包含的库文件 | target |
| **其他** | | | | |
| skipLibCheck | boolean | false | 跳过库文件类型检查 | - |
| forceConsistentCasingInFileNames | boolean | false | 文件名大小写检查 | - |
| jsx | string | - | JSX 编译方式 | - |
| allowJs | boolean | false | 允许编译 JS 文件 | - |
| checkJs | boolean | false | 检查 JS 文件 | allowJs |

### 顶层字段

| 字段 | 类型 | 说明 |
|------|------|------|
| include | string[] | 指定要编译的文件模式 |
| exclude | string[] | 指定要排除的文件或目录 |
| extends | string | 继承其他配置文件 |
| references | array | 项目引用（多项目工作区） |
| ts-node | object | ts-node 特定配置 |

## 统一配置示例

以下是一个完整的tsconfig.json配置示例，适用于大多数现代项目，注释说明各选项的用途：

```json
{
  // ========================================
  // 编译器选项
  // ========================================
  "compilerOptions": {
    // ---------- 模块相关 ----------
    "target": "ES2020",              // 编译目标: ES2020，推荐现代项目使用
    "module": "ESNext",              // 模块系统: ES Modules，配合现代打包工具
    "moduleResolution": "bundler",   // 模块解析: bundler（Vite/Webpack），不推荐用 baseUrl
    "esModuleInterop": true,         // CommonJS 默认导入支持，推荐开启
    "resolveJsonModule": true,       // 允许导入 JSON 文件

    // ---------- 类型检查 ----------
    "strict": true,                  // 启用所有严格检查（推荐）
      // 等价于启用以下所有选项：
      // strictNullChecks: true,      // 严格 null 检查
      // noImplicitAny: true,         // 禁止隐式 any
      // strictFunctionTypes: true,   // 严格函数类型
      // strictBindCallApply: true,   // 严格 bind/call/apply
      // strictPropertyInitialization: true, // 严格属性初始化
      // noImplicitThis: true,        // 禁止隐式 this
      // alwaysStrict: true,          // 始终使用严格模式
      // noUnusedLocals: true,        // 检查未使用的局部变量
      // noUnusedParameters: true,    // 检查未使用的参数
      // noImplicitReturns: true,     // 检查隐式返回
      // noFallthroughCasesInSwitch: true // 检查 switch 穿透

    // ---------- 输出相关 ----------
    "outDir": "./dist",              // 输出目录
    "rootDir": "./src",              // 输入根目录，保持目录结构
    "sourceMap": true,               // 生成 source map（调试用）
    "declaration": true,             // 生成 .d.ts 类型声明文件（库项目需要）
    "declarationMap": true,          // 生成声明文件的 source map
    "removeComments": false,         // 是否移除注释
    "incremental": true,             // 增量编译，加速重新编译
    "noEmit": false,                 // 是否生成输出文件 true: 不生成, false: 生成（仅类型检查时设为 true）

    // ---------- 路径解析 ----------
    // 注意: TypeScript 5.x 推荐不使用 baseUrl，直接使用相对路径
    "baseUrl": "./",         // 模块解析(paths)基准路径，注意: baseUrl将停止在 TypeScript 7.0 中运行，已被标注为@deprecated, 直接使用paths即可
    "paths": {
      "#/*": ["./src/*"],            // 路径别名: @ 映射到 src
      "@utils/*": ["./src/utils/*"],
      "@components/*": ["./src/components/*"]
    },

    // ---------- 类型定义 ----------
    "lib": ["ES2020"],               // 包含的库类型，浏览器项目可加 "DOM"
    "types": ["node"],               // 包含的类型声明，测试环境可加 "jest"
    "typeRoots": ["./node_modules/@types", "./src/@types"],  // 自定义类型搜索目录

    // ---------- 其他 ----------
    "skipLibCheck": true,            // 跳过库文件类型检查（推荐，加速编译）
    "forceConsistentCasingInFileNames": true,  // 文件名大小写检查（跨平台兼容）
    "jsx": "react",                  // JSX 编译方式（React 项目）
    "allowJs": false,                // 允许编译 JS 文件
    "checkJs": false                 // 检查 JS 文件类型
  },

  // ========================================
  // 项目结构
  // ========================================
  "include": [
    "src/**/*.ts",                   // 编译 src 下所有 .ts 文件
    "src/**/*.tsx"                   // 编译 React TSX 文件
  ],
  "exclude": [
    "node_modules",                  // 排除 node_modules
    "dist",                          // 排除输出目录
    "**/*.test.ts",                  // 排除测试文件
    "**/*.spec.ts"
  ],

  // ========================================
  // 高级配置
  // ========================================
  // "extends": "./tsconfig.base.json",  // 继承基础配置
  // "references": [                       // 项目引用（monorepo）
  //   { "path": "./packages/core" }
  // ],
  "ts-node": {
    "esm": true,                     // 启用 ES 模块
    "experimentalSpecifierResolution": "node"
  }
}
```

## 编译选项详解

### 模块相关选项

#### target

指定编译后的 JavaScript 目标版本。可选值：`ES3`, `ES5`, `ES6/ES2015`, `ES2016`, `ES2017`, `ES2018`, `ES2019`, `ES2020`, `ES2021`, `ES2022`, `ESNext`。

**推荐**：

- Node.js 14+: `ES2020`
- Node.js 16+: `ES2021`
- Node.js 18+: `ES2022`
- 现代浏览器: `ES2020` 或更高

#### module

指定生成哪个模块系统代码。可选值：`CommonJS`, `UMD`, `AMD`, `System`, `ESNext`, `ES6`, `ES2020`, `None`。

**说明**：

- `CommonJS`: Node.js 默认（require/module.exports）
- `ESNext`: 原生 ES 模块（import/export），推荐配合现代打包工具
- `NodeNext`: Node.js ESM 项目使用

#### moduleResolution

指定模块解析策略。可选值：`node`, `node10`, `node16`, `nodenext`, `bundler`, `classic`。

**说明**：

- `bundler`: 现代打包工具（Vite、Webpack 等），**推荐**
- `node16`/`nodenext`: Node.js ESM 项目
- `node`: 传统 Node.js 模块解析
- `classic`: 旧版解析策略（不推荐）

#### esModuleInterop

允许导入 CommonJS 模块时使用默认导入语法。

**示例**：

```typescript
// esModuleInterop: false
import * as fs from 'fs'; // 必须使用命名空间导入

// esModuleInterop: true
import fs from 'fs'; // 可以使用默认导入
```

### 类型检查选项

#### strict

启用所有严格类型检查选项。新项目强烈建议开启。

#### strictNullChecks

启用严格的 null 检查。

**示例**：

```typescript
let value: string | null = null;
value.toUpperCase(); // 报错：Object is possibly 'null'
value?.toUpperCase(); // 正确
```

#### noImplicitAny

禁止隐式的 any 类型。

**示例**：

```typescript
function processData(data) { // 报错：Parameter 'data' implicitly has an 'any' type
  return data.length;
}

// 修正
function processData(data: unknown) {
  if (typeof data === 'string') {
    return data.length;
  }
  return 0;
}
```

### 输出相关选项

#### outDir

指定输出目录，编译后的 .js 文件和 source map 文件会输出到此目录。

#### rootDir

指定输入文件的根目录，控制编译输出目录结构。

**说明**：

- 如果不指定，TypeScript 会自动推断（所有输入文件的最长公共路径）
- `rootDir` 下的目录结构会在 `outDir` 中保持不变
- 必须与 `include` 配合使用，`rootDir` 应该包含 `include` 的所有文件

**示例**：

```text
项目结构：
project/
├── src/
│   ├── utils/log.ts
│   └── main.ts
└── dist/

配置: "rootDir": "./src", "outDir": "./dist"
输出: src/utils/log.ts → dist/utils/log.js

配置: "outDir": "./dist" (不指定 rootDir)
输出: src/utils/log.ts → dist/src/utils/log.js
```

#### sourceMap

生成 source map 文件，用于调试，将编译后的代码映射回原始 TypeScript 源码。

**说明**：

source map 是一个映射文件，记录了编译后的代码与原始源代码之间的对应关系。当浏览器或调试器遇到错误时，可以根据 source map 找到原始 TypeScript 源码的位置，而不是编译后的 JavaScript 位置。

**工作原理**：

```text
源代码 (TypeScript) ──tsc──► 编译代码 (JavaScript)
                              │
                              │ source map 映射
                              ▼
                        浏览器调试器显示源代码
```

**文件结构示例**：

```text
project/
├── src/
│   ├── utils.ts           # 原始 TypeScript 源码
│   └── main.ts
└── dist/
    ├── utils.js           # 编译后的 JavaScript
    ├── utils.js.map       # source map 文件
    ├── main.js
    └── main.js.map
```

**启用 sourceMap**：

```json
// tsconfig.json
{
  "compilerOptions": {
    "sourceMap": true
  }
}
```

编译后会生成对应的 `.js.map` 文件：

```javascript
// dist/utils.js
function greet(name) {
    return "Hello, " + name + "!";
}
// # sourceMappingURL=utils.js.map
```

**package.json 配置配合**：

source map 文件的生成和发布需要在 `package.json` 中进行适当配置，以确保开发和生产环境的正确处理。

**1. 开发环境配置**：

```json
{
  "name": "my-project",
  "version": "1.0.0",
  "scripts": {
    "dev": "tsc --watch",
    "build": "tsc"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

**2. 发布配置（库项目）**：

库项目需要决定是否发布 source map 文件：

```json
{
  "name": "my-library",
  "version": "1.0.0",
  "files": [
    "dist",
    "README.md"
  ],
  "scripts": {
    "build": "tsc",
    "build:prod": "tsc && npm run clean:maps"
  },
  // 选项 1: 包含 source map（推荐用于库）
  // "files": ["dist/**/*.js", "dist/**/*.d.ts", "dist/**/*.js.map"]

  // 选项 2: 不包含 source map（生产环境）
  // "files": ["dist/**/*.js", "dist/**/*.d.ts"]
}
```

**3. 生产环境（不发布 source map）**：

```json
{
  "scripts": {
    "build": "tsc",
    "build:prod": "tsc && rimraf dist/**/*.js.map"
  }
}
```

**4. 使用构建工具时**：

**Vite 项目**：

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build"
  }
}

// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    sourcemap: true,  // Vite 生成 source map
    rollupOptions: {
      output: {
        sourcemap: true
      }
    }
  }
});
```

**Webpack 项目**：

```javascript
// webpack.config.js
module.exports = {
  mode: 'development',
  devtool: 'source-map',  // 开发环境启用
  // 或
  devtool: 'eval-source-map',  // 快速重建
  // 或
  devtool: 'false',  // 生产环境关闭
};
```

**source map 类型对比**：

| 类型 | 说明 | 生成时间 | 调试质量 |
|------|------|----------|----------|
| `source-map` | 独立的 .map 文件 | 慢 | 最佳 |
| `eval-source-map` | 内联 source map，用 eval | 快 | 好 |
| `cheap-module-source-map` | 不包含列映射 | 较快 | 中等 |
| `eval` | 仅使用 eval，无映射 | 最快 | 最差 |

**浏览器开发工具中的效果**：

启用 sourceMap 后，在浏览器开发者工具中：

- 错误堆栈显示原始 TypeScript 文件名和行号
- 可以在原始源码中设置断点
- 变量查看显示 TypeScript 中的变量名

**示例**：

```typescript
// src/utils.ts
function calculateDiscount(price: number, discount: number): number {
  return price * (1 - discount / 100);
}

console.log(calculateDiscount(100, 20));  // 断点设置在这里
```

```javascript
// dist/utils.js（浏览器实际执行）
function calculateDiscount(price, discount) {
    return price * (1 - discount / 100);
}
console.log(calculateDiscount(100, 20));
```

**安全考虑**：

source map 会暴露源代码结构，生产环境可能有安全风险：

```json
// package.json - 生产环境
{
  "scripts": {
    "build": "tsc && rimraf dist/**/*.js.map",
    "deploy": "npm run build && npm publish"
  }
}
```

或使用 `.gitignore` / `.npmignore`：

```text
# .gitignore / .npmignore
*.js.map
*.d.ts.map
```

**调试技巧**：

1. **开发环境**：始终启用 `sourceMap: true`
2. **生产环境**：通常禁用，或仅在需要调试时临时启用
3. **CI/CD**：可以验证 source map 的生成但不部署

**完整配置示例**：

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "sourceMap": true,              // 启用 source map
    "declaration": true,
    "declarationMap": true           // 声明文件也生成 source map
  }
}

// package.json
{
  "name": "my-app",
  "version": "1.0.0",
  "scripts": {
    "build": "tsc",
    "build:prod": "tsc && rimraf dist/**/*.js.map",
    "dev": "tsc --watch"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "rimraf": "^3.0.0"
  }
}
```

#### noEmit

不生成输出文件，仅进行类型检查。

**说明**：

`--noEmit` 选项指示 TypeScript 编译器只执行类型检查，而不生成任何输出文件（.js、.d.ts、source map 等）。这在以下场景非常有用：

**使用场景**：

1. **类型检查为主**：当项目使用打包工具（如 Vite、Webpack、Rollup）来处理代码转换和输出时，TypeScript 只需要负责类型检查，无需生成 JavaScript 文件。

2. **CI/CD 流水线**：在持续集成中只验证类型正确性，不需要生成产物，加快构建速度。

3. **开发调试**：快速检查类型错误，等待打包工具处理实际的代码生成。

4. **纯 TypeScript 项目**：当所有代码最终由其他工具链处理时。

**命令行使用**：

```bash
# 仅类型检查，不生成文件
tsc --noEmit

# 指定配置文件
tsc --noEmit -p tsconfig.test.json
```

**tsconfig.json 配置**：

```json
{
  "compilerOptions": {
    "noEmit": true  // 或者在运行时使用 --noEmit 覆盖
  }
}
```

**工作流程示例**：

```json
// package.json
{
  "scripts": {
    "type-check": "tsc --noEmit",       // 仅类型检查
    "type-check:watch": "tsc --noEmit --watch",
    "build": "tsc",                      // 完整编译
    "dev": "vite"                       // 使用 Vite 开发（无需 tsc 编译）
  }
}
```

**与打包工具配合**：

- **Vite**: Vite 内置了 TypeScript 支持，会执行类型检查和转译，`tsc --noEmit` 用于 CI 验证
- **Webpack**: 通过 `ts-loader` 处理 TypeScript，`tsc --noEmit` 用于独立类型检查
- **Rollup**: 通过 `@rollup/plugin-typescript` 处理，`tsc --noEmit` 用于预检查

**性能优势**：

- 跳过文件生成步骤，通常能加快 20-30% 的类型检查速度
- 不产生临时文件，减少磁盘 I/O

**注意事项**：

- 即使 `noEmit: true`，TypeScript 仍会完整解析所有文件并执行类型检查
- 与 `declaration` 冲突：不能同时生成类型声明文件
- 与 `declarationMap` 冲突：不能生成声明文件的 source map

#### declaration

生成 .d.ts 类型声明文件。

**说明**：

- 用于库项目，让其他 TypeScript 项目能使用你的类型定义
- 如果需要对外发布 npm 包，推荐启用
- 应用项目通常不需要

### 路径解析选项

#### paths

配置模块路径映射。

**示例**：

```json
{
  "compilerOptions": {
    "paths": {
      "#/*": ["./src/*"],
      "@utils/*": ["./src/utils/*"]
    }
  }
}
```

**使用**：

```typescript
import { logger } from '#/utils/log';
```

**说明**：

- 映射模式中使用 `*` 作为通配符
- 配合 `moduleResolution: "bundler"` 使用（推荐）
- TypeScript 5.x 推荐直接使用相对于配置文件的完整路径，不使用 `baseUrl`

---

### 使用 `#` 路径别名配置

使用 `#` 作为路径别名是一种现代、简洁的模块导入方式，需要协调配置 `package.json`、`tsconfig.json`、`test/tsconfig.json` 和 `jest.config.js` 四个文件。

**核心原理**：

```text
TypeScript 类型检查                运行时模块解析
          ↓                              ↓
  tsconfig.json                package.json imports
       paths                          & Jest
          ↓                              ↓
    #/utils/log  ──────────────────▶  #/utils/log
          │                              │
          └───────────▶ src/utils/log ◀─┘
```

#### 1. package.json 配置

在 `package.json` 中添加 `imports` 字段，定义路径映射：

```json
{
  "name": "shell-formatter",
  "type": "module",
  "imports": {
    "#*": "./src/*"
  }
}
```

**说明**：

- `type: "module"`：声明项目使用 ES 模块
- `imports`：定义模块导入映射
- `"#*": "./src/*"`：所有以 `#` 开头的导入映射到 `src` 目录
- `*` 是通配符，匹配任意子路径

**实际效果**：

| 导入语句 | 解析为 |
|---------|--------|
| `import { logger } from '#/utils/log'` | `./src/utils/log.js` |
| `import { config } from '#/config'` | `./src/config.js` |
| `import { extension } from '#/extension'` | `./src/extension.js` |

#### 2. tsconfig.json 配置

在 `tsconfig.json` 中配置 `paths`，使 TypeScript 能正确解析路径：

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "resolvePackageJsonImports": true,
    "paths": {
      "#/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "test", "coverage"]
}
```

**关键选项**：

- `moduleResolution: "bundler"`：推荐用于现代打包工具
- `resolvePackageJsonImports: true`：启用从 package.json 解析导入（TypeScript 5.7+）
- `paths: { "#/*": ["./src/*"] }`：TypeScript 类型检查的路径映射

#### 3. test/tsconfig.json 配置

测试环境的 `tsconfig.json` 需要继承主配置并调整路径：

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

**配置说明**：

- `extends: "../tsconfig.json"`：继承主配置
- `rootDir: "../"`：根目录设置为项目根目录
- `paths: { "#/*": ["../src/*"] }`：路径指向父目录的 `src`
- `noEmit: true`：仅类型检查，不生成文件
- `types: ["jest", "node"]`：包含 Jest 和 Node 类型定义

**重要提示**：测试配置中的 `paths` 路径需要相对于 `test/tsconfig.json` 的位置（即 `../src/*`），而主配置中的路径是相对于 `tsconfig.json` 的位置（即 `./src/*`）。

#### 4. jest.config.js 配置

在 Jest 配置中添加 `moduleNameMapper`，使测试运行时能正确解析模块：

```javascript
/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',

  // 模块名映射
  moduleNameMapper: {
    '^#utils/(.*)$': '<rootDir>/src/utils/$1',
    '^#/(.*)$': '<rootDir>/src/$1',
  },

  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
      tsconfig: './test/tsconfig.json',
    }],
  },
};
```

**配置说明**：

- `moduleNameMapper`：正则表达式映射 `#` 导入到实际文件路径
- `^#utils/(.*)$`：匹配 `#utils/` 开头的导入
- `<rootDir>`：Jest 内置 token，自动替换为项目根目录
- `ts-jest` 配置中指定 `tsconfig: './test/tsconfig.json'`

**完整配置示例**：

**package.json**：

```json
{
  "name": "shell-formatter",
  "version": "1.0.0",
  "type": "module",
  "imports": {
    "#*": "./src/*"
  }
}
```

**tsconfig.json**：

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolvePackageJsonImports": true,
    "paths": {
      "#/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts"]
}
```

**test/tsconfig.json**：

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "types": ["jest", "node"],
    "noEmit": true,
    "paths": {
      "#/*": ["../src/*"]
    }
  },
  "include": ["../src/**/*", "../test/**/*"]
}
```

**jest.config.js**：

```javascript
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^#/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
      tsconfig: './test/tsconfig.json',
    }],
  },
};
```

#### 实际使用示例

**源文件结构**：

```text
project/
├── src/
│   ├── utils/
│   │   ├── logger.ts
│   │   └── validator.ts
│   ├── config.ts
│   └── extension.ts
├── test/
│   └── utils.test.ts
├── package.json
├── tsconfig.json
├── test/tsconfig.json
└── jest.config.js
```

**导入示例**：

```typescript
// src/extension.ts
import { logger } from '#/utils/logger';
import { config } from '#/config';

logger.debug('Extension activated');
```

```typescript
// test/utils.test.ts
import { logger } from '#/utils/logger';
import { validateInput } from '#/utils/validator';

describe('Utils', () => {
  test('should log messages', () => {
    logger.info('Test message');
  });

  test('should validate input', () => {
    const result = validateInput('test');
    expect(result).toBe(true);
  });
});
```

#### 配置协同工作流程

```text
开发者编写代码
      ↓
import { logger } from '#/utils/logger'
      ↓
    ├──▶ TypeScript 类型检查（tsconfig.json paths）
    │        ↓
    │    类型正确 ✓
    │
    └──▶ 运行时解析
             ├──▶ package.json imports（运行时）
             └──▶ Jest moduleNameMapper（测试运行时）
                      ↓
               解析到 ./src/utils/logger.js
```

**各阶段解析器**：

| 阶段 | 配置文件 | 作用 |
|------|---------|------|
| 开发时类型检查 | `tsconfig.json` | TypeScript 编译器解析路径 |
| 主代码运行 | `package.json imports` | Node.js 运行时解析模块 |
| 测试运行 | `jest.config.js moduleNameMapper` | Jest 测试运行时解析模块 |
| 测试类型检查 | `test/tsconfig.json` | TypeScript 编译器解析测试代码 |

#### 常见问题与解决方案

**问题 1：TypeScript 报错找不到模块**

**原因**：`tsconfig.json` 中的 `paths` 配置错误或路径不正确。

**解决**：

- 检查 `paths` 是否配置了 `#/*`
- 检查路径是否相对于 `tsconfig.json` 的位置
- 确保 `moduleResolution` 设置为 `bundler`

**问题 2：Jest 测试运行时找不到模块**

**原因**：`jest.config.js` 中缺少 `moduleNameMapper` 配置。

**解决**：

```javascript
"moduleNameMapper": {
  "^#/(.*)$": "<rootDir>/src/$1"
}
```

**问题 3：测试环境 TypeScript 类型错误**

**原因**：`test/tsconfig.json` 中的 `paths` 路径不正确。

**解决**：使用相对路径指向父目录的 `src`：

```json
"paths": {
  "#/*": ["../src/*"]
}
```

**问题 4：运行时代码找不到模块**

**原因**：`package.json` 缺少 `imports` 字段或未设置 `type: "module"`。

**解决**：

```json
{
  "type": "module",
  "imports": {
    "#*": "./src/*"
  }
}
```

#### 路径别名对比

| 别名风格 | 示例 | 优点 | 缺点 |
|---------|------|------|------|
| `#/*` | `#/utils/log` | 简洁、现代、区分明显 | 需要 TypeScript 5.7+ |
| `@/*` | `@/utils/log` | 常见、广泛支持 | 与 npm 包命名冲突风险 |
| `@src/*` | `@src/utils/log` | 明确来源 | 输入较长 |
| `~/*` | `~/utils/log` | 短小 | 与一些工具冲突 |

**推荐**：使用 `#/*` 作为项目内部路径别名，简洁且不易与第三方包冲突。

### 其他选项

#### types

指定要包含的类型声明文件。

**说明**：

- 默认包含 `@types` 目录下的所有类型
- 设置 `types` 后，只包含指定的类型声明
- 测试环境通常需要 `["jest", "node"]`

#### lib

指定要包含的库文件。

**可选值**：`ES5`~`ESNext`, `DOM`, `DOM.Iterable`, `WebWorker`, `ScriptHost`

**说明**：

- 默认根据 `target` 选项自动选择
- 浏览器项目需要添加 `["DOM"]`
- Node.js 项目通常只需要对应的 ES 版本

#### skipLibCheck

跳过声明文件的类型检查，可以显著加快编译速度。推荐开启。

#### resolveJsonModule

允许导入 JSON 文件。

**示例**：

```typescript
import config from './config.json';
console.log(config.name);
```

#### forceConsistentCasingInFileNames

强制文件名大小写一致，避免跨平台兼容性问题。

## 项目结构选项

### include

指定要编译的文件模式。

**语法**：

- `*`: 匹配零个或多个字符（不包括目录分隔符）
- `**/`: 递归匹配任意子目录
- `?`: 匹配单个字符

**示例**：

```json
{
  "include": [
    "src/**/*.ts",              // src 目录下所有 .ts 文件
    "test/**/*.ts",             // test 目录下所有 .ts 文件
    "**/*.ts",                  // 项目中所有 .ts 文件
    "src/**/*.{ts,tsx}"         // 多种扩展名
  ]
}
```

**默认行为**：

- 默认包含所有 `.ts`, `.tsx`, `.d.ts` 文件
- 默认排除 `node_modules`, `bower_components`, `jspm_packages`

### exclude

指定要排除的文件或目录，优先级高于 `include`。

**示例**：

```json
{
  "exclude": [
    "node_modules",
    "dist",
    "**/*.test.ts",
    "**/*.spec.ts"
  ]
}
```

## 高级配置

### extends

继承其他配置文件，支持链式继承。

**示例**：

```json
// tsconfig.base.json
{
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true
  }
}

// tsconfig.json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext"
  }
}
```

### references

TypeScript 项目引用，用于 monorepo 或大型项目。

**示例**：

```json
{
  "references": [
    { "path": "./packages/core" },
    { "path": "./packages/utils" }
  ]
}
```

**说明**：

- 支持增量编译和项目间依赖检查
- 被引用的项目需要配置 `composite: true`

### ts-node

ts-node 特定配置。

**示例**：

```json
{
  "ts-node": {
    "esm": true,
    "experimentalSpecifierResolution": "node"
  }
}
```

## 常见问题

### Q1: 如何解决路径别名在测试中不工作？

**方案**:

1. `tsconfig.json` 配置 `paths`
2. `package.json` 配置 `imports`（Node.js ESM 运行时）
3. Jest 配置 `moduleNameMapper`

```json
// package.json
{
  "type": "module",
  "imports": {
    "#*": "./src/*"
  }
}

// jest.config.js
module.exports = {
  moduleNameMapper: {
    '^#/(.*)$': '<rootDir>/src/$1'
  }
};
```

### Q2: target 和 lib 的区别？

- **target**: 指定编译输出的 JavaScript 版本，影响语言特性的降级
- **lib**: 指定可用的类型定义，影响类型检查

**建议**: `target` 和 `lib` 保持一致

### Q3: 何时使用 `moduleResolution: "bundler"`？

- 使用 Vite、Webpack、Rollup 等现代打包工具
- 项目不直接在 Node.js 环境运行（如浏览器、Electron）
- 需要支持 bare imports

**不使用场景**: 直接在 Node.js 环境运行（使用 `node16` 或 `nodenext`）

### Q4: 如何优化编译速度？

- 启用 `incremental: true`
- 启用 `skipLibCheck: true`
- 使用项目引用 `references`
- 限制 `include` 范围，排除测试文件
- 使用 `tsc --watch` 模式

### Q5: 库项目和应用项目配置有什么区别？

| 选项 | 库项目 | 应用项目 |
|------|--------|----------|
| declaration | true | false |
| declarationMap | true | false |
| types | - | ["node"] / ["jest", "node"] |
| sourceMap | true | true（开发）/ false（生产） |

## 参考资料

- [TypeScript 官方文档 - tsconfig.json](https://www.typescriptlang.org/tsconfig)
- [TypeScript 编译选项手册](https://www.typescriptlang.org/docs/handbook/compiler-options.html)
- [TypeScript 配置最佳实践](https://github.com/microsoft/TypeScript/wiki/Coding-guidelines)
- [TypeScript Playground](https://www.typescriptlang.org/play)

---

**更新日期**: 2025-01-30
**TypeScript 版本**: 5.x
