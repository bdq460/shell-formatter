# Shell Format

> 基于 shfmt 和 shellcheck 的智能 Shell 脚本格式化和检查工具

**English Version**: [README_EN.md](README_EN.md)

## 开发者快速开始

### 项目概述

Shell Format 是一个 VSCode 扩展，提供 Shell 脚本的格式化和诊断功能。采用插件化架构，支持动态插件加载、依赖注入和性能优化。

### 核心功能

- **格式化** - 使用 shfmt 自动格式化 Shell 脚本
- **诊断** - 使用 shellcheck 和 shfmt 检测语法和语义错误
- **自动诊断** - 打开、保存或编辑时自动检查（300ms 防抖）
- **插件系统** - 支持动态插件激活/停用，配置驱动
- **性能监控** - 内置性能指标收集和报告

### 开发文档

详细的技术文档请查看 [doc/developer/](doc/developer/)：

- **[快速开始指南](doc/developer/getting-started.md)** - 开发环境搭建、编译、调试
- **[架构设计文档](doc/developer/architecture.md)** - 插件架构、依赖注入、扩展性指南
- **[架构评审报告](ARCHITECTURE_REVIEW.md)** - 架构质量评估和改进建议

### 项目结构

```text
├── src/
│   ├── extension.ts          # 扩展入口
│   ├── plugins/             # 插件系统
│   │   ├── pluginManager.ts     # 插件管理器
│   │   ├── pluginInterface.ts    # 插件接口
│   │   ├── pluginInitializer.ts # 插件初始化
│   │   └── *.ts                 # 具体插件实现
│   ├── di/                  # 依赖注入
│   │   ├── container.ts          # DI 容器
│   │   └── initializer.ts       # DI 初始化
│   ├── diagnostics/          # 诊断模块
│   ├── formatters/           # 格式化模块
│   ├── providers/            # 提供者模块
│   ├── commands/             # 命令模块
│   ├── config/               # 配置管理
│   ├── tools/               # 工具层
│   └── utils/               # 工具函数
└── doc/
    ├── developer/            # 开发者文档
    └── user/                 # 用户文档
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

# 打包插件（注意：不要使用 vsce package，会导致未使用正确的 README.md）
npm run package:extension

# 安装插件（方法 1）
npm run install:extension

# 安装插件（方法 2）
# 右键点击根目录下的 shell-format-1.0.0.vsix 文件，点击"安装扩展 VSIX"
```

详细说明请参考 [快速开始指南](doc/developer/getting-started.md)。

### 用户文档

面向最终用户的使用文档请查看 [doc/user/README.md](doc/user/README.md)：

- **配置选项** - 完整的配置说明（中英文）
- **使用方法** - 格式化、快速修复等操作指南
- **常见问题** - 故障排除和 FAQ

---

## 系统要求

- **Node.js** >= 16.x
- **npm** >= 8.x
- **TypeScript** >= 5.0
- **VSCode** >= 1.74.0

## 链接

- [GitHub](https://github.com/bdq460/shell-format)
- [Issues](https://github.com/bdq460/shell-format/issues)
- [License](LICENSE)

## 致谢

感谢以下开源工具：

- [shfmt](https://github.com/mvdan/sh) - Shell 脚本格式化工具
- [shellcheck](https://github.com/koalaman/shellcheck) - Shell 脚本静态分析工具
