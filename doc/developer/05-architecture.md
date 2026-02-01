# 架构与核心设计

本篇聚焦项目整体架构设计、关键模块职责与性能优化策略。建议在阅读[项目结构与目录布局](03-project-layout.md)后进入本篇。

## 概述

Shell Formatter 是一个基于 VSCode 扩展 API 的 Shell 脚本格式化和诊断工具。本文档详细说明项目的架构设计、技术选型和实现细节。

> **注意**：本文档专注于项目整体架构设计。
>
> - 关于 **插件机制详解**，请参考 [插件系统详解](06-plugin-system.md)
> - 关于 VSCode Extension API 的详细说明，请参考 [extension-api.md](../vscode/extension-api.md)

## 核心概念

### 插件系统 (Plugin System)

- **动态注册和注销** - 运行时注册/移除插件
- **插件激活管理** - 基于配置激活/停用插件
- **并行激活** - 支持并行插件激活（40% 性能提升）

**插件管理器（关键初始化）**：

```typescript
export class PluginManager {
  private baseManager: BasePluginManager<IFormatPlugin>;

  constructor() {
    this.baseManager = new BasePluginManager({
      throwOnActivationError: false,
      throwOnDeactivationError: false,
    });
  }

  register(plugin: IFormatPlugin): void {
    this.baseManager.register(plugin);
  }

  async unregister(name: string): Promise<void> {
    await this.baseManager.unregister(name);
  }

  async activateMultiple(names: string[]): Promise<number> {
    return this.baseManager.activateMultiple(names);
  }
}
```

**插件接口**：

```typescript
export interface IFormatPlugin extends IPlugin {
  name: string;
  displayName: string;
  version: string;
  description: string;
  isAvailable(): Promise<boolean>;
  format?(
    document: Document,        // 领域类型，不依赖 VSCode
    options: PluginFormatOptions,
  ): Promise<PluginFormatResult>;
  check(
    document: Document,        // 领域类型，不依赖 VSCode
    options: PluginCheckOptions,
  ): Promise<PluginCheckResult>;
  getSupportedExtensions(): string[];
}
```

> **架构说明**：插件接口使用领域类型（`Document`, `Diagnostic`, `TextEdit` 等），不依赖 VSCode 类型。这种设计使得插件层可以在 CLI、Web、桌面应用等多种场景中复用。VSCode 特定的类型转换由适配器层（`DocumentAdapter`）处理。

### 依赖注入 (Dependency Injection)

使用轻量级 DI 容器管理服务与插件依赖，支持单例、瞬时模式与循环依赖检测：

```typescript
export class DIContainer {
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
}
```

### 诊断集合 (DiagnosticCollection)

用于集中管理 Shell 脚本的格式化和语法检查诊断信息。详细 API 说明请参考 [../vscode/extension-api.md](../vscode/extension-api.md)。

### 模块导入和路径解析

项目使用 **ES Modules** (`type: "module"`) 配合路径别名系统，实现清晰的模块导入。

#### 导入配置

项目通过两套配置系统实现路径别名：

| 配置文件 | 配置项 | 值 | 作用阶段 |
|---------|---------|------|---------|
| `package.json` | `imports` | `"#*": "./src/*"` | Node.js 运行时解析 |
| `tsconfig.json` | `paths` | `"#/*": ["./src/*"]` | TypeScript 编译时解析 |

#### 工作原理

```typescript
// 1. 代码中使用路径别名
import { logger } from '#/utils/log';

// 2. TypeScript 编译时通过 tsconfig.json 的 paths 解析
//    #/utils/log → ./src/utils/log

// 3. Node.js 运行时通过 package.json 的 imports 解析
//    #/utils/log → ./src/utils/log

// 4. 最终都指向同一个文件
//    src/utils/log.ts
```

#### 配置注意事项

| 要点 | 说明 |
|------|------|
| **语法差异** | `package.json` 的 `imports` 使用 `#*`（不带斜杠），`tsconfig.json` 的 `paths` 使用 `#/*`（带斜杠） |
| **路径相对性** | `paths` 的路径相对于配置文件位置。主配置用 `./src/*`，测试配置用 `../src/*` |
| **一致性** | 两个配置系统的映射必须保持一致，否则会导致编译或运行时错误 |
| **ESM 要求** | 必须在 `package.json` 中设置 `"type": "module"` 才能启用 ESM |

