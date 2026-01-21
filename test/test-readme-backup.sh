#!/bin/bash
#
# README 备份恢复测试脚本
# 用于验证备份和恢复功能是否正常工作
#

set -e

# 脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && cd)"

MANAGE_SCRIPT="${SCRIPT_DIR}/manage-readme.sh"

echo "========================================="
echo "README 备份恢复测试"
echo "========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试函数
test_step() {
    local name="$1"
    local command="$2"
    local expected="$3"

    echo -n "测试: ${name} ... "

    if ${command} &> /dev/null; then
        if [ -z "${expected}" ] || ${expected} &> /dev/null; then
            echo -e "${GREEN}✓ 通过${NC}"
            return 0
        else
            echo -e "${RED}✗ 失败${NC} (期望条件不满足)"
            return 1
        fi
    else
        echo -e "${RED}✗ 失败${NC}"
        return 1
    fi
}

# 检查原始状态
echo "1. 检查原始状态"
if bash "${MANAGE_SCRIPT}" check &> /dev/null; then
    echo -e "${YELLOW}⚠ 当前已替换为用户 README${NC}"
    echo "正在恢复原始状态..."
    bash "${MANAGE_SCRIPT}" restore
fi
echo ""

# 测试备份功能
echo "2. 测试备份功能"
TEST_BACKUP=$(bash "${MANAGE_SCRIPT}" backup 2>&1 | grep "备份完成:" | awk '{print $NF}' | tr -d "'")
if [ -n "${TEST_BACKUP}" ] && [ -f "${PROJECT_ROOT}/${TEST_BACKUP}" ]; then
    echo -e "${GREEN}✓ 备份创建成功: ${TEST_BACKUP}${NC}"
else
    echo -e "${RED}✗ 备份创建失败${NC}"
    exit 1
fi
echo ""

# 测试替换功能
echo "3. 测试替换功能"
bash "${MANAGE_SCRIPT}" replace
if bash "${MANAGE_SCRIPT}" check &> /dev/null; then
    echo -e "${GREEN}✓ 替换成功${NC}"

    # 验证内容是否被替换
    if grep -q "shell-formatter" "${PROJECT_ROOT}/README.md" \
        && grep -q "基于 shfmt 和 shellcheck" "${PROJECT_ROOT}/README.md"; then
        echo -e "${GREEN}✓ 内容验证通过（用户文档）${NC}"
    else
        echo -e "${RED}✗ 内容验证失败${NC}"
        bash "${MANAGE_SCRIPT}" restore
        exit 1
    fi
else
    echo -e "${RED}✗ 替换失败${NC}"
    bash "${MANAGE_SCRIPT}" restore
    exit 1
fi
echo ""

# 测试恢复功能
echo "4. 测试恢复功能"
bash "${MANAGE_SCRIPT}" restore
if ! bash "${MANAGE_SCRIPT}" check &> /dev/null; then
    echo -e "${GREEN}✓ 恢复成功${NC}"

    # 验证内容是否被恢复
    if grep -q "Quick Start for Developers" "${PROJECT_ROOT}/README.md" \
        || grep -q "快速开始指南" "${PROJECT_ROOT}/README.md"; then
        echo -e "${GREEN}✓ 内容验证通过（原始文档）${NC}"
    else
        echo -e "${RED}✗ 内容验证失败${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ 恢复失败${NC}"
    exit 1
fi
echo ""

# 测试多次备份
echo "5. 测试多次备份（验证时间戳和清理）"
for i in {1..4}; do
    echo "  创建第 ${i} 个备份..."
    bash "${MANAGE_SCRIPT}" backup &> /dev/null
done

BACKUP_COUNT=$(ls -1 "${PROJECT_ROOT}"/README.md.bak.* 2> /dev/null | wc -l)
if [ "${BACKUP_COUNT}" -eq 3 ]; then
    echo -e "${GREEN}✓ 备份清理正常（保留 3 个，删除 1 个）${NC}"
else
    echo -e "${RED}✗ 备份清理异常（预期 3 个，实际 ${BACKUP_COUNT} 个）${NC}"
    ls -lh "${PROJECT_ROOT}"/README.md.bak.*
    exit 1
fi
echo ""

# 清理测试备份
echo "6. 清理测试备份"
bash "${MANAGE_SCRIPT}" restore &> /dev/null
rm -f "${PROJECT_ROOT}"/README.md.bak.* "${PROJECT_ROOT}"/README.md.bak
echo -e "${GREEN}✓ 清理完成${NC}"
echo ""

echo "========================================="
echo -e "${GREEN}所有测试通过！✓${NC}"
echo "========================================="
echo ""
echo "备份和恢复功能正常工作。"
echo ""
echo "使用方法："
echo "  npm run package:extension  # 安全打包"
echo "  npm run readme:backup      # 仅备份"
echo "  npm run readme:replace     # 替换为用户文档"
echo "  npm run readme:restore     # 恢复原始文档"
echo "  npm run readme:check       # 检查状态"
