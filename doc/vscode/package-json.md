# package.json 配置说明

`package.json` 是 VSCode 扩展的核心配置文件，包含以下重要字段：

## 基本信息

```json
{
  "name": "shell-formatter", // 扩展唯一标识符
  "displayName": "Shell format with shell-shfmt", // 显示名称
  "description": "Format shell scripts with shellcheck and shfmt, show errors in 'Problems' plate", // 扩展描述
  "version": "1.0.0", // 版本号（遵循 semver）
  "publisher": "bdq460", // 发布者名称（需在 VSCode Marketplace 注册）
  "icon": "icon.png", // 扩展图标路径
  "engines": {
    "vscode": "^1.74.0" // 最低 VSCode 版本要求
  },
  "categories": ["Formatters", "Linters"], // 扩展分类
  "repository": {
    // 代码仓库信息
    "type": "git",
    "url": "https://github.com/bdq460/shell-formatter.git"
  }
}
```

## 激活事件 (activationEvents)

定义扩展何时被激活：

```json
"activationEvents": [
  "onLanguage:shellscript",                  // 打开 shell 脚本时激活
  "onCommand:shell-formatter.fixAllProblems"     // 执行修复所有问题命令时激活
]
```

**说明**：

- 移除了 `onCommand:shell-formatter.formatDocument`，因为注册了 `DocumentRangeFormattingEditProvider` 后，VSCode 的默认格式化命令已经足够，无需额外注册命令。

## 主入口 (main)

```json
"main": "./dist/extension.js"                // 扩展入口文件路径（编译后）
```

## 贡献点 (contributes)

定义扩展向 VSCode 贡献的功能：

### 1. 语言定义

```json
"languages": [
  {
    "id": "shellscript",                     // 语言 ID
    "aliases": ["Shell", "Shell Script"],    // 语言别名
    "extensions": [".sh", ".bash", ".zsh"],  // 文件扩展名
    "configuration": "./language-configuration.json"  // 语言配置文件
  }
]
```

**language-configuration.json** 定义语言的编辑器行为：

- 注释符号
- 括号配对
- 自动闭合
- 代码包裹

详细说明请参考 `language-configuration-explained.md`

### 2. 配置选项

```json
"configuration": {
  "type": "object",
  "title": "Shell Format",
  "properties": {
    "shell-fShell FormatterheckPath": {
      "type": "string",
      "default": "shellcheck",
      "description": "Path to shellcheck executable"
    },
    "shell-formatter.shfmtPath": {
      "type": "string",
      "default": "shfmt",
      "description": "Path to shfmt executable"
    },
    "shell-formatter.tabSize": {
      "type": ["number", "string"],
      "enum": ["vscode", "ignore"],
      "default": "vscode",
      "description": "Indentation size: number for spaces or 'tab' for tabs (used with shfmt -i/-tabs), value can be one of [vscode, ignore] or number. vscode: use vscode tab size, ignore: ignore tab check and format. default is vscode"
    },
    "shell-formatter.logOutput": {
        "type": "string",
        "enum": ["off", "on"],
        "default": "off",
        "description": "Output log information to console and output window! value can be one of [off, on]. default is off"
    },
    "shell-formatter.onError": {
        "type": "string",
        "enum": ["showProblem", "ignore"],
        "default": "showProblem",
        "description": "How to handle shfmt errors"
    }
  }
}
```

**配置说明**：

| 配置项           | 类型             | 默认值        | 说明                                                                       |
| ---------------- | ---------------- | ------------- | -------------------------------------------------------------------------- |
| `shellcheckPath` | string           | `shellcheck`  | shellcheck 可执行文件路径                                                  |
| `shfmtPath`      | string           | `shfmt`       | shfmt 可执行文件路径                                                       |
| `tabSize`        | number 或 string | `vscode`      | 缩进大小：数字表示空格数，`vscode` 使用 VSCode 配置，`ignore` 忽略缩进检查 |
| `logOutput`      | string           | `off`         | 日志输出：`on` 输出到控制台和输出窗口，`off` 关闭                          |
| `onError`        | string           | `showProblem` | 错误处理：`showProblem` 在问题面板显示，`ignore` 忽略错误                  |

### 3. 命令 (commands)

定义命令，所定义的命令由命令面板、快捷键触发，全局，不依赖代码问题，需主动执行。

