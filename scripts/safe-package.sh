#!/bin/bash
#
# 安全打包脚本
# 确保在任何失败情况下都能恢复 README.md
# 自动清理旧版本 vsix 文件，防止版本冲突
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

# 清理旧版本 vsix 文件
cleanup_old_vsix() {
    echo "清理旧版本 vsix 文件..."
    vsix_count=$(find "${PROJECT_ROOT}" -maxdepth 1 -name "shell-formatter-*.vsix" -type f | wc -l)

    if [ "$vsix_count" -gt 0 ]; then
        find "${PROJECT_ROOT}" -maxdepth 1 -name "shell-formatter-*.vsix" -type f -delete
        echo "✅ 已清理 ${vsix_count} 个旧版本 vsix 文件"
    else
        echo "✅ 没有发现旧版本 vsix 文件"
    fi
}

# 获取生成的 vsix 文件名
get_vsix_filename() {
    vsix_file=$(find "${PROJECT_ROOT}" -maxdepth 1 -name "shell-formatter-*.vsix" -type f | head -n 1)
    echo "$vsix_file"
}

# 注册错误处理
trap error_handler EXIT INT TERM

# 主逻辑
echo "========================================="
echo "开始安全打包流程"
echo "========================================="
echo ""

# 0. 清理旧版本 vsix 文件
echo "步骤 0/5: 清理旧版本 vsix 文件"
cleanup_old_vsix
echo ""

# 1. 备份并替换 README.md
echo "步骤 1/5: 备份并替换 README.md"
bash "${MANAGE_SCRIPT}" replace
echo ""

# 2. 编译代码
echo "步骤 2/5: 编译代码"
cd "${PROJECT_ROOT}"
npm run compile
echo ""

# 3. 打包
echo "步骤 3/5: 执行打包"
npx @vscode/vsce package
echo ""

# 4. 清理
echo "步骤 4/5: 清理临时文件"
npm run clean
echo ""

# 5. 恢复 README.md
echo "步骤 5/5: 恢复 README.md..."
bash "${MANAGE_SCRIPT}" restore
echo ""

# 清除错误处理（因为执行成功了）
trap - EXIT

# 显示打包结果
echo "========================================="
echo "✅ 打包完成！"
echo "========================================="
echo ""

VSIX_FILE=$(get_vsix_filename)
if [ -n "$VSIX_FILE" ]; then
    echo "📦 扩展包: $(basename "$VSIX_FILE")"
    # 使用 stat 替代 ls 获取文件大小
    if command -v stat &> /dev/null; then
        # macOS 和 Linux 都支持的 stat 格式
        FILE_SIZE=$(stat -f%z "$VSIX_FILE" 2> /dev/null || stat -c%s "$VSIX_FILE" 2> /dev/null)
        if [ -n "$FILE_SIZE" ]; then
            # 转换为人类可读格式
            if [ "$FILE_SIZE" -lt 1024 ]; then
                echo "   大小: ${FILE_SIZE}B"
            elif [ "$FILE_SIZE" -lt 1048576 ]; then
                echo "   大小: $((FILE_SIZE / 1024))KB"
            else
                echo "   大小: $((FILE_SIZE / 1048576))MB"
            fi
        fi
    fi
    echo ""
    echo "💡 安装命令:"
    echo "   npm run install:extension"
    echo ""
    echo "   或手动安装:"
    echo "   code --install-extension \"$(basename "$VSIX_FILE")\""
else
    echo "⚠️  警告: 未找到生成的 vsix 文件"
fi