#### 示例：配置多个路径别名

```json
// package.json
{
  "type": "module",
  "imports": {
    "#*": "./src/*",
    "#utils/*": "./src/utils/*",
    "#config/*": "./src/config/*"
  }
}
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "resolvePackageJsonImports": true,
    "paths": {
      "#/*": ["./src/*"],
      "#utils/*": ["./src/utils/*"],
      "#config/*": ["./src/config/*"]
    }
  }
}
```

### 文档过滤

文档过滤是确保扩展只对合适的文件进行诊断和格式化的关键机制。如果不过滤，会导致以下问题：

1. **性能问题**：对非 Shell 文件进行不必要的诊断，浪费资源
2. **错误诊断**：对临时文件、虚拟文件生成错误的诊断结果
3. **诊断残留**：虚拟文档（如 AI 助手的 diff 视图）关闭后，诊断错误无法消失

#### 过滤层级

文档过滤分为三个层级，按顺序执行：

**第一层：语言 ID 过滤**

只处理 VSCode 识别为 Shell 脚本的文件：

```typescript
// 只处理 shell 语言文件
if (document.languageId !== PackageInfo.languageId) {
    logger.debug(`Skipping file with non-shell language: ${document.fileName}`);
    return true;
}
```

**第二层：文件扩展名过滤**

检查文件是否有合法的后缀名（`.sh`、`.bash`、`.zsh`）：

```typescript
// 合法后缀名从 PackageInfo.fileExtensions 获取
const validFileSuffixes = PackageInfo.fileExtensions; // ['.sh', '.bash', '.zsh']
const hasValidSuffix = validFileSuffixes.some(ext => fileName.endsWith(ext));
if (!hasValidSuffix) {
    logger.debug(`Skipping file with invalid suffix: ${uri.toString()}`);
    return true;
}
```

**第三层：URI Scheme 过滤**

只处理实际的磁盘文件，跳过虚拟文档：

```typescript
// 跳过非 file/git scheme 的文件
if (uri.scheme !== 'file' && uri.scheme !== 'git') {
    logger.debug(`Skipping file with non-file/git scheme: ${uri.toString()}`);
    return true;
}
```

#### 为什么需要 URI Scheme 过滤

当使用 AI 助手扩展（如 Genie）修改代码时，会创建虚拟文档（URI scheme 如 `genie-diff`）。如果对这些虚拟文档进行诊断：

- 诊断结果被绑定到虚拟文档的 URI（如 `genie-diff://...`）
- 虚拟文档关闭后，诊断集合中仍然保留这些诊断
- 由于不是实际文件，无法通过正常的文件关闭事件清理
- 导致问题面板的错误提示一直存在，无法消失

#### 常见 URI Scheme 列表

| Scheme | 来源 | 说明 | 处理方式 |
|--------|------|------|---------|
| `file` | 内置 | 磁盘上的实际文件，如 `file:///path/to/file.sh` | ✅ 处理 |
| `git` | 内置 Git | Git 版本控制中的文件，如 `git:/path/to/file.sh` | ✅ 处理 |
| `untitled` | 内置 | 未保存的新文件，如 `untitled:Untitled-1` | ❌ 跳过 |
| `output` | 扩展 | 输出通道，如 `output:extension-name` | ❌ 跳过 |
| `git-index` | 内置 Git | Git 索引中的内容，如 `git-index:/path/to/file.sh` | ❌ 跳过 |
| `debug` | 内置 | 调试源文件，如 `debug:/path/to/file.sh` | ❌ 跳过 |
| `vscode-notebook-cell` | 内置 | Notebook 单元格 | ❌ 跳过 |
| `vscode-vfs` | 内置 | 虚拟文件系统，如 `vscode-vfs://...` | ❌ 跳过 |
| `genie-diff` | 第三方 | AI 助手的 diff 视图，如 `genie-diff://...` | ❌ 跳过 |

