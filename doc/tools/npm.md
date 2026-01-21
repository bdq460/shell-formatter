# npm 完整使用指南

本指南涵盖了 npm 的常用命令、镜像源管理、安全审计、依赖管理等全方位使用说明。

## 目录

- [基础命令](#基础命令)
- [包管理](#包管理)
- [依赖管理](#依赖管理)
- [安全审计](#安全审计)
- [镜像源管理](#镜像源管理)
- [配置管理](#配置管理)
- [常见问题](#常见问题)

---

## 基础命令

### 查看版本信息

```bash
# 查看 npm 版本
npm -v
npm --version

# 查看 Node.js 版本
node -v

# 查看 npm 配置信息
npm config list
```

### 查看帮助

```bash
# 查看帮助
npm help

# 查看特定命令的帮助
npm help install
npm help audit

# 查看命令列表
npm help search
```

---

## 包管理

### 安装包

```bash
# 本地安装（默认）
npm install <package>

# 全局安装
npm install -g <package>
npm install --global <package>

# 安装特定版本
npm install <package>@version
npm install <package>@1.2.3
npm install <package>@latest

# 安装开发依赖
npm install -D <package>
npm install --save-dev <package>

# 安装到可选依赖
npm install -O <package>
npm install --save-optional <package>

# 精确安装（锁定版本）
npm install -E <package>
npm install --save-exact <package>

# 从 GitHub 安装
npm install <username>/<repo>
npm install git+https://github.com/<username>/<repo>.git

# 从本地路径安装
npm install ./local-package
npm install ../local-package

# 安装多个包
npm install <package1> <package2> <package3>
```

### 卸载包

```bash
# 本地卸载
npm uninstall <package>

# 全局卸载
npm uninstall -g <package>

# 卸载开发依赖
npm uninstall -D <package>

# 卸载并从 package.json 移除
npm uninstall --save <package>
npm uninstall --save-dev <package>
```

### 更新包

```bash
# 检查过时的包
npm outdated

# 更新到最新的兼容版本
npm update

# 更新特定包
npm update <package>

# 强制更新（忽略版本范围）
npm update --force

# 全局更新
npm update -g
```

### 搜索包

```bash
# 搜索包
npm search <keyword>

# 搜索并限制结果数
npm search <keyword> --long

# 搜索并显示详细信息
npm search <keyword> --json
```

### 查看包信息

```bash
# 查看包的基本信息
npm view <package>
npm info <package>

# 查看最新版本
npm view <package> version

# 查看所有版本
npm view <package> versions
npm view <package> versions --json

# 查看版本发布历史
npm view <package> time
npm view <package> time --json

# 查看特定字段
npm view <package> homepage
npm view <package> description
npm view <package> repository
npm view <package> keywords
npm view <package> license
```

---

## 依赖管理

### 查看依赖

```bash
# 查看项目的依赖树
npm list

# 查看特定包的依赖树
npm list <package>

# 查看全局包的依赖树
npm list -g

# 限制显示深度
npm list --depth=0    # 只显示顶层依赖
npm list --depth=1    # 显示顶层和直接依赖

# 只显示生产依赖
npm list --prod

# 只显示开发依赖
npm list --dev

# 查看 JSON 格式
npm list --json

# 查看直接依赖
npm view <package> dependencies

# 查看开发依赖
npm view <package> devDependencies

# 查看可选依赖
npm view <package> optionalDependencies

# 查看对等依赖
npm view <package> peerDependencies
```

### package.json 脚本

```bash
# 运行脚本
npm run <script>

# 运行 start 脚本
npm start

# 运行 test 脚本
npm test

# 运行 build 脚本
npm run build

# 列出所有脚本
npm run

# 传递参数
npm run <script> -- --arg1 --arg2
```

### 版本号规则 (SemVer)

```tree
格式: MAJOR.MINOR.PATCH

1.2.3
 | | |
 | | └─ PATCH: bug 修复
 | └──── MINOR: 新功能，向后兼容
 └──────── MAJOR: 重大变更，可能不兼容
```

版本范围符号：

- `^1.2.3` - 兼容次版本: >=1.2.3 <2.0.0
- `~1.2.3` - 兼容补丁版本: >=1.2.3 <1.3.0
- `1.2.3` - 精确版本
- `>=1.2.3` - 大于等于
- `>1.2.3` - 大于
- `<=1.2.3` - 小于等于
- `<1.2.3` - 小于
- `1.2.*` - 通配符
- `*` - 任意版本
- `latest` - 最新版本

---

## 安全审计

### 运行安全审计

```bash
# 审计项目依赖
npm audit

# 审计全局包
npm audit -g

# 查看特定包的审计信息
npm audit <package>

# 以 JSON 格式输出
npm audit --json
```

### 按严重级别审计

```bash
# 默认显示所有级别的问题
npm audit

# 只显示 moderate 及以上级别的问题
npm audit --audit-level=moderate

# 只显示 high 及以上级别的问题
npm audit --audit-level=high

# 只显示 critical 级别的问题
npm audit --audit-level=critical
```

### 自动修复安全问题

```bash
# 自动修复可修复的漏洞
npm audit fix

# 强制修复（可能破坏兼容性）
npm audit fix --force

# 只修复 prod 依赖的漏洞
npm audit fix --only=prod

# 只修复 dev 依赖的漏洞
npm audit fix --only=dev

# 干跑模式（不实际修复）
npm audit fix --dry-run
```

### 审计报告解读

审计报告包含以下严重级别：

| 级别 | 说明 | 风险 |
|------|------|------|
| **critical** | 严重漏洞 | 可导致代码执行、数据泄露等 |
| **high** | 高危漏洞 | 可导致数据泄露、权限提升等 |
| **moderate** | 中危漏洞 | 影响有限，需关注 |
| **low** | 低危漏洞 | 影响较小 |
| **info** | 信息性 | 需要了解的信息 |

---

## 镜像源管理

### 国内镜像源对比

| 镜像源 | URL | 安全审计 | 下载速度 | 稳定性 | 推荐度 |
|--------|-----|---------|---------|--------|--------|
| **腾讯云** | `https://mirrors.tencent.com/npm/` | ✅ 支持 | 快 | 高 | ⭐⭐⭐⭐⭐ |
| **淘宝** | `https://registry.npmmirror.com/` | ❌ 不支持 | 最快 | 高 | ⭐⭐⭐⭐ |
| **cnpm** | `https://r.cnpmjs.org/` | ❌ 不支持 | 快 | 中 | ⭐⭐⭐ |
| **华为云** | `https://repo.huaweicloud.com/repository/npm/` | ❌ 不支持 | 快 | 中 | ⭐⭐⭐ |
| **官方源** | `https://registry.npmjs.org/` | ✅ 支持 | 慢 | 高 | ⭐⭐⭐⭐ |

### 查看和切换镜像源

```bash
# 查看当前镜像源
npm config get registry

# 切换到官方源（支持安全审计）
npm config set registry https://registry.npmjs.org/

# 切换到淘宝镜像（最快下载）
npm config set registry https://registry.npmmirror.com/

# 切换到腾讯云镜像（支持安全审计）⭐ 推荐
npm config set registry https://mirrors.tencent.com/npm/

# 切换到 cnpm 镜像
npm config set registry https://r.cnpmjs.org/

# 切换到华为云镜像
npm config set registry https://repo.huaweicloud.com/repository/npm/
```

### 使用 nrm 管理镜像源

```bash
# 安装 nrm
npm install -g nrm

# 查看所有镜像源
nrm ls

# 添加自定义镜像源
nrm add <name> <url>
nrm add custom https://your-custom-registry.com/

# 删除镜像源
nrm del <name>

# 切换镜像源
nrm use npm        # 官方源
nrm use taobao     # 淘宝镜像
nrm use tencent    # 腾讯云镜像
nrm use cnpm       # cnpm 镜像
nrm use huawei     # 华为云镜像

# 测试所有镜像源的速度
nrm test

# 测试特定镜像源
nrm test <name>
```

### 为不同项目设置镜像源

在项目根目录创建 `.npmrc` 文件：

```ini
# .npmrc
registry=https://mirrors.tencent.com/npm/
```

### 镜像源最佳实践

**开发环境**：

```bash
# 日常使用淘宝镜像（最快）
npm config set registry https://registry.npmmirror.com/

# 需要安全审计时切换到腾讯云镜像
npm config set registry https://mirrors.tencent.com/npm/
npm audit
```

**CI/CD 环境**：

```bash
# 统一使用腾讯云镜像（稳定 + 支持审计）
npm config set registry https://mirrors.tencent.com/npm/
```

**生产部署前**：

```bash
# 必须使用腾讯云镜像或官方源进行完整安全审计
npm config set registry https://mirrors.tencent.com/npm/
npm audit --audit-level=moderate
```

---

## 配置管理

### 配置文件优先级

npm 配置按以下优先级加载（从高到低）：

1. 命令行参数
2. 项目 `.npmrc` 文件
3. 用户配置文件 `~/.npmrc`
4. 全局配置文件 `$PREFIX/etc/npmrc`
5. npm 内置配置

### 查看和管理配置

```bash
# 查看所有配置
npm config list

# 查看配置的键值对
npm config list --json

# 获取特定配置
npm config get registry
npm config get prefix

# 设置配置
npm config set key value
npm config set registry https://mirrors.tencent.com/npm/

# 删除配置
npm config delete key

# 编辑配置文件
npm config edit

# 查看默认配置
npm config get default
```

### 常用配置项

```bash
# 设置镜像源
npm config set registry https://mirrors.tencent.com/npm/

# 设置全局安装路径
npm config set prefix /usr/local

# 设置缓存目录
npm config set cache ~/.npm-cache

# 设置日志级别
npm config set loglevel warn
npm config set loglevel info
npm config set loglevel silent

# 设置包安装严格模式
npm config set strict-ssl true

# 设置代理
npm config set proxy http://proxy-server.com:port
npm config set https-proxy http://proxy-server.com:port

# 设置 ca 证书
npm config set cafile /path/to/cafile.pem

# 设置保存前缀
npm config set save-prefix "^"

# 设置确切的版本号
npm config set save-exact true
```

### 用户配置文件 (~/.npmrc)

```ini
# .npmrc 示例
registry=https://mirrors.tencent.com/npm/
save-prefix=^
save-exact=false
strict-ssl=true
loglevel=warn
```

### 项目配置文件 (.npmrc)

```ini
# .npmrc 示例（项目级别）
registry=https://mirrors.tencent.com/npm/
save-exact=true
# 项目特定的配置
@mycompany:registry=https://registry.mycompany.com/
```

---

## 常见问题

### Q: 为什么淘宝镜像不支持安全审计？

A: 安全审计需要 npm 的 `/-/npm/v1/security/audits` 端点支持，大部分国内镜像只实现了同步功能，未实现这个安全审计端点。使用腾讯云镜像可以解决这个问题。

### Q: 如何解决 npm install 速度慢的问题？

A: 有以下几种方法：

1. 使用国内镜像源（推荐腾讯云或淘宝）
2. 使用 yarn 或 pnpm 替代 npm
3. 配置缓存：`npm config set cache ~/.npm-cache`
4. 使用并行下载工具

### Q: npm WARN deprecated 警告是什么意思？

A: 表示某个包已被弃用，建议升级到替代版本。例如：

- `inflight@1.0.6` 已被弃用，建议使用 `lru-cache`
- `glob@7.0.6` 已升级到 `glob@11.0.0`，不再依赖过时的包

### Q: 如何清理 npm 缓存？

```bash
# 清理缓存
npm cache clean --force

# 验证缓存
npm cache verify
```

### Q: npm install 时出现 EACCES 错误怎么办？

A: 这是权限问题，解决方法：

```bash
# 方法 1: 使用 sudo（不推荐）
sudo npm install

# 方法 2: 修改 npm 默认目录（推荐）
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc

# 方法 3: 使用 nvm 管理 Node.js 版本
nvm install node
```

### Q: 如何查看 npm 的日志？

```bash
# 查看 npm 日志位置
npm config get cache
# 日志在: <cache>/_logs/

# 查看最近的日志
npm cache clean --force  # 清理旧日志
```

### Q: package-lock.json 文件有什么作用？

A: `package-lock.json` 用于：

- 锁定依赖的确切版本
- 确保团队成员安装相同版本的依赖
- 加快安装速度
- **不要手动修改此文件**

### Q: 如何卸载 npm？

```bash
# macOS/Linux
npm uninstall -g npm
sudo rm -rf /usr/local/lib/node_modules/npm

# Windows
npm uninstall -g npm
# 然后手动删除 npm 目录
```

### Q: 如何设置 npm 代理？

```bash
# 设置 HTTP 代理
npm config set proxy http://proxy-server.com:8080

# 设置 HTTPS 代理
npm config set https-proxy http://proxy-server.com:8080

# 删除代理
npm config delete proxy
npm config delete https-proxy
```

### Q: 如何离线安装 npm 包？

```bash
# 下载包但不安装
npm pack <package>

# 从 .tgz 文件安装
npm install <package>-<version>.tgz

# 缓存所有依赖
npm install --cache-min 999999

# 使用 npm-offline 工具
npm install -g npm-offline
npm-offline download
```

---

## 实用技巧

### 快速重置项目

```bash
# 删除 node_modules 和 lock 文件
rm -rf node_modules package-lock.json

# 重新安装
npm install
```

### 批量安装多个包

```bash
# 从文件安装包列表
cat packages.txt | xargs npm install

# 使用 npx 执行包而不安装
npx create-react-app my-app
npx typescript --init
```

### 查看 npm 使用统计

```bash
# 查看包的下载量
npm view <package> downloads

# 查看包的 GitHub 信息
npm view <package> repository
```

### 使用 npm scripts 快捷方式

```bash
# 直接运行（不需要 run 前缀）
npm start
npm test
npm stop

# 需要使用 run 前缀
npm run build
npm run dev
```

---

## 附录

### npm 命令速查表

| 命令 | 说明 |
|------|------|
| `npm install` | 安装依赖 |
| `npm install -g` | 全局安装 |
| `npm uninstall` | 卸载包 |
| `npm update` | 更新包 |
| `npm outdated` | 检查过时的包 |
| `npm audit` | 运行安全审计 |
| `npm audit fix` | 自动修复安全问题 |
| `npm view` | 查看包信息 |
| `npm search` | 搜索包 |
| `npm list` | 查看依赖树 |
| `npm config get/set` | 配置管理 |
| `npm run` | 运行脚本 |

### 常用镜像源列表

```bash
# 官方源
https://registry.npmjs.org/

# 淘宝镜像
https://registry.npmmirror.com/

# 腾讯云镜像（支持安全审计）⭐
https://mirrors.tencent.com/npm/

# cnpm 镜像
https://r.cnpmjs.org/

# 华为云镜像
https://repo.huaweicloud.com/repository/npm/

# Yarn 镜像
https://registry.yarnpkg.com/
```

### 相关资源

- [npm 官方文档](https://docs.npmjs.com/)
- [npm 语义化版本规范](https://semver.org/lang/zh-CN/)
- [npm 包搜索](https://www.npmjs.com/)
- [nrm 仓库](https://github.com/Pana/nrm)

---

**最后更新**: 2026-01-11
**适用版本**: npm >= 9.0.0
