# Git Commit Command

使用 Git 提交变更的规范和最佳实践指南。

## 功能说明

提供 Git 提交的标准流程和规范：

- 遵循 Conventional Commits 规范
- Commit Message 必须提供中文与英文两套描述，分别完整说明变更内容
- 中文在前、英文在后，内容不交叉混排
- 交互式确认机制
- 支持自定义提交信息
- 自动推送到 GitHub

## Commit Message 格式规范

### 基本格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

**说明**：

- `type`: 提交类型（必需）
- `scope`: 影响范围（可选）
- `subject`: 简短描述（必需，50 字符内，中文在前）
- `body`: 详细描述（可选，中文一段 + 英文一段）
- `footer`: 破坏性变更说明（可选）

### Type（类型）

| 类型 | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | feat: 添加用户认证 |
| `fix` | 修复 bug | fix: 修复登录问题 |
| `docs` | 文档更新 | docs: 更新 API 文档 |
| `style` | 代码格式（不影响功能）| style: 统一代码风格 |
| `refactor` | 重构（既不是新功能也不是修复）| refactor: 优化数据处理 |
| `perf` | 性能优化 | perf: 减少渲染时间 |
| `test` | 测试相关 | test: 添加单元测试 |
| `chore` | 构建/工具链更新 | chore: 更新依赖版本 |
| `revert` | 回退之前的提交 | revert: feat(user): add login |

### Subject（主题）规范

- 简短描述（50 字符内）
- 首字母小写（英文）
- 不以句号结尾
- 使用祈使语气（英文）
- 中文描述在前，英文翻译在后

**示例**：

```
docs: 重构开发者文档结构
docs: refactor developer documentation structure
```

### Body（正文）规范

- 中文段落 + 英文段落
- 内容不交叉混排
- 说明"做什么"和"为什么"，而不是"怎么做"
- 每行不超过 72 字符

**示例**：

```
docs: 重构开发者文档结构

按 00-08 编号重新组织文档
新增开发者手册总览章节
优化文档索引结构
删除过时的 getting-started.md

Reorganize developer documentation with 00-08 numbering
Add developer handbook overview chapter
Optimize documentation index structure
Delete obsolete getting-started.md
```

### Footer（脚注）规范

- 破坏性变更说明
- 关联 Issue 或 PR
- 影响范围说明

**示例**：

```
feat(api): remove deprecated endpoint

Remove the deprecated /v1/users endpoint
Use /v2/users instead

BREAKING CHANGE: This removes support for the deprecated API

Closes #123
影响范围: 所有使用 /v1/users 的客户端
```

## 使用方法

### 1. 查看变更

```bash
# 查看所有变更状态
git status

# 查看详细变更
git diff

# 查看已暂存的变更
git diff --cached

# 查看变更统计
git diff --stat
```

### 2. 添加文件到暂存区

```bash
# 添加所有变更
git add -A

# 添加特定文件
git add path/to/file.ts

# 交互式添加
git add -i
```

### 3. 提交变更

```bash
# 简单提交
git commit -m "feat: add new feature"

Add new feature

# 多行提交
git commit -m "feat: add authentication

Implement user authentication using JWT tokens
Support login and registration functionality

Implement user authentication using JWT tokens
Support login and registration functionality"

# 编辑模式提交
git commit
```

### 4. 推送到远程

```bash
# 推送到当前分支
git push

# 推送到指定分支
git push origin main

# 推送并设置上游分支
git push -u origin main

# 强制推送（谨慎使用）
git push -f
```

## 提交流程

### 标准流程

```text
1. 查看变更状态
   git status
   ↓
2. 添加文件到暂存区
   git add -A
   ↓
3. 生成 Commit Message（中英双语）
   中文一段 + 英文一段
   ↓
4. 执行提交
   git commit
   ↓
5. 推送到 GitHub
   git push
```

### 交互式提交流程

```bash
# 步骤 1: 查看变更
$ git status
On branch main
Changes not staged for commit:
  modified:   src/app.ts
  modified:   docs/api.md

# 步骤 2: 添加文件
$ git add -A

# 步骤 3: 提交（编辑模式）
$ git commit

# Git 会打开编辑器，输入：
feat: 添加用户认证功能

实现基于 JWT 令牌的用户认证
支持登录和注册功能
添加 token 刷新机制

Implement user authentication using JWT tokens
Support login and registration functionality
Add token refresh mechanism

Closes #45

# 步骤 4: 保存并退出编辑器

# 步骤 5: 推送
$ git push
```

## Commit Message 示例

### 示例 1: 文档更新

```text
docs: 重构开发者文档结构

按 00-08 编号重新组织文档
新增开发者手册总览章节
优化文档索引结构
删除过时的 getting-started.md

Reorganize developer documentation with 00-08 numbering
Add developer handbook overview chapter
Optimize documentation index structure
Delete obsolete getting-started.md
```

### 示例 2: 新功能

```text
feat(user): 添加用户认证功能

实现基于 JWT 令牌的用户认证
支持登录和注册功能
添加 token 刷新机制

Implement user authentication using JWT tokens
Support login and registration functionality
Add token refresh mechanism

Closes #45
```

### 示例 3: 修复 Bug

```
fix(auth): 修复 token 过期检查问题

修正 token 过期时间计算错误
优化 token 刷新逻辑

Fix token expiration time calculation error
Optimize token refresh logic

Closes #78
```

### 示例 4: 重构

```
refactor(core): 优化数据处理流程

简化数据转换逻辑
减少重复代码
提升可读性和维护性

Simplify data transformation logic
Reduce code duplication
Improve readability and maintainability
```

### 示例 5: 性能优化

