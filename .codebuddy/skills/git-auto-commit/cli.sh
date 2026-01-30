#!/bin/bash
# Git Auto Commit CLI
# 使用方法: ./cli.sh [命令] [参数]
#
# 支持的命令:
#   status    - 查看 git 状态
#   add       - 添加文件到暂存区
#   commit    - 提交变更（自动生成 commit message）
#   push      - 推送到远程
#   full      - 完整流程：add + commit + push
#   --help    - 显示帮助信息

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 帮助信息
show_help() {
    echo -e "${CYAN}Git Auto Commit CLI${NC}"
    echo ""
    echo "使用方法: $0 [命令] [参数]"
    echo ""
    echo -e "${GREEN}支持命令:${NC}"
    echo "  ${YELLOW}status${NC}    查看 git 状态"
    echo "  ${YELLOW}add${NC}       添加文件到暂存区（可指定文件或使用 --all）"
    echo "  ${YELLOW}commit${NC}    提交变更（自动生成中英双语 commit message）"
    echo "  ${YELLOW}push${NC}      推送到远程仓库"
    echo "  ${YELLOW}full${NC}      完整流程：add + commit + push"
    echo "  ${YELLOW}--help${NC}    显示此帮助信息"
    echo ""
    echo -e "${GREEN}示例:${NC}"
    echo "  $0 status"
    echo "  $0 add"
    echo "  $0 add --all"
    echo "  $0 add file1.ts file2.ts"
    echo "  $0 commit"
    echo "  $0 push"
    echo "  $0 full"
    echo ""
}

# 检查 git 仓库
check_git_repo() {
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        echo -e "${RED}✗ 错误: 不是 git 仓库${NC}"
        exit 1
    fi
}

# 查看状态
cmd_status() {
    check_git_repo
    echo -e "${BLUE}=== Git Status ===${NC}"
    echo ""
    git status
    echo ""
    echo -e "${BLUE}=== Changes Summary ===${NC}"
    echo "Branch: $(git branch --show-current)"
    echo "Commits ahead: $(git rev-list --count @{u}.. || echo 0)"
}

# 添加文件
cmd_add() {
    check_git_repo

    if [ "$1" = "--all" ] || [ "$1" = "-a" ]; then
        echo -e "${YELLOW}暂存所有文件...${NC}"
        git add -A
    elif [ -z "$1" ]; then
        echo -e "${YELLOW}用法: $0 add [--all] [文件...]${NC}"
        exit 1
    else
        echo -e "${YELLOW}暂存文件: $@${NC}"
        git add "$@"
    fi
    echo -e "${GREEN}✓ 文件已暂存${NC}"
}

# 推送到远程
cmd_push() {
    check_git_repo
    CURRENT_BRANCH=$(git branch --show-current)

    echo -e "${BLUE}=== Git Push ===${NC}"
    echo "Branch: $CURRENT_BRANCH"
    echo ""

    if git push origin "$CURRENT_BRANCH"; then
        echo -e "${GREEN}✓ 推送成功${NC}"
    else
        echo -e "${RED}✗ 推送失败${NC}"
        echo "请检查网络连接和 GitHub 凭证"
        exit 1
    fi
}

# 生成 commit message
generate_commit_msg() {
    # 获取暂存的变更
    ADDED=$(git diff --cached --name-only --diff-filter=A 2>/dev/null | sort | tr '\n' ' ' | sed 's/ $//')
    MODIFIED=$(git diff --cached --name-only --diff-filter=M 2>/dev/null | sort | tr '\n' ' ' | sed 's/ $//')
    DELETED=$(git diff --cached --name-only --diff-filter=D 2>/dev/null | sort | tr '\n' ' ' | sed 's/ $//')

    # 默认值
    TYPE="chore"
    SCOPE=""
    EN_SUBJECT="update"
    ZH_SUBJECT="更新"
    BODY=""

    # 分析变更
    ALL_FILES="${ADDED}${MODIFIED}"
    CHANGES=$(git diff --cached --stat 2>/dev/null || true)

    if [ -z "$CHANGES" ]; then
        return 1
    fi

    # 判断类型
    if [[ $ALL_FILES == *"doc/"* ]]; then
        TYPE="docs"
        if [[ $ALL_FILES == *"npm"* ]] || [[ $ALL_FILES == *"tsconfig"* ]]; then
            EN_SUBJECT="update technical documentation"
            ZH_SUBJECT="更新技术文档"
            BODY="- 优化文档结构
- 新增配置说明
- 完善使用示例"
        elif [[ $ALL_FILES == *"developer/"* ]]; then
            EN_SUBJECT="refactor developer documentation"
            ZH_SUBJECT="重构开发者文档"
            BODY="- 重新组织文档结构
- 添加新章节
- 更新现有内容"
        else
            EN_SUBJECT="update documentation"
            ZH_SUBJECT="更新文档"
        fi
    elif [[ $ALL_FILES == *"src/"* ]]; then
        TYPE="feat"
        EN_SUBJECT="add feature"
        ZH_SUBJECT="添加功能"
        BODY="- 实现新功能
- 更新核心逻辑
- 优化代码结构"
    elif [[ $ALL_FILES == *"test/"* ]]; then
        TYPE="test"
        EN_SUBJECT="update tests"
        ZH_SUBJECT="更新测试"
        BODY="- 添加测试用例
- 修复测试问题
- 提高覆盖率"
    elif [[ ! -z "$DELETED" ]]; then
        TYPE="chore"
        EN_SUBJECT="remove files"
        ZH_SUBJECT="删除文件"
        BODY="- 删除冗余文件
- 清理过时代码
- 优化项目结构"
    fi

    # 判断作用域
    if [[ ! -z "$MODIFIED" ]]; then
        if [[ $MODIFIED == *"utils"* ]]; then
            SCOPE="utils"
        elif [[ $MODIFIED == *"extension"* ]]; then
            SCOPE="extension"
        elif [[ $MODIFIED == *"config"* ]]; then
            SCOPE="config"
        fi
    fi

    # 构建 scope
    if [ -n "$SCOPE" ]; then
        SCOPE_STR="($SCOPE)"
    else
        SCOPE_STR=""
    fi

    # 生成 commit message
    echo "${TYPE}${SCOPE_STR}: ${EN_SUBJECT}
${ZH_SUBJECT}

${BODY}"
}

