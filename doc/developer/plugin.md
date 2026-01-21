# 插件机制完整指南

## 概述

Shell Formatter 采用通用的、框架无关的插件系统，提供：

- ✅ 统一的插件生命周期管理
- ✅ 解耦的消息总线通信
- ✅ 灵活的依赖声明和能力广告
- ✅ 同步初始化和异步事件通知

## 架构设计

### 核心组件

```text
┌─────────────────────────────────────────────────┐
│                  应用层                          │
│           (Extension / VSCode)                  │
└────────────────┬────────────────────────────────┘
                 │
    ┌────────────┴──────────────┐
    │                           │
┌───▼──────────────┐  ┌────────▼────────┐
│  PluginManager   │  │  Application    │
│  - 插件生命周期   │  │  - 格式化       │
│  - 依赖验证      │  │  - 诊断         │
└───┬──────────────┘  └────────┬────────┘
    │                           │
    └────────────┬──────────────┘
                 │
            ┌────▼──────────┐
            │  MessageBus   │
            │  - 订阅/发布   │
            │  - 事件分发    │
            └────┬──────────┘
                 │
    ┌────────────┴──────────────┐
    │                           │
┌───▼──────────────┐  ┌────────▼────────┐
│   BasePlugin     │  │  IPlugin        │
│   - 基本实现      │  │  - 接口定义     │
│   - 工具方法      │  │                 │
└──────────────────┘  └─────────────────┘
```

### 核心类和接口

#### 1. IPlugin 接口

定义了所有插件必须实现的契约：

```typescript
export interface IPlugin {
  // 元数据
  name: string; // 唯一标识
  displayName: string; // 显示名称
  version: string; // 版本
  description: string; // 描述

  // 生命周期
  isAvailable(): Promise<boolean>; // 可用性检查
  onActivate?(): void | Promise<void>; // 激活钩子
  onDeactivate?(): void | Promise<void>; // 停用钩子

  // 消息系统
  setMessageBus?(messageBus: any): void; // 注入消息总线
  subscribe?(
    type: MessageType,
    handler: MessageHandler,
    options?: MessageSubscriptionOptions,
  ): string; // 订阅消息

  // 可选：依赖和能力
  getDependencies?(): PluginDependency[]; // 依赖声明
  getCapabilities?(): string[]; // 能力声明
}
```

#### 2. BasePlugin 抽象类

提供了常用的实现和工具方法：

```typescript
export abstract class BasePlugin implements IPlugin {
  abstract get name(): string;
  abstract get displayName(): string;
  abstract get version(): string;
  abstract get description(): string;
  abstract isAvailable(): Promise<boolean>;

  // 消息发布（简化 API）
  protected publish<T>(
    type: MessageType,
    payload?: T,
    source?: string,
  ): Promise<number>;

  // 消息发布（高级 API）
  protected publishMessage<T>(message: Message<T>): Promise<number>;

  // 消息订阅
  protected subscribeMessage<T>(
    type: MessageType,
    handler: MessageHandler<T>,
    options?: MessageSubscriptionOptions,
  ): string;

  // 错误处理辅助
  protected async safeExecute<T>(
    operation: () => Promise<T>,
    context: string,
  ): Promise<T | undefined>;
}
```

#### 3. PluginManager

管理插件的生命周期和运行：

```typescript
export class PluginManager<TPlugin extends IPlugin = IPlugin> {
  // 插件管理
  register(plugin: TPlugin): void;
  unregister(name: string): Promise<void>;
  get(name: string): TPlugin | undefined;
  getAll(): TPlugin[];

  // 插件激活/停用
  async activate(name: string): Promise<boolean>;
  async deactivate(name: string): Promise<boolean>;

  // 查询
  async getAvailablePlugins(): Promise<TPlugin[]>;
  getStats(): PluginStats;

  // 消息发布
  async publishMessage(type: string, payload?: any): Promise<number>;
  async publishMessageWithMetadata<T>(message: Message<T>): Promise<number>;
  async publishConfigChange(config: any): Promise<number>;

  // 获取消息总线
  getMessageBus(): MessageBus;
}
```

#### 4. MessageBus

实现发布-订阅模式：

