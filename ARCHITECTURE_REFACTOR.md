# Shell Formatter 架构改造文档

## 改造目标

按照清晰架构（Clean Architecture）原则重新组织目录结构，明确各层职责和依赖关系。

---

## 当前目录结构

```
src/
├── adapters/              # 适配器层（混乱，需拆分）
├── config/                # 配置层
├── di/                    # DI 容器（与 utils/di 重复）
├── infrastructure/        # 基础设施层
│   ├── logger/           # 依赖 vscode，位置不当
│   └── shell_tool/       # shell 工具
├── plugins/              # 插件层（实际为领域层）
├── services/             # 服务层（与 application 混淆）
├── utils/                # 工具层（保持不动）
├── vscode/               # VSCode 相关（需拆分）
│   ├── converters/       # 类型转换
│   ├── entrypoints/      # 入口点
│   └── features/         # 业务功能
└── extension.ts          # 入口文件
```

---

## 目标目录结构

```
src/
├── entrypoints/          # 适配器层：VSCode 命令、事件、Provider
├── application/          # 应用层：用例编排、应用服务
├── domain/               # 领域层：核心业务逻辑、插件系统
├── infrastructure/       # 基础设施层：外部工具（shfmt、shellcheck）
├── platform/             # 平台层：VSCode 特定实现
├── shared/               # 共享层：类型转换器、共享接口
├── config/               # 配置层（保持不变）
├── utils/                # 工具层（保持不变）
└── extension.ts          # 入口文件
```

---

## 各层职责

