# Git Auto Commit Skill

自动分析文件变化，生成中英双语 commit message，确认后提交到 GitHub。

## 功能说明

1. 分析当前 git 变化（新增、修改、删除）
2. 根据变更类型自动生成符合 Conventional Commits 规范的 commit message（中英双语）
3. 等待用户确认
4. 执行 git add 和 commit
5. 推送到 GitHub

## Commit Message 格式

### 类型 (Type)

根据变更内容自动判断类型：

- `feat` - 新功能
- `fix` - Bug 修复
- `docs` - 文档更新
- `refactor` - 代码重构
- `style` - 代码格式调整
- `perf` - 性能优化
- `test` - 测试相关
- `chore` - 构建/工具链更新

### 中英双语格式

```text
<type>(<scope>): <subject (English)>

<subject (Chinese)>

<body (Chinese)>

- Change 1
- Change 2

Breaking Changes: <description>
```

## 执行流程

### 1. 检查 git 状态

```bash
git status
git diff --stat
```

### 2. 分析变更内容

根据文件路径和变更内容：

- `doc/**/*` → `docs`
- `src/**/*` → `feat` 或 `fix`
- `test/**/*` → `test`
- `*.json` 配置文件 → `chore`

### 3. 生成 commit message

#### 示例：文档重构

```text
docs: refactor developer documentation structure

重构开发者文档结构，按 00-08 编号重新组织

- 新增 00-handbook.md（开发者手册总览）
- 新增 01-setup.md（环境搭建）
- 重命名并更新原有文档
- 删除 getting-started.md（已整合）

影响范围：doc/
```

#### 示例：新增功能

```text
feat(utils): add log utility module feat(工具): 添加日志工具模块

添加日志工具模块，支持多级别日志输出和格式化

- 实现 debug, info, warn, error 级别
- 支持自定义日志格式
- 添加时间戳和上下文信息

影响范围：src/utils/logger.ts
```

### 4. 确认与提交

```bash
# 显示生成的 commit message
echo "Generated commit message:"
cat << 'EOF'
<commit message>
EOF

# 询问确认
read -p "Continue with this commit? (y/n) " confirm

if [ "$confirm" = "y" ]; then
  git add -A
  git commit -m "<commit message>"
  git push
  echo "✓ Changes committed and pushed to GitHub"
else
  echo "✗ Commit cancelled"
fi
```

## 配置文件

创建 `.commit-template.md` 作为默认模板：

```markdown
<type>(<scope>): <subject>

<body>

<footer>
```

## 使用方法

### 手动执行

```bash
# 查看变更
git status

# 使用 skill 生成 commit message
# 复制生成的 commit message

# 提交
git add -A
git commit -m "<pasted message>"
git push
```

### 自动化脚本

创建 `scripts/git-auto-commit.sh`：

```bash
#!/bin/bash
set -e

# 获取 git 变化
CHANGES=$(git diff --cached --stat)
ADDED=$(git diff --cached --name-only --diff-filter=A)
MODIFIED=$(git diff --cached --name-only --diff-filter=M)
DELETED=$(git diff --cached --name-only --diff-filter=D)

echo "=== Git Changes ==="
echo "Added: $ADDED"
echo "Modified: $MODIFIED"
echo "Deleted: $DELETED"

# 根据变更分析类型
TYPE="chore"
SCOPE=""
if [[ $ADDED == *"doc/"* ]] || [[ $MODIFIED == *"doc/"* ]]; then
  TYPE="docs"
fi
if [[ $MODIFIED == *"src/"* ]]; then
  TYPE="feat"
fi
if [[ $MODIFIED == *"test/"* ]]; then
  TYPE="test"
fi

# 生成 commit message（示例）
echo "=== Generated Commit Message ==="
echo "$TYPE: update"

# 确认
read -p "Proceed? (y/n) " confirm
if [ "$confirm" = "y" ]; then
  git commit
  git push
else
  echo "Cancelled"
fi
```

## 最佳实践

1. **提交前检查**：
   - 确保所有文件已暂存（`git add -A`）
   - 检查是否包含敏感信息
   - 确认分支正确

2. **Commit Message 规则**：
   - 标题简洁（50 字符内）
   - 正文详细说明变更内容
   - 如有破坏性变更，在 footer 说明

3. **推送到 GitHub**：
   - 提交后立即推送
   - 检查远程分支是否存在
   - 确认推送成功

## 示例输出

```text
=== Git Status ===
On branch main
Changes not staged for commit:
  modified:   doc/tools/npm.md
  modified:   doc/tools/tsconfig.md

=== Analysis ===
Files changed: 2
Type: docs (documentation updates)

=== Generated Commit Message ===
docs: update npm and tsconfig documentation

更新 npm 和 tsconfig 文档

- 优化 tsconfig.md 文档结构
- 新增版本管理章节
- 添加配置示例

=== Confirm ===
Continue with this commit? (y/n):
```

## 集成到 workflow

在 `package.json` 添加 scripts：

```json
{
  "scripts": {
    "commit": "bash .codebuddy/skills/git-auto-commit/commit.sh"
  }
}
```

使用：

```bash
npm run commit
```
