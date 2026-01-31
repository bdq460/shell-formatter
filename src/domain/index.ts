/**
 * 插件模块 - 领域层
 *
 * 提供插件接口、基础实现和领域类型
 * 不依赖 VSCode，可在 CLI、Web、桌面应用等场景复用
 */

export * from "./plugins/base-plugin";
export * from "./plugin-initializer";
export * from "./plugin-interface";
export * from "./plugin-manager";
export * from "./plugins/shellcheck-plugin";
export * from "./plugins/shfmt-plugin";
export * from "./types";
