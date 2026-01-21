# language-configuration.json 详解

## 什么是 language-configuration.json？

`language-configuration.json` 是 VSCode 的**语言配置文件**，用于定义某种编程语言在编辑器中的行为和特性。

这个文件告诉 VSCode：

- 如何识别注释
- 代码括号如何配对
- 自动补全括号、引号
- 选中代码时如何包裹
- 光标跳转行为等

## 文件位置

在 `package.json` 中引用：

```json
{
  "contributes": {
    "languages": [
      {
        "id": "shellscript",
        "extensions": [".sh", ".bash", ".zsh"],
        "configuration": "./language-configuration.json"  // ← 语言配置文件
      }
    ]
  }
}
```

## 配置项详解

### 1. comments（注释定义）

定义语言的注释语法：

```json
"comments": {
  "lineComment": "#"    // 单行注释符号
}
```

**作用**：

- 当你按 `Ctrl+/`（macOS: `Cmd+/`）时，VSCode 会使用 `#` 来注释/取消注释代码
- 支持快速注释多行代码

**示例**：

```bash
# 原代码
echo "hello"

# 按 Ctrl+/ 后
# echo "hello"
```

如果语言支持多行注释，还可以定义：

```json
"comments": {
  "lineComment": "//",        // 单行注释
  "blockComment": ["/*", "*/"]  // 块注释（开始和结束）
}
```

---

### 2. brackets（括号定义）

定义语言的括号配对：

```json
"brackets": [
  ["{", "}"],
  ["[", "]"],
  ["(", ")"]
]
```

**作用**：

- 高亮显示匹配的括号
- 当光标在一个括号上时，自动高亮对应的另一个括号
- 支持 "跳转到匹配括号" 功能（`Ctrl+Shift+\`）

**示例**：

```bash
# 当光标在 { 上时，会自动高亮 }
if [ condition ]; then
    echo "hello"
{
    echo "nested"
}
fi
```

---

### 3. autoClosingPairs（自动闭合配对）

定义输入左符号时是否自动插入右符号：

```json
"autoClosingPairs": [
  {
    "open": "{",
    "close": "}"
  },
  {
    "open": "[",
    "close": "]"
  },
  {
    "open": "(",
    "close": ")"
  },
  {
    "open": "\"",
    "close": "\"",
    "notIn": ["string"]      // ← 特殊条件
  },
  {
    "open": "'",
    "close": "'",
    "notIn": ["string", "comment"]  // ← 特殊条件
  }
]
```

**作用**：

- 输入 `{` 时自动输入 `}`
- 输入 `"` 时自动输入 `"`
- 光标会自动放在中间

**示例**：

```bash
# 输入 {
if [ condition ] then|
  # ↑ 光标在这里

# 自动变成
if [ condition ] then
  |
  # ↑ 光标在这里，等待输入
}
```

**notIn 参数说明**：

- `notIn: ["string"]` - 在字符串内不自动闭合
- `notIn: ["string", "comment"]` - 在字符串和注释内不自动闭合

**示例**：

```bash
# 输入 echo "
# 如果 notIn: ["string"]，则不会自动闭合，变成：
echo "

# 如果没有 notIn，会自动闭合：
echo "|"
```

---

### 4. surroundingPairs（包裹配对）

定义选中代码后，如何用符号包裹：

```json
"surroundingPairs": [
  ["{", "}"],
  ["[", "]"],
  ["(", ")"],
  ["\"", "\""],
  ["'", "'"]
]
```

**作用**：

- 选中代码后输入左符号，自动用配对符号包裹
- 支持快捷键 `Alt+Shift+.` 或 `Cmd+Shift+.` 包裹代码

**示例**：

```bash
# 原代码
echo "hello"

# 选中后输入 "
echo "|hello|"  # ← 自动用 " 包裹

