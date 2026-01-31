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
│   ├── application/           # 应用层 - 用例编排
│   │   ├── di/                # 依赖注入初始化
│   │   ├── services/          # 应用服务
│   │   └── usecases/          # 用例实现
│   ├── config/                # 配置管理
│   ├── domain/                # 领域层 - 核心业务逻辑
│   │   ├── port/              # 端口接口
│   │   ├── plugins/           # 插件实现
│   │   └── types.ts           # 领域类型
│   ├── entrypoints/           # 入口层 - VSCode API 接入
│   │   ├── commands/          # 命令实现
│   │   ├── listeners/         # 事件监听器
│   │   └── providers/         # 功能提供者
│   ├── infrastructure/        # 基础设施层 - 外部适配
│   │   ├── adapters/          # 工具适配器
│   │   └── shell-tools/       # Shell 工具封装
│   ├── shared/                # 共享层 - 跨层工具
│   │   ├── converters/        # 类型转换器
│   │   └── logger.ts          # 日志适配器
│   ├── utils/                 # 工具层 - 基础设施
│   │   ├── di/                # DI 容器实现
│   │   ├── executor/          # 命令执行器
│   │   ├── performance/       # 性能监控
│   │   └── plugin/            # 插件系统
│   ├── i18n/                  # 国际化支持
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
| `application/` | 应用层 - 用例编排 | `usecases/`, `services/`, `di/` |
| `config/` | 配置管理 | `package-info.ts`, `setting-info.ts` |
| `domain/` | 领域层 - 核心业务 | `port/`, `plugins/`, `types.ts`, `plugin-manager.ts` |
| `entrypoints/` | 入口层 - VSCode 接入 | `commands/`, `listeners/`, `providers/` |
| `infrastructure/` | 基础设施层 - 外部适配 | `adapters/`, `shell-tools/` |
| `shared/` | 共享层 - 跨层工具 | `logger.ts`, `converters/`, `performance-metrics.ts` |
| `utils/` | 工具层 - 基础设施 | `executor/`, `di/`, `plugin/`, `performance/` |
| `i18n/` | 国际化支持 | `index.ts`, `locales/` |

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
