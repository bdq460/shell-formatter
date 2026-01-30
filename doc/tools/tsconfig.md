# TypeScript 配置说明

## 目录

- [概述](#概述)
- [TypeScript 7+ 配置指南](#typescript-7-配置指南)
- [文件结构](#文件结构)
- [编译选项详解](#编译选项详解)
  - [模块相关选项](#模块相关选项)
  - [类型检查选项](#类型检查选项)
  - [输出相关选项](#输出相关选项)
  - [路径解析选项](#路径解析选项)
  - [其他选项](#其他选项)
- [项目结构选项](#项目结构选项)
- [高级配置](#高级配置)
- [最佳实践](#最佳实践)
- [常见问题](#常见问题)

## 概述

`tsconfig.json` 是 TypeScript 项目的配置文件，用于指定编译器选项、包含/排除的文件、以及项目根目录等信息。TypeScript 编译器（tsc）根据此配置文件将 TypeScript 代码编译为 JavaScript。

## TypeScript 7+ 配置指南

TypeScript 7 引入了多项重要的配置变化，本文档优先介绍 TypeScript 7+ 的推荐配置方式。

### TypeScript 7 主要变化

#### 1. 不再推荐使用 `baseUrl`

**原因**:

- `baseUrl` 与 Node.js 的模块解析策略不一致
- 容易导致路径解析混乱
- 现代打包工具（Vite、Webpack、Rollup）不再需要 `baseUrl`

**迁移方式**:

```json
// ❌ TypeScript 7 之前（不推荐）
{
  "compilerOptions": {
    "baseUrl": "./",
    "paths": {
      "#/*": ["./src/*"]
    }
  }
}

// ✅ TypeScript 7+ 推荐
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "paths": {
      "#/*": ["./src/*"]
    }
  }
}
```

#### 2. 推荐 `moduleResolution: "bundler"`

**适用场景**:

- 使用 Vite、Webpack、Rollup 等现代打包工具
- 项目使用 ES Modules
- 需要支持路径别名

**配置示例**:

```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ES2020"
  }
}
```

#### 3. `paths` 使用相对于配置文件的路径

TypeScript 7+ 中，`paths` 的解析更加直观：

```json
// tsconfig.json（项目根目录）
{
  "compilerOptions": {
    "paths": {
      "#/*": ["./src/*"]      // 相对于 tsconfig.json 所在目录
    }
  }
}

// test/tsconfig.json（test/ 目录）
{
  "compilerOptions": {
    "paths": {
      "#/*": ["../src/*"]     // 相对于 test/tsconfig.json 所在目录
    }
  }
}
```

### TypeScript 7+ 完整配置模板

#### 项目主配置

```json
{
  "compilerOptions": {
    // 模块设置
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020"],

    // 输出设置
    "outDir": "./dist",
    "rootDir": "./src",
    "sourceMap": true,

    // 类型检查
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,

    // 路径别名（TS 7+ 风格）
    "paths": {
      "#/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "test", "coverage"]
}
```

#### 测试配置

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    // 扩大编译范围
    "rootDir": "../",
    "outDir": "../dist-test",

    // 测试类型
    "types": ["jest", "node"],

    // 路径别名（相对于 test/tsconfig.json）
    "paths": {
      "#/*": ["../src/*"]
    }
  },
  "include": ["../src/**/*", "./**/*"],
  "exclude": ["node_modules", "../dist", "../dist-test", "../coverage"]
}
```

### TypeScript 7+ 配置检查清单

配置 TypeScript 7+ 项目时，请确认：

- [ ] 使用 `"moduleResolution": "bundler"`
- [ ] 不使用 `"baseUrl"`
- [ ] `"paths"` 使用相对于配置文件的路径
- [ ] `"module"` 设置为 `"ESNext"` 或 `"NodeNext"`
- [ ] `"target"` 至少为 `"ES2020"`
- [ ] `package.json` 中配置 `"imports"` 字段（Node.js ESM 运行时支持）

### 与 Jest 的配合

TypeScript 7+ 配置需要与 Jest 的 `moduleNameMapper` 配合：

```javascript
// jest.config.js
module.exports = {
  moduleNameMapper: {
    // 与 tsconfig.json 的 paths 保持一致
    '^#/(.*)$': '<rootDir>/src/$1'
  }
};
```

### 与 package.json 的配合

TypeScript 的 `paths` 只在编译时生效，Node.js 运行时需要 `package.json` 的 `imports` 字段：

```json
// package.json
{
  "type": "module",
  "imports": {
    "#*": "./src/*"
  }
}
```

**关键区别**:

| 配置位置 | 作用时机 | 语法 | 示例 |
|---------|---------|------|------|
| `tsconfig.json` `paths` | 编译时 | `"#/*": ["./src/*"]` | TypeScript 类型检查 |
| `package.json` `imports` | 运行时 | `"#*": "./src/*"` | Node.js ESM 解析 |

**注意**: `package.json` 中的 `imports` 键名**不带斜杠**（`#*`），而 `tsconfig.json` 中的 `paths` 键名**带斜杠**（`#/*`）。这是两套系统的不同语法要求。

### 版本兼容性

| TypeScript 版本 | `moduleResolution` 推荐 | `baseUrl` |
|----------------|------------------------|-----------|
| 5.0 - 5.6 | `"node"` 或 `"bundler"` | 可用但不推荐 |
| 5.7+ (TS 7) | `"bundler"` | 不推荐 |
| 6.0+ | `"bundler"` | 已弃用 |

## 文件结构

```json
{
  "compilerOptions": {
    // 编译器选项
  },
  "include": [],
  "exclude": [],
  "extends": "",
  "references": []
}
```

### 顶层字段说明

- **compilerOptions**: 编译器配置选项
- **include**: 指定要编译的文件模式
- **exclude**: 指定要排除的文件或目录
- **extends**: 继承其他 tsconfig.json 文件的配置
- **references**: 项目引用（多项目工作区）

## 编译选项详解

### 模块相关选项

#### target

**作用**: 指定编译后的 JavaScript 目标版本

**可选值**: `ES3`, `ES5`, `ES6/ES2015`, `ES2016`, `ES2017`, `ES2018`, `ES2019`, `ES2020`, `ES2021`, `ES2022`, `ESNext`

**示例**:

```json
{
  "compilerOptions": {
    "target": "ES2020"
  }
}
```

**说明**:

- 选择较低版本会生成兼容性更好的代码，但可能无法使用某些现代语法
- `ESNext` 表示使用最新的 ECMAScript 特性
- 本项目使用 `ES2020`，因为 VSCode 扩展支持的最低环境已支持 ES2020

#### module

**作用**: 指定生成哪个模块系统代码

**可选值**: `CommonJS`, `UMD`, `AMD`, `System`, `ESNext`, `ES6`, `ES2020`, `None`

**示例**:

```json
{
  "compilerOptions": {
    "module": "ESNext"
  }
}
```

**说明**:

- `CommonJS`: Node.js 默认模块系统（require/module.exports）
- `ESNext/ES6`: 原生 ES 模块系统（import/export）
- 本项目使用 `ESNext`，配合 VSCode 扩展的打包工具

#### moduleResolution

**作用**: 指定模块解析策略

**可选值**: `node`, `node10`, `node16`, `nodenext`, `bundler`, `classic`

**示例**:

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler"
  }
}
```

**说明**:

- `node`: Node.js 的模块解析策略
- `bundler`: 现代打包工具的解析策略（Vite、Webpack 等）
- `classic`: 旧版 TypeScript 的解析策略（已不推荐）
- 本项目使用 `bundler`，因为扩展会被打包工具处理

#### esModuleInterop

**作用**: 允许导入 CommonJS 模块时使用默认导入语法

**类型**: `boolean`

**默认值**: `false`

**示例**:

```json
{
  "compilerOptions": {
    "esModuleInterop": true
  }
}
```

**说明**:

```typescript
// esModuleInterop: false
import * as fs from 'fs'; // 必须使用命名空间导入

// esModuleInterop: true
import fs from 'fs'; // 可以使用默认导入
import { readFile } from 'fs'; // 也可以使用命名导入
```

**推荐**: 开启此选项，提供更好的互操作性

### 类型检查选项

#### strict

**作用**: 启用所有严格类型检查选项

**类型**: `boolean`

**默认值**: `false`

**示例**:

```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

**等价于**:

```json
{
  "compilerOptions": {
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

**推荐**: 新项目强烈建议开启，能捕获更多潜在错误

#### strictNullChecks

**作用**: 启用严格的 null 检查

**类型**: `boolean`

**示例**:

```typescript
// strictNullChecks: false
let value: string | null = null;
value.toUpperCase(); // 不会报错，但运行时可能出错

// strictNullChecks: true
let value: string | null = null;
value.toUpperCase(); // 编译错误：Object is possibly 'null'
value?.toUpperCase(); // 正确：使用可选链
```

#### noImplicitAny

**作用**: 禁止隐式的 any 类型

**类型**: `boolean`

**示例**:

```typescript
// noImplicitAny: false
function processData(data) { // data 类型为 any
    return data.length; // 不会报错
}

// noImplicitAny: true
function processData(data) { // 编译错误：Parameter 'data' implicitly has an 'any' type
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

**作用**: 指定输出目录

**类型**: `string`

**示例**:

```json
{
  "compilerOptions": {
    "outDir": "./dist"
  }
}
```

**说明**: 编译后的 .js 文件和 source map 文件会输出到此目录

#### rootDir

**作用**: 指定输入文件的根目录，控制编译输出目录结构

**类型**: `string`

**示例**:

```json
{
  "compilerOptions": {
    "rootDir": "./src"
  }
}
```

**详细说明**:

`rootDir` 确定编译时的根目录，并与 `outDir` 配合保持目录结构一致。

**项目结构示例**:

```text
project/
├── src/
│   ├── utils/
│   │   └── logger.ts
│   └── main.ts
└── dist/           (输出目录)
```

**配置 A**: 指定 `rootDir: "src"`

```json
{
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  }
}
```

**输出结构**:

```text
dist/
├── utils/
│   └── logger.js    ✅ 保持 src 下的目录结构
└── main.js
```

**配置 B**: 不指定 `rootDir`（自动推断）

```json
{
  "compilerOptions": {
    "outDir": "./dist"
  },
  "include": ["src/**/*.ts"]
}
```

**输出结构**:

```text
dist/
└── src/
    ├── utils/
    │   └── logger.js  ⚠️ 包含了 src 目录
    └── main.js
```

**关键点**:

1. **默认行为**: 如果不指定 `rootDir`，TypeScript 会自动推断（所有输入文件的最长公共路径）
2. **目录保持**: `rootDir` 下的目录结构会在 `outDir` 中保持不变
3. **配合使用**: 必须与 `include` 配合，`rootDir` 应该包含或匹配 `include` 的范围

**不同场景的配置**:

**场景 1**: 只编译生产代码

```json
{
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src/**/*.ts"]
}
```

输出: `src/utils/log.ts` → `dist/utils/log.js`

**场景 2**: 编译源代码和测试

```json
{
  "compilerOptions": {
    "rootDir": ".",
    "outDir": "dist"
  },
  "include": ["src/**/*.ts", "test/**/*.ts"]
}
```

输出: `src/utils/log.ts` → `dist/src/utils/log.js`

**常见错误**:

- ❌ `rootDir` 范围小于 `include`: 会导致编译错误
- ❌ `rootDir` 指向不存在或不匹配的路径: 可能导致输出结构混乱
- ✅ 确保 `rootDir` 包含 `include` 的所有文件

#### sourceMap

**作用**: 生成 source map 文件

**类型**: `boolean`

**默认值**: `false`

**示例**:

```json
{
  "compilerOptions": {
    "sourceMap": true
  }
}
```

**说明**: source map 用于调试，将编译后的代码映射回原始 TypeScript 源码

#### declaration

**作用**: 生成 .d.ts 类型声明文件

**类型**: `boolean`

**默认值**: `false`

**示例**:

```json
{
  "compilerOptions": {
    "declaration": true
  }
}
```

**说明**:

- 用于库项目，让 TypeScript 项目能使用你的类型定义
- VSCode 扩展通常会使用此选项生成类型定义供外部使用

#### declarationMap

**作用**: 生成声明文件的 source map

**类型**: `boolean`

**默认值**: `false`

**示例**:

```json
{
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true
  }
}
```

### 路径解析选项

#### paths

**作用**: 配置模块路径映射（TypeScript 7+ 推荐方式）

**类型**: `object`

**示例**:

```json
{
  "compilerOptions": {
    "paths": {
      "#/*": ["./src/*"],
      "@utils/*": ["./src/utils/*"],
      "@components/*": ["./src/components/*"]
    }
  }
}
```

**使用示例**:

```typescript
// 不使用 paths
import { logger } from '../../../src/utils/log';

// 使用 paths
import { logger } from '#/utils/log';
import { formatDate } from '@utils/date';
import { Button } from '@components/Button';
```

**说明**:

- `paths` 使用相对于配置文件的路径（TypeScript 7+ 推荐）
- 映射模式中使用 `*` 作为通配符
- 本项目使用 `#/` 作为 src 目录的别名
- 配合 `moduleResolution: "bundler"` 使用（推荐）

**TypeScript 7+ 注意事项**:

TypeScript 7 不推荐使用 `baseUrl`，建议直接使用相对于配置文件的完整路径：

```json
// ✅ TypeScript 7+ 推荐
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "paths": {
      "#/*": ["./src/*"]
    }
  }
}

// ❌ TypeScript 7 不推荐（使用 baseUrl）
{
  "compilerOptions": {
    "baseUrl": "./",
    "paths": {
      "#/*": ["./src/*"]
    }
  }
}
```

### 其他选项

#### types

**作用**: 指定要包含的类型声明文件

**类型**: `string[]`

**示例**:

```json
{
  "compilerOptions": {
    "types": ["node", "jest", "vscode"]
  }
}
```

**说明**:

- 默认情况下，TypeScript 会自动包含 `@types` 目录下的所有类型
- 设置 `types` 后，只包含指定的类型声明
- 本项目测试配置使用 `["jest", "node"]`

#### typeRoots

**作用**: 指定类型声明文件的搜索目录

**类型**: `string[]`

**示例**:

```json
{
  "compilerOptions": {
    "typeRoots": ["./node_modules/@types", "./src/@types"]
  }
}
```

**说明**: 用于自定义类型声明文件的查找位置

#### lib

**作用**: 指定要包含的库文件

**类型**: `string[]`

**示例**:

```json
{
  "compilerOptions": {
    "lib": ["ES2020", "DOM", "DOM.Iterable"]
  }
}
```

**可选值**:

- `ES5`, `ES6`, `ES2015`, `ES2016`, `ES2017`, `ES2018`, `ES2019`, `ES2020`, `ES2021`, `ES2022`, `ESNext`
- `DOM`, `DOM.Iterable`
- `WebWorker`, `WebWorker.ImportScripts`
- `ScriptHost`

**说明**:

- 默认根据 `target` 选项自动选择
- 如果运行环境支持 DOM，需要显式添加
- 本项目使用 `["ES2020"]`，因为 VSCode 扩展运行环境不依赖 DOM

#### skipLibCheck

**作用**: 跳过声明文件的类型检查

**类型**: `boolean`

**默认值**: `false`

**示例**:

```json
{
  "compilerOptions": {
    "skipLibCheck": true
  }
}
```

**说明**:

- 可以显著加快编译速度
- 跳过 `node_modules/@types` 下文件的类型检查
- 推荐开启，因为第三方库的类型通常已经过验证

#### resolveJsonModule

**作用**: 允许导入 JSON 文件

**类型**: `boolean`

**默认值**: `false`

**示例**:

```json
{
  "compilerOptions": {
    "resolveJsonModule": true
  }
}
```

**使用示例**:

```typescript
import config from './config.json';

console.log(config.name); // TypeScript 会推断 config 的类型
```

#### forceConsistentCasingInFileNames

**作用**: 强制文件名大小写一致

**类型**: `boolean`

**默认值**: `false`

**示例**:

```json
{
  "compilerOptions": {
    "forceConsistentCasingInFileNames": true
  }
}
```

**说明**:

```typescript
// 文件名为 utils.ts

import { helper } from './Utils'; // 不区分大小写的文件系统会通过
import { helper } from './utils'; // 正确

// 开启 forceConsistentCasingInFileNames 后
import { helper } from './Utils'; // 编译错误
```

**推荐**: 开启，避免在不同操作系统上的兼容性问题

## 项目结构选项

### include

**作用**: 指定要编译的文件模式，决定哪些文件会被 TypeScript 编译器处理

**类型**: `string[]`

**示例**:

```json
{
  "include": [
    "src/**/*.ts",
    "src/**/*.tsx",
    "test/**/*.ts"
  ]
}
```

**模式语法**:

- `*` 匹配零个或多个字符（不包括目录分隔符）
- `**/` 递归匹配任意子目录
- `?` 匹配单个字符

**详细说明**:

`include` 使用 glob 模式匹配文件，决定哪些 TypeScript 文件需要被编译。

**常用模式**:

```json
{
  "include": [
    "src/**/*.ts",          // src 目录下所有 .ts 文件（递归）
    "test/**/*.ts",         // test 目录下所有 .ts 文件
    "**/*.ts",              // 项目中所有 .ts 文件
    "src/**/*.tsx",         // React TSX 文件
    "src/**/*.{ts,tsx}"     // 多种扩展名
  ]
}
```

**项目结构示例**:

```text
project/
├── src/
│   ├── utils/
│   │   └── log.ts
│   └── main.ts
├── test/
│   ├── unit/
│   │   └── log.test.ts
│   └── integration/
│       └── main.test.ts
└── tsconfig.json
```

**配置示例 1**: 只编译生产代码

```json
{
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules"]
}
```

编译内容:

- ✅ `src/utils/log.ts`
- ✅ `src/main.ts`
- ❌ `test/unit/log.test.ts` (不编译)

**配置示例 2**: 编译源代码和测试

```json
{
  "compilerOptions": {
    "rootDir": ".",
    "outDir": "dist"
  },
  "include": [
    "src/**/*.ts",
    "test/**/*.ts"
  ],
  "exclude": ["node_modules", "dist"]
}
```

编译内容:

- ✅ `src/utils/log.ts`
- ✅ `src/main.ts`
- ✅ `test/unit/log.test.ts`
- ✅ `test/integration/main.test.ts`

**默认行为**:

如果不指定 `include`，TypeScript 会:

- 默认包含所有 `.ts`, `.tsx`, `.d.ts` 文件
- 排除 `node_modules`, `bower_components`, `jspm_packages`

**与 exclude 的关系**:

`exclude` 优先级高于 `include`:

```json
{
  "include": [
    "src/**/*.ts",
    "**/*.test.ts"
  ],
  "exclude": [
    "node_modules",
    "**/*.spec.ts"      // 排除所有 .spec.ts 文件
  ]
}
```

**最佳实践**:

1. **明确指定**: 即使有默认行为，也显式指定 `include`，避免意外包含文件
2. **合理分组**: 将源代码和测试代码分开，使用不同的模式
3. **与 rootDir 匹配**: 确保 `include` 的范围在 `rootDir` 之内
4. **使用排除**: 对于明确的排除项（如 node_modules、输出目录），使用 `exclude`

### exclude

**作用**: 指定要排除的文件或目录

**类型**: `string[]`

**示例**:

```json
{
  "exclude": [
    "node_modules",
    "dist",
    "build",
    "**/*.test.ts",
    "**/*.spec.ts"
  ]
}
```

**说明**:

- 默认排除 `node_modules`, `bower_components`, `jspm_packages`
- 排除规则优先于 include 规则

### rootDir 与 include 的区别与配合

`rootDir` 和 `include` 虽然都涉及文件路径，但它们的职责完全不同。理解两者的区别对于正确配置 TypeScript 项目至关重要。

#### 核心区别对比

| 特性 | `rootDir` | `include` |
|------|-----------|-----------|
| **职责** | 确定输入根目录，影响输出结构 | 确定哪些文件需要被编译 |
| **类型** | 路径（字符串） | glob 模式数组 |
| **影响范围** | 输出目录的结构 | 编译文件的范围 |
| **默认行为** | 自动推断（最长公共路径） | 包含所有 `.ts`, `.tsx`, `.d.ts` |
| **所属位置** | `compilerOptions` 内部 | 顶层字段 |
| **必需性** | 可选 | 可选 |

#### 详细示例对比

**项目结构**:

```text
project/
├── src/
│   ├── utils/
│   │   └── log.ts
│   └── main.ts
├── test/
│   └── log.test.ts
├── dist/              (输出目录)
└── tsconfig.json
```

#### 场景 1: 生产代码编译（典型 VSCode 扩展配置）

```json
// tsconfig.json
{
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", ".vscode-test"]
}
```

**效果**:

- ✅ 编译: `src/utils/log.ts`, `src/main.ts`
- ❌ 不编译: `test/log.test.ts`
- 📁 输出结构:

  ```text
  dist/
  ├── utils/
  │   └── log.js
  └── main.js
  ```

  (不包含 `dist/src/` 目录)

**适用场景**: 打包发布到 VSCode Marketplace，只需要源代码。

#### 场景 2: 测试代码编译

```json
// test/tsconfig.json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "rootDir": "../",
    "outDir": "dist-test",
    "paths": {
      "#/*": ["../src/*"]
    }
  },
  "include": [
    "../src/**/*.ts",
    "./**/*"
  ],
  "exclude": ["node_modules", "dist", "dist-test"]
}
```

**效果**:

- ✅ 编译: `src/utils/log.ts`, `src/main.ts`, `test/log.test.ts`
- 📁 输出结构:

  ```text
  dist-test/
  ├── src/
  │   ├── utils/
  │   │   └── log.js
  │   └── main.js
  └── test/
      └── log.test.js
  ```

  (保持完整的目录结构)

**适用场景**: 运行测试时，需要同时编译源代码和测试代码。

#### 场景 3: 错误配置示例

**❌ 错误 1**: rootDir 范围小于 include

```json
{
  "compilerOptions": {
    "rootDir": "src"     // 只覆盖 src 目录
  },
  "include": [
    "src/**/*.ts",
    "test/**/*.ts"       // 包含了 test 目录（在 rootDir 之外）
  ]
}
```

**问题**: TypeScript 会报错，因为 `test` 文件不在 `rootDir` 内。

**错误信息**:

```text
error TS6059: File 'project/test/log.test.ts' is not under 'rootDir' ...
```

**修复**:

```json
{
  "compilerOptions": {
    "rootDir": "."       // 扩大到项目根目录
  },
  "include": [
    "src/**/*.ts",
    "test/**/*.ts"
  ]
}
```

**❌ 错误 2**: 不指定 rootDir 导致输出结构不理想

```json
{
  "compilerOptions": {
    "outDir": "dist"
    // 未指定 rootDir，自动推断为所有文件的最长公共路径
  },
  "include": ["src/**/*.ts"]
}
```

**输出结果**:

```text
dist/
└── src/              ⚠️ 多了一层 src 目录
    ├── utils/
    │   └── log.js
    └── main.js
```

**修复**: 显式指定 `rootDir: "src"`

#### 图解说明

**配置对比图**:

```text
输入文件结构:
project/
├── src/
│   ├── utils/
│   │   └── log.ts
│   └── main.ts

配置 A: rootDir: "src", outDir: "dist"
输出:
dist/
├── utils/
│   └── log.js        ✅ 简洁结构
└── main.js

配置 B: rootDir: ".", outDir: "dist"
输出:
dist/
└── src/
    ├── utils/
    │   └── log.js    ⚠️ 多一层目录
    └── main.js
```

#### 最佳实践

1. **使用 TypeScript 7+ 推荐配置**

   ```json
   {
     "compilerOptions": {
       "module": "ESNext",
       "moduleResolution": "bundler",
       "target": "ES2020",
       "paths": {
         "#/*": ["./src/*"]
       }
     }
   }
   ```

   ✅ 不使用 `baseUrl`，直接使用相对于配置文件的路径

2. **保持一致性**

   ```json
   {
     "compilerOptions": {
       "rootDir": "src"
     },
     "include": ["src/**/*.ts"]
   }
   ```

   ✅ `rootDir` 和 `include` 指向相同范围

3. **测试配置使用项目根目录**

   ```json
   {
     "compilerOptions": {
       "rootDir": "../",
       "paths": {
         "#/*": ["../src/*"]
       }
     },
     "include": ["../src/**/*.ts", "./**/*"]
   }
   ```

   ✅ 确保所有文件都在 rootDir 范围内
   ✅ 路径别名使用相对于测试配置文件的路径

4. **显式指定 rootDir**
   - 即使可以自动推断，也显式指定 `rootDir`
   - 避免意外导致输出结构变化

5. **使用 extends 继承基础配置**

   ```json
   // tsconfig.json (生产)
   {
     "compilerOptions": {
       "rootDir": "src",
       "outDir": "dist",
       "paths": {
         "#/*": ["./src/*"]
       }
     },
     "include": ["src/**/*.ts"]
   }

   // test/tsconfig.json (测试)
   {
     "extends": "../tsconfig.json",
     "compilerOptions": {
       "rootDir": "../",
       "outDir": "dist-test",
       "paths": {
         "#/*": ["../src/*"]
       }
     },
     "include": ["../src/**/*.ts", "./**/*"]
   }
   ```

#### 实际应用：本项目配置示例

**生产配置** (`tsconfig.json`):

```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ES2020",
    "rootDir": "./src",        // 源代码根目录
    "outDir": "./dist",
    "paths": {
      "#/*": ["./src/*"]       // 路径别名（TS 7+ 风格）
    }
  },
  "include": ["src/**/*.ts"]    // 只编译生产代码
}
```

**测试配置** (`test/tsconfig.json`):

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "rootDir": "../",          // 项目根目录
    "outDir": "../dist-test",
    "types": ["jest", "node"],
    "paths": {
      "#/*": ["../src/*"]      // 相对于 test/tsconfig.json 的路径
    }
  },
  "include": [
    "../src/**/*.ts",         // 源代码
    "./**/*"                    // 测试代码
  ],
  "exclude": ["node_modules", "../dist", "../dist-test", "../coverage"]
}
```

## 测试配置详解

### 测试配置概述

测试配置是专门为运行测试而设计的 TypeScript 配置文件。它通常继承主配置文件，但会对某些选项进行调整，以满足测试环境的特殊需求。

**常见位置**: `test/tsconfig.json`

### 测试配置的特点

与生产配置相比，测试配置通常有以下特点：

| 特性 | 生产配置 | 测试配置 |
|------|----------|----------|
| **编译文件** | 只编译源代码 (`src/**/*.ts`) | 编译源代码 + 测试代码 |
| **rootDir** | `src` | 项目根目录 (`../` 或 `.`) |
| **outDir** | `dist` | `dist-test` 或 `./test/dist` |
| **types** | 生产环境类型 (`node`, `vscode`) | 测试环境类型 (`jest`, `node`) |
| **extends** | 可能继承基础配置 | 继承主配置 `../tsconfig.json` |
| **paths** | 相对于配置文件 (`./src/*`) | 相对于配置文件 (`../src/*`) |

### 完整测试配置示例

**项目结构**:

```text
project/
├── src/
│   ├── utils/
│   │   └── log.ts
│   └── extension.ts
├── test/
│   ├── unit/
│   │   └── utils/
│   │       └── log.test.ts
│   └── tsconfig.json          ← 测试配置文件
├── tsconfig.json             ← 主配置文件
└── package.json
```

**test/tsconfig.json**:

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "types": [
      "jest",
      "node"
    ],
    "rootDir": "../",
    "outDir": "dist-test",
    "paths": {
      "#/*": [
        "../src/*"
      ]
    }
  },
  "ts-node": {
    "esm": true,
    "experimentalSpecifierResolution": "node"
  },
  "include": [
    "../src/**/*",
    "./**/*"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "dist-test"
  ]
}
```

### 配置项详细说明

#### 1. extends

**作用**: 继承主配置文件，避免重复配置

```json
{
  "extends": "../tsconfig.json"
}
```

**说明**:

- 使用相对路径 `../` 因为测试配置在 `test/` 目录下
- 继承主配置的所有选项（`strict`, `esModuleInterop`, `module` 等）
- 只需要覆盖或添加测试特有的选项

**继承后的完整配置**:

```json
{
  // 从主配置继承:
  "compilerOptions": {
    "module": "ESNext",
    "target": "ES2020",
    "moduleResolution": "bundler",
    "lib": ["ES2020"],
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },

  // 测试配置覆盖/添加:
  "compilerOptions": {
    "types": ["jest", "node"],     // 覆盖主配置的 types
    "rootDir": "../",
    "outDir": "dist-test",
    "paths": {
      "#/*": ["../src/*"]
    }
  }
}
```

#### 2. types

**作用**: 指定测试环境需要的类型声明

```json
{
  "compilerOptions": {
    "types": [
      "jest",
      "node"
    ]
  }
}
```

**说明**:

- `jest`: Jest 测试框架的类型定义（`expect`, `describe`, `it` 等）
- `node`: Node.js 环境的类型定义（`process`, `Buffer` 等）
- 覆盖主配置中的 `types`，避免包含生产环境的类型（如 `vscode`）

**对比**:

```json
// 主配置 tsconfig.json
{
  "compilerOptions": {
    "types": ["node", "vscode"]  // VSCode 扩展需要的类型
  }
}

// 测试配置 test/tsconfig.json
{
  "compilerOptions": {
    "types": ["jest", "node"]    // 测试需要的类型
  }
}
```

#### 3. rootDir

**作用**: 扩大根目录以包含源代码和测试代码

```json
{
  "compilerOptions": {
    "rootDir": "../"
  }
}
```

**说明**:

- 测试配置位于 `test/` 目录，使用 `../` 指向项目根目录
- 确保源代码 (`../src/`) 和测试代码 (`./`) 都在 `rootDir` 范围内

**目录结构**:

```text
test/
├── unit/
│   └── utils/
│       └── log.test.ts    ← 在 rootDir 范围内
└── tsconfig.json          ← rootDir = ../, 指向项目根目录

项目根目录/
├── src/
│   └── utils/
│       └── log.ts        ← 在 rootDir 范围内
└── test/
    └── ...
```

#### 4. outDir

**作用**: 指定测试编译的输出目录

```json
{
  "compilerOptions": {
    "outDir": "dist-test"
  }
}
```

**说明**:

- 与生产配置的输出目录（`dist`）分离，避免混淆
- 常见命名: `dist-test`, `test-dist`, `./test/dist`

**输出结构**:

```text
test/
├── unit/
│   └── utils/
│       └── log.test.ts
├── tsconfig.json
└── dist-test/             ← 输出目录
    ├── src/
    │   ├── utils/
    │   │   └── log.js
    │   └── extension.js
    └── test/
        └── unit/
            └── utils/
                └── log.test.js
```

#### 5. paths

**作用**: 调整路径别名，使其相对于测试配置的位置

```json
{
  "compilerOptions": {
    "paths": {
      "#/*": ["../src/*"]
    }
  }
}
```

**说明**:

- 测试配置在 `test/` 目录下，路径需要相对于 `test/` 配置
- `../src/*` 指向项目根目录下的 `src/`
- 确保测试文件中的路径别名能正确解析

**TypeScript 7+ 风格对比**:

```json
// 主配置 tsconfig.json (在项目根目录)
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "paths": {
      "#/*": ["./src/*"]      // 相对于 tsconfig.json
    }
  }
}

// 测试配置 test/tsconfig.json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "paths": {
      "#/*": ["../src/*"]     // 相对于 test/tsconfig.json
    }
  }
}
```

**说明**:

- TypeScript 7+ 不需要 `baseUrl`
- `paths` 使用相对于配置文件的路径
- 测试配置使用 `"../src/*"` 指向项目根目录的 `src/`

**测试文件中使用路径别名**:

```typescript
// test/unit/utils/log.test.ts
import { logger } from '#/utils/log';  // 解析到 ../src/utils/log

describe('logger', () => {
  it('should log messages', () => {
    // ...
  });
});
```

#### 6. ts-node

**作用**: ts-node 特定配置，用于直接运行 TypeScript 文件

```json
{
  "ts-node": {
    "esm": true,
    "experimentalSpecifierResolution": "node"
  }
}
```

**说明**:

- `esm`: 启用 ES 模块支持
- `experimentalSpecifierResolution`: 模块解析策略（`node` 或 `explicit`）
- 用于 Jest 的 preset（如 `ts-jest`）或其他需要 ts-node 的工具

#### 7. include

**作用**: 包含源代码和测试代码

```json
{
  "include": [
    "../src/**/*",    // 源代码（相对于 test/ 目录）
    "./**/*"          // 测试代码（相对于 test/ 目录）
  ]
}
```

**说明**:

- `../src/**/*`: 包含所有源代码文件
- `./**/*`: 包含测试目录下的所有文件（包括测试代码、配置文件等）
- 确保测试运行时可以访问源代码

#### 8. exclude

**作用**: 排除不需要编译的目录

```json
{
  "exclude": [
    "node_modules",
    "dist",
    "dist-test"         // 排除测试输出目录本身
  ]
}
```

**说明**:

- `node_modules`: 第三方依赖
- `dist`: 生产代码的输出目录
- `dist-test`: 测试代码的输出目录（避免递归编译）

### 测试配置与主配置对比表

| 配置项 | 主配置 (`tsconfig.json`) | 测试配置 (`test/tsconfig.json`) | 说明 |
|--------|-------------------------|-------------------------------|------|
| **extends** | (无) | `"../tsconfig.json"` | 测试配置继承主配置 |
| **types** | `["node", "vscode"]` | `["jest", "node"]` | 测试需要 Jest 类型 |
| **rootDir** | `"src"` | `"../"` | 测试需要包含整个项目 |
| **outDir** | `"dist"` | `"dist-test"` | 分离输出目录 |
| **paths** | `"#/*": ["./src/*"]` | `"#/*": ["../src/*"]` | 路径别名相对位置调整 |
| **ts-node** | `{"esm": true, ...}` | `{"esm": true, ...}` | ts-node 配置 |
| **include** | `["src/**/*.ts"]` | `["../src/**/*", "./**/*"]` | 包含源代码和测试代码 |
| **exclude** | `["node_modules", ...]` | `["node_modules", "dist", "dist-test"]` | 排除额外目录 |

### 测试配置的最佳实践

#### 1. 使用 extends 继承主配置

**推荐**:

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    // 只覆盖测试特有的选项
  }
}
```

**好处**:

- 避免重复配置
- 主配置更新时，测试配置自动同步
- 保持配置一致性

#### 2. 分离输出目录

**推荐**:

```json
{
  "compilerOptions": {
    "outDir": "dist-test"
  }
}
```

**好处**:

- 避免混淆生产代码和测试代码
- 便于清理测试编译结果
- 不影响生产构建

#### 3. 正确配置路径别名（TypeScript 7+ 风格）

**推荐**:

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "paths": {
      "#/*": ["../src/*"]
    }
  }
}
```

**注意事项**:

- TypeScript 7+ 不需要 `baseUrl`
- 路径使用相对于测试配置文件的位置
- 主配置使用 `"./src/*"`，测试配置使用 `"../src/*"`
- 确保与主配置的路径别名映射一致
- 测试文件中的导入语句使用相同的别名

#### 4. 显式指定 types

**推荐**:

```json
{
  "compilerOptions": {
    "types": ["jest", "node"]
  }
}
```

**说明**:

- 覆盖主配置中的 `types`
- 只包含测试需要的类型
- 避免包含不相关的类型（如 `vscode`）

#### 5. 在 package.json 中配置测试脚本

**推荐**:

```json
{
  "scripts": {
    "compile": "tsc -p ./",
    "test": "tsc -p ./test/tsconfig.json && jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

**说明**:

- 使用 `-p` 参数指定配置文件
- 测试前先编译，确保类型检查通过
- 支持不同的测试模式

### 常见问题与解决方案

#### 问题 1: 找不到模块或类型定义

**错误信息**:

```text
Cannot find module '#/utils/log' or its corresponding type declarations.
```

**原因**: 路径别名配置错误

**解决方案**:

```json
{
  "compilerOptions": {
    "baseUrl": "../",
    "paths": {
      "#/*": ["../src/*"]
    }
  }
}
```

确保路径相对于 `test/tsconfig.json` 的位置。

#### 问题 2: Jest 无法识别 TypeScript 配置

**错误信息**:

```text
Jest encountered an unexpected token
```

**原因**: Jest 配置没有正确使用 tsconfig

**解决方案**:

**jest.config.js**:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^#/(.*)$': '<rootDir>/src/$1'
  }
};
```

确保 Jest 的 `moduleNameMapper` 与 TypeScript 的 `paths` 一致。

#### 问题 3: 编译输出包含不必要的文件

**问题**: `dist-test/` 目录包含了大量不需要的文件

**解决方案**:

```json
{
  "include": [
    "../src/**/*.ts",    // 只包含源代码
    "./**/*"            // 测试代码
  ],
  "exclude": [
    "node_modules",
    "dist",
    "dist-test",
    "**/*.d.ts"         // 排除声明文件
  ]
}
```

#### 问题 4: 测试和主配置冲突

**问题**: 测试配置的修改影响了主配置

**原因**: 错误地使用了继承

**解决方案**:

```json
{
  "extends": "../tsconfig.json",  // 继承
  "compilerOptions": {
    // 只覆盖需要的选项
    "types": ["jest", "node"],
    "rootDir": "../"
  }
}
```

不要在测试配置中重新定义所有选项。

### 实际应用：本项目的测试配置

**项目结构**:

```text
shell_formatter/
├── src/
│   ├── utils/
│   │   ├── log.ts
│   │   ├── plugin/
│   │   │   ├── PluginManager.ts
│   │   │   ├── MessageBus.ts
│   │   │   └── BasePlugin.ts
│   │   └── performance/
│   │       └── alertManager.ts
│   └── extension.ts
├── test/
│   ├── unit/
│   │   └── utils/
│   │       ├── log.test.ts
│   │       ├── plugin/
│   │       │   ├── PluginManager.test.ts
│   │       │   ├── MessageBus.test.ts
│   │       │   └── BasePlugin.test.ts
│   │       └── performance/
│   │           └── alertManager.test.ts
│   └── tsconfig.json
├── tsconfig.json
└── jest.config.js
```

**test/tsconfig.json**:

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "types": [
      "jest",
      "node"
    ],
    "rootDir": "../",
    "outDir": "dist-test",
    "paths": {
      "#/*": [
        "../src/*"
      ]
    }
  },
  "ts-node": {
    "esm": true,
    "experimentalSpecifierResolution": "node"
  },
  "include": [
    "../src/**/*",
    "./**/*"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "dist-test"
  ]
}
```

**测试文件中使用路径别名**:

```typescript
// test/unit/utils/log.test.ts
import {
  LogLevel,
  getLogLevelRank,
  logger,
  setLogger,
  shouldLogByLevel,
} from '#/utils/log';

describe('log utils', () => {
  it('should map log levels to numeric ranks', () => {
    expect(getLogLevelRank(LogLevel.DEBUG)).toBe(0);
  });
});
```

**运行测试**:

```bash
# 编译测试配置
tsc -p ./test/tsconfig.json

# 运行测试
npm test
```

## 高级配置

### extends

**作用**: 继承其他配置文件

**类型**: `string`

**示例**:

```json
{
  "extends": "./base.json"
}
```

**相对路径示例**:

```json
// tsconfig.base.json（基础配置）
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

**继承多个配置**:

```json
// tsconfig.json 只能直接 extends 一个文件
// 如果需要多个层次，可以使用链式继承
// tsconfig.prod.json -> tsconfig.json -> tsconfig.base.json
```

**本项目的测试配置示例**:

```json
// tsconfig.test.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "types": ["jest", "node"],
    "rootDir": ".",
    "outDir": "dist-test",
    "baseUrl": ".",
    "paths": {
      "#/*": ["./src/*"]
    }
  },
  "ts-node": {
    "esm": true,
    "experimentalSpecifierResolution": "node"
  },
  "include": [
    "src/**/*",
    "test/**/*"
  ],
  "exclude": ["node_modules", "dist", "dist-test"]
}
```

### references

**作用**: TypeScript 项目引用（多项目工作区）

**类型**: `array`

**示例**:

```json
{
  "references": [
    { "path": "./packages/core" },
    { "path": "./packages/utils" }
  ]
}
```

**说明**:

- 用于 monorepo 或大型项目
- 支持增量编译和项目间依赖检查
- 被引用的项目需要配置 `composite: true`

### ts-node

**作用**: ts-node 特定配置

**示例**:

```json
{
  "ts-node": {
    "esm": true,
    "experimentalSpecifierResolution": "node"
  }
}
```

**说明**:

- `esm`: 启用 ES 模块支持
- `experimentalSpecifierResolution`: 指定模块解析策略

## 通用最佳实践

### 1. 项目基础配置

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

### 2. 库项目配置

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### 3. 测试配置（TypeScript 7+ 风格）

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "types": ["jest", "node"],
    "rootDir": ".",
    "outDir": "dist-test",
    "paths": {
      "#/*": ["./src/*"]
    }
  },
  "include": ["src/**/*", "test/**/*"],
  "exclude": ["node_modules", "dist", "dist-test"]
}
```

