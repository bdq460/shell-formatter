# 环境准备与调试

本篇聚焦开发环境准备与调试方式，完成后即可进入开发循环。

## 前置要求

### 必需工具

| 工具           | 最低版本  | 说明              |
| -------------- | --------- | ----------------- |
| **Node.js**    | >= 16.x   | JavaScript 运行时 |
| **npm**        | >= 8.x    | 包管理器          |
| **VSCode**     | >= 1.74.0 | 开发环境          |
| **TypeScript** | >= 5.0    | 编译器            |

### 推荐工具

- **Git**: 版本控制
- **ESLint**: 代码检查
- **Prettier**: 代码格式化（可选）

---

## 安装步骤

### 1. 克隆项目

```bash
git clone https://github.com/bdq460/shell-formatter.git
cd shell-formatter
```

### 2. 安装依赖

```bash
npm install
```

### 3. 验证安装

```bash
# 检查 Node.js 版本
node -v

# 检查 npm 版本
npm -v

# 检查 TypeScript 版本
tsc -v
```

---

## 开发环境配置

### 1. 安装 VSCode 扩展

推荐安装以下扩展:

- **ESLint**: 代码检查
- **Prettier - Code formatter**: 代码格式化（可选）
- **TypeScript Importer**: 自动导入

### 2. 配置 VSCode

在 `.vscode/settings.json` 中添加:

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

### 3. 配置调试

仓库未默认跟踪 `.vscode/launch.json`。如需调试，可使用 VSCode 生成「Run Extension」配置后按 `F5` 启动。

---

## 调试

### 启动调试

1. 按 `F5` 或点击 "Run Extension"
2. 会启动一个新的 VSCode 窗口（Extension Development Host）
3. 在新窗口中测试插件功能

### 设置断点

1. 在代码中设置断点
2. 按 `F5` 启动调试
3. 在 Extension Development Host 中触发功能
4. 程序会在断点处暂停

### 查看日志

1. 打开输出面板（`Ctrl+Shift+U` / `Cmd+Shift+U`）
2. 选择 "Extension Host" 或 "shell-formatter" 通道

---

## 相关文档

- [开发工作流与实战](02-development-workflow.md) - 构建、测试与常见任务
- [项目结构与目录布局](03-project-layout.md) - 目录结构说明
- [架构与核心设计](05-architecture.md) - 系统架构和设计原则
