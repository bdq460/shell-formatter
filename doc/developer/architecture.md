# Shell Format 架构设计文档

## 概述

Shell Format 是一个基于 VSCode 扩展 API 的 Shell 脚本格式化和诊断工具。本文档详细说明项目的架构设计、技术选型和实现细节。

> **注意**：本文档专注于项目整体架构设计。
>
> - 关于 **插件机制详解**，请参考 [plugin.md](./plugin.md)
> - 关于 VSCode Extension API 的详细说明，请参考 [extension-api.md](../vscode/extension-api.md)

## 核心概念

### 插件系统 (Plugin System)

Shell Format 采用插件架构，所有格式化和诊断功能都通过插件实现。插件系统支持：

- **动态注册和注销** - 运行时注册/移除插件
- **插件激活管理** - 基于配置激活/停用插件
- **并行激活** - 支持并行插件激活（40% 性能提升）
- **可用性检查** - 自动检测插件是否可用

**插件接口**：

```typescript
export interface IFormatPlugin {
  name: string;
  displayName: string;
  version: string;
  description: string;
  isAvailable(): Promise<boolean>;
  format(document: TextDocument, options: FormatOptions): Promise<TextEdit[]>;
  check(document: TextDocument, options: CheckOptions): Promise<CheckResult>;
  getSupportedExtensions(): string[];
}
```

### 依赖注入 (Dependency Injection)

项目使用自定义的轻量级依赖注入容器（DIContainer），支持：

- **单例模式** - 服务实例全局唯一
- **瞬时模式** - 每次解析返回新实例
- **循环依赖检测** - 自动检测循环依赖
- **清理钩子** - 支持服务自定义清理逻辑

**DI 容器特性**：

```typescript
class DIContainer {
  registerSingleton<T>(
    name: string,
    factory: ServiceFactory<T>,
    dependencies: string[],
  ): void;
  registerTransient<T>(
    name: string,
    factory: ServiceFactory<T>,
    dependencies: string[],
  ): void;
  resolve<T>(name: string): T;
  has(name: string): boolean;
  reset(): void;
  clear(): void;
  async cleanup(): Promise<void>;
}
```

### 诊断集合 (DiagnosticCollection)

用于集中管理 Shell 脚本的格式化和语法检查诊断信息。详细 API 说明请参考 [../vscode/extension-api.md](../vscode/extension-api.md)。

### 文档过滤

跳过特殊文件（如 Git 冲突文件、临时文件），避免对非目标文件进行诊断和格式化。

**跳过模式**：

| 模式       | 说明         | 示例             |
| ---------- | ------------ | ---------------- |
| `/\.git$/` | Git 冲突文件 | `example.sh.git` |
| `/\.swp$/` | Vim 临时文件 | `file.sh.swp`    |
| `/\.swo$/` | Vim 交换文件 | `file.sh.swo`    |
| `/~$/`     | 备份文件     | `file.sh~`       |
| `/\.tmp$/` | 临时文件     | `file.sh.tmp`    |
| `/\.bak$/` | 备份文件     | `file.sh.bak`    |

**示例代码**：

```typescript
function shouldSkipFile(fileName: string): boolean {
  const baseName = path.basename(fileName);
  const skipPatterns = [/\.git$/, /\.swp$/, /\.swo$/, /~$/, /\.tmp$/, /\.bak$/];
  return skipPatterns.some((pattern) => pattern.test(baseName));
}
```

## 设计原则

### 1. 插件化设计

项目采用插件架构，所有格式化和诊断功能都通过插件实现：

```text
┌─────────────────────────────────────────────────┐
│              extension.ts (入口)                │
│  - 初始化 DI 容器                                │
│  - 注册插件到 PluginManager                      │
│  - 激活插件（基于配置）                          │
│  - 注册提供者和监听器                            │
└─────────────────────────────────────────────────┘
                    ↓
    ┌───────────┼───────────┬───────────────┐
    ↓           ↓           ↓               ↓
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│commands │ │diagnostics││formatters││plugins  │
└─────────┘ └─────────┘ └─────────┘ └─────────┘
    ↓           ↓           ↓               ↓
┌─────────────────────────────────────────┐
│           PluginManager                │
│  - 管理插件注册和激活                             │
│  - 并行插件执行                                   │
└─────────────────────────────────────────┘
                    ↓
    ┌───────────┴───────────┬───────────────┐
    ↓                       ↓               ↓
┌─────────┐           ┌─────────┐    ┌─────────┐
│shfmt    │           │shellcheck│    │ tools/  │
│Plugin   │           │Plugin   │    │ adapters│
└─────────┘           └─────────┘    └─────────┘
```

