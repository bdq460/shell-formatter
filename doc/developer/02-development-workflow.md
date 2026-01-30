# 开发工作流与实战

本篇覆盖开发循环中的常用命令、示例任务与常见开发操作。

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

## 第一个任务

让我们完成一个简单的任务: 添加一个新的命令。

### 任务: 添加 "Hello World" 命令

#### 步骤 1: 创建命令文件

在 `src/commands/` 下创建 `helloCommand.ts`:

```typescript
import * as vscode from "vscode";

export function registerHelloCommand(): vscode.Disposable {
  return vscode.commands.registerCommand("shell-formatter.helloWorld", () => {
    vscode.window.showInformationMessage("Hello, World!");
  });
}
```

#### 步骤 2: 导出命令

在 `src/commands/index.ts` 中添加:

```typescript
export * from "./fixCommand";
export * from "./performanceCommand";
export * from "./pluginStatusCommand";
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

参考本指南“第一个任务”章节了解如何添加新命令。

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

更多详情请参考 [插件系统详解](06-plugin-system.md)。

---

## 相关文档

- [环境准备与调试](01-setup.md) - 开发环境配置
- [核心配置与工程规范](04-configuration-reference.md) - 配置项与脚本说明
- [插件系统详解](06-plugin-system.md) - 插件机制与生命周期
- [测试体系与实践](08-testing.md) - 测试编写与运行