### 4. VSCode 扩展配置

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
    "types": ["node"],
    "paths": {
      "#/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", ".vscode-test"]
}
```

### 5. 性能优化

```json
{
  "compilerOptions": {
    "incremental": true,
    "skipLibCheck": true,
    "composite": false
  }
}
```

- `incremental`: 增量编译，加快重新编译速度
- `skipLibCheck`: 跳过类型声明检查
- `composite`: 用于项目引用，如果不需要可以设为 false

## 常见问题

### Q1: 如何解决路径别名在测试中不工作？

**问题**:

```typescript
// 测试文件中使用路径别名
import { logger } from '#/utils/log';
// 报错: Cannot find module '#/utils/log'
```

**解决方案**:

1. 确保 `tsconfig.json` 中配置了 `paths`（TypeScript 7+ 风格）:

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "paths": {
      "#/*": ["./src/*"]
    }
  }
}
```

1. 确保 `package.json` 中配置了 `imports` 字段（Node.js ESM 子路径导入）:

```json
{
  "type": "module",
  "imports": {
    "#*": "./src/*"
  }
}
```

**重要说明**:

- `imports` 是 Node.js 的 **ESM 子路径导入** 特性，与 TypeScript 的 `paths` 是两套系统
- TypeScript 编译时只识别 `tsconfig.json` 中的 `paths`
- Node.js 运行时只识别 `package.json` 中的 `imports`
- 两者需要保持一致，但配置语法不同：
  - `tsconfig.json`: `"#/*": ["./src/*"]`（带斜杠）
  - `package.json`: `"#*": "./src/*"`（不带斜杠，这是 Node.js 的匹配规则）