```json
"commands": [
  {
    "command": "shell-formatter.formatDocument",
    "title": "Format document with shell-formatter"
  },
  {
    "command": "shell-formatter.fixAllProblems",
    "title": "Fix all problems with shell-formatter"
  }
]
```

**注意**：

1. 这里只是声明命令，需要通过 `vscode.commands.registerCommand()` 注册命令及命令实现，才能使命令可用
2. `shell-formatter.formatDocument` 命令虽然声明了，但因为注册了 `DocumentRangeFormattingEditProvider`，VSCode 的默认格式化命令已经足够，可以不额外注册此命令的实现
3. `shell-formatter.fixAllProblems` 命令必须注册实现，用于修复所有问题

```JavaScript
// 注册命令
const fixAllCommand = vscode.commands.registerCommand(
    'shell-formatter.fixAllProblems',
    async (uri: vscode.Uri) => {
        // 修复所有问题的逻辑
        const document = await vscode.workspace.openTextDocument(uri);
        await formatDocument(document);
    }
);
```

**使用方式**：

- 命令面板输入 "Format document with shell-formatter" 或 "Fix all problems with shell-formatter"
- 可以绑定快捷键
- 可以在代码中通过 `vscode.commands.executeCommand()` 调用

### 4. 代码操作 (codeActions)

定义代码操作，所定义的代码操作通过点击灯泡图标执行，仅在有代码问题时显示，主要针对问题修复。

```json
"codeActions": [
  {
    "kind": "quickfix.shell-formatter",
    "title": "Fix this issue with shell-formatter",
    "languages": ["shellscript"]
  },
  {
    "kind": "source.fixAll.shell-formatter",
    "title": "Fix all problems with shell-formatter",
    "languages": ["shellscript"]
  }
]
```

**属性说明**：

| 属性        | 说明                                                            |
| ----------- | --------------------------------------------------------------- |
| `kind`      | 操作类型：`quickfix` 修复单个问题，`source.fixAll` 修复所有问题 |
| `title`     | 显示给用户的操作名称                                            |
| `languages` | 在哪些语言文件中显示此操作                                      |

**注意**：这里只是声明 action，需要通过 `vscode.languages.registerCodeActionsProvider()` 注册代码操作提供者，才能使代码操作可用。

**QuickFix vs SourceFixAll**：

| 特性                 | QuickFix                   | SourceFixAll                             |
| -------------------- | -------------------------- | ---------------------------------------- |
| 用途                 | 修复特定的、局部的问题     | 修复整个文档的所有问题                   |
| 触发方式             | 灯泡图标、右键菜单         | 保存时（`editor.codeActionsOnSave`）     |
| 是否需要自定义子类型 | ❌ 否                      | ✅ 是（如 `.append('shell-formatter')`） |
| 配置支持             | 不支持 `codeActionsOnSave` | 支持 `codeActionsOnSave`                 |

**完整流程**：

1. 用户打开一个 Shell 脚本文件
2. 发现问题 → 代码左侧显示黄色灯泡
3. 点击灯泡 → 显示 "Fix this issue with shell-formatter" (quickfix) 和 "Fix all problems with shell-formatter" (source.fixAll)
4. 选择修复 → 执行 `shell-formatter.fixAllProblems` 命令

#### 完整的用户体验流程

- 用户打开一个 Shell 脚本文件
- 发现问题 → 代码左侧显示黄色灯泡
- 点击灯泡 → 显示 "Fix all with shfmt" (codeAction)
- 选择修复 → 执行 shell-formatter.fixAllProblems (command)

## 脚本 (scripts)

脚本通过 npm 运行，包含以下脚本：

```json
"scripts": {
  "package:extension": "npx @vscode/vsce package && npm run clean",
  "install:extension": "npm run package:extension && code --install-extension $(ls shell-formatter-*.vsix) --extensions-dir ~/.vscode/extensions",
  "vscode:prepublish": "npm run compile && npm run copy-readme",
  "clean": "rm -rf dist/*",
  "compile": "tsc -p ./",
  "watch": "tsc -watch -p ./",
  "pretest": "npm run compile",
  "lint": "eslint src --ext ts",
  "test": "node test/run.js",
  "copy-readme": "cp doc/user/README_EN.md README.md"
}
```

**脚本说明**：

