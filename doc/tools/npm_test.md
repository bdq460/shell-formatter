# 测试环境设置指南

## Node.js 版本兼容性问题

你当前使用的 Node.js 版本是 `v23.10.0`，但 Jest 29.x 及其依赖包的官方支持版本范围是：

- `^18.14.0`
- `^20.0.0`
- `^22.0.0`
- `>=24.0.0`

**注意**: Node.js v23.10.0 不在官方支持范围内，可能会遇到兼容性问题。

## 推荐解决方案

### 方案1: 使用 nvm 切换到支持的 Node 版本（推荐）

```bash
# 列出可用的 Node 版本
nvm ls

# 切换到 Node 22.x（推荐）
nvm use 22

# 或者切换到 Node 20.x（更稳定）
nvm use 20

# 验证版本
node -v
```

### 方案2: 升级到 Node 24.x+

```bash
# 使用 nvm 安装 Node 24.x
nvm install 24
nvm use 24

# 验证版本
node -v
```

### 方案3: 在 package.json 中指定 engines（已配置）

package.json 已经配置了引擎要求：

```json
{
  "engines": {
    "node": ">=18.0.0"
  }
}
```

## 正确的安装步骤

### 1. 清理全局安装的包

```bash
# 卸载全局安装的 @types/jest
npm uninstall -g @types/jest

# 验证已卸载
npm list -g @types/jest
```

### 2. 在项目中安装依赖

```bash
# 确保在项目根目录
cd ~/workspace/tech/personal_project/vscode/extension/shell_formatter

# 安装所有开发依赖（包括测试依赖）
npm install

# 或者单独安装测试相关的依赖
npm install --save-dev jest @types/jest ts-jest
```

### 3. 验证安装

```bash
# 检查 package.json 中的依赖
cat package.json | grep -A 10 "devDependencies"

# 验证 Jest 是否安装
npm list jest

# 运行测试
npm run test:unit
```

## 运行测试

### 运行所有单元测试

```bash
npm run test:unit
```

### 运行测试并监听文件变化

```bash
npm run test:unit:watch
```

### 生成覆盖率报告

```bash
npm run test:unit:coverage
```

### 运行所有测试（包括项目测试和单元测试）

```bash
npm run test:all
```

## 常见问题

### Q1: 为什么不能使用全局安装？

A: 全局安装会导致：

- 不同项目使用不同版本的包
- 依赖冲突
- 难以维护

**建议**: 始终在项目中本地安装开发依赖。

### Q2: Node.js 版本警告可以忽略吗？

A: 虽然可能可以工作，但建议使用支持的版本以避免潜在问题：

- 运行时错误
- 性能问题
- 缺少新功能

### Q3: 如何检查当前项目的 Node 版本要求？

A: 查看 package.json：

```bash
cat package.json | grep -A 3 "engines"
```

### Q4: 测试文件的位置和命名规范

A: 测试文件应该放在：

- `.codebuddy/test/skills/<skill-name>/*.test.ts`

命名规范：

- `*.test.ts` - 单元测试
- `*.spec.ts` - 规范测试
- `__tests__/*.ts` - 集成测试

## 示例：创建新的测试文件

为 `data-engineer` 技能创建测试：

```bash
# 1. 创建测试文件目录
mkdir -p .codebuddy/test/skills/data-engineer

# 2. 创建测试文件
touch .codebuddy/test/skills/data-engineer/schema-generator.test.ts

# 3. 编写测试内容（参考 api-generator.test.ts）
```

测试文件模板：

```typescript
/**
 * Schema Generator 单元测试
 */

import { SchemaGenerator } from '../../../skills/data-engineer/scripts/schema-generator';

describe('SchemaGenerator', () => {
  let generator: SchemaGenerator;

  beforeEach(() => {
    generator = new SchemaGenerator({
      database: 'postgresql',
      outputDir: './test-output',
      generateMigration: true,
    });
  });

  describe('generateSchema', () => {
    it('should generate schema for valid model', () => {
      const model = {
        name: 'User',
        tableName: 'users',
        fields: [
          {
            name: 'id',
            type: 'number',
            required: true,
            primaryKey: true,
          },
        ],
      };

      const schema = generator.generateSchema([model]);

      expect(schema).toBeDefined();
      expect(schema).toContain('CREATE TABLE');
    });
  });
});
```

## 下一步

1. ✅ 使用支持的 Node.js 版本（建议 Node 22.x 或 20.x）
2. ✅ 在项目中本地安装依赖
3. ✅ 运行测试验证环境
4. ✅ 为更多技能编写测试用例

## 参考资料

- [Jest 官方文档](https://jestjs.io/)
- [ts-jest 文档](https://kulshekhar.github.io/ts-jest/)
- [Node.js 版本管理 (nvm)](https://github.com/nvm-sh/nvm)
- [测试最佳实践](https://github.com/goldbergyoni/javascript-testing-best-practices)
