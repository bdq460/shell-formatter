# 开发者手册总览

本手册面向 Shell Formatter 扩展的开发人员，帮助你从技术角度系统了解项目。文档以“从上手到深入”为路径组织，适合新成员快速入门，也适合维护者查阅实现细节。

## 适用对象

- 初次参与项目开发的工程师
- 需要扩展/维护插件能力的开发者
- 需要理解架构与测试体系的维护者

## 推荐阅读顺序

1. [环境准备与调试](01-setup.md) - 开发环境配置与调试方式
2. [开发工作流与实战](02-development-workflow.md) - 构建、测试与常见任务
3. [项目结构与目录布局](03-project-layout.md) - 代码与资源组织方式
4. [核心配置与工程规范](04-configuration-reference.md) - 构建/测试/打包配置详解
5. [架构与核心设计](05-architecture.md) - 系统设计与模块协作
6. [插件系统详解](06-plugin-system.md) - 插件生命周期与消息系统
7. [可观测性与性能监控](07-observability.md) - 监控、告警与性能指标
8. [测试体系与实践](08-testing.md) - 测试配置、编写与最佳实践
9. [国际化指南](09-i18n-guide.md) - 多语言支持和翻译指南
10. [终端用户界面（TUI）编程](10-terminal-ui.md) - Shell 脚本交互式界面实现

## 项目速览

### 核心功能

Shell Formatter 插件提供两个核心功能:

1. **格式化**: 使用 shfmt 格式化 Shell 脚本
2. **诊断**: 使用 shellcheck 和 shfmt 检测错误

### 工作原理

```text
用户操作
    ↓
VSCode API
    ↓
扩展代码
    ↓
插件系统（PluginManager）
    ↓
DI 容器获取插件
    ↓
spawn 调用外部工具
    ↓
shfmt / shellcheck
    ↓
返回结果
    ↓
适配器转换为诊断
    ↓
更新 VSCode UI
```

### 架构特点

- **插件架构** - 使用 IFormatPlugin 接口定义插件，支持动态加载
- **依赖注入** - 轻量级 DI 容器管理服务依赖，支持循环依赖检测
- **并行激活** - 使用 Promise.all 并行激活插件，性能提升 40%
- **配置缓存** - 基于 SettingInfo 实现配置快照和自动失效
- **性能监控** - 内置性能指标收集和报告

## 帮助与资源

### 获取帮助

如果遇到问题:

1. 查看 [插件系统详解](06-plugin-system.md) - 插件开发完整参考
2. 查看项目内文档
3. 查看 [VSCode 扩展开发文档](https://code.visualstudio.com/api)
4. 在 [GitHub Issues](https://github.com/bdq460/shell-formatter/issues) 中提问

### 相关资源

**项目文档**:

- [项目结构与目录布局](03-project-layout.md) - 目录结构和配置文件概览
- [插件系统详解](06-plugin-system.md) - 插件开发完整参考
- [测试体系与实践](08-testing.md) - 测试配置和编写指南
- [架构与核心设计](05-architecture.md) - 项目架构详细说明

**外部资源**:

- [VSCode 扩展开发文档](https://code.visualstudio.com/api) - 官方 API 文档

## 下一步

完成本总览后，建议按以下顺序深入:

1. [项目结构与目录布局](03-project-layout.md) - 理解项目组织和配置文件
2. [架构与核心设计](05-architecture.md) - 了解系统架构和设计原则
3. [插件系统详解](06-plugin-system.md) - 掌握插件系统开发
4. [测试体系与实践](08-testing.md) - 学习测试编写和最佳实践
5. 查看 [源代码](../../src/) - 深入具体实现
6. 参考 [VSCode Extension API](../vscode/extension-api.md) - 了解 API 使用