| 层级 | 职责 | 依赖 |
|------|------|------|
| **entrypoints/** | 适配 VSCode 命令、事件、Provider | application/, shared/, platform/, utils/ |
| **application/** | 用例编排，协调领域对象完成业务 | domain/, shared/, utils/ |
| **domain/** | 核心业务逻辑，独立于平台和框架 | shared/kernel/, utils/ |
| **infrastructure/** | 外部工具实现（shfmt、shellcheck） | domain/, shared/, utils/ |
| **platform/** | VSCode 特定实现（Logger 等） | shared/kernel/, utils/ |
| **shared/** | 共享转换器和接口 | utils/ |
| **shared/kernel/** | 最底层共享接口，无依赖 | 无 |
| **utils/** | 通用工具，与业务无关 | 无 |

---

## 文件迁移映射表

### 1. entrypoints/ 层

| 源路径 | 目标路径 |
|--------|----------|
| `vscode/entrypoints/commands/` | `entrypoints/commands/` |
| `vscode/entrypoints/listeners/` | `entrypoints/listeners/` |
| `vscode/entrypoints/*.ts` | `entrypoints/` |

**包含文件：**

- `fixCommand.ts`
- `performanceCommand.ts`
- `pluginStatusCommand.ts`
- `index.ts`
- `saveListener.ts`
- `openListener.ts`
- `changeListener.ts`
- `deleteListener.ts`
- `configChangeListener.ts`
- `closeListener.ts`
- `codeActionsProvider.ts`
- `diagnosticCollection.ts`
- `formattingProvider.ts`

---

### 2. application/ 层

| 源路径 | 目标路径 |
|--------|----------|
| `vscode/features/commands/performance.ts` | `application/services/performance-service.ts` |
| `vscode/features/commands/pluginStatus.ts` | `application/services/plugin-status-service.ts` |
| `vscode/features/diagnostics/index.ts` | `application/usecases/diagnose-document.ts` |
| `vscode/features/formatters/index.ts` | `application/usecases/format-document.ts` |

---

### 3. domain/ 层

| 源路径 | 目标路径 |
|--------|----------|
| `plugins/basePlugin.ts` | `domain/plugins/base-plugin.ts` |
| `plugins/shfmtPlugin.ts` | `domain/plugins/shfmt-plugin.ts` |
| `plugins/shellcheckPlugin.ts` | `domain/plugins/shellcheck-plugin.ts` |
| `plugins/types.ts` | `domain/types.ts` |
| `plugins/pluginManager.ts` | `domain/plugin-manager.ts` |
| `plugins/index.ts` | `domain/index.ts` |
| `plugins/pluginInterface.ts` | `domain/plugin-interface.ts` |
| `plugins/pluginInitializer.ts` | `domain/plugin-initializer.ts` |

---

### 4. infrastructure/ 层

| 源路径 | 目标路径 |
|--------|----------|
| `infrastructure/shell_tool/` | `infrastructure/shell-tools/` |

**重命名：**

- `shell_tool/` → `shell-tools/`

---

### 5. platform/ 层

| 源路径 | 目标路径 |
|--------|----------|
| `infrastructure/logger/loggerService.ts` | `platform/logger.ts` |
| `services/loggerService.ts` | `platform/logger.ts`（合并） |

---

### 6. shared/ 层

| 源路径 | 目标路径 |
|--------|----------|
| `vscode/converters/document.ts` | `shared/converters/document.ts` |
| `vscode/converters/diagnostic.ts` | `shared/converters/diagnostic.ts` |
| `vscode/converters/index.ts` | `shared/converters/index.ts` |
| `adapters/diagnosticFactory.ts` | `shared/converters/diagnostic-factory.ts`（可选） |

**新增文件：**

- `shared/kernel/logger.ts` - 日志接口定义
- `shared/kernel/index.ts` - 共享内核导出

---

### 7. 删除的目录

| 目录 | 说明 |
|------|------|
| `vscode/` | 功能分散到 entrypoints/ 和 application/ |
| `adapters/` | 功能分散到 shared/converters/ 和 platform/ |
| `services/` | 功能分散到 application/ 和 platform/ |
| `di/` | 合并到 utils/di/ |
| `plugins/` | 移动到 domain/ |

---

### 8. 保持不动的目录

| 目录 | 说明 |
|------|------|
| `config/` | 配置层保持不变 |
| `utils/` | 工具层保持不变 |

---

## 实施步骤

### 步骤 1：创建新目录结构

```bash
cd src
mkdir -p entrypoints/{commands,listeners,providers}
mkdir -p application/{usecases,services}
mkdir -p domain/{entities,plugins}
mkdir -p infrastructure/shell-tools
mkdir -p platform
mkdir -p shared/{converters,kernel}
```

### 步骤 2：移动 entrypoints 文件

```bash
mv vscode/entrypoints/commands/* entrypoints/commands/
mv vscode/entrypoints/listeners/* entrypoints/listeners/
mv vscode/entrypoints/*.ts entrypoints/
```

### 步骤 3：创建 application 层

```bash
mv vscode/features/commands/performance.ts application/services/performance-service.ts
mv vscode/features/commands/pluginStatus.ts application/services/plugin-status-service.ts
mv vscode/features/diagnostics/index.ts application/usecases/diagnose-document.ts
mv vscode/features/formatters/index.ts application/usecases/format-document.ts
```

### 步骤 4：移动 domain 层

```bash
mv plugins/basePlugin.ts domain/plugins/base-plugin.ts
mv plugins/shfmtPlugin.ts domain/plugins/shfmt-plugin.ts
mv plugins/shellcheckPlugin.ts domain/plugins/shellcheck-plugin.ts
mv plugins/types.ts domain/types.ts
mv plugins/pluginManager.ts domain/plugin-manager.ts
mv plugins/index.ts domain/index.ts
mv plugins/pluginInterface.ts domain/plugin-interface.ts
mv plugins/pluginInitializer.ts domain/plugin-initializer.ts
```

### 步骤 5：调整 infrastructure

```bash
mv infrastructure/shell_tool infrastructure/shell-tools
```

### 步骤 6：创建 platform 层

```bash
# 合并 logger 实现到 platform/
mv infrastructure/logger/loggerService.ts platform/logger.ts
```

### 步骤 7：创建 shared 层

```bash
mv vscode/converters/* shared/converters/
# 创建新的 kernel 文件
touch shared/kernel/logger.ts
touch shared/kernel/index.ts
```

### 步骤 8：清理旧目录

```bash
rm -rf vscode/
rm -rf adapters/
rm -rf services/
rm -rf di/
rm -rf plugins/
rm -rf infrastructure/logger/
```

---

## 依赖关系图

```text
extension.ts
    ↓
entrypoints/          ← 依赖 → application/, shared_, platform_, utils_
    ↓
application/          ← 依赖 → domain_, shared_, utils_
    ↓
domain/               ← 依赖 → shared/kernel/, utils_
    ↓
infrastructure/       ← 依赖 → domain_, shared_, utils_
    ↓
platform/             ← 依赖 → shared/kernel_, utils_
    ↓
shared/               ← 依赖 → utils_
    ↓
shared/kernel/        ← 无依赖（最底层）
    ↓
utils/                ← 无依赖（可复用）
```

---

## 注意事项

1. **utils/ 保持不动** - 确保可复用性
2. **只移动文件，不修改内容** - 后续单独处理导入路径
3. **保留 Git 历史** - 使用 git mv 移动文件
4. **分步验证** - 每步完成后检查目录结构

---

## 验证清单

- [ ] 新目录结构创建完成
- [ ] 所有文件按映射表移动完成
- [ ] 旧目录清理完成
- [ ] utils/ 目录保持完整
- [ ] 无文件丢失

---

文档版本：v1.0
创建日期：2026-01-31