# 提交变更
cmd_commit() {
    check_git_repo

    echo -e "${BLUE}=== Git Commit ===${NC}"
    echo ""

    # 检查是否有暂存的变更
    CHANGES=$(git diff --cached --stat 2>/dev/null || true)
    if [ -z "$CHANGES" ]; then
        echo -e "${YELLOW}没有暂存的变更${NC}"
        echo -e "${YELLOW}运行 '$0 add' 暂存文件${NC}"
        exit 0
    fi

    # 显示变更
    echo -e "${CYAN}暂存的变更:${NC}"
    git diff --cached --stat
    echo ""

    # 生成 commit message
    COMMIT_MSG=$(generate_commit_msg)
    if [ $? -ne 0 ]; then
        echo -e "${RED}无法生成 commit message${NC}"
        exit 1
    fi

    # 显示 commit message
    echo -e "${GREEN}生成的 Commit Message:${NC}"
    echo -e "${CYAN}---${NC}"
    echo -e "$COMMIT_MSG"
    echo -e "${CYAN}---${NC}"
    echo ""

    # 确认提交
    read -p "确认提交? (y/n) " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}提交中...${NC}"
        if git commit -m "$COMMIT_MSG"; then
            echo -e "${GREEN}✓ 提交成功${NC}"
            COMMIT_HASH=$(git rev-parse HEAD)
            echo "  Commit: $COMMIT_HASH"
        else
            echo -e "${RED}✗ 提交失败${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}✗ 已取消${NC}"
        echo -e "${YELLOW}手动提交命令:${NC}"
        echo "  git commit -m \"$COMMIT_MSG\""
    fi
}

# 完整流程
cmd_full() {
    check_git_repo

    echo -e "${BLUE}=== Git Auto Commit (Full) ===${NC}"
    echo ""

    # 1. 添加文件
    echo -e "${YELLOW}步骤 1/3: 暂存变更${NC}"
    git add -A
    echo -e "${GREEN}✓ 已暂存所有文件${NC}"
    echo ""

    # 2. 检查是否有变更
    CHANGES=$(git diff --cached --stat 2>/dev/null || true)
    if [ -z "$CHANGES" ]; then
        echo -e "${YELLOW}没有变更需要提交${NC}"
        exit 0
    fi

    # 3. 提交
    echo -e "${YELLOW}步骤 2/3: 生成 commit message${NC}"
    COMMIT_MSG=$(generate_commit_msg)
    if [ $? -ne 0 ]; then
        exit 1
    fi

    echo -e "${GREEN}生成的 Commit Message:${NC}"
    echo -e "${CYAN}---${NC}"
    echo -e "$COMMIT_MSG"
    echo -e "${CYAN}---${NC}"
    echo ""

    # 确认
    read -p "确认完整流程 (add + commit + push)? (y/n) " -n 1 -r
    echo ""

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}✗ 已取消${NC}"
        exit 0
    fi

    # 提交
    echo -e "${YELLOW}步骤 3/3: 提交并推送${NC}"
    if git commit -m "$COMMIT_MSG"; then
        echo -e "${GREEN}✓ 提交成功${NC}"
    else
        echo -e "${RED}✗ 提交失败${NC}"
        exit 1
    fi

    # 推送
    CURRENT_BRANCH=$(git branch --show-current)
    if git push origin "$CURRENT_BRANCH"; then
        echo -e "${GREEN}✓ 推送成功${NC}"
        echo ""
        echo -e "${CYAN}=== 完成 ===${NC}"
        echo "Branch: $CURRENT_BRANCH"
        COMMIT_HASH=$(git rev-parse HEAD)
        echo "Commit: $COMMIT_HASH"
    else
        echo -e "${RED}✗ 推送失败${NC}"
        exit 1
    fi
}

# 主函数
main() {
    case "${1:-}" in
        status)
            cmd_status
            ;;
        add)
            shift
            cmd_add "$@"
            ;;
        commit)
            cmd_commit
            ;;
        push)
            cmd_push
            ;;
        full)
            cmd_full
            ;;
        --help|-h|help|"")
            show_help
            ;;
        *)
            echo -e "${RED}错误: 未知命令 '$1'${NC}"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# 运行主函数
main "$@"
