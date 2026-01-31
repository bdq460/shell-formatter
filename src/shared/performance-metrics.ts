/**
 * 性能指标名称常量
 *
 * 这些常量定义了项目中所有性能监控指标的名称
 * 对应 utils/performance/alertManager.ts 中定义的默认阈值
 */

export const PERFORMANCE_METRICS = {
    /** 诊断单个文档的耗时 */
    SHELLCHECK_DIAGNOSE_DURATION: "shfmt_diagnose_duration",
    /** 诊断所有文档的耗时 */
    DIAGNOSE_ALL_DOCS_DURATION: "diagnose_all_docs_duration",
    /** 格式化操作的耗时 */
    SHFMT_FORMAT_DURATION: "format_duration",
    /** shfmt 格式化的耗时 */
    SHFMT_EXECUTE_FORMAT_DURATION: "shfmt_format_duration",
    /** shellcheck 检查的耗时 */
    SHELLCHECK_EXECUTE_CHECK_DURATION: "shellcheck_diagnose_duration",
    /** 插件加载的耗时 */
    PLUGIN_LOAD_DURATION: "plugin_load_duration",
    /** 服务初始化的耗时 */
    SERVICE_INIT_DURATION: "service_init_duration",
    /** DI 容器重新初始化的耗时 */
    DI_CONTAINER_REINITIALIZATION_DURATION: "di_container_reinitialization_duration",
    /** 配置变更处理器的耗时 */
    CONFIGURATION_CHANGE_HANDLER_DURATION: "configuration_change_handler_duration",
    /** 文档保存诊断的耗时 */
    DOCUMENT_SAVE_DIAGNOSIS_DURATION: "document_save_diagnosis_duration",
    /** 提供代码操作的耗时 */
    PROVIDER_CODE_ACTIONS_DURATION: "provider_code_actions_duration",
    /** 插件执行检查的耗时 */
    PLUGIN_EXECUTE_CHECK_DURATION: "plugin_execute_check_duration",
    /** 插件执行格式化的耗时 */
    PLUGIN_EXECUTE_FORMAT_DURATION: "plugin_execute_format_duration",
} as const;
