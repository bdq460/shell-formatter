# Shell Format

> Intelligent Shell script formatting and checking tool based on shfmt and shellcheck
> 基于 shfmt 和 shellcheck 的智能 Shell 脚本格式化和检查工具

## Quick Start 快速开始

### Feature Overview 功能概述

Shell Format automatically formats your Shell scripts and detects errors using industry-standard tools:

- **Smart Formatting 智能格式化** - Automatically format Shell scripts with shfmt
- **Error Detection 错误检测** - Detect syntax and semantic errors with shellcheck
- **Automatic Diagnosis 自动诊断** - Automatic checking when opening, saving, or editing (300ms debounce/防抖)
- **Quick Fixes 快速修复** - One-click fix for formatting issues
- **Plugin System 插件系统** - Dynamic plugin activation/deactivation with configuration
- **Detailed Logs 详细日志** - Timestamped operation logs with customizable format

## Configuration Options 配置选项

### Complete Configuration Example 完整配置示例

```json
{
  "shell-format.tabSize": 2,
  "shell-format.plugins.shfmt": {
    "enabled": true,
    "path": "shfmt"
  },
  "shell-format.plugins.shellcheck": {
    "enabled": true,
    "path": "shellcheck"
  },
  "shell-format.log": {
    "enabled": false,
    "level": "info",
    "format": "[%timestamp] [%level] [%name] [%method:%line] %message"
  },
  "shell-format.onError": "showProblem"
}
```

### Configuration Details 配置说明

#### `shell-format.plugins.shfmt`

Shfmt plugin configuration / Shfmt 插件配置

- **Type 类型**: object
- **Default 默认值**: `{ "enabled": true, "path": "shfmt" }`

**Properties 属性**:

- `enabled` (boolean): Enable or disable shfmt plugin / 是否启用 shfmt 插件 (default: `true`)
- `path` (string): Path to shfmt executable / shfmt 可执行文件路径 (default: `"shfmt"`)

#### `shell-format.plugins.shellcheck`

Shellcheck plugin configuration / Shellcheck 插件配置

- **Type 类型**: object
- **Default 默认值**: `{ "enabled": true, "path": "shellcheck" }`

**Properties 属性**:

- `enabled` (boolean): Enable or disable shellcheck plugin / 是否启用 shellcheck 插件 (default: `true`)
- `path` (string): Path to shellcheck executable / shellcheck 可执行文件路径 (default: `"shellcheck"`)

#### `shell-format.tabSize`

Controls indentation behavior / 控制缩进行为

- **Type 类型**: number | string
- **Options 选项**:
  - `vscode`: Use VSCode's indent settings / 使用 VSCode 的缩进设置
  - `ignore`: Do not validate indentation / 不验证缩进
  - Number: Number of spaces / 空格数 (e.g., `2`, `4`)
- **Default 默认值**: `vscode`

#### `shell-format.log`

Configure logging behavior / 配置日志行为

- **Type 类型**: object
- **Default 默认值**:

  ```json
  {
    "enabled": false,
    "level": "info",
    "format": "[%timestamp] [%level] [%name] [%method:%line] %message"
  }
  ```

**Properties 属性**:

- `enabled` (boolean): Enable or disable logging / 是否启用日志 (default: `false`)
- `level` (string): Log level - `debug`, `info`, `warn`, `error` / 日志级别 (default: `info`)
- `format` (string): Log format pattern / 日志格式
  - Available placeholders 可用占位符: `%timestamp`, `%level`, `%name`, `%method`, `%line`, `%message`

#### `shell-format.onError`

Error handling method / 错误处理方式

- **Type 类型**: string
- **Options 选项**:
  - `ignore`: Ignore errors / 忽略错误
  - `showProblem`: Show problems / 显示问题
- **Default 默认值**: `showProblem`

## Plugin Commands 插件命令

| Command                              | Description                                                     |
| ------------------------------------ | --------------------------------------------------------------- |
| shell-format.formatDocument          | Format entire document / 格式化整个文档                         |
| shell-format.fixAllProblems          | Fix all formatting issues with one click / 一键修复所有格式问题 |
| shell-format.showPerformanceReport   | Show performance metrics / 显示性能指标                         |
| shell-format.resetPerformanceMetrics | Reset performance metrics / 重置性能指标                        |
| shell-format.showPluginStatus        | Show plugin status / 显示插件状态                               |

## Usage 使用方法