#### 核心代码实现

```typescript
// src/shared/file-checker.ts

/**
 * 检查是否应该跳过该文件
 * 
 * 过滤逻辑：
 * 1. 检查 URI 是否为空
 * 2. 处理 .git 后缀（Git 冲突文件）
 * 3. 检查文件扩展名是否合法
 * 4. 检查 URI scheme 是否为 file 或 git
 * 
 * @param uri 文档 URI
 * @returns 如果应该跳过返回 true，否则返回 false
 */
export function shouldSkipUri(uri: vscode.Uri): boolean {
    // 1. 如果 uri 为空，直接跳过
    if (!uri) {
        logger.debug(`Skipping file with empty uri`);
        return true;
    }

    let fileName = uri.fsPath.split('/').pop() || '';

    // 2. 如果文件以 .git 结尾，则删除 .git 再进行检查
    // 这是为了处理 Git 冲突文件（如 file.sh.git）
    const gitSuffix = /\.git$/;
    if (gitSuffix.test(fileName)) {
        logger.debug(`Found .git suffix in file name: ${fileName}, removing .git suffix for check`);
        fileName = fileName.replace(gitSuffix, '');
    }

    // 3. 检查文件扩展名
    const validFileSuffixes = PackageInfo.fileExtensions;
    const hasValidSuffix = validFileSuffixes.some(ext => fileName.endsWith(ext));
    if (!hasValidSuffix) {
        logger.debug(`Skipping file with invalid suffix: ${uri.toString()}`);
        return true;
    }

    // 4. 跳过非 file/git scheme 的文件
    if (uri.scheme !== 'file' && uri.scheme !== 'git') {
        logger.debug(`Skipping file with non-file/git scheme: ${uri.toString()}`);
        return true;
    }

    logger.debug(`File passed all checks, will not skip: ${uri.toString()}`);
    return false;
}

/**
 * 检查文档是否应该跳过
 * 在 shouldSkipUri 的基础上增加语言 ID 检查
 * 
 * @param document VSCode 文档对象
 * @returns 如果应该跳过返回 true，否则返回 false
 */
export function shouldSkipFile(document: vscode.TextDocument): boolean {
    if (!document) {
        logger.debug(`Skipping file with empty document`);
        return true;
    }

    // 只处理 shell 语言文件
    if (document.languageId !== PackageInfo.languageId) {
        logger.debug(`Skipping file with non-shell language: ${document.fileName}`);
        return true;
    }

    return shouldSkipUri(document.uri);
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
extension.ts (VSCode 入口层)
    ↓
commands/  diagnostics/  formatters/ (VSCode 适配层)
    ↓           ↓              ↓
plugins/ (领域层 - 使用领域类型)
    ↓
DI Container
    ↓
config/  tools/  utils/ (基础设施层)
```

- `extension.ts` 依赖所有功能模块，作为 VSCode 扩展入口
- 业务模块（commands/、diagnostics/、formatters/）依赖 `plugins/`
- `plugins/` 使用领域类型（`Document`, `Diagnostic`, `TextEdit`），不依赖 VSCode
- `PluginManager` 作为适配器层，负责 VSCode 类型与领域类型的转换
- 业务模块之间相互独立

### 2.1 类型转换架构

为了实现领域层与 VSCode 的解耦，引入适配器层进行类型转换：

```text
VSCode 类型                    领域类型
───────────                   ─────────
TextDocument    ←───────→     Document
Diagnostic        ←───────→   Diagnostic
TextEdit          ←───────→   TextEdit
Range             ←───────→   Range
Position          ←───────→   Position
```

**转换流程**：

```typescript
// 1. VSCode 调用 PluginManager
const result = await pluginManager.format(vscodeDocument, options);

// 2. PluginManager 内部转换为领域类型
const domainDocument = DocumentAdapter.toDocument(vscodeDocument);
const domainResult = await plugin.format(domainDocument, options);

// 3. 插件返回领域类型结果
return {
    textEdits: domainResult.textEdits,  // 领域类型 TextEdit[]
    diagnostics: domainResult.diagnostics  // 领域类型 Diagnostic[]
};

// 4. PluginManager 转换回 VSCode 类型
return {
    textEdits: DocumentAdapter.fromTextEdits(domainResult.textEdits),
    diagnostics: DocumentAdapter.fromDiagnostics(domainResult.diagnostics)
};
```