```typescript
export class MessageBus {
  // 订阅
  subscribe<T = any>(
    type: MessageType,
    handler: MessageHandler<T>,
    options?: MessageSubscriptionOptions,
  ): string;

  once<T = any>(
    type: MessageType,
    handler: MessageHandler<T>,
    options?: MessageSubscriptionOptions,
  ): string;

  // 发布
  publish<T>(type: MessageType, payload?: T, source?: string): Promise<number>;

  async publishMessage<T>(message: Message<T>): Promise<number>;

  // 取消订阅
  unsubscribe(subscriptionId: string): boolean;
  clearSubscriptions(type: MessageType): number;

  // 统计和检查
  getStats(): MessageBusStats;
  hasSubscribers(type: MessageType): boolean;
}
```

## 生命周期详解

### 插件激活流程

```text
1. 调用 PluginManager.activate(name)
   ↓
2. 发送 "plugin:before-activate" 消息
   ↓
3. 验证依赖
   - 检查所有 required: true 的依赖是否已激活
   - 如果缺少，发送 "plugin:activation-failed" 并返回 false
   ↓
4. 检查可用性
   - 调用 plugin.isAvailable()
   - 如果不可用，发送 "plugin:activation-failed" 并返回 false
   ↓
5. 调用 onActivate() 钩子（如果存在）
   - 同步执行初始化逻辑
   - 订阅消息总线
   - 准备资源
   - 若失败，发送 "plugin:activation-failed"
   ↓
6. 标记为活动状态
   ↓
7. 发送 "plugin:activated" 消息
   - payload.capabilities 包含该插件的能力列表
```

### 插件停用流程

```text
1. 调用 PluginManager.deactivate(name)
   ↓
2. 发送 "plugin:before-deactivate" 消息
   ↓
3. 调用 onDeactivate() 钩子（如果存在）
   - 取消所有消息订阅
   - 清理资源
   - 若失败，发送 "plugin:deactivation-failed"
   ↓
4. 标记为非活动状态
   ↓
5. 发送 "plugin:deactivated" 消息
```

## 消息系统

### 生命周期事件

| 事件类型                     | 何时发送   | Payload                                   | 用途                     |
| ---------------------------- | ---------- | ----------------------------------------- | ------------------------ |
| `plugin:before-activate`     | 激活开始前 | `{ pluginName, timestamp }`               | 通知监听器激活即将开始   |
| `plugin:activated`           | 激活成功后 | `{ pluginName, timestamp, capabilities }` | 通知插件已启用，包含能力 |
| `plugin:activation-failed`   | 激活失败   | `{ pluginName, timestamp, error }`        | 通知激活失败原因         |
| `plugin:before-deactivate`   | 停用开始前 | `{ pluginName, timestamp }`               | 通知监听器停用即将开始   |
| `plugin:deactivated`         | 停用成功后 | `{ pluginName, timestamp }`               | 通知插件已停用           |
| `plugin:deactivation-failed` | 停用失败   | `{ pluginName, timestamp, error }`        | 通知停用失败原因         |

### 应用消息

应用可以发布自定义消息供插件订阅：

```typescript
// 配置变更通知
await pluginManager.publishConfigChange({
  indent: 4,
  lineWidth: 80,
  // ... 其他配置
});

// 通用消息发布
await pluginManager.publishMessage("file:save", {
  filePath: "/path/to/file.sh",
  content: "#!/bin/bash\n...",
});

// 带元数据的消息发布
await pluginManager.publishMessageWithMetadata({
  type: "task:complete",
  payload: {
    taskId: "123",
    result: "success",
  },
  metadata: {
    duration: 1500,
    priority: "high",
  },
});
```

### 订阅消息

```typescript
class MyPlugin extends BasePlugin {
  private configSubId?: string;

  async onActivate(): Promise<void> {
    // 订阅配置变更
    this.configSubId = this.subscribeMessage("config:change", (msg) => {
      console.log("配置已更改:", msg.payload);
      this.updateConfig(msg.payload);
    });

    // 一次性订阅
    this.subscribeMessage(
      "app:init",
      (msg) => {
        console.log("应用初始化完成");
      },
      { once: true },
    );
  }

  async onDeactivate(): Promise<void> {
    // 自动取消订阅（BasePlugin 会处理）
  }

  private updateConfig(config: any): void {
    // 处理配置变更
  }
}
```

## 依赖管理

### 声明依赖

```typescript
export interface PluginDependency {
  name: string; // 依赖的插件名称
  version?: string; // 版本范围（可选）
  required: boolean; // 是否为必需依赖
}
```

### 实现示例

```typescript
class ShfmtPlugin extends BasePlugin {
  getDependencies(): PluginDependency[] {
    return [
      {
        name: "config-plugin",
        required: true, // 必需依赖
      },
      {
        name: "logger-plugin",
        version: "^1.0.0",
        required: false, // 可选依赖
      },
    ];
  }

  async onActivate(): Promise<void> {
    // onActivate 被调用时，依赖已被验证为可用
    // 可以安全地使用依赖
  }
}
```

