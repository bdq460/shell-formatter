#!/bin/bash
#
# 安全打包脚本
# 确保在任何失败情况下都能恢复 README.md
#

set -e # 遇到错误立即退出

# 脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# 管理脚本
MANAGE_SCRIPT="${SCRIPT_DIR}/manage-readme.sh"

# 错误处理函数
error_handler() {
    local exit_code=$?
    echo ""
    echo "========================================="
    echo "⚠️  打包失败 (退出码: ${exit_code})"
    echo "========================================="
    echo ""
    echo "尝试恢复 README.md..."

    # 尝试恢复 README.md
    if bash "${MANAGE_SCRIPT}" restore; then
        echo "✅ README.md 恢复成功"
    else
        echo "❌ README.md 恢复失败"
        echo "请手动运行: npm run readme:restore"
    fi

    exit ${exit_code}
}

# 注册错误处理
trap error_handler EXIT INT TERM

# 主逻辑
echo "========================================="
echo "开始安全打包流程"
echo "========================================="
echo ""

# 1. 备份并替换 README.md
echo "步骤 1/4: 备份并替换 README.md"
bash "${MANAGE_SCRIPT}" replace
echo ""

# 2. 编译代码
echo "步骤 2/4: 编译代码"
cd "${PROJECT_ROOT}"
npm run compile
echo ""

# 3. 打包
echo "步骤 3/4: 执行打包"
npx @vscode/vsce package
echo ""

# 4. 清理
echo "步骤 4/4: 清理临时文件"
npm run clean
echo ""

# 5. 恢复 README.md
echo "恢复 README.md..."
bash "${MANAGE_SCRIPT}" restore
echo ""

# 清除错误处理（因为执行成功了）
trap - EXIT

echo "========================================="
echo "✅ 打包完成！"
echo "========================================="
echo ""
echo "扩展包已生成在: ${PROJECT_ROOT}"
find . -maxdepth 1 -name "shell-formatter-*.vsix" -exec ls -lh {} \; | awk '{print $9, "(" $5 ")"}'