### 3. 关注点分离

| 层级         | 职责           | 示例                                       | 依赖关系                |
| ------------ | -------------- | ------------------------------------------ | ----------------------- |
| **Entrypoints 层** | VSCode API 接入 | `entrypoints/commands/`, `entrypoints/listeners/` | 依赖 Application 层     |
| **Application 层** | 用例编排       | `application/usecases/`, `application/services/`  | 依赖 Domain 层          |
| **Domain 层**      | 核心业务逻辑   | `domain/port/`, `domain/plugins/`                 | 完全独立，无外部依赖    |
| **Infrastructure 层** | 外部适配    | `infrastructure/adapters/`, `infrastructure/shell-tools/` | 依赖 Domain 层和 Utils 层 |
| **Shared 层**      | 跨层工具       | `shared/converters/`, `shared/logger.ts`          | 依赖 Utils 层           |
| **Utils 层**       | 基础设施       | `utils/executor/`, `utils/di/`, `utils/plugin/`   | 完全独立，无项目依赖    |

**领域类型说明**：

插件层使用领域类型（Domain Types），这些类型是对 VSCode 类型的抽象，不依赖任何外部框架：

| 领域类型         | 对应 VSCode 类型     | 说明                           |
| ---------------- | -------------------- | ------------------------------ |
| `Document`       | `TextDocument`       | 文档内容、URI、语言 ID 等      |
| `Diagnostic`     | `Diagnostic`         | 诊断信息（位置、消息、级别）   |
| `TextEdit`       | `TextEdit`           | 文本编辑操作                   |
| `Range`          | `Range`              | 文本范围                       |
| `Position`       | `Position`           | 行号和列号                     |
| `DiagnosticSeverity` | `DiagnosticSeverity` | 错误、警告、信息、提示         |

### 3.1 领域类型定义

领域类型定义在 `src/plugins/types.ts`：

```typescript
/**
 * 文档领域模型
 */
export interface Document {
    uri: string;           // 文档 URI
    content: string;       // 文档内容
    languageId: string;    // 语言 ID
    fileName: string;      // 文件名
    lineCount: number;     // 行数
}

/**
 * 诊断领域模型
 */
export interface Diagnostic {
    range: Range;                              // 诊断范围
    message: string;                           // 诊断消息
    severity: DiagnosticSeverity;              // 严重级别
    code?: string | number;                    // 诊断代码
    source?: string;                           // 诊断源
}

/**
 * 文本编辑领域模型
 */
export interface TextEdit {
    range: Range;          // 编辑范围
    newText: string;       // 新文本内容
}
```

### 3.2 适配器实现

`DocumentAdapter` 提供双向类型转换：

```typescript
export class DocumentAdapter {
    // VSCode → 领域类型
    static toDocument(document: vscode.TextDocument): Document;
    static toDiagnostic(diagnostic: vscode.Diagnostic): Diagnostic;
    static toTextEdit(edit: vscode.TextEdit): TextEdit;

    // 领域类型 → VSCode
    static fromDocument(document: Document): vscode.TextDocument;
    static fromDiagnostic(diagnostic: Diagnostic): vscode.Diagnostic;
    static fromTextEdit(edit: TextEdit): vscode.TextEdit;

    // 批量转换
    static toDiagnostics(diagnostics: vscode.Diagnostic[]): Diagnostic[];
    static fromDiagnostics(diagnostics: Diagnostic[]): vscode.Diagnostic[];
}
```

### 3.3 架构优势

1. **框架无关**：插件层可在 CLI、Web、桌面应用等场景复用
2. **易于测试**：领域类型不依赖 VSCode，便于单元测试
3. **清晰边界**：通过适配器层隔离外部框架依赖
4. **类型安全**：编译时检查类型转换的正确性

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

```text
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

```text
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