# 选中后输入 {
echo "hello"
# |
# }
# ← 自动用 {} 包裹
```

---

## 完整示例对比

### 没有 language-configuration.json

```bash
# 输入 { 后只显示 {
if [ condition ]; then
{  # ← 没有自动闭合

# 按 Ctrl+/ 没有注释功能
# 需要手动输入 #
```

### 有 language-configuration.json

```bash
# 输入 { 后自动显示 {|}
if [ condition ]; then
{
  echo "hello"  # 光标在中间
}

# 按 Ctrl+/ 自动注释
# if [ condition ]; then
#   echo "hello"
# fi

# 选中 "hello" 后输入 "
echo "'hello'"  # 自动包裹
```

---

## 更多配置项

除了上面四个配置项，还支持：

### 1. wordPattern（单词匹配模式）

```json
"wordPattern": "(-?\\d*\\.\\d\\w*)|([^\\`\\~\\!\\@\\#\\%^&\\*\\(\\)\\-\\=\\+\\[\\{\\]\\}\\\\\\|\\;\\:\\'\\\"\\,\\.\\<\\>\\/\\?\\s]+)"
```

**作用**：

- 定义什么算作一个"单词"
- 影响双击选择、`Ctrl+D` 选择相同单词等行为

### 2. indentationRules（缩进规则）

```json
"indentationRules": {
  "increaseIndentPattern": "^.*\\{[\\s\\S]*$",
  "decreaseIndentPattern": "^\\s*\\}",
  "indentNextLinePattern": "^.*(\\{|:)$"
}
```

**作用**：

- 定义何时增加缩进
- 定义何时减少缩进
- 定义下一行是否自动缩进

### 3. folding（代码折叠规则）

```json
"folding": {
  "markers": {
    "start": "^\\s*#\\s*region\\b",
    "end": "^\\s*#\\s*endregion\\b"
  }
}
```

**作用**：

- 定义可折叠的代码块
- 支持自定义折叠标记

---

## 实际效果演示

### 场景 1：输入括号

```bash
# 输入 if [
if [|  # → 自动变成 if [|]
#     ↑ 光标在中间
```

### 场景 2：注释代码

```bash
# 选中多行代码
echo "line1"
echo "line2"
echo "line3"

# 按 Ctrl+/
# echo "line1"
# echo "line2"
# echo "line3"

# 再按一次 Ctrl+/ 取消注释
```

### 场景 3：包裹代码

```bash
# 原代码
echo "hello"

# 选中后输入 {
{
  echo "hello"  # 自动包裹
}

# 选中后输入 "
"echo "hello""  # 自动包裹
```

### 场景 4：括号高亮

```bash
# 光标在 { 上时
{
  echo "hello"
}  # ← 这个 } 会高亮显示
```

---

## 为什么要配置这个文件？

### 1. 提升开发体验

- 自动补全括号和引号
- 快速注释代码
- 代码包裹功能

### 2. 减少输入错误

- 自动配对括号
- 减少漏写引号
- 避免括号不匹配

### 3. 提高编码效率

- 少敲很多键盘
- 代码格式更一致
- 更好的代码高亮

### 4. 与 VSCode 原生功能集成

- 自动闭合
- 括号配对
- 代码折叠
- 快捷注释

---

## 不同语言的配置示例

### JavaScript

```json
{
  "comments": {
    "lineComment": "//",
    "blockComment": ["/*", "*/"]
  },
  "brackets": [
    ["{", "}"],
    ["[", "]"],
    ["(", ")"]
  ],
  "autoClosingPairs": [
    ["{", "}"],
    ["[", "]"],
    ["(", ")"],
    ["\"", "\""],
    ["'", "'"]
  ],
  "surroundingPairs": [
    ["{", "}"],
    ["[", "]"],
    ["(", ")"],
    ["\"", "\""],
    ["'", "'"]
  ]
}
```

### Python

```json
{
  "comments": {
    "lineComment": "#"
  },
  "brackets": [
    ["{", "}"],
    ["[", "]"],
    ["(", ")"]
  ],
  "autoClosingPairs": [
    ["{", "}"],
    ["[", "]"],
    ["(", ")"]
  ],
  "surroundingPairs": [
    ["{", "}"],
    ["[", "]"],
    ["(", ")"]
  ]
}
```

### HTML

```json
{
  "comments": {
    "blockComment": ["<!--", "-->"]
  },
  "autoClosingPairs": [
    ["{", "}"],
    ["[", "]"],
    ["(", ")"],
    ["\"", "\""],
    ["'", "'"],
    ["<", ">"]
  ],
  "surroundingPairs": [
    ["{", "}"],
    ["[", "]"],
    ["(", ")"],
    ["\"", "\""],
    ["'", "'"],
    ["<", ">"]
  ]
}
```

---

## 总结

`language-configuration.json` 是 VSCode 语言支持的核心配置文件，它：

1. **定义注释语法** - 支持快速注释
2. **定义括号配对** - 高亮匹配括号
3. **定义自动闭合** - 输入左符号自动补全右符号
4. **定义代码包裹** - 选中代码后快速用符号包裹

**没有这个文件**：

- ✅ 语言仍然可以工作
- ❌ 但缺少智能编辑功能

**有这个文件**：

- ✅ 更好的编码体验
- ✅ 自动补全配对
- ✅ 快速注释代码
- ✅ 代码包裹功能

它是提升开发体验的关键配置文件！