### 2. 单向依赖

模块之间保持单向依赖关系：

```text
extension.ts
    ↓
commands/  diagnostics/  formatters/
    ↓           ↓              ↓
plugins/ (插件层) ←────────────────────┘
    ↓
DI Container
    ↓
config/  tools/  utils/  adapters/
```

- `extension.ts` 依赖所有功能模块
- 业务模块（commands/、diagnostics/、formatters/）依赖 `plugins/`
- `plugins/` 依赖 DI 容器和工具层
- 业务模块之间相互独立

### 3. 关注点分离

| 层级       | 职责         | 示例                                       |
| ---------- | ------------ | ------------------------------------------ |
| **入口层** | 注册和协调   | `extension.ts`                             |
| **业务层** | 实现具体功能 | `commands/`, `diagnostics/`, `formatters/` |
| **插件层** | 插件管理     | `plugins/`, `di/`                          |
| **工具层** | 提供通用能力 | `tools/`, `utils/`, `adapters/`            |
| **配置层** | 配置管理     | `config/`, `metrics/`                      |

## 核心模块详解

### 1. 扩展入口 (extension.ts)

**职责**：

- 扩展生命周期的管理
- DI 容器的初始化和注册
- 插件的初始化和激活
- Provider 和监听器的注册
- 资源清理

**关键代码**：

```typescript
export function activate(context: vscode.ExtensionContext) {
    // 1. 初始化日志系统
    initializeLoggerAdapter();

    // 2. 初始化 DI 容器并注册所有服务
    const container = getContainer();
    initializeDIContainer(container);

    // 3. 初始化插件（注册到 PluginManager）
    initializePlugins();

    // 4. 创建诊断集合（全局单例）
    const diagnosticCollection = vscode.languages.createDiagnosticCollection(
        PackageInfo.extensionName,
    );

    // 5. 注册提供者
    const rangeFormatProvider = vscode.languages.registerDocumentRangeFormattingEditProvider(...);
    const codeActionProvider = vscode.languages.registerCodeActionsProvider(...);

    // 6. 注册命令
    const commands = registerAllCommands(diagnosticCollection);

    // 7. 监听事件
    const saveListener = vscode.workspace.onDidSaveTextDocument(...);
    const openListener = vscode.workspace.onDidOpenTextDocument(...);
    const changeListener = vscode.workspace.onDidChangeTextDocument(...);
    const configChangeListener = vscode.workspace.onDidChangeConfiguration(...);

    // 8. 清理资源
    context.subscriptions.push(
        rangeFormatProvider,
        codeActionProvider,
        ...commands,
        saveListener,
        openListener,
        changeListener,
        configChangeListener,
        diagnosticCollection,
    );
}
```

**设计要点**：

1. **延迟初始化** - DI 容器和插件系统在激活时初始化
2. **资源管理** - 所有 Disposable 对象都注册到 context.subscriptions
3. **统一入口** - 所有初始化逻辑集中在 `activate()` 函数中
4. **配置热重载** - 配置变化时重置 DI 容器和重新激活插件

### 2. 插件管理器 (plugins/pluginManager.ts)

**职责**：

- 管理插件的注册和注销
- 管理插件的激活和停用
- 并行执行插件
- 插件可用性检查

**核心设计**：

