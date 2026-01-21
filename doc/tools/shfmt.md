# Shfmt 使用指南

本文档详细说明 shfmt 在格式化 Shell 脚本时的行为及处理策略。

## Shfmt 退出码行为

### 正常执行情况

一般情况下，使用 `shfmt -i 2 -bn -ci -sr` 执行格式化操作后，无论是否有格式调整，都会返回退出码 `0`。

**判断是否发生格式化：**

- 通过 `stdout` 判断是否有格式修改
  1. 如果有格式调整，则 `stdout` 不为空，返回格式化后的内容
  2. 如果没有格式调整，则 `stdout` 为空，返回原内容

### 语法错误情况

当脚本代码存在语法错误时，shfmt 会返回非 0 的退出码，同时输出错误信息到 `stderr`。

**示例：**

对于以下语法错误的代码（if 条件没有闭合）：

```shell
if [ "x" = "x" ]
    echo "missing then"
```

执行命令：

```shell
shfmt -i 2 -bn -ci -sr test_syntax.sh
```

**输出结果：**

```output
returnCode: 1
Stdout:
Stderr: <standard input >: 16: 9: reached EOF without matching { with }
```

## Shfmt 常用参数

### -i 参数：缩进设置

设置缩进空格数，默认为 0（使用 tab）。

示例：

```bash
shfmt -i 2  # 使用 2 个空格缩进
```

### -bn 参数：二元操作符换行

在二元操作符（如 `&&`, `||`, `|`）后换行。

示例：

```bash
# 之前
cmd1 && cmd2

# -bn 后
cmd1 && \
    cmd2
```

### -ci 参数：switch case 缩进

对 `case` 语句进行缩进。

示例：

```bash
# 之前
case $var in
  1)
    echo "one"
    ;;
esac

# -ci 后
case $var in
  1)
    echo "one"
    ;;
esac  # case 选项缩进
```

### -sr 参数：重定向操作符换行

在重定向操作符（如 `>`, `>>`, `<`）后换行。

示例：

```bash
# 之前
echo "text" > file.txt

# -sr 后
echo "text" \
    > file.txt
```

## 参考资源

- [shfmt 官方仓库](https://github.com/mvdan/sh)
- [shfmt 文档](https://pkg.go.dev/mvdan.cc/sh/v3/cmd/shfmt)
