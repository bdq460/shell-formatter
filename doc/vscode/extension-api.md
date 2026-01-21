# VSCode 扩展开发指南

本文档整理了开发 VSCode 扩展时需要注意的 VSCode 框架 API 和机制，基于 Shell Format 扩展的实际开发经验。

## 目录

- [扩展生命周期](#扩展生命周期)
- [扩展激活](#扩展激活)
- [资源管理](#资源管理)
- [事件监听](#事件监听)
- [Provider 模式](#provider-模式)
- [命令系统](#命令系统)
- [诊断系统](#诊断系统)
- [配置管理](#配置管理)
- [文本编辑](#文本编辑)

---

## 扩展生命周期

### 激活和停用

VSCode 扩展有两个核心生命周期函数：

```typescript
export function activate(context: vscode.ExtensionContext) {
    // 扩展激活时调用
}

export function deactivate() {
    // 扩展停用时调用
}
```

**激活时机**：

- 通过 `activationEvents` 配置
- 常见激活事件：
  - `onLanguage:shellscript` - 打开特定语言文件时激活
  - `onCommand:shell-format.xxx` - 执行特定命令时激活
  - `*` - 启动 VSCode 时立即激活

**停用时机**：

- 关闭 VSCode 窗口
- 禁用扩展
- 重新加载窗口（Reload Window）
- 卸载扩展

---

## 扩展激活

### ExtensionContext

`ExtensionContext` 是扩展激活时传入的上下文对象，提供了重要属性：

| 属性 | 类型 | 用途 |
|-----|------|------|
| `subscriptions` | `Disposable[]` | 存储需要自动清理的资源 |
| `workspaceState` | `Memento` | 工作区级别的持久化存储 |
| `globalState` | `Memento` | 全局级别的持久化存储 |
| `extensionPath` | `string` | 扩展的安装路径 |
| `extensionUri` | `Uri` | 扩展的 Uri 对象 |

```typescript
export function activate(context: vscode.ExtensionContext) {
    // 注册需要自动清理的资源
    const command = vscode.commands.registerCommand('my.command', () => {
        // 命令实现
    });

    const listener = vscode.workspace.onDidChangeTextDocument((e) => {
        // 监听器实现
    });

    // 添加到 subscriptions，停用时自动清理
    context.subscriptions.push(command, listener);
}
```

---

## 资源管理

### Disposable 模式

**什么是 Disposable？**

VSCode 使用 `Disposable` 接口来管理需要手动释放的资源。

**Disposable 的类型**：

| 类型 | 接口 | 清理方式 |
|-----|------|---------|
| 事件监听器 | `Disposable` | `dispose()` |
| 命令注册 | `Disposable` | `dispose()` |
| Provider 注册 | `Disposable` | `dispose()` |
| 诊断集合 | `DiagnosticCollection` | `dispose()` |
| 输出通道 | `OutputChannel` | `dispose()` |
| 状态栏项 | `StatusBarItem` | `dispose()` |

**自动清理机制**：

`vscode.ExtensionContext.subscriptions` 是一个 Disposable 数组。当扩展被停用时，VSCode 会自动调用每个 disposable 的 `dispose()` 方法。

**清理时机**：

VSCode 会在以下情况自动调用 `deactivate()` 并清理 subscriptions：

- 关闭 VSCode 窗口
- 禁用扩展
- 重新加载窗口（Reload Window）
- 卸载扩展

```typescript
export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.languages.registerDocumentFormattingEditProvider(...);

    // 添加到 subscriptions
    context.subscriptions.push(disposable);
}

export function deactivate() {
    // context.subscriptions 中的资源由 VSCode 自动清理
    // 不需要手动调用 dispose()
}
```

**手动清理的资源**：

```typescript
export function deactivate() {
    // 防抖定时器不是 Disposable，需要手动清理
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }

    // 输出通道需要手动清理（如果不在 subscriptions 中）
    if (outputChannel) {
        outputChannel.dispose();
    }
}
```

---

## 事件监听

### 常用工作区事件

| 事件 | 触发时机 | 用途 | 防抖 |
|-----|---------|------|------|
| `onDidOpenTextDocument` | 文档打开时 | 初始诊断 | ❌ |
| `onDidSaveTextDocument` | 文档保存时 | 保存时诊断 | ❌ |
| `onDidChangeTextDocument` | 文档内容变化时 | 实时诊断 | ✅ 推荐 |
| `onDidChangeConfiguration` | 配置变化时 | 重新初始化 | ❌ |
| `onDidCloseTextDocument` | 文档关闭时 | 清理缓存 | ❌ |

### 文档事件监听示例

```typescript
// 文档保存时诊断
const saveListener = vscode.workspace.onDidSaveTextDocument(
    async (document) => {
        if (document.languageId === 'shellscript') {
            await diagnoseDocument(document);
        }
    }
);

// 文档打开时诊断
const openListener = vscode.workspace.onDidOpenTextDocument(
    async (document) => {
        if (document.languageId === 'shellscript') {
            await diagnoseDocument(document);
        }
    }
);
```

### 配置变化监听

`onDidChangeConfiguration` 会监听配置变化，包括用户 `settings.json` 或工作区 `.vscode/settings.json` 所有配置变化。

**使用 `event.affectsConfiguration()` 精确判断**：

```typescript
const configChangeListener = vscode.workspace.onDidChangeConfiguration(
    async (event) => {
        // 检查是否影响当前扩展的配置
        if (event.affectsConfiguration('my-extension')) {
            // 重新初始化
            reinitialize();
        }

        // 检查特定配置项
        if (event.affectsConfiguration('my-extension.someSetting')) {
            // 处理特定配置变化
        }
    }
);
```

**自定义配置变更检测方法**：

```typescript
static isConfigurationChanged(event: vscode.ConfigurationChangeEvent): boolean {
    // 监听本插件的配置变化
    if (event.affectsConfiguration(this.configSection)) {
        return true;
    }
    // 只有当 tabSize 设置为 'vscode' 时，才需要监听 editor.tabSize 变化
    if (this.getTabSize() === 'vscode' && event.affectsConfiguration('editor.tabSize')) {
        return true;
    }
    return false;
}
```

---

## Provider 模式

### 文档格式化 Provider

#### DocumentFormattingEditProvider

用于提供文档格式化功能。

**触发条件**：

- 快捷键：用户按下格式化文档快捷键（默认是 `Cmd + Shift + F` / `Ctrl + Shift + F`）
- 命令面板：用户从命令面板选择"格式化文档"
- 保存时：如果配置了 `editor.formatOnSave`
- 粘贴时：如果配置了 `editor.formatOnPaste`
- 输入时：如果配置了 `editor.formatOnType`
- 自动保存：文件自动保存时触发

**格式化结果应用**：

`provideDocumentFormattingEdits()` 方法返回一个 `TextEdit[]`，表示格式化后的文本。VSCode 会自动应用这些编辑更新原始文档。

| 特性 | 说明 |
|-----|------|
| 接口方法 | `provideDocumentFormattingEdits()` |
| 返回类型 | `TextEdit[]` |
| 触发方式 | 快捷键、命令面板、保存时等 |
| 覆盖范围 | 整个文档 |

```typescript
const formatProvider = vscode.languages.registerDocumentFormattingEditProvider(
    'shellscript',
    {
        provideDocumentFormattingEdits(
            document: vscode.TextDocument,
            options: vscode.FormattingOptions,
            token: vscode.CancellationToken
        ): vscode.ProviderResult<vscode.TextEdit[]> {
            // 返回格式化后的 TextEdit
            const fullRange = new vscode.Range(
                document.positionAt(0),
                document.positionAt(document.getText().length)
            );
            return [vscode.TextEdit.replace(fullRange, formattedContent)];
        }
    }
);
```

#### DocumentRangeFormattingEditProvider

用于提供文档范围格式化功能。

**触发条件**：

通过选中代码后，从命令面板或右键菜单选择"格式化选中文本（Format Selection）"时，VSCode 会调用 `provideDocumentRangeFormattingEdits()` 方法。

`provideDocumentRangeFormattingEdits()` 方法返回一个 `TextEdit[]`，表示格式化后的文本。VSCode 会自动应用这些编辑更新原始文档。

**重要说明**：

> A document range provider is also a document formatter which means there is no need to register a document formatter when also registering a range provider.

注意：文档范围提供者也同时是文档格式化提供者，因此当注册范围提供者时不需要单独注册格式化提供者。

| 特性 | 说明 |
|-----|------|
| 接口方法 | `provideDocumentRangeFormattingEdits()` |
| 返回类型 | `TextEdit[]` |
| 触发方式 | 右键菜单"格式化选中文本" |
| 特性 | 同时支持整个文档格式化 |

**推荐做法**：

如果调用了 `registerDocumentRangeFormattingEditProvider` 注册了范围提供者：

1. 不需要再 `registerDocumentFormattingEditProvider`
2. 不需要再注册 `my-extension.formatDocument` 命令，因为默认格式化命令已经可以满足格式化需求

```typescript
// 只注册范围格式化提供者
const rangeFormatProvider = vscode.languages.registerDocumentRangeFormattingEditProvider(
    'shellscript',
    {
        provideDocumentRangeFormattingEdits(
            document: vscode.TextDocument,
            range: vscode.Range,
            options: vscode.FormattingOptions,
            token: vscode.CancellationToken
        ): vscode.ProviderResult<vscode.TextEdit[]> {
            // 跳过特殊文件
            if (shouldSkipFile(document.fileName)) {
                return [];
            }

            // 即使是范围格式化，也返回整个文档的格式化结果
            // VSCode 会自动裁剪选区内的变更
            return formatFullDocument(document);
        }
    }
);
```

**Shell 脚本格式化的特殊处理**：

注意：Shell 脚本的格式化需要完整的上下文（if/fi、do/done 等配对），因此即使只选中部分文本，也需要对整个文档进行格式化。

VSCode 会自动裁剪 TextEdit，只应用选区内的变更。

```typescript
/**
 * 格式化文档范围
 * 注意：Shell 脚本的格式化需要完整的上下文（if/fi、do/done 等配对），
 * 因此即使只选中部分文本，也需要对整个文档进行格式化。
 * VSCode 会自动裁剪 TextEdit，只应用选区内的变更。
 */
export async function formatDocumentRange(
    document: vscode.TextDocument,
    range: vscode.Range,
    options?: vscode.FormattingOptions,
    token?: vscode.CancellationToken
): Promise<vscode.TextEdit[]> {
    // 直接调用 formatDocument，由 VSCode 自动裁剪选区内的变更
    return formatDocument(document, options, token);
}
```

#### 格式化触发条件

| 触发方式 | Provider |
|---------|----------|
| 快捷键 `Cmd + Shift + F` | RangeFormattingEditProvider |
| 命令面板"格式化文档" | RangeFormattingEditProvider |
| 右键菜单"格式化文档" | RangeFormattingEditProvider |
| 保存时（配置了 `editor.formatOnSave`）| RangeFormattingEditProvider |
| 右键菜单"格式化选中文本" | RangeFormattingEditProvider |

### registerCodeActionsProvider

用于注册 Code Actions Provider。

**参数说明**：

| 参数 | 说明 |
|-----|------|
| `languageId` | 绑定特定语言，如 `'shellscript'` |
| `CodeActionProvider` | 实现 `provideCodeActions()` 方法的类实例 |
| `CodeActionProviderOptions` | 配置选项，包含 `providedCodeActionKinds` |

#### 参数CodeActionProvider

绑定Code Actions与具体执行命令名称, 只绑定命令名称，不绑定命令实现。

#### CodeActionProviderOptions

`CodeActionProviderOptions` 的作用是**过滤**，不是绑定实现。

**支持的 Code Actions 类型**：

| 类型 | 用途 | 说明 |
|-----|------|------|
| `QuickFix` | 修复单个问题 | 修复特定的、局部的问题 |
| `SourceFixAll` | 修复所有问题 | 修复整个文档的所有问题 |

##### 1. 性能优化 - 避免不必要的调用

当用户触发 CodeAction 时，VSCode 会询问所有注册的 CodeActionProvider。

- **如果不设置** `providedCodeActionKinds`：
  - 当用户点击灯泡图标时，VSCode 调用所有 provider → 你的 provider 被调用 → 返回所有 action

- **如果设置了** `providedCodeActionKinds: [QuickFix]`：
  - 用户保存文件时 → VSCode 只请求 `SourceFixAll` → 跳过你的 provider
  - 用户右键点击 → VSCode 请求 `QuickFix` → 调用你的 provider

##### 2. 过滤 - 精确匹配配置

当用户配置了 `editor.codeActionsOnSave`：

```json
{
  "editor.codeActionsOnSave": {
    "source.fixAll": "explicit",
    "source.fixAll.shell-format": "always"
  }
}
```

VSCode 会：

- 只调用声明了 `providedCodeActionKinds: [..., SourceFixAll]` 的 provider
- 过滤掉没有声明 SourceFixAll 的 provider

##### 3. 工作流程示例

假设有两个扩展：

- Extension A: `providedCodeActionKinds: [QuickFix]`
- Extension B (你的): `providedCodeActionKinds: [QuickFix, SourceFixAll.append('shell-format')]`

| 用户操作 | 调用 A | 调用你的扩展 |
|---------|--------|-------------|
| 保存文件（请求 SourceFixAll）| ✗ | ✓ |
| 保存文件（请求 SourceFixAll.shell-format）| ✗ | ✓ |
| 右键点击（请求 QuickFix）| ✓ | ✓ |

#### CodeActionProvider 的触发时机

VSCode 会在以下情况调用 `provideCodeActions()`：

1. **右键点击代码** → 显示上下文菜单
2. **点击灯泡图标 💡** → 显示快速修复选项
3. **按 `Cmd + .` / `Ctrl + .`** → 显示快速修复面板
4. **保存文件时**（如果配置了 `editor.codeActionsOnSave`）
5. **编辑器焦点变化时**（VSCode 可能会预先获取）

#### QuickFix vs SourceFixAll

##### vscode.CodeActionKind.QuickFix

| 特性 | 说明 |
|-----|------|
| 用途 | 修复特定的、局部的问题 |
| 触发方式 | 在代码中右键或按 `Cmd + .` 时显示的灯泡菜单 |
| 是否需要自定义子类型 | ❌ 不需要，因为它不通过 `codeActionsOnSave` 触发 |

##### vscode.CodeActionKind.SourceFixAll.${PackageInfo.extensionName}

| 特性 | 说明 |
|-----|------|
| 用途 | 修复整个文档的所有问题 |
| 触发方式 | 通过 `editor.codeActionsOnSave` 配置在保存时自动执行 |
| 是否需要自定义子类型 | ✅ 需要（如 `.append('shell-format')`），这样才能在 `codeActionsOnSave` 中精确控制 |

**为什么不需要给 QuickFix append？**

1. **QuickFix 不在 `codeActionsOnSave` 中使用**
   - `editor.codeActionsOnSave` 只支持 SourceFixAll 类型的 CodeAction，不支持 QuickFix 类型

2. **QuickFix 是用户手动触发的**
   - 此时不需要区分是哪个扩展的 QuickFix，因为用户已经选中了文档或问题
   - 当你在代码上看到错误提示时：
     - 点击灯泡图标 💡
     - 或按 `Cmd + .` / `Ctrl + .`

#### 注册示例

```typescript
const codeActionProvider = vscode.languages.registerCodeActionsProvider(
    PackageInfo.languageId,  // 绑定特定语言
    new ShellFormatCodeActionProvider(),
    {
        providedCodeActionKinds: [
            vscode.CodeActionKind.QuickFix,  // 灯泡图标显示
            vscode.CodeActionKind.SourceFixAll.append(PackageInfo.extensionName)  // 保存时自动执行
        ]
    }
);
```

#### provideCodeActions 方法详解

**方法签名**：

```typescript
public provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken
): vscode.ProviderResult<(vscode.CodeAction | vscode.Command)[]>
```

**参数说明**：

| 参数 | 说明 |
|-----|------|
| `document` | 当前文档对象 |
| `range` | 选中的范围或光标位置 |
| `context` | 代码操作上下文，包含诊断信息、触发类型等 |
| `token` | 取消令牌 |

**context 参数详解**：

```typescript
context: {
    only: CodeActionKind | undefined,  // 请求的特定类型
    triggerKind: CodeActionTriggerKind,  // 触发方式
    diagnostics: Diagnostic[]  // 范围内的诊断
}
```

**关键实现策略**：

```typescript
public provideCodeActions(...): vscode.ProviderResult<vscode.CodeAction[]> {
    const actions: vscode.CodeAction[] = [];

    // 从 DiagnosticCollection 获取当前文档的所有诊断
    const diagnosticCollection = getDiagnosticCollection();
    const documentDiagnostics = diagnosticCollection.get(document.uri) || [];

    // 检查是否有来自本扩展的诊断
    const matchingDiagnostics = documentDiagnostics.filter(
        d => d.source === PackageInfo.diagnosticSource
    );

    // 如果没有来自本扩展的诊断问题，则不提供任何操作
    if (matchingDiagnostics.length === 0) {
        return actions;
    }

    // 策略：
    // - "Fix all problems with shell-format" 总是显示（全局操作）
    // - "Fix this issue with shell-format" 只在 context.diagnostics 有诊断时显示（光标在错误位置）
    // - 由于诊断的 range 很小（1 个字符），光标很难在范围内，所以 "Fix this issue" 可能很少显示

    // 如果 context.diagnostics 有来自本扩展的诊断，创建 "Fix this issue"
    if (context.diagnostics && context.diagnostics.length > 0) {
        const contextMatchingDiagnostics = context.diagnostics.filter(
            d => d.source === PackageInfo.diagnosticSource
        );
        if (contextMatchingDiagnostics.length > 0) {
            // 只为第一个匹配的诊断创建 QuickFix，避免重复
            const diagnostic = contextMatchingDiagnostics[0];
            const fixThisAction = new vscode.CodeAction(
                'Fix this issue with shell-format',
                vscode.CodeActionKind.QuickFix
            );
            // 关联当前诊断问题
            fixThisAction.diagnostics = [diagnostic];
            fixThisAction.isPreferred = true;
            fixThisAction.command = {
                title: 'Fix this issue',
                command: 'shell-format.fixAllProblems',
                arguments: [document.uri]
            };
            actions.push(fixThisAction);
        }
    }

    // 为整个文档提供独立的 QuickFix: "Fix all problems with shell-format"
    // 不关联任何特定诊断，这样会在右键菜单中单独显示
    const fixAllAction = new vscode.CodeAction(
        'Fix all with shell-format',
        vscode.CodeActionKind.QuickFix
    );
    fixAllAction.command = {
        title: 'Fix all problems',
        command: 'shell-format.fixAllProblems',
        arguments: [document.uri]
    };
    actions.push(fixAllAction);

    return actions;
}
```

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
检查 context.diagnostics
    ↓
返回可执行的 CodeAction[]
    ↓
用户选择修复操作
    ↓
执行对应的命令
```

---

## 命令系统

### 注册命令

```typescript
const command = vscode.commands.registerCommand(
    'my-extension.myCommand',
    async (uri?: vscode.Uri) => {
        // 命令实现

        // 获取当前编辑器
        const editor = vscode.window.activeTextEditor;

        // 获取文档
        const document = editor?.document;

        // 从问题面板的修复命令调用（会传入 uri）
        if (uri) {
            document = vscode.workspace.textDocuments.find(
                doc => doc.uri.toString() === uri.toString()
            );
        }
    }
);

context.subscriptions.push(command);
```

### 命令与 CodeAction 的区别

| 特性 | 命令 (Commands) | CodeAction |
|-----|----------------|------------|
| 注册位置 | `package.json` → `commands` | `package.json` → `codeActions` |
| 触发方式 | 命令面板、快捷键、右键菜单 | 点击灯泡图标、`Cmd + .` |
| 是否关联问题 | ❌ 不关联 | ✅ 需要有问题才显示 |
| 实现方式 | `registerCommand()` | `registerCodeActionsProvider()` |
| 作用域 | 全局，可随时调用 | 局部，仅在有问题时显示 |

---

## 诊断系统

### DiagnosticCollection

**什么是 DiagnosticCollection？**

用于管理诊断信息（错误、警告、提示）的 API。

**作用**：

- 在编辑器中显示错误、警告、提示
- 统一管理所有文档的诊断信息
- 在"问题"面板中显示所有诊断
- 在代码中显示波浪线和灯泡图标

**创建和使用**：

```typescript
// 创建诊断集合
const diagnosticCollection = vscode.languages.createDiagnosticCollection('my-extension');

// 设置诊断
diagnosticCollection.set(document.uri, diagnostics);

// 删除诊断
diagnosticCollection.delete(document.uri);

// 清空所有诊断
diagnosticCollection.clear();

// 获取诊断
const diagnostics = diagnosticCollection.get(document.uri);
```

**Diagnostic 对象**：

```typescript
const diagnostic = new vscode.Diagnostic(
    new vscode.Range(startLine, startChar, endLine, endChar),
    '诊断消息',
    vscode.DiagnosticSeverity.Error  // Error, Warning, Info, Hint
);

diagnostic.source = 'my-extension';  // 诊断来源
diagnostic.code = 'SC1001';         // 错误代码
diagnostic.relatedInformation = [    // 相关信息
    new vscode.DiagnosticRelatedInformation(
        new vscode.Location(uri, range),
        '详细信息'
    )
];
```

**资源管理**：

DiagnosticCollection 实现了 Disposable 接口，需要清理：

- 内存占用：保存大量诊断信息
- UI 资源：编辑器中的波浪线、灯泡图标
- 事件监听：内部可能有事件监听器

```typescript
context.subscriptions.push(diagnosticCollection);
```

---

## 配置管理

### WorkspaceConfiguration

```typescript
// 获取配置对象
const config = vscode.workspace.getConfiguration('my-extension');

// 读取配置
const value = config.get<string>('mySetting', 'defaultValue');
const tabSize = config.get<number>('tabSize', 4);

// 写入配置（需要用户手动保存）
await config.update('mySetting', 'newValue', vscode.ConfigurationTarget.Global);
await config.update('mySetting', 'newValue', vscode.ConfigurationTarget.Workspace);
await config.update('mySetting', 'newValue', vscode.ConfigurationTarget.WorkspaceFolder);
```

### package.json 配置定义

```json
{
  "contributes": {
    "configuration": {
      "type": "object",
      "title": "My Extension",
      "properties": {
        "my-extension.mySetting": {
          "type": "string",
          "default": "defaultValue",
          "description": "设置说明",
          "enum": ["option1", "option2"],
          "markdownDescription": "**Markdown** 格式的说明"
        }
      }
    }
  }
}
```

### 配置变更检测

```typescript
const configChangeListener = vscode.workspace.onDidChangeConfiguration(
    async (event) => {
        // 检查配置是否影响当前扩展
        if (event.affectsConfiguration('my-extension')) {
            // 处理扩展配置变化
        }

        // 检查特定配置项
        if (event.affectsConfiguration('my-extension.specificSetting')) {
            // 处理特定配置变化
        }
    }
);
```

---

## 文本编辑

### TextEdit

**TextEdit 用于描述文本编辑操作**：

```typescript
// 替换文本
const edit = vscode.TextEdit.replace(
    new vscode.Range(startLine, startChar, endLine, endChar),
    'new text'
);

// 插入文本
const insertEdit = vscode.TextEdit.insert(
    new vscode.Position(line, character),
    'inserted text'
);

// 删除文本
const deleteEdit = vscode.TextEdit.delete(
    new vscode.Range(startLine, startChar, endLine, endChar)
);
```

### WorkspaceEdit

**WorkspaceEdit 用于批量编辑**：

```typescript
const edit = new vscode.WorkspaceEdit();

// 替换文档中的文本
edit.replace(document.uri, range, 'new text');

// 创建新文件
edit.createFile(newUri, { overwrite: true });

// 删除文件
edit.deleteFile(oldUri, { ignoreIfNotExists: true });

// 应用编辑
await vscode.workspace.applyEdit(edit);
```

### TextDocument

**TextDocument 提供文档操作**：

```typescript
// 获取文档内容
const content = document.getText();

// 获取指定范围的内容
const rangeContent = document.getText(range);

// 获取文档行数
const lineCount = document.lineCount;

// 获取特定行
const line = document.lineAt(lineNumber);

// 根据偏移量获取位置
const position = document.positionAt(offset);

// 根据位置获取偏移量
const offset = document.offsetAt(position);

// 获取整个文档的范围
const fullRange = new vscode.Range(
    document.positionAt(0),
    document.positionAt(document.getText().length)
);
```

### TextEditor

**TextEditor 提供编辑器操作**：

```typescript
// 获取当前编辑器
const editor = vscode.window.activeTextEditor;

if (editor) {
    // 获取选区
    const selection = editor.selection;

    // 获取文档
    const document = editor.document;

    // 替换选区文本
    await editor.edit(editBuilder => {
        editBuilder.replace(selection, 'new text');
    });

    // 设置光标位置
    editor.selection = new vscode.Selection(
        new vscode.Position(line, character),
        new vscode.Position(line, character)
    );
}
```

---

## 其他重要 API

### OutputChannel

**输出通道用于在 VSCode 输出面板显示日志**：

```typescript
// 创建输出通道
const outputChannel = vscode.window.createOutputChannel('My Extension');

// 输出文本
outputChannel.appendLine('Log message');
outputChannel.append('No newline');

// 显示输出面板
outputChannel.show();

// 清除输出
outputChannel.clear();

// 释放资源
outputChannel.dispose();
```

### CancellationToken

**取消令牌用于取消异步操作**：

```typescript
export async function myAsyncOperation(
    token?: vscode.CancellationToken
): Promise<void> {
    // 检查是否已取消
    if (token?.isCancellationRequested) {
        throw new vscode.CancellationError();
    }

    // 监听取消请求
    token?.onCancellationRequested(() => {
        // 取消操作
        cleanup();
    });

    // 执行操作
}
```

### Disposable 合并

```typescript
// 使用 Disposable.from 合并多个 Disposable
const disposable = vscode.Disposable.from(
    command1,
    command2,
    listener1,
    listener2
);

context.subscriptions.push(disposable);

// 或者使用扩展运算符
context.subscriptions.push(command1, command2, listener1, listener2);
```

---

## 防抖机制

### Debounce 诊断

**用于延迟执行文档诊断，避免在用户快速输入时频繁触发诊断操作**

在事件被连续触发时，只在最后一次触发后的指定时间间隔结束后才执行回调函数。

**时间线示例**：

```text
用户输入:    A    B    C    D
时间轴:   |----|--|---|---------> 500ms
诊断触发:                        ✓ (只在D之后500ms触发一次)
```

**实现**：

```typescript
let debounceTimer: NodeJS.Timeout | undefined;

function debounceDiagnose(document: vscode.TextDocument, delay: number = 500): void {
    // 清除之前的定时器，避免重复触发
    // 确保只有最后一次触发产生的定时器可以保留下来
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
        diagnoseDocument(document);
    }, delay);
}

// 监听文档变化时防抖触发诊断
const changeListener = vscode.workspace.onDidChangeTextDocument(
    async (event) => {
        if (event.document.languageId === 'shellscript') {
            // 跳过特殊文件
            if (shouldSkipFile(event.document.fileName)) {
                return;
            }
            debounceDiagnose(event.document);
        }
    }
);
```

---

## 最佳实践

### 1. 资源管理

- 所有 Disposable 对象都添加到 `context.subscriptions`
- 非 Disposable 资源在 `deactivate()` 中手动清理
- 使用 `clearTimeout` 清理定时器

### 2. 防抖机制

- 文档变化事件使用防抖，避免频繁触发
- 推荐防抖时间为 500ms

### 3. 配置管理

- 使用 `vscode.workspace.getConfiguration()` 读取配置
- 在 `package.json` 中定义默认值
- 监听配置变化并重新初始化
- 使用 `event.affectsConfiguration()` 精确判断配置变化

### 4. 诊断管理

- 使用 DiagnosticCollection 集中管理诊断
- 在文档变化时清除旧诊断
- 使用 `diagnostic.source` 标识诊断来源

### 5. 错误处理

- 捕获并记录错误
- 使用 CancellationToken 支持取消操作
- 友好的错误提示

### 6. 格式化 Provider 选择

- 优先使用 `DocumentRangeFormattingEditProvider`
- 不需要同时注册 `DocumentFormattingEditProvider`
- 不需要额外注册格式化命令

### 7. CodeAction Provider 策略

- 为整个文档提供独立的 QuickFix（全局操作）
- 为特定问题提供关联诊断的 QuickFix（局部操作）
- 使用 `providedCodeActionKinds` 过滤请求，优化性能

---

## 常见问题

### Q1: 为什么注册了 `DocumentRangeFormattingEditProvider` 就不需要 `DocumentFormattingEditProvider`？

A: VSCode 官方文档说明，文档范围提供者同时也是文档格式化提供者。VSCode 会自动处理整个文档格式化。

### Q2: `QuickFix` 和 `SourceFixAll` 有什么区别？

A:

- `QuickFix`: 修复特定问题，用户手动触发，不需要自定义子类型
- `SourceFixAll`: 修复所有问题，可在保存时自动执行，需要自定义子类型

### Q3: `providedCodeActionKinds` 的作用是什么？

A: 用于过滤请求的类型，避免不必要的调用。可以精确匹配 `codeActionsOnSave` 配置。

### Q4: 如何处理文档的格式化需要完整上下文的情况？

A: 即使是范围格式化，也返回整个文档的格式化结果。VSCode 会自动裁剪选区内的变更。

### Q5: `context.subscriptions` 中的资源何时清理？

A: 在扩展停用时（关闭窗口、禁用扩展、重新加载窗口、卸载扩展）由 VSCode 自动调用 `dispose()`。

### Q6: 如何判断配置变更是否影响当前扩展？

A: 使用 `event.affectsConfiguration('extension-name')` 方法，或者自定义 `isConfigurationChanged()` 方法进行精确判断。

### Q7: CodeAction 的 `diagnostics` 属性有什么作用？

A: 关联诊断问题后，点击 CodeAction 时会高亮显示对应的问题位置。只有当 `context.diagnostics` 包含来自本扩展的诊断时，才应该创建关联的诊断。

### Q8: 为什么需要为整个文档提供独立的 QuickFix？

A: 由于诊断的 range 通常很小（1 个字符），光标很难在范围内。提供独立的 QuickFix 可以确保用户在文档任何位置都能看到修复选项。