| 脚本                | 说明                                 |
| ------------------- | ------------------------------------ |
| `package:extension` | 打包扩展为 VSIX 文件                 |
| `install:extension` | 打包并安装扩展到本地 VSCode          |
| `vscode:prepublish` | 发布前自动执行（编译 + 复制 README） |
| `clean`             | 清理编译输出目录                     |
| `compile`           | 编译 TypeScript                      |
| `watch`             | 监听模式编译                         |
| `pretest`           | 测试前执行                           |
| `lint`              | 代码检查                             |
| `test`              | 运行测试                             |
| `copy-readme`       | 复制英文 README 到根目录（用于发布） |

**注意**：`scripts` 字段不会包含在打包文件中，仅在开发和构建阶段使用。

### 触发场景

#### 1. vscode:prepublish - 自动触发（VSCode 命令）

这是唯一一个可能自动触发的脚本：

- 使用 `vsce publish` 命令发布扩展时，VSCode CLI 会自动执行
- 使用 `vsce package` 命令打包扩展时，VSCode CLI 会自动执行

#### 2. 其他脚本 - 全部手动触发

| 脚本      | 触发方式               | 使用场景                         |
| --------- | ---------------------- | -------------------------------- |
| `compile` | `npm run compile`      | 编译 TypeScript 代码             |
| `watch`   | `npm run watch`        | 监听模式，代码变更时自动重新编译 |
| `pretest` | `npm test`（自动触发） | 测试前编译和检查                 |
| `lint`    | `npm run lint`         | 运行 ESLint 代码检查             |
| `test`    | `npm test`             | 运行测试                         |

#### 3. npm 脚本钩子

npm 脚本支持 pre/post 钩子机制：

| 钩子             | 触发时机              | vsce 是否触发 |
| ---------------- | --------------------- | ------------- |
| `preinstall`     | `npm install` 前      | ❌ 否         |
| `postinstall`    | `npm install` 后      | ❌ 否         |
| `prepublishOnly` | `npm publish` 前      | ❌ 否         |
| `prepack`        | `npm pack` 前         | ❌ 否         |
| `postpack`       | `npm pack` 后         | ❌ 否         |
| `prepare`        | `npm pack/publish` 前 | ❌ 否         |
| `pretest`        | `npm test` 前         | ❌ 否         |
| `posttest`       | `npm test` 后         | ❌ 否         |

**注意**：以上 npm 钩子 vsce 不会触发，仅在直接使用 npm 命令时有效。

**常用示例**：

```bash
npm test        # 会自动执行 pretest 脚本
npm publish     # 会自动执行 prepublishOnly、prepack、prepare 脚本
npm pack       # 会自动执行 prepack、prepare 脚本
```

## 依赖 (devDependencies)

```json
"devDependencies": {
  "@types/node": "^18.0.0",                  // Node.js 类型定义
  "@types/vscode": "^1.74.0",                // VSCode API 类型定义
  "@typescript-eslint/eslint-plugin": "^6.0.0",
  "@typescript-eslint/parser": "^6.0.0",
  "eslint": "^8.0.0",                        // 代码检查工具
  "typescript": "^5.0.0"                    // TypeScript 编译器
}
```

**注意**：`devDependencies` 中的依赖不会打包到 VSIX 文件中，仅用于开发和构建。

## 打包说明

### 打包包含的文件

使用 `vsce package` 打包后，VSIX 文件包含以下文件：

```shell
shell-formatter-1.0.0.vsix (11 files, 137.23 KB)
├── LICENSE.txt
├── example.sh
├── icon-256.png
├── icon-512.png
├── icon.png
├── language-configuration.json
├── package.json
├── readme.md
└── dist/
    └── extension.js
```

### 打包排除的文件

以下文件通过 `.vscodeignore` 排除，不会打包到 VSIX 中：

- **开发文件**：`.eslintrc.js`、`src/**`、`tsconfig.json`、`**/*.ts`
- **配置文件**：`.vscode/**`、`.gitignore`、`.yarnrc`
- **依赖目录**：`node_modules/**`、`package-lock.json`
- **文档文件**：`PUBLISH.md`、`doc/**`、`package-optimization.md`
- **其他文件**：`generate_icon.sh`、`out/**`、`*.vsix`

详细的打包优化说明请参考 `package-optimization.md` [打包: ❌]
