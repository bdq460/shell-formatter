# 文档索引

## 快速导航

### 👤 我是用户（已安装插件）

- [用户使用文档](../resources/USER_README.md) - 插件功能、配置和使用说明

### 👨‍💻 我是开发者

**入门必读**:

- [根目录 README.md](../README.md) - 项目概述、架构设计、开发指南
- [根目录 README_EN.md](../README_EN.md) - 项目概述、架构设计、开发指南(英文版)
- [开发者手册总览](developer/00-handbook.md) - 手册导航与项目速览
- [环境准备与调试](developer/01-setup.md) - 开发环境配置与调试方式
- [开发工作流与实战](developer/02-development-workflow.md) - 构建、测试与常见任务
- [项目结构与目录布局](developer/03-project-layout.md) - 目录结构说明 ⭐
- [核心配置与工程规范](developer/04-configuration-reference.md) - 构建/测试/打包配置详解

**进阶文档**:

- [架构与核心设计](developer/05-architecture.md) - 详细的架构设计说明
- [插件系统详解](developer/06-plugin-system.md) - 插件系统详细介绍和开发指南
- [可观测性与性能监控](developer/07-observability.md) - 性能监控和优化
- [测试体系与实践](developer/08-testing.md) - 测试配置、编写和最佳实践
- [国际化指南](developer/09-i18n.md) - 多语言支持和翻译指南

**VSCode 扩展开发**:

- [VSCode 扩展 API 参考](vscode/extension-api.md) - VSCode 扩展开发 API 详细说明
- [package.json 配置说明](vscode/package-json.md) - 扩展配置详解
- [language-configuration.json 详解](vscode/language-configuration.md) - 语言配置说明

### 🔧 工具参考

- [shellcheck 使用指南](tools/shellcheck.md) - shellcheck 工具说明
- [shfmt 使用指南](tools/shfmt.md) - shfmt 工具说明
- [spawn 使用指南](tools/spawn.md) - Node.js spawn API 使用
- [npm 使用指南](tools/npm.md) - npm 使用说明
- [TypeScript 配置详解](tools/tsconfig.md) - tsconfig 完整说明

## 文档说明

- **根目录 README.md** 是开发者文档，在开发阶段使用
- **打包时**，`doc/user/README.md` 会被复制为根目录的 `README.md`，作为插件市场首页
- 本索引文档仅用于开发阶段，帮助快速查找各类文档