1. 为测试编译使用 `tsconfig.test.json`（包含 `baseUrl` 和 `paths`），并在 VS Code 中为 test 目录添加专用配置文件：

```json
// test/tsconfig.json
{
  "extends": "../tsconfig.test.json",
  "include": ["**/*.ts"]
}
```

1. 如果使用 Jest，需要在 `jest.config.js` 中配置 `moduleNameMapper`:

```javascript
module.exports = {
  moduleNameMapper: {
    '^#/(.*)$': '<rootDir>/src/$1'
  }
};
```

1. 如果使用 ts-node，需要安装 `tsconfig-paths`:

```javascript
require('tsconfig-paths').register();
```

### Q2: 如何为不同环境配置不同的 tsconfig？

**方案 1**: 使用基础配置继承

```json
// tsconfig.base.json
{
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true
  }
}

// tsconfig.json (开发环境)
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "sourceMap": true
  }
}

// tsconfig.prod.json (生产环境)
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "sourceMap": false,
    "removeComments": true
  }
}
```

**方案 2**: 使用 npm scripts

```json
{
  "scripts": {
    "build": "tsc",
    "build:prod": "tsc -p tsconfig.prod.json",
    "test": "tsc -p tsconfig.test.json && jest"
  }
}
```

### Q3: target 和 lib 的区别？

