#!/bin/bash

# 有真实语法错误的示例
if [ -f "test.txt" ]; then
  echo "文件存在"
  cat test.txt | grep "hello"
else
  echo "文件不存在"
fi

# 语法错误：未闭合的 if
if [ "x" = "x" ]
  echo "missing then"

# 语法错误：函数定义错误
hello() {
    echo "test"
# 缺少 }

# 语法错误：命令错误
local name=$1
