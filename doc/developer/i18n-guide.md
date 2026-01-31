# 国际化（i18n）使用指南

## 概述

本项目支持多语言国际化，会根据 VSCode 的语言设置自动切换。支持 9 种语言，覆盖全球主要用户群体。

## 支持的语言

| 语言代码 | 语言名称 | 覆盖区域 |
|----------|----------|----------|
| **en** | English | 英语国家 |
| **zh** | 简体中文 | 中国大陆、新加坡 |
| **zh-tw** | 繁體中文 | 台湾、香港、澳门 |
| **ja** | 日本語 | 日本 |
| **ko** | 한국어 | 韩国 |
| **de** | Deutsch | 德国、奥地利、瑞士 |
| **fr** | Français | 法国、加拿大、比利时 |
| **es** | Español | 西班牙、拉丁美洲 |
| **ar** | العربية | 中东、北非 |
| **vi** | Tiếng Việt | 越南 |
| **hi** | हिन्दी | 印度 |
| **ru** | Русский | 俄罗斯、东欧 |
| **pt** | Português | 巴西、葡萄牙 |

## 语言包位置

语言包位于 `src/i18n/locales/` 目录：

```text
src/i18n/
├── index.ts           # i18n 核心逻辑
└── locales/
    ├── ar.json        # 阿拉伯语
    ├── de.json        # 德语
    ├── en.json        # 英语
    ├── es.json        # 西班牙语
    ├── fr.json        # 法语
    ├── hi.json        # 印地语
    ├── ja.json        # 日语
    ├── ko.json        # 韩语
    ├── pt.json        # 葡萄牙语
    ├── ru.json        # 俄语
    ├── vi.json        # 越南语
    ├── zh.json        # 简体中文
    └── zh-tw.json     # 繁体中文
```

## 使用方法

### 1. 基本翻译

```typescript
import { t } from "../../i18n";

// 使用翻译键
const message = t("messages.noActiveDocument");
vscode.window.showWarningMessage(message);
```

### 2. 参数化翻译

语言包支持参数替换：

```typescript
// 语言包定义
{
  "messages": {
    "partialFixSuccess": "{count} fix(es) applied, but {remaining} problem(s) remain."
  }
}

// 使用方式
const message = t("messages.partialFixSuccess", {
  count: 5,
  remaining: 2
});
// 结果：5 fix(es) applied, but 2 problem(s) remain.
```

### 3. 添加新的翻译

#### 步骤 1：在语言包中添加键

**en.json**:

```json
{
  "myFeature": {
    "title": "My Feature Title",
    "description": "This is a description with {param} parameter"
  }
}
```

**zh.json**:

```json
{
  "myFeature": {
    "title": "我的功能标题",
    "description": "这是一个包含 {param} 参数的描述"
  }
}
```

#### 步骤 2：在代码中使用

```typescript
import { t } from "../../i18n";

const title = t("myFeature.title");
const description = t("myFeature.description", { param: "动态值" });
```

## 语言包结构

语言包按功能模块组织：

```json
{
  "common": {
    "enabled": "Enabled",
    "disabled": "Disabled"
  },
  "messages": {
    "noActiveDocument": "No active document",
    "allProblemsFixed": "All problems fixed"
  },
  "performance": {
    "title": "Performance Report",
    "summaryTitle": "Summary"
  },
  "pluginStatus": {
    "title": "Plugin Status"
  }
}
```

## 命名规范

- 使用点号分隔路径：`module.key`
- 模块名使用小写：`performance`、`pluginStatus`
- 键名使用小写+下划线或驼峰：`total_metrics` 或 `totalMetrics`

## 已国际化的功能

✅ 用户提示消息（showInformationMessage、showWarningMessage）
✅ 性能报告
✅ 插件状态报告
✅ 命令确认对话框

## 暂未国际化的功能

❌ 日志信息（开发者调试用）
❌ 代码注释
❌ package.json 配置描述（需要单独的语言包文件）

## 测试不同语言

1. 打开 VSCode 设置（Ctrl+,）
2. 搜索 `Locale`
3. 选择语言（如 `zh-cn`、`ja`、`de` 等）
4. 重启 VSCode

## 扩展支持更多语言

如需支持新语言：

1. 创建新的语言包文件：`src/i18n/locales/xx.json`
2. 参考 `en.json` 的结构翻译所有键
3. 在 `src/i18n/index.ts` 中添加语言映射：

```typescript
// 1. 导入语言包
import xx from "./locales/xx.json";

// 2. 添加到 SupportedLocale 类型
type SupportedLocale = "en" | "zh" | "xx";

// 3. 添加到 localeMessages
const localeMessages: Record<SupportedLocale, LocaleMessages> = {
    en, zh, xx,
};

// 4. 添加到 localeMapping
const localeMapping: Record<string, SupportedLocale> = {
    "xx": "xx",
    "xx-XX": "xx",
};
```

## 回退机制

当语言包加载失败或翻译键不存在时，系统会自动回退到英文：

```typescript
// 如果当前语言是日语，但 "newFeature.key" 不存在
const message = t("newFeature.key");
// 会自动尝试从英文语言包获取
// 如果英文也不存在，返回原始键名
```

## API 参考

### 函数

| 函数 | 签名 | 说明 |
|------|------|------|
| `initializeI18n` | `() => void` | 初始化 i18n 模块 |
| `t` | `(key: string, params?: Record<string, string \| number>) => string` | 翻译函数 |
| `getCurrentLocale` | `() => SupportedLocale` | 获取当前语言 |
| `getSupportedLocales` | `() => SupportedLocale[]` | 获取所有支持的语言 |
| `setLocale` | `(locale: SupportedLocale) => boolean` | 切换语言 |
| `isLocaleSupported` | `(locale: string) => boolean` | 检查是否支持某语言 |

### 类型

```typescript
type SupportedLocale = "en" | "zh" | "zh-tw" | "ja" | "ko" | "de" | "fr" | "es" | "ar" | "vi" | "hi" | "ru" | "pt";
```

## 注意事项

1. **参数必须匹配**：确保语言包中的 `{param}` 与调用时的参数名一致
2. **保持同步**：添加新翻译时，确保所有语言包都有对应的键
3. **测试验证**：切换语言后测试所有用户可见的文本
4. **RTL 语言**：阿拉伯语（ar）是 RTL（从右到左）语言，如需完整支持需要考虑布局调整