**target**: 指定编译输出的 JavaScript 版本，影响：

- 语言特性的降级（如 async/await、class 等）
- 内置对象的 polyfill

**lib**: 指定可用的类型定义，影响：

- 哪些全局对象和方法可以被使用
- 类型检查的严格程度

```json
{
  "compilerOptions": {
    "target": "ES5",        // 输出 ES5 代码
    "lib": ["ES2020"]       // 可以使用 ES2020 的类型（但运行时可能不支持）
  }
}
```

**建议**:

- `target` 和 `lib` 保持一致
- 如果使用打包工具处理 polyfill，target 可以设低，lib 设高

### Q4: 何时应该使用 `moduleResolution: "bundler"`？

**使用场景**:

- 使用 Vite、Webpack、Rollup 等现代打包工具
- 项目不直接在 Node.js 环境运行（如浏览器、VSCode 扩展）
- 需要支持 bare imports（如 `import lodash from 'lodash'`）

**不使用场景**:

- 直接在 Node.js 环境运行（使用 `node16` 或 `nodenext`）
- 使用较旧的构建工具

### Q5: 如何处理第三方库缺少类型定义？

**方案 1**: 安装类型定义

```bash
npm install @types/library-name --save-dev
```

**方案 2**: 创建本地类型声明

```typescript
// src/@types/library-name.d.ts
declare module 'library-name' {
  export function someMethod(): void;
}
```

