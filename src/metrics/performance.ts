/**
 * 性能指标名称常量
 */
export const PERFORMANCE_METRICS = {
    // 诊断相关
    DIAGNOSE_ONE_DOC_DURATION: "diagnose_one_doc_duration",
    DIAGNOSE_ALL_DOCS_DURATION: "diagnose_all_docs_duration",
    SHFMT_DIAGNOSE_DURATION: "shfmt_diagnose_duration",
    SHELLCHECK_DIAGNOSE_DURATION: "shellcheck_diagnose_duration",

    // 格式化相关
    FORMAT_DURATION: "format_duration",
    SHFMT_FORMAT_DURATION: "shfmt_format_duration",

    // 插件相关
    PLUGIN_LOAD_DURATION: "plugin_load_duration",
    PLUGIN_EXECUTE_CHECK_DURATION: "plugin_execute_check_duration",
    PLUGIN_EXECUTE_FORMAT_DURATION: "plugin_execute_format_duration",

    // 服务相关
    SERVICE_INIT_DURATION: "service_init_duration",
    SERVICE_RESOLVE_DURATION: "service_resolve_duration",

    // Provider 相关
    PROVIDER_CODE_ACTIONS_DURATION: "provider_code_actions_duration",

    // 其他
    CONFIG_REFRESH_DURATION: "config_refresh_duration",
    CACHE_HIT: "cache_hit",
    CACHE_MISS: "cache_miss",
} as const;
