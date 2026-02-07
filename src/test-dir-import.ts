/**
 * 测试 package.json imports 目录导入（自动解析 index.js）
 * 运行: node dist/test-dir-import.js
 */

// 测试目录导入 - 应该自动解析为 config/index.js
import { PackageInfo } from "#/config";

console.log("=== Testing directory import with index.js ===\n");

console.log("Test: Import from '#/config' (should resolve to config/index.js)");
try {
    console.log("  PackageInfo.extensionName:", PackageInfo.extensionName);
    console.log("  ✓ Directory import with index.js works!\n");
} catch (error) {
    console.error("  ✗ Failed:", error, "\n");
    process.exit(1);
}

console.log("=== Directory import test passed! ===");
