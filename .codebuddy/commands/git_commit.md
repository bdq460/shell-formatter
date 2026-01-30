# Git Commit Command

自动分析 Git 变更，生成中英双语 Commit Message，交互式确认后提交到 GitHub。

## 功能说明

- 自动检测 Git 仓库变更状态
- 智能分析变更文件类型
- 生成符合 Conventional Commits 规范的 Commit Message（中英双语）
- 交互式确认机制
- 支持自定义提交信息
- 自动推送到 GitHub

## 使用方法

### 方式 1: 使用 npm script

```bash
# 完整流程（自动生成 + 提交 + 推送）
npm run git:full

# 仅提交（不推送）
npm run git:commit
```

### 方式 2: 直接调用脚本

```bash
# 完整流程
bash .codebuddy/skills/git-auto-commit/cli.sh full

# 仅提交
bash .codebuddy/skills/git-auto-commit/cli.sh commit
```

## 命令参数

| 子命令 | 说明 | 示例 |
|--------|------|------|
| `status` | 查看 Git 状态 | `cli.sh status` |
| `add` | 添加文件到暂存区 | `cli.sh add [files...]` |
| `commit` | 提交变更 | `cli.sh commit [message]` |
| `push` | 推送到远程 | `cli.sh push` |
| `full` | 完整流程 | `cli.sh full` |

## Commit Message 格式

### Type（类型）

| 类型 | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | feat: 添加用户认证 |
| `fix` | 修复 bug | fix: 修复登录问题 |
| `docs` | 文档更新 | docs: 更新 API 文档 |
| `style` | 代码格式 | style: 统一代码风格 |
| `refactor` | 重构 | refactor: 优化数据处理 |
| `perf` | 性能优化 | perf: 减少渲染时间 |
| `test` | 测试相关 | test: 添加单元测试 |
| `chore` | 构建/工具 | chore: 更新依赖版本 |

### 示例输出

```text
docs: 重构开发者文档结构

Refactor developer documentation structure

- 按 00-08 编号重新组织文档
- 新增开发者手册总览章节
- 优化文档索引结构
- 删除过时的 getting-started.md

影响范围: doc/developer/
```

## 智能类型判断规则

- `doc/**/*` → `docs`
- `test/**/*` → `test`
- `src/**/*` → `feat` / `fix`
- `package.json` → `chore`
- `tsconfig.json` → `chore`
- `*.md` → `docs`
- `*.ts`, `*.js` → `feat` / `fix`

## 交互流程

```text
1. 检测变更
   ↓
2. 分析文件类型
   ↓
3. 生成 Commit Message（中英双语）
   ↓
4. 显示预览
   ↓
5. 用户确认 (y/n)
   ↓
6. 执行提交
   ↓
7. 推送到 GitHub
```

## 示例使用

### 自动生成并提交

```bash
$ npm run git:full

=== Git Auto Commit (Full) ===

步骤 1/3: 检测变更
✓ 检测到 5 个变更文件

步骤 2/3: 生成 Commit Message

生成的 Commit Message:
---
docs: 重构开发者文档结构

Refactor developer documentation structure

- 按 00-08 编号重新组织文档
- 新增开发者手册总览章节
- 优化文档索引结构
---

确认提交并推送? (y/n) y

步骤 3/3: 执行提交和推送
✓ 提交成功: abc123def456
✓ 推送成功: origin/main

=== 完成 ===
```

### 自定义提交信息

```bash
$ npm run git:commit "fix: 修复登录问题"

=== Git Commit ===

生成的 Commit Message:
---
fix: 修复登录问题

Fix login issue

- 修复 token 过期问题
- 优化错误提示
---

确认提交? (y/n) y

✓ 提交成功: xyz789abc123
```

## 配置选项

### 修改默认推送分支

编辑 `cli.sh`，修改 `DEFAULT_BRANCH` 变量：

```bash
DEFAULT_BRANCH="main"  # 或 "master"
```

### 自定义类型映射

编辑 `cli.sh`，修改 `TYPE_MAPPING` 数组：

```bash
TYPE_MAPPING=(
    "doc/**/*:docs"
    "test/**/*:test"
    "src/**/*:feat"
    "config/**/*:chore"
)
```

## 故障排除

### 问题 1: 检测不到变更

**原因**: 没有未暂存或已暂存的变更

**解决**: 检查 `git status`

### 问题 2: 推送失败

**原因**: 网络问题或权限问题

**解决**:

- 检查网络连接
- 验证 GitHub 仓库权限
- 确认远程仓库 URL 正确

### 问题 3: Commit Message 不符合规范

**原因**: 文件类型判断不准确

**解决**:

- 使用自定义提交信息：`cli.sh commit "custom message"`
- 修改 `TYPE_MAPPING` 配置

## 相关文件

- `.codebuddy/skills/git-auto-commit/cli.sh` - CLI 脚本
- `.codebuddy/skills/git-auto-commit/commit.sh` - 自动提交脚本
- `.codebuddy/skills/git-auto-commit/skill.md` - Skill 说明
- `.codebuddy/skills/git-auto-commit/README.md` - 详细文档

## 参考资源

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Commit Good Practices](https://chris.beams.io/posts/git-commit/)
- [npm scripts 文档](https://docs.npmjs.com/cli/v9/using-npm/scripts)