### 激活规则

- **必需依赖** (`required: true`)：如果未激活，插件激活失败，发送 `ACTIVATION_FAILED` 事件
- **可选依赖** (`required: false`)：即使未激活，插件仍然可以激活，但应做好相应的处理

## 能力声明

### 声明能力

插件可以声明它提供的能力，其他系统和插件可以通过这些信息了解插件的功能：

```typescript
class MyPlugin extends BasePlugin {
  getCapabilities(): string[] {
    return [
      "format", // 提供格式化功能
      "check", // 提供检查功能
      "lint:style", // 提供代码风格检查
      "fix:issues", // 提供问题修复
      "extensions:.sh,.bash",
    ];
  }
}
```

### 获取能力

通过监听 `plugin:activated` 事件获取插件能力：

```typescript
messageBus.subscribe("plugin:activated", (msg) => {
  const pluginName = msg.payload.pluginName;
  const capabilities = msg.payload.capabilities;
  console.log(`${pluginName} 提供的能力:`, capabilities);
});
```

## 实现示例

### 基础插件示例

```typescript
import { BasePlugin } from "./utils/plugin";
import { logger } from "./utils/log";

export class MyPlugin extends BasePlugin {
  get name() {
    return "my-plugin";
  }

  get displayName() {
    return "My Plugin";
  }

  get version() {
    return "1.0.0";
  }

  get description() {
    return "A sample plugin demonstrating the framework";
  }

  async isAvailable(): Promise<boolean> {
    // 检查依赖的工具是否可用
    return true;
  }

  async onActivate(): Promise<void> {
    logger.info(`${this.name} plugin activated`);

    // 订阅消息
    if (this.messageBus) {
      this.subscribeMessage("config:change", (msg) => {
        logger.debug(`${this.name} received config:change`);
        this.handleConfigChange(msg.payload);
      });
    }
  }

  async onDeactivate(): Promise<void> {
    logger.info(`${this.name} plugin deactivated`);
    // 自动取消订阅
  }

  getDependencies() {
    return [];
  }

  getCapabilities() {
    return ["process", "analyze"];
  }

  private handleConfigChange(config: any): void {
    // 处理配置变更
  }
}
```

### VSCode 格式化插件示例

```typescript
import * as vscode from "vscode";
import { BasePlugin } from "../utils/plugin";
import { logger } from "../utils/log";

export class ShfmtPlugin extends BasePlugin {
  name = "shfmt";
  displayName = "Shell Formatter (shfmt)";
  version = "1.0.0";
  description = "Format shell scripts using shfmt";

  private tool: ShfmtTool;
  private configChangeSubId?: string;

  constructor(shfmtPath: string) {
    super();
    this.tool = new ShfmtTool(shfmtPath);
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.tool.check("-", { content: "# test" });
      return true;
    } catch {
      logger.warn("shfmt is not available");
      return false;
    }
  }

  async onActivate(): Promise<void> {
    logger.info(`${this.name} activated`);

    // 订阅配置变更
    if (this.messageBus) {
      this.configChangeSubId = this.subscribeMessage("config:change", (msg) => {
        logger.debug(`${this.name} received config change`);
        // 更新内部配置
      });
    }
  }

  async onDeactivate(): Promise<void> {
    logger.info(`${this.name} deactivated`);
  }

  getDependencies() {
    return [];
  }

  getCapabilities() {
    return ["format:shell", "check:shell"];
  }

  async format(
    document: vscode.TextDocument,
    options: any,
  ): Promise<vscode.TextEdit[]> {
    // 实现格式化逻辑
    const result = await this.tool.format("-", {
      content: document.getText(),
    });
    // 转换结果为 TextEdit 数组
    return [];
  }

  async check(document: vscode.TextDocument, options: any): Promise<any> {
    // 实现检查逻辑
    const result = await this.tool.check("-", {
      content: document.getText(),
    });
    // 转换结果为诊断信息
    return { diagnostics: [] };
  }
}
```

## 错误处理

### 激活失败处理

```typescript
// 监听激活失败事件
messageBus.subscribe("plugin:activation-failed", (msg) => {
  const { pluginName, error } = msg.payload;
  logger.error(`Failed to activate ${pluginName}: ${error}`);
  // 可以尝试重新激活或采用降级方案
});
```

### 安全执行辅助方法