```text
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

### 9. 基础设施适配器 (infrastructure/adapters/)

**职责**：

- 将外部工具适配到领域端口接口
- 实现领域类型与 VSCode 类型的转换
- 统一工具调用接口

**核心设计**：

```typescript
// infrastructure/adapters/shfmt-adapter.ts
export class ShfmtToolAdapter implements IFormatTool {
    private tool: ShfmtTool;

    constructor(tool: ShfmtTool) {
        this.tool = tool;
    }

    async format(content: string, options?: FormatToolOptions): Promise<string> {
        return this.tool.format(content, options);
    }

    async check(content: string, options?: CheckToolOptions): Promise<ToolCheckResult> {
        return this.tool.check(content, options);
    }

    async isAvailable(): Promise<boolean> {
        return this.tool.isAvailable();
    }
}
```

### 10. 共享层转换器 (shared/converters/)

**职责**：

- 领域类型与 VSCode 类型的双向转换
- 集中管理类型转换逻辑

**核心设计**：

```typescript
// shared/converters/document.ts
export class DocumentConverter {
    // VSCode → 领域类型
    static toDomain(document: vscode.TextDocument): Document {
        return {
            uri: document.uri.toString(),
            content: document.getText(),
            languageId: document.languageId,
            fileName: document.fileName,
            lineCount: document.lineCount,
        };
    }

    // 领域类型 → VSCode
    static toVscodeEdit(edit: TextEdit): vscode.TextEdit {
        return new vscode.TextEdit(
            new vscode.Range(
                edit.range.start.line,
                edit.range.start.character,
                edit.range.end.line,
                edit.range.end.character
            ),
            edit.newText
        );
    }
}
```

### 11. 配置管理 (config/setting-info.ts)

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
      plugins: this.getPluginsImpl(),
    };
  }

  // 配置变更检测
  static isConfigurationChanged(
    event: vscode.ConfigurationChangeEvent,
  ): boolean {
    const keys = [
      "shell-formatter.plugins.shfmt",
      "shell-formatter.plugins.shellcheck",
      "shell-formatter.tabSize",
      "shell-formatter.log",
      "shell-formatter.onError",
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

> 详见 [可观测性与性能监控](07-observability.md) 了解完整实现细节

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

    async format(
      document: TextDocument,
      options: PluginFormatOptions,
    ): Promise<PluginFormatResult> {
        // 格式化逻辑
    }

    async check(
      document: TextDocument,
      options: PluginCheckOptions,
    ): Promise<PluginCheckResult> {
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
"shell-formatter.plugins.myPlugin": {
    "type": "object",
    "default": { "enabled": true, "path": "myPlugin" }
}
```

### 2. 添加新命令

```typescript
// 在 commands/ 下创建新文件
export function registerMyCommand(): vscode.Disposable {
  return vscode.commands.registerCommand("shell-formatter.myCommand", () => {
    // 实现命令逻辑
  });
}

// 在 index.ts 中注册
export function registerAllCommands(): vscode.Disposable[] {
  return [
    registerFixAllCommand(),
    registerPerformanceReportCommand(),
    registerResetPerformanceCommand(),
    registerPluginStatusCommand(),
    registerMyCommand(), // 注册新命令
  ];
}
```

### 3. 添加新的配置项

```typescript
// 在 package.json 中添加
"configuration": {
    "properties": {
        "shell-formatter.plugins.myPlugin": {
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

- 平铺配置结构（shell-formatter.shfmtPath, shell-formatter.shellcheckPath）
- 每次调用都读取 VSCode API
- 缺少配置缓存机制

**新架构**：

- 嵌套配置结构（shell-formatter.plugins.shfmt.path）
- 配置快照机制
- 支持插件启用/禁用
- 细粒度配置变化检测

```typescript
// 新架构：嵌套配置
{
  "shell-formatter.plugins": {
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

Shell Formatter 采用插件化、可扩展的架构设计，通过清晰的模块划分和单向依赖关系，实现了高内聚、低耦合的代码结构。项目充分利用了 VSCode Extension API 的 Provider 模式和事件驱动机制，提供了良好的用户体验和开发者体验。

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