```typescript
export class PluginManager {
  private plugins = new Map<string, IFormatPlugin>();
  private activePlugins = new Set<string>();

  // 注册插件
  register(plugin: IFormatPlugin): void {
    this.plugins.set(plugin.name, plugin);
  }

  // 注销插件
  unregister(name: string): void {
    this.plugins.delete(name);
    this.activePlugins.delete(name);
  }

  // 并行激活多个插件（40% 性能提升）
  async activateMultiple(names: string[]): Promise<number> {
    const activationResults = await Promise.all(
      names.map(async (name) => {
        const success = await this.activate(name);
        return { name, success };
      }),
    );
    // 统计成功和失败
    return activationResults.filter((r) => r.success).length;
  }

  // 使用活动插件格式化文档
  async format(
    document: vscode.TextDocument,
    options: FormatOptions,
  ): Promise<vscode.TextEdit[]> {
    for (const name of this.activePlugins) {
      const plugin = this.plugins.get(name);
      if (plugin) {
        const edits = await plugin.format(document, options);
        if (edits && edits.length > 0) {
          return edits; // 返回第一个成功的结果
        }
      }
    }
    return [];
  }

  // 使用活动插件检查文档
  async check(
    document: vscode.TextDocument,
    options: CheckOptions,
  ): Promise<CheckResult> {
    const allDiagnostics: vscode.Diagnostic[] = [];
    let hasErrors = false;

    for (const name of this.activePlugins) {
      const plugin = this.plugins.get(name);
      if (plugin) {
        const result = await plugin.check(document, options);
        allDiagnostics.push(...result.diagnostics);
        if (result.hasErrors) hasErrors = true;
      }
    }

    return { hasErrors, diagnostics: allDiagnostics };
  }

  // 插件状态查询
  isActive(name: string): boolean {
    return this.activePlugins.has(name);
  }

  getStats(): PluginStats {
    // 返回插件统计信息
  }
}
```

**性能优化**：

- **并行激活** - 使用 `Promise.all` 并行激活插件，性能提升 40%
- **按需激活** - 基于配置只激活启用的插件
- **早期返回** - format 返回第一个成功的结果，check 收集所有结果

### 3. 依赖注入容器 (di/container.ts)

**职责**：

- 管理服务实例的生命周期
- 支持单例和瞬时模式
- 循环依赖检测
- 服务清理

**核心设计**：

```typescript
export class DIContainer {
  private services = new Map<string, ServiceMetadata<unknown>>();
  private creatingStack = new Set<string>(); // 循环依赖检测

  // 注册单例服务
  registerSingleton<T>(
    name: string,
    factory: ServiceFactory<T>,
    dependencies: string[] = [],
  ): void {
    this.services.set(name, {
      factory,
      instantiated: false,
      instance: undefined,
      dependencies,
    });
  }

  // 注册瞬时服务
  registerTransient<T>(
    name: string,
    factory: ServiceFactory<T>,
    dependencies: string[] = [],
  ): void {
    this.services.set(name, {
      factory,
      instantiated: false, // 总是 false，每次创建新实例
      dependencies,
    });
  }

  // 解析服务
  resolve<T>(name: string): T {
    const service = this.services.get(name);

    // 检测循环依赖
    if (this.creatingStack.has(name)) {
      const cycle = Array.from(this.creatingStack).concat([name]).join(" -> ");
      throw new Error(`Circular dependency detected: ${cycle}`);
    }

    // 单例且已实例化，直接返回
    if (service.instantiated && service.instance !== undefined) {
      return service.instance as T;
    }

    // 创建新实例
    this.creatingStack.add(name);
    try {
      const instance = service.factory() as T;

      // 如果是单例，缓存实例
      if (service.instantiated === false) {
        service.instantiated = true;
        service.instance = instance;
      }

      return instance;
    } finally {
      this.creatingStack.delete(name);
    }
  }

  // 重置所有服务（主要用于测试）
  reset(): void {
    for (const [, metadata] of this.services.entries()) {
      metadata.instantiated = false;
      metadata.instance = undefined;
    }
    this.creatingStack.clear();
  }

  // 清理所有服务
  async cleanup(): Promise<void> {
    for (const [name, metadata] of this.services.entries()) {
      if (metadata.instantiated && metadata.instance) {
        if (hasCleanup(metadata.instance)) {
          const result = metadata.instance.cleanup();
          if (result && typeof (result as Promise<void>).then === "function") {
            await result;
          }
        }
      }
    }
  }
}
```

**设计要点**：

1. **轻量级实现** - 不依赖第三方库，完全自包含
2. **循环依赖检测** - 使用 creatingStack 检测循环依赖
3. **清理钩子** - 支持 ICleanup 接口，自定义清理逻辑
4. **测试友好** - 提供 reset() 方法支持测试隔离

