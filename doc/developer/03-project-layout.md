# 项目结构与目录布局

本文档介绍 Shell Formatter 项目的目录结构与关键目录职责，帮助开发者快速理解项目组织方式。

## 目录

- [项目概览](#项目概览)
- [目录结构详解](#目录结构详解)
- [关键目录说明](#关键目录说明)
- [相关文档](#相关文档)

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
├── doc/                        # 文档目录
│   ├── developer/             # 开发者文档
│   ├── tools/                 # 工具文档
│   │   ├── tsconfig.md        # TypeScript 配置
│   │   ├── npm.md             # npm 使用
│   │   ├── npm_test.md        # npm test 说明
│   │   ├── shellcheck.md      # shellcheck 工具
│   │   ├── shfmt.md           # shfmt 工具
│   │   └── spawn.md           # spawn API
│   ├── vscode/                # VSCode 扩展开发参考
│   │   ├── extension-api.md
│   │   ├── language-configuration.md
│   │   └── package-json.md
│   └── INDEX.md               # 文档索引
│
├── resources/                  # 资源文件
│   ├── icon.png               # 扩展图标
│   ├── language-configuration.json  # 语言配置
│   └── USER_README.md         # 用户文档（插件市场展示）
│
├── scripts/                    # 脚本目录
│   ├── safe-package.sh        # 安全打包脚本（处理 README 切换）
│   ├── manage-readme.sh       # README 备份/替换/恢复脚本
│   └── test-readme-backup.sh  # README 备份测试脚本
│
├── src/                        # 源代码目录
│   ├── adapters/              # 适配器
│   ├── commands/              # 命令实现
│   ├── config/                # 配置管理
│   ├── di/                    # 依赖注入容器
│   ├── diagnostics/           # 诊断模块
│   ├── formatters/            # 格式化模块
│   ├── metrics/               # 指标与常量
│   ├── plugins/               # 插件目录
│   ├── providers/             # VSCode Providers
│   ├── tools/                 # 工具层（executor/shell 等）
│   ├── utils/                 # 工具函数
│   └── extension.ts           # 扩展入口
│
├── test/                       # 测试目录
│   ├── fixtures/              # 测试夹具
│   ├── unit/                  # 单元测试
│   └── tsconfig.json          # 测试专用 TS 配置
│
├── coverage/                   # 覆盖率报告（自动生成）
├── dist/                       # 编译输出（自动生成）
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
├── README_EN.md               # 英文说明
└── ARCHITECTURE_REVIEW.md     # 架构评审
```

---

## 关键目录说明

### `src/` - 源代码

| 子目录 | 说明 | 关键文件 |
|--------|------|----------|
| `adapters/` | 工具适配层 | `formatterAdapter.ts`, `diagnosticAdapter.ts` |
| `commands/` | VSCode 命令实现 | `fixCommand.ts`, `performanceCommand.ts` |
| `config/` | 配置管理 | `settingInfo.ts`, `packageInfo.ts` |
| `di/` | 依赖注入容器 | `container.ts`, `initializer.ts` |
| `diagnostics/` | 诊断模块 | `index.ts` |
| `formatters/` | 格式化模块 | `index.ts` |
| `metrics/` | 指标常量 | `performance.ts` |
| `plugins/` | 格式化/诊断插件 | `shfmtPlugin.ts`, `shellcheckPlugin.ts` |
| `providers/` | VSCode Providers | `index.ts` |
| `tools/` | 外部工具执行 | `executor/`, `shell/` |
| `utils/` | 通用工具函数 | `log.ts`, `debounce.ts`, `performance/`, `plugin/` |

### `test/` - 测试代码

| 子目录 | 说明 |
|--------|------|
| `unit/` | 单元测试 |
| `tsconfig.json` | 测试专用 TypeScript 配置 |

### `doc/` - 文档

| 子目录 | 说明 |
|--------|------|
| `developer/` | 开发者文档 |
| `tools/` | 工具使用文档 |
| `vscode/` | VSCode 扩展参考文档 |
| `INDEX.md` | 文档索引和导航 |

### `resources/` - 资源文件

| 文件 | 说明 |
|------|------|
| `icon.png` | 扩展图标（插件市场展示） |
| `language-configuration.json` | Shell 语言配置 |
| `USER_README.md` | 用户文档（发布时会复制到根目录） |

### `scripts/` - 脚本目录

| 脚本 | 用途 |
|------|------|
| `safe-package.sh` | 安全打包脚本，自动处理 README 切换 |
| `manage-readme.sh` | README 备份/替换/恢复管理 |
| `test-readme-backup.sh` | 测试 README 备份功能 |

---

## 相关文档

- [核心配置与工程规范](04-configuration-reference.md) - 配置文件与脚本说明
- [开发工作流与实战](02-development-workflow.md) - 构建、测试与常见任务
- [测试体系与实践](08-testing.md) - 测试体系详解
- [TypeScript 配置详解](../tools/tsconfig.md) - tsconfig 完整说明