```
perf(render): 减少组件渲染时间

优化虚拟滚动算法
减少不必要的重新渲染
提升滚动性能

Optimize virtual scrolling algorithm
Reduce unnecessary re-renders
Improve scrolling performance
```

### 示例 6: 破坏性变更

```
feat(api): 升级 API 版本到 v2

重构所有 API 端点
使用 RESTful 设计模式
废弃旧的 v1 API

Refactor all API endpoints
Use RESTful design pattern
Deprecate old v1 API

BREAKING CHANGE: This removes support for v1 API endpoints
所有使用 v1 API 的客户端需要迁移到 v2
All clients using v1 API need to migrate to v2

影响范围: API 客户端
Scope: API clients

Deprecates: #123
```

## 智能类型判断建议

根据变更的文件内容，选择合适的 Type：

| 文件路径 | 推荐类型 | 说明 |
|---------|---------|------|
| `doc/**/*` | `docs` | 文档变更 |
| `test/**/*` | `test` | 测试相关 |
| `src/**/*` | `feat` / `fix` | 根据是新增还是修复 |
| `package.json` | `chore` | 依赖更新 |
| `tsconfig.json` | `chore` | 配置更新 |
| `*.md` | `docs` | Markdown 文档 |
| `*.ts`, `*.js` | `feat` / `fix` | 源代码变更 |
| `*.sh`, `Makefile` | `chore` | 脚本和构建配置 |

## Git 别名配置

为了提高效率，可以配置常用的 Git 别名：

```bash
# 查看状态
git config --global alias.st status

# 添加所有文件
git config --global alias.aa 'add -A'

# 提交
git config --global alias.ci commit

# 推送
git config --global alias.ps push

# 查看日志
git config --global alias.lg 'log --oneline --graph --all'

# 取消暂存
git config --global alias.un 'reset HEAD --'

# 查看最后一次提交
git config --global alias.last 'log -1 HEAD'
```

使用示例：

```bash
git st      # git status
git aa      # git add -A
git ci      # git commit
git ps      # git push
```

## 最佳实践

### 1. 提交频率

- **频繁提交**：小步快跑，每个功能点单独提交
- **原子提交**：每次提交只做一件事
- **可回滚**：每个提交都应该是可以独立回滚的

### 2. 提交内容

- **相关联**：一个提交只包含相关的变更
- **完整**：一个提交应该是一个完整的单元
- **测试**：确保代码已测试

### 3. Commit Message

- **清晰**：让别人（包括未来的自己）能看懂
- **准确**：准确描述变更内容
- **简洁**：主题简短，详情清晰

### 4. 审查变更

提交前使用以下命令审查：

```bash
# 查看将要提交的变更
git diff --cached

# 查看变更统计
git diff --cached --stat

# 查看变更的行数
git diff --cached --shortstat
```

## 常见问题

### 问题 1: 如何修改最后一次提交？

```bash
# 修改最后一次提交的 message
git commit --amend

# 修改最后一次提交的内容
git add new_file.ts
git commit --amend

# 不修改提交时间
git commit --amend --no-edit
```

### 问题 2: 如何撤销提交？

```bash
# 撤销最后一次提交（保留变更）
git reset --soft HEAD~1

# 撤销最后一次提交（不保留变更）
git reset --hard HEAD~1

# 撤销多次提交（保留变更）
git reset --soft HEAD~3
```

### 问题 3: 如何修改已推送的提交？

```bash
# 修改本地提交
git commit --amend

# 强制推送到远程（谨慎使用）
git push --force

# 推荐方式：使用 --force-with-lease
git push --force-with-lease
```

### 问题 4: 如何 Cherry-Pick 提交？

```bash
# 从其他分支选择提交
git cherry-pick <commit-hash>

# 选择多个提交
git cherry-pick <commit1> <commit2>

# 选择范围
git cherry-pick <commit1>^..<commit2>
```

### 问题 5: 如何解决冲突？

```bash
# 1. 查看冲突文件
git status

# 2. 手动解决冲突
# 编辑冲突文件，保留需要的代码

# 3. 标记为已解决
git add <conflicted-file>

# 4. 继续提交
git commit
```

## Git Hooks

使用 Git Hooks 自动化提交验证：

### 提交前验证（commit-msg）

创建 `.git/hooks/commit-msg`：

```bash
#!/bin/bash
# 检查 commit message 格式

commit_regex='^(feat|fix|docs|style|refactor|perf|test|chore|revert)(\(.+\))?: .{1,50}'

if ! grep -qE "$commit_regex" "$1"; then
    echo "Commit message format is invalid!"
    echo "Expected format: type(scope): subject"
    echo "Example: feat(user): add authentication"
    exit 1
fi
```

添加执行权限：

```bash
chmod +x .git/hooks/commit-msg
```

## 相关工具

### Commitlint

安装并配置 commitlint 自动检查 Commit Message：

```bash
npm install --save-dev @commitlint/cli @commitlint/config-conventional
```

创建 `commitlint.config.js`：

```javascript
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'chore', 'revert']
    ],
    'subject-max-length': [2, 'always', 50],
  }
}
```

### Husky

使用 Husky 管理 Git Hooks：

```bash
npm install --save-dev husky
npx husky install
npx husky add .husky/commit-msg 'npx --no -- commitlint --edit "$1"'
```

## 参考资源

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Commit Good Practices](https://chris.beams.io/posts/git-commit/)
- [How to Write a Git Commit Message](https://chris.beams.io/posts/git-commit/)
- [Angular Commit Message Conventions](https://github.com/angular/angular/blob/master/CONTRIBUTING.md#commit)
- [npm scripts 文档](https://docs.npmjs.com/cli/v9/using-npm/scripts)
