/**
 * Application 层导出
 *
 * 应用层职责：
 * - 用例编排（usecases/）
 * - 应用服务（services/）
 * - DI 初始化（di/）
 *
 * 依赖：domain/, shared/, utils/
 */

// DI 初始化
export {
    initializeDIContainer,
    reinitializeDIContainer
} from "./di/initializer";

// Usecases
export { diagnoseDocument } from "./usecases/diagnose-document";
export { formatDocument } from "./usecases/format-document";

// Services - Performance Service
export {
    checkPerformanceHealth,
    getPerformanceStats,
    getPerformanceSummary,
    showPerformanceReport,
    startTimer
} from "./services/performance-service";

export type { MetricData } from "./services/performance-service";

// Domain - Performance Metrics (re-export for convenience)
export { PERFORMANCE_METRICS } from "../shared/performance-metrics";

// Services - Plugin Status Service
export {
    getAllPluginStatus, isPluginAvailable, showPluginStatus
} from "./services/plugin-status-service";

export type { PluginStatus } from "./services/plugin-status-service";
