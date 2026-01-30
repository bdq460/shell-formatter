# Shell Formatter

[![Version](https://img.shields.io/visual-studio-marketplace/v/bdq460.shell-formatter?label=VS%20Code%20Marketplace)](https://marketplace.visualstudio.com/items?itemName=bdq460.shell-formatter)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![VS Code](https://img.shields.io/badge/VS%20Code-1.74.0%2B-blue.svg)](https://code.visualstudio.com/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)

> 基于 shfmt 和 shellcheck 的智能 Shell 脚本格式化和检查工具

**English Version**: [README_EN.md](README_EN.md)

## 📚 文档导航

- **[文档索引](doc/INDEX.md)** - 完整的文档导航和快速链接
- **[用户使用文档](resources/USER_README.md)** - 插件功能、配置和使用说明
- **[开发者文档](#开发者快速开始)** - 项目概述、架构设计和开发指南

## 开发者快速开始

### 项目概述

Shell Formatter 是一个 VSCode 扩展，提供 Shell 脚本的格式化和诊断功能。采用插件化架构，支持动态插件加载、依赖注入和性能优化。

### 核心功能

- **格式化** - 使用 shfmt 自动格式化 Shell 脚本
- **诊断** - 使用 shellcheck 和 shfmt 检测语法和语义错误
- **自动诊断** - 打开、保存或编辑时自动检查（300ms 防抖）
- **插件系统** - 支持动态插件激活/停用，配置驱动
- **性能监控** - 内置性能指标收集和报告

### 开发文档

详细的技术文档请查看 [doc/developer/](doc/developer/)：

- **[开发者手册](doc/developer/00-handbook.md)** - 开发者文档总览
- **[环境搭建](doc/developer/01-setup.md)** - 开发环境搭建
- **[开发工作流](doc/developer/02-development-workflow.md)** - 开发流程指南
- **[项目布局](doc/developer/03-project-layout.md)** - 项目结构说明
- **[配置参考](doc/developer/04-configuration-reference.md)** - 配置选项详解
- **[架构设计](doc/developer/05-architecture.md)** - 插件架构、依赖注入
- **[插件系统](doc/developer/06-plugin-system.md)** - 插件开发指南
- **[可观测性](doc/developer/07-observability.md)** - 性能监控和日志
- **[测试](doc/developer/08-testing.md)** - 单元测试和集成测试

### 项目结构

```text
├── src/
│   ├── extension.ts          # 扩展入口
│   ├── adapters/             # 适配器层
│   ├── commands/             # 命令模块
│   ├── config/               # 配置管理
│   ├── di/                  # 依赖注入
│   ├── diagnostics/          # 诊断模块
│   ├── formatters/           # 格式化模块
│   ├── metrics/             # 性能指标
│   ├── plugins/             # 插件系统
│   ├── providers/            # 提供者模块
│   ├── tools/               # 工具层
│   │   ├── executor/             # 执行器
│   │   └── shell/                # Shell 工具
│   └── utils/               # 工具函数
│       ├── performance/         # 性能监控工具
│       └── plugin/              # 插件工具
├── doc/
│   ├── developer/            # 开发者文档
│   ├── tools/                # 工具文档
│   ├── versions/             # 版本文档
│   └── vscode/               # VSCode 文档
├── test/                    # 测试文件
├── scripts/                 # 构建脚本
├── resources/               # 资源文件
├── dist/                    # 编译输出
├── coverage/                # 测试覆盖率
├── .eslintrc.js            # ESLint 配置
├── jest.config.js          # Jest 配置
├── tsconfig.json           # TypeScript 配置
├── package.json            # 项目配置
├── .vscodeignore           # VSCode 忽略配置
├── .gitignore              # Git 忽略配置
└── .markdownlintrc.json    # Markdown Lint 配置
```

### 技术架构

- **插件架构** - IFormatPlugin 接口，支持动态加载和配置
- **依赖注入** - 自定义轻量级 DI 容器，支持循环依赖检测
- **单例管理** - PluginManager、PerformanceMonitor 等全局单例
- **配置缓存** - 基于 SettingInfo 实现配置快照和自动失效
- **性能优化** - 并行插件激活（40% 性能提升）、防抖机制
- **适配器模式** - 工具结果转换为 VSCode 诊断

### 快速上手

```bash
# 安装依赖
npm install

# 监听模式编译（开发时使用）
npm run watch

# 打包插件（注意：不要使用 vsce package，会导致未使用正确的 README.md）
npm run package:extension

# 安装插件（方法 1 - 推荐）
npm run install:extension

# 安装插件（方法 2）
# 右键点击根目录下的 shell-formatter-1.0.1.vsix 文件，点击"安装扩展 VSIX"
```

详细说明请参考 [文档索引](doc/INDEX.md) 或 [环境搭建指南](doc/developer/01-setup.md)。

### 用户文档

面向最终用户的使用文档请查看 [resources/USER_README.md](resources/USER_README.md)：

- **配置选项** - 完整的配置说明（中英文）
- **使用方法** - 格式化、快速修复等操作指南
- **常见问题** - 故障排除和 FAQ

---

## 系统要求

- **Node.js** >= 20.x
- **npm** >= 9.x
- **TypeScript** >= 5.0
- **VSCode** >= 1.74.0

## 链接

- [GitHub](https://github.com/bdq460/shell-formatter)
- [Issues](https://github.com/bdq460/shell-formatter/issues)
- [License](LICENSE)

## 致谢

感谢以下开源工具：

- [shfmt](https://github.com/mvdan/sh) - Shell 脚本格式化工具
- [shellcheck](https://github.com/koalaman/shellcheck) - Shell 脚本静态分析工具
