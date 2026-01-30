#!/bin/bash
set -e

# Git Auto Commit Script
# 自动分析文件变化，生成中英双语 commit message，确认后提交到 GitHub

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Git Auto Commit ===${NC}"
echo ""

# 检查 git 状态
echo -e "${YELLOW}Checking git status...${NC}"
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}✗ Not a git repository${NC}"
    exit 1
fi

# 暂存所有变更
echo -e "${YELLOW}Staging all changes...${NC}"
git add -A
CHANGES=$(git diff --cached --stat 2>/dev/null || true)

# 检查是否有变更
if [ -z "$CHANGES" ]; then
    echo -e "${YELLOW}No changes to commit${NC}"
    exit 0
fi

# 获取变更详情
echo -e "${GREEN}✓ Changes staged${NC}"
git diff --cached --stat
echo ""

# 分析变更
ADDED=$(git diff --cached --name-only --diff-filter=A 2>/dev/null | sort | tr '\n' ' ' | sed 's/ $//')
MODIFIED=$(git diff --cached --name-only --diff-filter=M 2>/dev/null | sort | tr '\n' ' ' | sed 's/ $//')
DELETED=$(git diff --cached --name-only --diff-filter=D 2>/dev/null | sort | tr '\n' ' ' | sed 's/ $//')

# 确定提交类型和范围
TYPE="chore"
SCOPE=""
EN_SUBJECT="update"
ZH_SUBJECT="更新"
BODY=""

# 分析变更类型
if [[ ! -z "$ADDED" ]] || [[ ! -z "$MODIFIED" ]]; then
    ALL_FILES="${ADDED}${MODIFIED}"

    # 检查文档变更
    if [[ $ALL_FILES == *"doc/"* ]]; then
        TYPE="docs"

        # 进一步分析文档变更内容
        if [[ $ALL_FILES == *"npm"* ]] && [[ $ALL_FILES == *"tsconfig"* ]]; then
            EN_SUBJECT="update documentation"
            ZH_SUBJECT="更新文档"
            BODY="- 更新 npm 和 tsconfig 技术手册
- 融合 npm_test.md 到 npm.md
- 新增 TypeScript 介绍章节
- 优化文档结构"
        elif [[ $ALL_FILES == *"developer/"* ]]; then
            EN_SUBJECT="refactor developer documentation"
            ZH_SUBJECT="重构开发者文档"
            BODY="- 重新组织开发者文档结构
- 按编号 00-08 排序
- 新增开发者手册章节
- 更新现有文档"
        else
            EN_SUBJECT="update documentation"
            ZH_SUBJECT="更新文档"
        fi
    fi

    # 检查源代码变更
    if [[ $ALL_FILES == *"src/"* ]]; then
        TYPE="feat"
        EN_SUBJECT="add new feature"
        ZH_SUBJECT="添加新功能"
        BODY="- 实现新功能模块
- 更新核心逻辑
- 优化代码结构"
    fi

    # 检查测试变更
    if [[ $ALL_FILES == *"test/"* ]]; then
        TYPE="test"
        EN_SUBJECT="update tests"
        ZH_SUBJECT="更新测试"
        BODY="- 添加新的测试用例
- 修复现有测试
- 提高覆盖率"
    fi

    # 检查配置文件变更
    if [[ $ALL_FILES == *"package.json"* ]] || [[ $ALL_FILES == *"tsconfig.json"* ]] || [[ $ALL_FILES == *"jest.config"* ]]; then
        TYPE="chore"
        EN_SUBJECT="update configuration"
        ZH_SUBJECT="更新配置"
        BODY="- 更新项目配置
- 调整构建脚本
- 优化开发环境"
    fi

    # 检查删除操作
    if [[ ! -z "$DELETED" ]]; then
        TYPE="chore"
        EN_SUBJECT="remove files"
        ZH_SUBJECT="删除文件"
        BODY="- 删除冗余文件
- 清理过时代码
- 优化项目结构"
    fi
fi

# 检测作用域
if [[ ! -z "$MODIFIED" ]]; then
    if [[ $MODIFIED == *"utils"* ]]; then
        SCOPE="utils"
    elif [[ $MODIFIED == *"extension"* ]]; then
        SCOPE="extension"
    elif [[ $MODIFIED == *"config"* ]]; then
        SCOPE="config"
    fi
fi

# 构建完整的 scope
if [ -n "$SCOPE" ]; then
    SCOPE_STR="($SCOPE)"
else
    SCOPE_STR=""
fi

# 生成 commit message
COMMIT_MSG="${TYPE}${SCOPE_STR}: ${EN_SUBJECT}

${ZH_SUBJECT}

${BODY}"

# 显示生成的 commit message
echo -e "${BLUE}=== Generated Commit Message ===${NC}"
echo ""
echo -e "${GREEN}${COMMIT_MSG}${NC}"
echo ""

# 显示变更统计
echo -e "${BLUE}=== Changes Summary ===${NC}"
FILE_COUNT=$(echo "$CHANGES" | wc -l | tr -d ' ')
echo "Files changed: $FILE_COUNT"
echo "Type: $TYPE"
echo "Scope: $SCOPE"
echo ""

# 询问确认
echo -e "${YELLOW}Ready to commit${NC}"
read -p "Continue with this commit? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Committing...${NC}"
    git commit -m "$COMMIT_MSG"

    # 检查是否需要推送
    CURRENT_BRANCH=$(git branch --show-current)
    echo -e "${YELLOW}Pushing to branch: $CURRENT_BRANCH${NC}"

    if git push origin "$CURRENT_BRANCH"; then
        echo ""
        echo -e "${GREEN}✓ Successfully committed and pushed to GitHub${NC}"
        echo -e "${GREEN}  Branch: $CURRENT_BRANCH${NC}"
        echo -e "${GREEN}  Files: $FILE_COUNT${NC}"
    else
        echo ""
        echo -e "${RED}✗ Push failed${NC}"
        echo -e "${YELLOW}You may need to:${NC}"
        echo "  - Check your internet connection"
        echo "  - Verify your GitHub credentials"
        echo "  - Run: git push origin $CURRENT_BRANCH"
        exit 1
    fi
else
    echo -e "${YELLOW}✗ Commit cancelled${NC}"
    echo ""
    echo -e "${YELLOW}To commit manually:${NC}"
    echo "  git commit -m \"$COMMIT_MSG\""
    echo "  git push"
fi
