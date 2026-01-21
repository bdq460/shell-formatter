#!/bin/bash
#
# README.md 备份和恢复脚本
# 用于打包时临时替换 README.md，并在完成后恢复
#

set -e # 遇到错误立即退出

# 脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# 备份文件名（使用时间戳避免覆盖）
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${PROJECT_ROOT}/README.md.bak.${TIMESTAMP}"
CURRENT_BACKUP="${PROJECT_ROOT}/README.md.bak"

README="${PROJECT_ROOT}/README.md"
USER_README="${PROJECT_ROOT}/doc/user/README.md"

# 函数：清理旧的备份文件
cleanup_old_backups() {
    echo "清理旧的备份文件..."
    # 保留最新的 3 个备份，删除其余的
    ls -t "${PROJECT_ROOT}"/README.md.bak.* 2> /dev/null | tail -n +4 | xargs -r rm -f
    echo "旧备份文件清理完成"
}

# 函数：备份当前的 README.md
backup_readme() {
    echo "备份当前的 README.md..."

    if [ -f "${README}" ]; then
        # 检查文件是否是用户文档的符号链接
        if [ -L "${README}" ]; then
            echo "README.md 是符号链接，跳过备份"
            return
        fi

        # 创建带时间戳的备份
        cp "${README}" "${BACKUP_FILE}"
        # 更新当前备份（用于快速恢复）
        cp "${README}" "${CURRENT_BACKUP}"

        echo "备份完成: ${BACKUP_FILE}"
    else
        echo "警告: README.md 不存在，跳过备份"
    fi
}

# 函数：替换为用户 README.md
replace_readme() {
    echo "替换为用户 README.md..."

    if [ ! -f "${USER_README}" ]; then
        echo "错误: 用户 README 不存在: ${USER_README}"
        exit 1
    fi

    cp "${USER_README}" "${README}"
    echo "替换完成"
}

# 函数：恢复 README.md
restore_readme() {
    echo "恢复 README.md..."

    # 优先使用最新备份
    if [ -f "${CURRENT_BACKUP}" ]; then
        mv "${CURRENT_BACKUP}" "${README}"
        echo "使用快速备份恢复完成"
    else
        # 查找最新的备份
        LATEST_BACKUP=$(ls -t "${PROJECT_ROOT}"/README.md.bak.* 2> /dev/null | head -n 1)

        if [ -n "${LATEST_BACKUP}" ]; then
            cp "${LATEST_BACKUP}" "${README}"
            # 更新快速备份
            cp "${LATEST_BACKUP}" "${CURRENT_BACKUP}"
            echo "使用备份恢复完成: ${LATEST_BACKUP}"
        else
            echo "警告: 未找到备份文件，无法恢复"
            return 1
        fi
    fi
}

# 函数：检查是否已替换
is_replaced() {
    [ -L "${README}" ] || [ ! -f "${CURRENT_BACKUP}" ]
}

# 主逻辑
case "${1:-}" in
    backup)
        backup_readme
        cleanup_old_backups
        ;;

    replace)
        backup_readme
        replace_readme
        cleanup_old_backups
        ;;

    restore)
        restore_readme
        cleanup_old_backups
        ;;

    check)
        if is_replaced; then
            echo "已替换为用户 README"
            exit 0
        else
            echo "未替换，使用原始 README"
            exit 1
        fi
        ;;

    *)
        echo "用法: $0 {backup|replace|restore|check}"
        echo ""
        echo "命令说明:"
        echo "  backup   - 备份当前的 README.md"
        echo "  replace  - 备份并替换为用户 README.md"
        echo "  restore  - 恢复原始 README.md"
        echo "  check    - 检查是否已替换"
        echo ""
        echo "示例:"
        echo "  npm run readme:backup"
        echo "  npm run readme:replace"
        echo "  npm run readme:restore"
        echo "  npm run readme:check"
        exit 1
        ;;
esac
