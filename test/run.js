#!/usr/bin/env node

import { execSync } from 'child_process';

console.log('正在运行单元测试...\n');

// 运行 Mocha 测试 - 包含 JavaScript 和 TypeScript 测试，增加详细输出
console.log('使用Mocha运行测试...\n');

try {
    execSync('npx mocha --reporter spec', { stdio: 'inherit' });
} catch (err) {
    console.error('✗ Mocha 测试失败');
    process.exit(1);
}

console.log('\n所有测试通过！');
