# Git Auto Commit Skill

自动分析文件变化，生成中英双语 commit message，确认后提交到 GitHub。

## 功能特点

1. ✅ 自动分析 git 变化（新增、修改、删除）
2. ✅ 智能判断提交类型（docs, feat, fix, test, chore 等）
3. ✅ 生成符合 Conventional Commits 规范的中英双语 commit message
4. ✅ 交互式确认，避免误提交
5. ✅ 自动推送到 GitHub

## 使用方法

### 快速使用

```bash
# 方式 1: 使用 npm script
npm run git:auto-commit

# 方式 2: 直接执行脚本
bash .codebuddy/skills/git-auto-commit/commit.sh
```

### 执行流程

1. **暂存变更**：自动执行 `git add -A`
2. **分析变更**：检测文件变化类型和范围
3. **生成 commit message**：根据变更内容生成中英双语信息
4. **显示预览**：展示完整的 commit message
5. **用户确认**：输入 `y` 确认，其他键取消
6. **提交并推送**：自动执行 commit 和 push

### 示例输出

```text
=== Git Auto Commit ===

Checking git status...
Staging all changes...
✓ Changes staged
 doc/tools/npm.md                |   20 +-
 doc/tools/tsconfig.md            |  200 ++-

=== Generated Commit Message ===

docs: update npm and tsconfig documentation

更新 npm 和 tsconfig 文档

- 优化 tsconfig.md 文档结构
- 新增版本管理章节
- 添加配置示例

=== Changes Summary ===
Files changed: 2
Type: docs
Scope: (tools)

Ready to commit
Continue with this commit? (y/n) y

Committing...
Pushing to branch: main
✓ Successfully committed and pushed to GitHub
  Branch: main
  Files: 2
```

## Commit Message 格式

### 中英双语结构

```text
<type>(<scope>): <subject (English)>

<subject (Chinese)>

- Change 1
- Change 2
```

### 类型判断规则

| 文件路径 | 提交类型 | 示例 |
|---------|---------|------|
| `doc/**/*` | `docs` | 文档更新 |
| `src/**/*` | `feat` 或 `fix` | 新功能/修复 |
| `test/**/*` | `test` | 测试相关 |
| `package.json` | `chore` | 配置更新 |
| `*.json` 配置 | `chore` | 构建配置 |
| 删除文件 | `chore` | 清理代码 |

## 智能分析

脚本会根据变更内容自动选择合适的 commit message：

### 文档重构

```text
docs: refactor developer documentation structure

重构开发者文档结构，按 00-08 编号重新组织
```

### 新增功能

```text
feat(utils): add log utility module

添加日志工具模块，支持多级别日志输出和格式化
```

### 配置更新

```text
chore: update project configuration

更新项目配置，调整构建脚本
```

## 自定义配置

### 修改类型判断规则

编辑 `.codebuddy/skills/git-auto-commit/commit.sh`：

```bash
# 在分析部分添加自定义规则
if [[ $ALL_FILES == *"your/path"* ]]; then
    TYPE="custom-type"
    EN_SUBJECT="your custom subject"
    ZH_SUBJECT="你的自定义主题"
fi
```

### 修改 commit message 模板

在脚本中修改 `COMMIT_MSG` 生成部分：

```bash
# 默认格式
COMMIT_MSG="${TYPE}${SCOPE_STR}: ${EN_SUBJECT}

${ZH_SUBJECT}

${BODY}"

# 自定义格式
COMMIT_MSG="${TYPE}${SCOPE_STR}: ${EN_SUBJECT}

${ZH_SUBJECT}

${BODY}

Co-authored-by: Your Name <email@example.com>"
```

## 注意事项

1. **确认变更内容**：执行前检查 `git status` 确认要提交的文件
2. **网络连接**：推送前确保网络正常
3. **分支选择**：脚本会自动推送到当前分支
4. **权限问题**：如果提示权限错误，检查 Git 凭证配置

## 故障排除

### 推送失败

```bash
# 检查远程仓库
git remote -v

# 检查分支
git branch -a

# 手动推送
git push origin <branch-name>
```

### Commit message 不满意

1. 输入 `n` 取消提交
2. 手动修改 commit message：

   ```bash
   git commit -m "your custom message"
   ```

3. 推送：

   ```bash
   git push
   ```

### 找不到脚本

```bash
# 确认脚本有执行权限
chmod +x .codebuddy/skills/git-auto-commit/commit.sh

# 检查路径
ls -la .codebuddy/skills/git-auto-commit/
```

## 与 Git 工具集成

### VS Code 集成

创建 `.vscode/tasks.json`：

```json
{
  "version": "2.0.0",
  "tasks": [{
    "label": "Git: Auto Commit",
    "type": "shell",
    "command": "bash",
    "args": [".codebuddy/skills/git-auto-commit/commit.sh"],
    "problemMatcher": []
  }]
}
```

使用：`Cmd+Shift+P` → "Tasks: Run Task" → "Git: Auto Commit"

### Pre-commit Hook

创建 `.git/hooks/pre-commit`：

```bash
#!/bin/bash
# 运行自动提交脚本
bash .codebuddy/skills/git-auto-commit/commit.sh
```

注意：这会导致每次提交前都运行脚本，可能不适合所有场景。

## 扩展功能

可以扩展脚本功能：

1. **添加更多类型**：如 `style`, `perf`, `build` 等
2. **检测破坏性变更**：添加 `BREAKING CHANGE:` footer
3. **生成变更列表**：自动列出所有修改的文件
4. **关联 Issue**：自动添加 `#issue-number` 链接

## 相关资源

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Commit Best Practices](https://chris.beams.io/posts/git-commit/)
- [Commitlint](https://commitlint.js.org/)