**方案 3**: 允许隐式 any（不推荐）

```json
{
  "compilerOptions": {
    "noImplicitAny": false
  }
}
```

### Q6: 为什么需要 `forceConsistentCasingInFileNames`？

**问题**:

```typescript
// 文件: src/utils/Logger.ts (大写 L)
import { Logger } from './utils/logger'; // 小写 l
```

在 Windows/macOS 上，文件系统不区分大小写，这行代码可以运行。
但在 Linux 上，文件系统区分大小写，会导致运行时错误。

**解决方案**:

```json
{
  "compilerOptions": {
    "forceConsistentCasingInFileNames": true
  }
}
```

这会在编译时捕获大小写不一致的问题，避免跨平台兼容性问题。

### Q7: 如何优化编译速度？

1. **启用增量编译**:

```json
{
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": ".tsbuildinfo"
  }
}
```

1. **跳过类型检查**:

```json
{
  "compilerOptions": {
    "skipLibCheck": true
  }
}
```

1. **使用项目引用**:

```json
{
  "references": [
    { "path": "./packages/core" }
  ]
}
```

1. **限制 include 范围**:

```json
{
  "include": ["src/**/*.ts"],
  "exclude": ["**/*.test.ts", "**/*.spec.ts"]
}
```

1. **使用 watch 模式**:

