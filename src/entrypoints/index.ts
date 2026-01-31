/**
 * VSCode 接入点层
 *
 * 职责：直接与 VSCode API 交互，注册各种 Provider、监听器和命令
 * 不包含业务逻辑，只负责将事件转发到 features 层
 */

export * from "./commands";
export * from "./listeners";
export * from "./formattingProvider";
export * from "./codeActionsProvider";
export * from "./diagnosticCollection";

// 重新导出 shouldSkipFile，供其他模块使用
export { shouldSkipFile } from "./listeners/saveListener";
