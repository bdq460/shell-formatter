/**
 * 测试 package.json imports 配置
 *
 * 运行方式:
 * 1. 先编译: npm run compile
 * 2. 运行: node dist/log_put.js
 */

import { LogLevel, getLogLevelRank, shouldLogByLevel } from "#/utils/log";

console.log("=== Testing package.json imports ===\n");

// 测试 1: 导入 LogLevel
console.log("Test 1: Import from '#/utils/log'");
console.log("  LogLevel.DEBUG:", LogLevel.DEBUG);
console.log("  LogLevel.INFO:", LogLevel.INFO);
console.log("  LogLevel.WARN:", LogLevel.WARN);
console.log("  LogLevel.ERROR:", LogLevel.ERROR);
console.log("  ✓ LogLevel imported successfully\n");

// 测试 2: 测试 getLogLevelRank
console.log("Test 2: Test getLogLevelRank function");
const rank = getLogLevelRank(LogLevel.INFO);
console.log("  getLogLevelRank(LogLevel.INFO):", rank);
console.log("  ✓ Function works\n");

// 测试 3: 测试 shouldLogByLevel
console.log("Test 3: Test shouldLogByLevel function");
const shouldLog = shouldLogByLevel(LogLevel.ERROR, LogLevel.INFO);
console.log("  shouldLogByLevel(ERROR, INFO):", shouldLog);
console.log("  ✓ Function works\n");

console.log("=== All import tests passed! ===");