### Format Document 格式化文档

#### Format Entire Document 格式化整个文档

- **Shortcut 快捷键**: `Shift+Alt+F` (Windows/Linux) or `Shift+Option+F` (macOS)
- **Right-click menu 右键菜单**: Select "Format Document" / 选择"格式化文档"
- **Command Palette 命令面板**: Enter "Format Document By Shellformat" / 输入"格式化文档"

#### Format Selected Text 格式化选中文本

- Select code to format / 选中要格式化的代码
- **Shortcut 快捷键**: `Ctrl+K Ctrl+F` (Windows/Linux) or `Cmd+K Cmd+F` (macOS)
- **Right-click menu 右键菜单**: Select "Format Selection" / 选择"格式化选中内容"

> Note: Shell script formatting requires full context (if/fi, do/done pairing), so even when text is selected, entire document is formatted. VSCode automatically crops changes within selection and applies them to editor.
> 注意：Shell 脚本格式化需要完整的上下文，因此即使只选中部分文本，也会格式化整个文档。VSCode 会自动裁剪选中区域内的更改并应用。

### Quick Fix Issues 快速修复问题

#### Fix Single Issue 修复单个问题

- Hover mouse over error code / 将鼠标悬停在错误代码上
- Click yellow light bulb icon / 点击黄色灯泡图标
- Select "Fix this issue with shell-format" / 选择"使用 shell-format 修复此问题"

#### Fix All Issues 修复所有问题

- Click yellow light bulb icon in code editor / 点击代码编辑器中的黄色灯泡图标
- Select "Fix all problems with shell-format" / 选择"使用 shell-format 修复所有问题"
- Or execute "Shell Format: Fix All Problems By Shellformat" in Command Palette / 或在命令面板中执行

### View Errors and Warnings 查看错误和警告

- Open VSCode's "Problems" panel / 打开 VSCode 的"问题"面板 (`Ctrl+Shift+M` / `Cmd+Shift+M`)
- View all shell script errors and warnings / 查看所有 Shell 脚本错误和警告
- **Error sources 错误来源**:
  - `shellcheck`: Syntax and semantic errors (red) / 语法和语义错误（红色）
  - `shell-format`: Formatting issues (yellow) / 格式问题（黄色）

### View Logs 查看日志

- Open Output panel / 打开输出面板 (`Ctrl+Shift+U` / `Cmd+Shift+U`)
- Select "shell-format" channel / 选择"shell-format"通道查看详细日志
- Enable logs in settings / 在设置中启用日志:

  ```json
  {
    "shell-format.log": {
      "enabled": true,
      "level": "debug"
    }
  }
  ```

### View Plugin Status 查看插件状态

- Open Command Palette / 打开命令面板 (`Ctrl+Shift+P` / `Cmd+Shift+P`)
- Enter "Shell Format: Show Plugin Status" / 输入"Shell Format: Show Plugin Status"
- View all registered plugins, their versions, and activation status / 查看所有已注册的插件、版本和激活状态

### View Performance Metrics 查看性能指标

- Open Command Palette / 打开命令面板 (`Ctrl+Shift+P` / `Cmd+Shift+P`)
- Enter "Shell Format: Show Performance Report" / 输入"Shell Format: Show Performance Report"
- View detailed performance metrics including plugin activation time, execution time, etc. / 查看详细的性能指标，包括插件激活时间、执行时间等

## Formatting Example 格式化示例

### Before Formatting 格式化前

```bash
#!/bin/bash
if [ -f "test.txt" ];then
echo "file exists"
fi
```

### After Formatting 格式化后

```bash
#!/bin/bash
if [ -f "test.txt" ]; then
    echo "file exists"
fi
```

## Supported File Types 支持的文件类型

- `.sh` - Shell scripts / Shell 脚本
- `.bash` - Bash scripts / Bash 脚本
- `.zsh` - Zsh scripts / Zsh 脚本

## FAQ 常见问题

### Why is entire document formatted when I format selected text?

### 为什么格式化选中文本时会格式化整个文档？

A: Shell script formatting requires full context (like if/fi, do/done pairing), so even when text is selected, shfmt formats entire document. VSCode automatically crops changes within selection and applies them to editor.

Shell 脚本格式化需要完整的上下文（如 if/fi、do/done 配对），因此即使只选中部分文本，shfmt 也会格式化整个文档。VSCode 会自动裁剪选中区域内的更改并应用到编辑器。