### 4. 插件初始化 (di/initializer.ts)

**职责**：

- 注册核心服务到 DI 容器
- 注册插件实例到 DI 容器
- 验证所有必需的服务都已注册

**核心设计**：

```typescript
export function initializeDIContainer(container: DIContainer): void {
  // 1. 注册核心服务
  container.registerSingleton(
    ServiceNames.PLUGIN_MANAGER,
    () => new PluginManager(),
    [], // 无依赖
  );

  container.registerSingleton(
    ServiceNames.PERFORMANCE_MONITOR,
    () => PerformanceMonitor.getInstance(),
    [],
  );

  // 2. 注册插件实例（单例）
  const shfmtPath = SettingInfo.getShfmtPath();
  const shellcheckPath = SettingInfo.getShellcheckPath();
  const indent = SettingInfo.getRealTabSize();

  container.registerSingleton(
    ServiceNames.SHFMT_PLUGIN,
    () => new PureShfmtPlugin(shfmtPath, indent),
    [],
  );

  container.registerSingleton(
    ServiceNames.SHELLCHECK_PLUGIN,
    () => new PureShellcheckPlugin(shellcheckPath),
    [],
  );

  // 3. 验证所有必需的服务都已注册
  validateRegistrations(container);
}
```

### 5. 插件激活 (plugins/pluginInitializer.ts)

**职责**：

- 基于配置激活插件
- 支持配置驱动的插件启用/禁用

**核心设计**：

```typescript
export function initializePlugins(): void {
  const container = getContainer();
  const pluginManager = container.resolve<PluginManager>(
    ServiceNames.PLUGIN_MANAGER,
  );

  // 获取插件实例
  const shfmtPlugin = container.resolve<IFormatPlugin>(
    ServiceNames.SHFMT_PLUGIN,
  );
  const shellcheckPlugin = container.resolve<IFormatPlugin>(
    ServiceNames.SHELLCHECK_PLUGIN,
  );

  // 注册插件到 PluginManager
  pluginManager.register(shfmtPlugin);
  pluginManager.register(shellcheckPlugin);

  // 基于配置激活插件
  const enabledPlugins: string[] = [];

  if (SettingInfo.isShfmtEnabled()) {
    enabledPlugins.push("shfmt");
  }

  if (SettingInfo.isShellcheckEnabled()) {
    enabledPlugins.push("shellcheck");
  }

  // 并行激活插件
  pluginManager.activateMultiple(enabledPlugins);
}
```

### 6. 诊断模块 (diagnostics/)

**职责**：

- 调用 PluginManager 进行诊断
- 转换插件结果为 VSCode 诊断
- 管理诊断集合

**诊断触发时机**：

| 触发条件 | 监听器                     | 防抖           |
| -------- | -------------------------- | -------------- |
| 文档保存 | `onDidSaveTextDocument`    | ❌ 否          |
| 文档打开 | `onDidOpenTextDocument`    | ❌ 否          |
| 文档变化 | `onDidChangeTextDocument`  | ✅ 是（300ms） |
| 配置变更 | `onDidChangeConfiguration` | ❌ 否          |

**工作流程**：

```flow
文档事件触发
    ↓
diagnoseDocument()
    ↓
获取 PluginManager
    ↓
pluginManager.check(document, options)
    ↓
并行执行所有活动的插件（串行）
    ↓
合并所有诊断结果
    ↓
更新 DiagnosticCollection
```

**关键实现**：

```typescript
export async function diagnoseDocument(
  document: vscode.TextDocument,
  token?: vscode.CancellationToken,
): Promise<vscode.Diagnostic[]> {
  // 检查 onError 配置
  if (SettingInfo.getOnErrorSetting() === "ignore") {
    return [];
  }

  // 使用 DI 容器获取 PluginManager
  const container = getContainer();
  const pluginManager = container.resolve<PluginManager>(
    ServiceNames.PLUGIN_MANAGER,
  );

  // 调用插件检查文档
  const result = await pluginManager.check(document, {
    token,
    timeout: undefined,
  });

  return result.diagnostics;
}
```

### 7. 格式化模块 (formatters/)

**职责**：

