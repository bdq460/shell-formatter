# 快速开始指南

本指南帮助新开发者快速上手 Shell Format 插件的开发。

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
git clone https://github.com/bdq460/shell-format.git
cd shell-format
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

## 项目理解

### 核心功能

Shell Format 插件提供两个核心功能:

1. **格式化**: 使用 shfmt 格式化 Shell 脚本
2. **诊断**: 使用 shellcheck 和 shfmt 检测错误

### 工作原理

```flow
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

在 `.vscode/launch.json` 中已有配置，直接按 `F5` 启动调试。

---

## 编译和运行

### 1. 一次性编译

```bash
npm run compile
```

编译后的代码输出到 `dist/` 目录。

### 2. 监听模式（推荐）

```bash
npm run watch
```

代码修改后会自动重新编译。

### 3. 运行测试

```bash
npm test
```

### 4. 代码检查

```bash
npm run lint
```

### 5. 打包

```bash
npm run package:extension
```

### 6. 安装包

```bash
npm run install:extension
```

---

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
2. 选择 "Extension Host" 或 "shell-format" 通道

---

## 第一个任务

让我们完成一个简单的任务: 添加一个新的命令。

### 任务: 添加 "Hello World" 命令

#### 步骤 1: 创建命令文件

在 `src/commands/` 下创建 `helloCommand.ts`:

```typescript
import * as vscode from "vscode";

export function registerHelloCommand(): vscode.Disposable {
  return vscode.commands.registerCommand("shell-format.helloWorld", () => {
    vscode.window.showInformationMessage("Hello, World!");
  });
}
```

#### 步骤 2: 导出命令

在 `src/commands/index.ts` 中添加:

```typescript
export * from "./formatCommand";
export * from "./fixCommand";
export * from "./helloCommand"; // 新增
```

#### 步骤 3: 注册命令

在 `src/extension.ts` 中添加:

```typescript
import { registerHelloCommand } from "./commands";

export function activate(context: vscode.ExtensionContext) {
  // ... 现有代码

  const helloCommand = registerHelloCommand();
  context.subscriptions.push(helloCommand);
}
```

#### 步骤 4: 测试命令

1. 按 `F5` 启动调试
2. 在 Extension Development Host 中打开命令面板（`Ctrl+Shift+P` / `Cmd+Shift+P`）
3. 输入 "Hello World"
4. 执行命令，应该会弹出 "Hello, World!" 消息

---

## 常见开发任务

### 添加新功能

参考本指南"第一个任务"章节了解如何添加新命令。

### 修改配置

1. 在 `package.json` 的 `configuration` 中添加配置项
2. 在 `src/config/settingInfo.ts` 中添加访问方法
3. 更新 `ConfigCache` 接口和 `refreshCache()` 方法
4. 更新配置变更检测列表

### 调试外部命令

使用插件系统进行调试：

```typescript
import { logger } from "../utils";
import { getContainer, ServiceNames } from "../di";
import { PluginManager } from "../plugins";

// 获取 DI 容器
const container = getContainer();

// 获取 PluginManager
const pluginManager = container.resolve<PluginManager>(
  ServiceNames.PLUGIN_MANAGER,
);

// 查看插件状态
const stats = pluginManager.getStats();
logger.info(`Total plugins: ${stats.total}, Active: ${stats.active}`);

// 查看活动插件列表
const activePlugins = pluginManager.getActivePluginNames();
logger.info(`Active plugins: ${activePlugins.join(", ")}`);
```

---

## 下一步

完成快速开始后，建议:

1. 阅读 [插件机制完整指南](./plugin.md) 了解插件系统
2. 阅读 [架构设计文档](architecture.md) 了解项目架构
3. 查看 [源代码](../../src/) 了解具体实现
4. 查看 [VSCode Extension API](../vscode/extension-api.md) 了解 API 使用

---

## 创建第一个插件

快速示例：创建一个简单的日志插件

```typescript
// src/plugins/myFirstPlugin.ts
import { BasePlugin } from "../utils/plugin";
import { logger } from "../utils/log";

export class MyFirstPlugin extends BasePlugin {
  get name() {
    return "my-first";
  }
  get displayName() {
    return "My First Plugin";
  }
  get version() {
    return "1.0.0";
  }
  get description() {
    return "My first plugin";
  }

  async isAvailable(): Promise<boolean> {
    return true; // 插件总是可用
  }

  async onActivate(): Promise<void> {
    logger.info(`${this.name} activated!`);

    // 订阅配置变更
    this.subscribeMessage("config:change", (msg) => {
      logger.info("Config changed:", msg.payload);
    });
  }

  async onDeactivate(): Promise<void> {
    logger.info(`${this.name} deactivated`);
  }

  getCapabilities() {
    return ["log", "monitor"];
  }
}
```

更多详情请参考 [插件机制完整指南](./plugin.md)

---

## 获取帮助

如果遇到问题:

1. 查看 [插件机制完整指南](./plugin.md) - 插件开发完整参考
2. 查看项目文档
3. 查看 [VSCode 扩展开发文档](https://code.visualstudio.com/api)
4. 在 [GitHub Issues](https://github.com/bdq460/shell-format/issues) 中提问

---

## 相关资源

- [插件机制完整指南](./plugin.md) - 插件开发完整参考
- [架构设计文档](architecture.md) - 项目架构详细说明
- [VSCode 扩展开发文档](https://code.visualstudio.com/api) - 官方 API 文档