---

### Can shellcheck errors be automatically fixed?

### shellcheck 错误可以自动修复吗？

A: No. shellcheck detects semantic errors and best practice issues, which developers need to fix manually based on specific scenarios. Only formatting issues (detected by shfmt) can be automatically fixed.

不可以。shellcheck 检测语义错误和最佳实践问题，需要根据具体场景手动修复。只有格式问题（由 shfmt 检测）可以自动修复。

---

### How to disable specific shellcheck warnings?

### 如何禁用特定的 shellcheck 警告？

A: You can use comments in your script to disable specific warnings:

可以在脚本中使用注释来禁用特定警告：

```bash
#!/bin/bash
# shellcheck disable=SC2034
local unused_var="test"

# Disable multiple warnings
# 禁用多个警告
# shellcheck disable=SC2034,SC2154
```

---

### Will this plugin affect VSCode performance?

### 此插件会影响 VSCode 性能吗？

A: No. The plugin uses debouncing (300ms) to avoid frequent diagnostic triggers. All external commands are executed asynchronously and won't block UI. Additionally, plugins can be enabled/disabled via configuration for fine-grained control.

不会。插件使用防抖（300ms）来避免频繁触发诊断。所有外部命令都是异步执行的，不会阻塞 UI。此外，可以通过配置启用/禁用插件以实现细粒度控制。

---

### Why don't errors show immediately while editing?

### 编辑时为什么不会立即显示错误？

A: Diagnosis is performed on disk files, so changes in editor need to be saved before being detected. Future versions will support real-time editing diagnosis via stdin.

诊断是基于磁盘文件进行的，编辑器中修改的内容需要保存后才能被检测。未来版本会支持通过 stdin 进行实时编辑时诊断。

---

### How to check which plugins are active?

### 如何检查哪些插件处于活动状态？

A: Use the "Shell Format: Show Plugin Status" command to view all registered plugins, their versions, and activation status.

使用"Shell Format: Show Plugin Status"命令查看所有已注册的插件、版本和激活状态。

---

### How to disable a specific plugin?

### 如何禁用特定插件？

A: Configure the plugin's `enabled` property to `false` in settings.json:

在 settings.json 中将插件的 `enabled` 属性设置为 `false`：

```json
{
  "shell-format.plugins.shellcheck": {
    "enabled": false,
    "path": "shellcheck"
  }
}
```

This will disable shellcheck but keep shfmt enabled.

这将禁用 shellcheck 但保持 shfmt 启用。

## System Requirements 系统要求

### VSCode Version

- VSCode >= 1.74.0

### External Tools 外部工具

#### shfmt (Required 必需)

Shell script formatting tool / Shell 脚本格式化工具

**macOS:**

```bash
brew install shfmt
```

**Linux (Ubuntu/Debian):**

```bash
sudo apt-get install shfmt
```

**Install with Go:**

```bash
go install mvdan.cc/sh/v3/cmd/shfmt@latest
```

#### shellcheck (Recommended 推荐)

Shell script static analysis tool / Shell 脚本静态分析工具

**macOS:**

```bash
brew install shellcheck
```

**Linux (Ubuntu/Debian):**

```bash
sudo apt-get install shellcheck
```

**Install with Go:**

```bash
go install github.com/koalaman/shellcheck/cmd/shellcheck@latest
```

> Note: shellcheck is optional. If not installed or disabled, the plugin will only use shfmt for formatting and basic checking.
> 注意：shellcheck 是可选的。如果未安装或被禁用，插件将只使用 shfmt 进行格式化和基本检查。

## Contact Developer 联系开发者

For questions or suggestions, please contact via:
如有问题或建议，请通过以下方式联系：

- **GitHub Issues**: [Submit an Issue 提交问题](https://github.com/bdq460/shell-format/issues)
- **Email**: [Send Email 发送邮件](mailto:bdq460@gmail.com)

## Links 链接

- [GitHub](https://github.com/bdq460/shell-format)
- [Issues](https://github.com/bdq460/shell-format/issues)
- [License](LICENSE)

## Acknowledgments 致谢

Thanks to the following open source tools / 感谢以下开源工具：

- [shfmt](https://github.com/mvdan/sh) - Shell script formatting tool / Shell 脚本格式化工具
- [shellcheck](https://github.com/koalaman/shellcheck) - Shell script static analysis tool / Shell 脚本静态分析工具