- 提供文档格式化功能
- 调用 PluginManager 执行格式化
- 返回格式化后的 TextEdit

**工作流程**：

```flow
用户触发格式化
    ↓
provideDocumentRangeFormattingEdits()
    ↓
formatDocument()
    ↓
获取 PluginManager
    ↓
pluginManager.format(document, options)
    ↓
尝试所有活动插件，返回第一个成功结果
    ↓
返回给 VSCode 应用
```

**关键实现**：

```typescript
export async function formatDocument(
  document: vscode.TextDocument,
  options?: vscode.FormattingOptions,
  token?: vscode.CancellationToken,
): Promise<vscode.TextEdit[]> {
  // 使用 DI 容器获取 PluginManager
  const container = getContainer();
  const pluginManager = container.resolve<PluginManager>(
    ServiceNames.PLUGIN_MANAGER,
  );

  // 调用插件格式化文档
  return await pluginManager.format(document, {
    token,
    timeout: undefined,
  });
}
```

### 8. 提供者模块 (providers/)

**职责**：

- 提供 Code Action（快速修复）
- 处理用户的修复请求

**工作流程**：

```flow
VSCode 检测到问题
    ↓
提供 CodeActionProvider
    ↓
用户点击黄色灯泡
    ↓
provideCodeActions()
    ↓
返回可执行的 CodeAction[]
    ↓
用户选择修复操作
    ↓
执行对应的命令
```

### 9. 适配器模块 (adapters/)

**职责**：

- 将工具结果转换为 VSCode 诊断
- 统一诊断格式

**核心设计**：

```typescript
export class DiagnosticAdapter {
  static convert(
    result: ToolResult,
    document: vscode.TextDocument,
    source: string,
  ): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];

    // 语法错误
    if (result.syntaxErrors) {
      for (const error of result.syntaxErrors) {
        diagnostics.push(this.createSyntaxError(error, document, source));
      }
    }

    // 格式问题
    if (result.formatIssues) {
      for (const issue of result.formatIssues) {
        diagnostics.push(this.createFormatIssue(issue, source));
      }
    }

    // Linter 问题
    if (result.linterIssues) {
      for (const issue of result.linterIssues) {
        diagnostics.push(this.createLinterIssue(issue, source));
      }
    }

    return diagnostics;
  }
}
```

### 10. 配置管理 (config/settingInfo.ts)

**职责**：

- 统一管理配置
- 提供配置快照和自动失效
- 细粒度配置变化检测

**核心设计**：

```typescript
export class SettingInfo {
  private static configCache: ConfigCache | null = null;

  // 初始化或刷新配置缓存
  static refreshCache(): void {
    this.configCache = {
      tabSize: this.getTabSizeImpl(),
      log: this.getLogImpl(),
      onError: this.getOnErrorImpl(),
      plugins: {
        shfmt: {
          enabled: this.getShfmtEnabledImpl(),
          path: this.getShfmtPathImpl(),
        },
        shellcheck: {
          enabled: this.getShellcheckEnabledImpl(),
          path: this.getShellcheckPathImpl(),
        },
      },
    };
  }

  // 配置变更检测
  static isConfigurationChanged(
    event: vscode.ConfigurationChangeEvent,
  ): boolean {
    const keys = [
      "shell-format.plugins.shfmt",
      "shell-format.plugins.shellcheck",
      "shell-format.tabSize",
      "shell-format.log",
      "shell-format.onError",
    ];

    for (const key of keys) {
      if (event.affectsConfiguration(key)) {
        return true;
      }
    }

    return false;
  }

  // 插件配置
  static isShfmtEnabled(): boolean {
    this.ensureCacheInitialized();
    return this.configCache!.plugins.shfmt.enabled;
  }

  static getShfmtPath(): string {
    this.ensureCacheInitialized();
    return this.configCache!.plugins.shfmt.path;
  }
}
```

**设计要点**：

1. **嵌套配置结构** - 支持嵌套对象配置（plugins.shfmt, plugins.shellcheck）
2. **配置缓存** - 避免频繁调用 VSCode API
3. **自动失效** - 配置变化时调用 refreshCache()
4. **细粒度检测** - 只检测真正影响行为的配置项

### 11. 性能监控 (utils/performance/)

**职责**：

