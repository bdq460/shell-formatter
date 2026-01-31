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

// Services
export {
    getPerformanceMetrics,
    PERFORMANCE_METRICS, resetPerformanceMetrics, showPerformanceReport, startTimer
} from "./services/performance-service";

export {
    getAllPluginStatus,
    isPluginAvailable, showPluginStatus
} from "./services/plugin-status-service";