```bash
tsc --watch
```

## 附录

### 完整的 tsconfig.json 示例

```json
{
  "compilerOptions": {
    // 模块相关
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "resolveJsonModule": true,

    // 类型检查
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,

    // 输出相关
    "outDir": "./dist",
    "rootDir": "./src",
    "sourceMap": true,
    "declaration": true,
    "declarationMap": true,
    "removeComments": false,

    // 路径解析
    "baseUrl": "./",
    "paths": {
      "#/*": ["./src/*"],
      "@utils/*": ["./src/utils/*"],
      "@components/*": ["./src/components/*"]
    },

    // 其他
    "lib": ["ES2020"],
    "types": ["node"],
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "incremental": true
  },
  "include": [
    "src/**/*.ts"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "**/*.test.ts",
    "**/*.spec.ts"
  ],
  "ts-node": {
    "esm": true,
    "experimentalSpecifierResolution": "node"
  }
}
```

### 参考资料

- [TypeScript 官方文档 - tsconfig.json](https://www.typescriptlang.org/tsconfig)
- [TypeScript 编译选项手册](https://www.typescriptlang.org/docs/handbook/compiler-options.html)
- [TypeScript 配置最佳实践](https://github.com/microsoft/TypeScript/wiki/Coding-guidelines)

---

**更新日期**: 2025-01-30
**TypeScript 版本**: 5.x