- 收集和统计性能指标
- 提供性能告警功能
- 生成性能报告

**核心组件**：

1. **PerformanceMonitor** - 单例，收集性能指标（count、min、max、avg）
2. **PerformanceTimer** - 便捷的计时工具，支持同步和异步
3. **PerformanceAlertManager** - 告警管理，支持多级别阈值配置（LOW、MEDIUM、HIGH、CRITICAL）

**关键用法**：

```typescript
// 使用 Timer 记录操作耗时
const timer = startTimer("format-document");
try {
  await formatDocument(document);
} finally {
  timer.stop(); // 自动记录指标和检查告警
}

// 配置告警阈值
const alertManager = getAlertManager();
alertManager.configureThreshold({
  metricName: "shfmt-format",
  highThreshold: 1000,
  criticalThreshold: 5000,
});

// 注册告警处理器
alertManager.onAlert((alert) => {
  if (alert.level === AlertLevel.CRITICAL) {
    logger.error(`Critical: ${alert.message}`);
  }
});

// 生成性能报告
const monitor = PerformanceMonitor.getInstance();
const report = monitor.generateReport();
```

**监控的关键指标**：

- `shfmt-format` - Shfmt 格式化耗时
- `shellcheck-check` - Shellcheck 检查耗时
- `format-document` - 总格式化耗时
- `diagnose-document` - 总诊断耗时

> 详见 [monitor.md](./monitor.md) 了解完整实现细节

## 关键设计模式

### 1. 插件模式

所有格式化和诊断功能都通过插件实现：

```typescript
export interface IFormatPlugin {
  name: string;
  displayName: string;
  version: string;
  description: string;
  isAvailable(): Promise<boolean>;
  format(document: TextDocument, options: FormatOptions): Promise<TextEdit[]>;
  check(document: TextDocument, options: CheckOptions): Promise<CheckResult>;
  getSupportedExtensions(): string[];
}

// 插件实现示例
export class PureShfmtPlugin implements IFormatPlugin {
  name = "shfmt";
  displayName = "Shfmt";
  version = "3.7.0";
  description = "Shell script formatter";

  async format(
    document: TextDocument,
    options: FormatOptions,
  ): Promise<TextEdit[]> {
    // 格式化逻辑
  }

  async check(
    document: TextDocument,
    options: CheckOptions,
  ): Promise<CheckResult> {
    // 检查逻辑
  }
}
```

### 2. 单例模式

全局服务使用单例模式：

```typescript
// PluginManager 单例
let globalPluginManager: PluginManager | null = null;

export function getPluginManager(): PluginManager {
  if (!globalPluginManager) {
    globalPluginManager = new PluginManager();
    logger.info("Global plugin manager initialized");
  }
  return globalPluginManager;
}

// PerformanceMonitor 单例
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }
}
```

### 3. 依赖注入模式

使用 DI 容器管理服务依赖：

```typescript
// 注册服务
container.registerSingleton(
  ServiceNames.PLUGIN_MANAGER,
  () => new PluginManager(),
  [],
);

// 解析服务
const pluginManager = container.resolve<PluginManager>(
  ServiceNames.PLUGIN_MANAGER,
);
```

### 4. Provider 模式

VSCode 使用 Provider 模式来扩展编辑器功能：

| Provider                            | 功能       | 接口                                    |
| ----------------------------------- | ---------- | --------------------------------------- |
| DocumentFormattingEditProvider      | 文档格式化 | `provideDocumentFormattingEdits()`      |
| DocumentRangeFormattingEditProvider | 选区格式化 | `provideDocumentRangeFormattingEdits()` |
| CodeActionsProvider                 | 代码操作   | `provideCodeActions()`                  |

### 5. 适配器模式

将工具结果转换为 VSCode 诊断：

```typescript
export class DiagnosticAdapter {
  static convert(
    result: ToolResult,
    document: vscode.TextDocument,
    source: string,
  ): vscode.Diagnostic[] {
    // 转换逻辑
  }
}
```

### 6. 事件驱动模式

通过监听 VSCode 事件来触发诊断：