```typescript
class MyPlugin extends BasePlugin {
  async onActivate(): Promise<void> {
    // 使用 safeExecute 进行错误处理
    const config = await this.safeExecute(
      () => this.loadConfig(),
      "load config",
    );

    if (config === undefined) {
      logger.warn("Failed to load config, using defaults");
      // 使用默认配置
    }
  }

  private async loadConfig(): Promise<any> {
    // 可能抛出异常的操作
    return {};
  }
}
```

## 日志记录

所有日志都使用 `src/utils/log.ts` 中的统一 logger：

```typescript
import { logger } from "../utils/log";

class MyPlugin extends BasePlugin {
  async onActivate(): Promise<void> {
    logger.debug(`${this.name} is initializing`);
    logger.info(`${this.name} activated successfully`);
  }

  async onDeactivate(): Promise<void> {
    logger.warn(`${this.name} is being deactivated`);
  }

  async someOperation(): Promise<void> {
    try {
      // 执行操作
    } catch (error) {
      logger.error(`${this.name} operation failed: ${String(error)}`);
    }
  }
}
```

日志级别：

- `DEBUG` - 调试信息（开发使用）
- `INFO` - 常规信息
- `WARN` - 警告（潜在问题）
- `ERROR` - 错误（严重问题）

## 最佳实践

### 1. 使用生命周期钩子

✅ **推荐**：在 `onActivate` 中初始化，在 `onDeactivate` 中清理

```typescript
async onActivate(): Promise<void> {
    this.subscriptionId = this.subscribeMessage('config:change', ...);
    this.timer = setInterval(...);
}

async onDeactivate(): Promise<void> {
    this.unsubscribeMessage(this.subscriptionId);
    clearInterval(this.timer);
}
```

### 2. 声明依赖和能力

✅ **推荐**：让系统了解你的插件

```typescript
getDependencies() {
    return [{ name: 'core-plugin', required: true }];
}

getCapabilities() {
    return ['format', 'check'];
}
```

### 3. 订阅消息处理异步事件

✅ **推荐**：用消息订阅处理不需要同步执行的通知

```typescript
this.subscribeMessage("file:save", async (msg) => {
  // 异步处理文件保存事件
  await this.analyzeFile(msg.payload.filePath);
});
```

### 4. 错误处理

✅ **推荐**：使用 logger 记录错误

```typescript
try {
  await this.operation();
} catch (error) {
  logger.error(`Operation failed: ${String(error)}`);
  // 不要忽视错误
}
```

❌ **不推荐**：使用 console.log

```typescript
console.log("Some info"); // ❌ 应使用 logger
```

### 5. 资源清理

✅ **推荐**：确保在 `onDeactivate` 中清理所有资源

```typescript
async onDeactivate(): Promise<void> {
    // 取消订阅
    this.subscriptionIds.forEach(id =>
        this.unsubscribeMessage(id)
    );

    // 关闭连接
    await this.connection?.close();

    // 停止定时器
    this.timers.forEach(id => clearInterval(id));
}
```

## 常见问题

### Q1: 何时使用 onActivate/onDeactivate vs 消息订阅？

**A:**

- **同步初始化/清理** → 使用钩子（`onActivate/onDeactivate`）
- **异步事件通知** → 使用消息订阅
- **其他系统通知你的事件** → 使用消息订阅

### Q2: 依赖的插件如果未激活会怎样？

**A:**

- 如果是 `required: true`，你的插件激活会失败，发送 `activation-failed` 事件
- 如果是 `required: false`，你的插件仍会激活，你应该在使用时检查依赖是否可用

### Q3: 如何调试插件？

**A:**

1. 使用 `logger.debug()` 记录调试信息
2. 监听生命周期事件：`plugin:activated`、`plugin:activation-failed` 等
3. 检查 PluginManager 的统计信息：`getStats()`
4. 在 VSCode 中查看输出面板

### Q4: 插件卸载后能重新加载吗？

**A:**

是的。流程是：

1. 调用 `deactivate(name)` 停用插件
2. 调用 `unregister(name)` 注销插件
3. 创建新实例
4. 调用 `register(plugin)` 注册插件
5. 调用 `activate(name)` 激活插件

## 扩展阅读

- [Architecture](./architecture.md) - 详细的架构设计
- [Getting Started](./getting-started.md) - 开发环境设置
- [Plugin Quick Start](./plugin/PLUGIN_QUICK_START.md) - 插件快速开始
- [Plugin Adoption Guide](./plugin/PLUGIN_FRAMEWORK_ADOPTION.md) - 框架采用指南
