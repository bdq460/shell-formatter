# Shellcheck 使用指南

本文档介绍 shellcheck 的使用方法、常见错误代码和最佳实践。

## 什么是 Shellcheck

Shellcheck 是一个静态分析工具，用于检测 Shell 脚本中的错误、最佳实践违规和常见陷阱。它能识别语法错误、语义问题以及潜在的安全隐患。

## 安装 Shellcheck

### macOS

```bash
brew install shellcheck
```

### Linux

```bash
# Ubuntu/Debian
sudo apt-get install shellcheck

# CentOS/RHEL
sudo yum install shellcheck

# Arch Linux
sudo pacman -S shellcheck
```

### 使用 Go 安装

```bash
go install github.com/koalaman/shellcheck/cmd/shellcheck@latest
```

## Shellcheck 命令行使用

### 基本用法

```bash
# 检查单个文件
shellcheck script.sh

# 检查多个文件
shellcheck script1.sh script2.sh

# 检查目录下所有脚本
shellcheck *.sh

# 使用不同格式输出
shellcheck -f gcc script.sh     # GCC 格式
shellcheck -f json script.sh    # JSON 格式
shellcheck -f checkstyle script.sh  # Checkstyle 格式
```

### 常用选项

```bash
# 指定 Shell 类型
shellcheck -s bash script.sh
shellcheck -s zsh script.sh

# 设置严重性级别
shellcheck -S style script.sh    # 包含样式建议
shellcheck -S info script.sh     # 仅显示信息级别以上

# 排除特定错误代码
shellcheck -e SC2034,SC2154 script.sh

# 显示颜色输出
# -C 或 --color 选项会让 shellcheck 的输出使用颜色高亮显示：
# 红色：严重错误（Error）
# 黄色：警告（Warning）
# 蓝色：信息（Info）
# 其他颜色：用于代码位置、文件名等
shellcheck -C/--color script.sh

# 详细输出
shellcheck -x script.sh
```

## 常见错误代码

### SC2168: 'local' is only valid in functions

**错误原因**：`local` 关键字只能在函数内部使用，在脚本顶层使用是无效的。

**错误示例**：

```bash
#!/bin/bash
local name="test"  # 错误：local 不能在函数外使用
```

**正确做法**：

```bash
#!/bin/bash
name="test"  # 在脚本顶层使用普通变量

# 或者在函数内使用 local
function myfunc() {
    local name="test"
}
```

---

### SC2154: variable is referenced but not assigned

**错误原因**：使用了未定义的变量。

**错误示例**：

```bash
#!/bin/bash
echo $name  # 错误：name 未定义
```

**正确做法**：

```bash
#!/bin/bash
local name="test"
echo $name
```

---

### SC2034: variable appears unused

**错误原因**：定义了变量但从未使用。

**错误示例**：

```bash
#!/bin/bash
local name="test"  # 警告：name 未使用
echo "Hello"
```

**正确做法**：

```bash
#!/bin/bash
local name="test"
echo "Hello, $name"
```

---

### SC2086: Double quote to prevent globbing and word splitting

**错误原因**：变量未使用双引号包裹，可能导致路径展开和单词分割。

**错误示例**：

```bash
#!/bin/bash
local file="my file.txt"
cat $file  # 错误：空格会被分割成多个参数
```

**正确做法**：

```bash
#!/bin/bash
local file="my file.txt"
cat "$file"  # 正确：双引号防止分割
```

---

### SC2046: Quote this to prevent word splitting

**错误原因**：命令替换未使用双引号包裹。

**错误示例**：

```bash
#!/bin/bash
files=$(ls)
for f in $files; do  # 错误：未加引号
    echo "$f"
done
```

**正确做法**：

```bash
#!/bin/bash
files=$(ls)
while IFS= read -r -d $'\0' f; do
    echo "$f"
done < <(find . -type f -print0)
```

---

### SC2001: See if you can use ${variable//search/replace} instead

**错误原因**：使用 `echo | sed` 进行字符串替换，效率较低。

**错误示例**：

```bash
#!/bin/bash
text="hello world"
echo "$text" | sed 's/world/bash/'  # 不推荐
```

**正确做法**：

```bash
#!/bin/bash
text="hello world"
echo "${text/world/bash}"  # 推荐：使用 Bash 内置替换
```

---

### SC1091: Not following: source not found

**错误原因**：引用的文件不存在或路径错误。

**错误示例**：

```bash
#!/bin/bash
source "./config.sh"  # 警告：文件可能不存在
```

**正确做法**：

```bash
#!/bin/bash
# 检查文件是否存在后再引用
if [ -f "./config.sh" ]; then
    source "./config.sh"
fi
```

---

### SC2157: Argument to -n is always true due to literal strings

**错误原因**：字符串比较写法错误。

**错误示例**：

```bash
#!/bin/bash
if [ -n "test" ]; then  # 总是 true
    echo "Always runs"
fi
```

**正确做法**：

```bash
#!/bin/bash
local var="test"
if [ -n "$var" ]; then
    echo "Variable is not empty"
fi
```

---

## 最佳实践

### 1. 总是使用双引号包裹变量

```bash
#!/bin/bash
local file="my file.txt"
cat "$file"
echo "File: $file"
```

### 2. 使用 `[[ ]]` 而非 `[ ]`

```bash
#!/bin/bash
# 推荐使用
if [[ "$name" == "test" ]]; then
    echo "Matched"
fi

# 避免使用
if [ "$name" == "test" ]; then
    echo "Matched"
fi
```

### 3. 使用 `$()` 而非反引号

```bash
#!/bin/bash
# 推荐
local files=$(ls)

# 避免
local files=`ls`
```

### 4. 函数中使用 `local` 声明变量

```bash
#!/bin/bash
function process() {
    local name=$1
    local count=0
    # 处理逻辑
}
```

### 5. 设置 `set -e` 和 `set -u`

```bash
#!/bin/bash
set -euo pipefail  # 在任何错误时退出，未定义变量时报错

# 或者在函数内部
function myfunc() {
    local -r name=$1  # -r 表示只读
    # 处理逻辑
}
```

### 6. 避免解析 `ls` 输出

```bash
#!/bin/bash
# 不推荐
for file in $(ls); do
    echo "$file"
done

# 推荐
find . -type f -print0 | while IFS= read -r -d $'\0' file; do
    echo "$file"
done
```

### 7. 忽略特定警告

如果某些警告需要忽略，可以在脚本中使用注释：

```bash
#!/bin/bash
# shellcheck disable=SC2034
local unused_var="test"

# 禁用多个警告
# shellcheck disable=SC2034,SC2154
```

## 常见问题

### Q: 如何禁用特定警告？

A: 在脚本中添加注释 `# shellcheck disable=SCXXXX`。

### Q: Shellcheck 检测出的错误是否必须修复？

A: 不一定。某些是建议性的（如样式问题），可以根据项目实际情况决定是否修复。但语法错误和严重问题建议修复。

### Q: Shellcheck 能检测所有错误吗？

A: 不能。Shellcheck 是静态分析工具，无法检测运行时错误。建议结合实际测试验证脚本。

## 参考资料

- [Shellcheck 官方文档](https://www.shellcheck.net/)
- [Shellcheck GitHub 仓库](https://github.com/koalaman/shellcheck)
- [Shellcheck Wiki](https://github.com/koalaman/shellcheck/wiki)