```typescript
// 文档保存时触发
const saveListener = vscode.workspace.onDidSaveTextDocument((document) => {
  if (isShellScript(document)) {
    diagnoseDocument(document);
  }
});

// 文档打开时触发
const openListener = vscode.workspace.onDidOpenTextDocument((document) => {
  if (isShellScript(document)) {
    diagnoseDocument(document);
  }
});

// 文档变化时防抖触发
const changeListener = vscode.workspace.onDidChangeTextDocument((event) => {
  if (isShellScript(event.document)) {
    debounceManager.debounce(uri, () => diagnoseDocument(event.document), 300);
  }
});

// 配置变更时触发
const configListener = vscode.workspace.onDidChangeConfiguration((event) => {
  if (SettingInfo.isConfigurationChanged(event)) {
    // 重置 DI 容器和重新激活插件
    const container = getContainer();
    container.reset();
    initializeDIContainer(container);
    initializePlugins();
  }
});
```

## 性能优化

### 1. 并行插件激活

使用 Promise.all 并行激活插件：

```typescript
async activateMultiple(names: string[]): Promise<number> {
    const activationResults = await Promise.all(
        names.map(async (name) => {
            const success = await this.activate(name);
            return { name, success };
        }),
    );
    return activationResults.filter((r) => r.success).length;
}
```

**性能提升**：

- 串行激活：250ms
- 并行激活：150ms
- **提升：40%**

### 2. 防抖机制

编辑时使用 300ms 防抖，避免频繁触发诊断：

```typescript
debounceManager.debounce(
  uri,
  async () => {
    const diagnostics = await diagnoseDocument(event.document);
    diagnosticCollection.set(event.document.uri, diagnostics);
  },
  300,
);
```

### 3. 按需诊断

只在以下情况触发诊断：

- 打开 Shell 脚本文件
- 保存 Shell 脚本文件
- 编辑 Shell 脚本文件（防抖）
- 配置变更时重新诊断所有文件

### 4. 配置缓存

配置快照机制避免频繁调用 VSCode API：

```typescript
static refreshCache(): void {
    this.configCache = {
        tabSize: this.getTabSizeImpl(),
        log: this.getLogImpl(),
        // ...
    };
}
```

### 5. 异步执行

所有外部命令（shellcheck、shfmt）使用异步执行，不阻塞 UI。

### 6. 取消支持

通过 CancellationToken 支持取消操作：

```typescript
format(document: TextDocument, options: FormatOptions): Promise<TextEdit[]> {
    const token = options.token;
    if (token?.isCancellationRequested) {
        return [];
    }
    // ...
}
```

## 错误处理

### 1. 外部命令错误

```typescript
plugin.format(document, options).catch((error) => {
  logger.error(`Plugin "${name}" format failed: ${String(error)}`);
  return [];
});
```

### 2. 插件可用性检查

```typescript
async activate(name: string): Promise<boolean> {
    const plugin = this.plugins.get(name);
    if (!plugin) {
        logger.error(`Plugin "${name}" is not registered`);
        return false;
    }

    const isAvailable = await plugin.isAvailable();
    if (!isAvailable) {
        logger.warn(`Plugin "${name}" is not available`);
        return false;
    }

    this.activePlugins.add(name);
    return true;
}
```

### 3. 配置错误处理

```typescript
try {
  SettingInfo.refreshCache();
  // ...
} catch (error) {
  logger.error(`Error handling configuration change: ${String(error)}`);
}
```

## 扩展性设计

### 1. 添加新插件

```typescript
// 1. 实现插件接口
export class MyPlugin implements IFormatPlugin {
    name = "myPlugin";
    displayName = "My Plugin";
    version = "1.0.0";
    description = "My custom plugin";

    async format(document: TextDocument, options: FormatOptions): Promise<TextEdit[]> {
        // 格式化逻辑
    }

    async check(document: TextDocument, options: CheckOptions): Promise<CheckResult> {
        // 检查逻辑
    }
}

// 2. 在 di/initializer.ts 中注册
container.registerSingleton(
    ServiceNames.MY_PLUGIN,
    () => new MyPlugin(),
    [],
);

// 3. 在 pluginInitializer.ts 中激活
if (SettingInfo.isMyPluginEnabled()) {
    enabledPlugins.push("myPlugin");
}

// 4. 在 package.json 中添加配置
"shell-format.plugins.myPlugin": {
    "type": "object",
    "default": { "enabled": true, "path": "myPlugin" }
}
```

