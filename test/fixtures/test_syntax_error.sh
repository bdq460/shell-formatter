#!/bin/bash

# 测试语法错误脚本
# 故意缺少 fi

if [ -f "test.txt" ]; then
    echo "File exists"
# 缺少 fi 结束符