### 2. 添加新命令

```typescript
// 在 commands/ 下创建新文件
export function registerMyCommand(): vscode.Disposable {
  return vscode.commands.registerCommand("shell-format.myCommand", () => {
    // 实现命令逻辑
  });
}

// 在 index.ts 中注册
export function registerAllCommands(): vscode.Disposable[] {
  return [
    registerFormatCommand(),
    registerFixCommand(),
    registerMyCommand(), // 注册新命令
  ];
}
```

### 3. 添加新的配置项

```typescript
// 在 package.json 中添加
"configuration": {
    "properties": {
        "shell-format.plugins.myPlugin": {
            "type": "object",
            "default": { "enabled": true, "path": "myPlugin" }
        }
    }
}

// 在 settingInfo.ts 中访问
export class SettingInfo {
    static isMyPluginEnabled(): boolean {
        this.ensureCacheInitialized();
        return this.configCache!.plugins.myPlugin?.enabled ?? true;
    }

    static getMyPluginPath(): string {
        this.ensureCacheInitialized();
        return this.configCache!.plugins.myPlugin?.path ?? "myPlugin";
    }
}
```

## 架构演进

### 服务层到插件架构的转变

在架构演进中，从服务层（`services/`）转换为插件架构（`plugins/`）：

**关键改进**：

1. **插件接口** - 定义统一的 IFormatPlugin 接口
2. **插件管理器** - PluginManager 管理插件生命周期
3. **并行激活** - 支持 Promise.all 并行激活插件（40% 性能提升）
4. **配置驱动** - 基于配置动态激活/停用插件
5. **依赖注入** - 引入 DI 容器管理服务依赖

**从服务层到插件架构的转变**：

```typescript
// 旧架构：服务层
const serviceManager = ServiceManager.getInstance();
const shfmtService = serviceManager.getShfmtService();
const result = await shfmtService.format(fileName, token);

// 新架构：插件架构
const container = getContainer();
const pluginManager = container.resolve<PluginManager>(
  ServiceNames.PLUGIN_MANAGER,
);
const result = await pluginManager.format(document, { token });
```

### 配置管理的演进

**旧架构**：

- 平铺配置结构（shell-format.shfmtPath, shell-format.shellcheckPath）
- 每次调用都读取 VSCode API
- 缺少配置缓存机制

**新架构**：

- 嵌套配置结构（shell-format.plugins.shfmt.path）
- 配置快照机制
- 支持插件启用/禁用
- 细粒度配置变化检测

```typescript
// 新架构：嵌套配置
{
  "shell-format.plugins": {
    "shfmt": { "enabled": true, "path": "shfmt" },
    "shellcheck": { "enabled": true, "path": "shellcheck" }
  }
}

// 配置变化时
SettingInfo.refreshCache();
container.reset();
initializeDIContainer(container);
initializePlugins();
```

### 性能优化的演进

**旧架构**：

- 串行插件激活（250ms）
- 缺少性能指标收集

**新架构**：

- 并行插件激活（150ms，40% 提升）
- 内置性能监控
- 性能指标报告命令

---

## 总结

Shell Format 采用插件化、可扩展的架构设计，通过清晰的模块划分和单向依赖关系，实现了高内聚、低耦合的代码结构。项目充分利用了 VSCode Extension API 的 Provider 模式和事件驱动机制，提供了良好的用户体验和开发者体验。

**架构优势**：

- ✅ 插件化设计，易于维护和扩展
- ✅ 依赖注入，支持循环依赖检测
- ✅ 单向依赖，避免循环依赖
- ✅ 关注点分离，职责清晰
- ✅ 并行执行，性能提升 40%
- ✅ 异步执行，不阻塞 UI
- ✅ 完善的错误处理和日志系统
- ✅ 配置缓存，细粒度变更检测
- ✅ 性能监控，指标收集和报告

**相关文档**：

- [package.json](../../package.json) - 扩展配置文件
- [ARCHITECTURE_REVIEW.md](../../ARCHITECTURE_REVIEW.md) - 架构评审报告
- [vscode/extension-api.md](../vscode/extension-api.md) - VSCode Extension API 说明
