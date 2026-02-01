import {
    checkPerformanceHealth,
    getPerformanceStats,
    getPerformanceSummary,
    PERFORMANCE_METRICS,
    showPerformanceReport,
    startTimer,
} from "../../../../src/application/services/performance-service";
import { logger } from "../../../../src/utils/log";

jest.mock("../../../../src/i18n", () => ({
    t: (key: string, params?: Record<string, unknown>) => {
        if (params) {
            return `i18n:${key}:${JSON.stringify(params)}`;
        }
        return `i18n:${key}`;
    },
}));

const mockGetAllMetricNames = jest.fn();
const mockGetMetricData = jest.fn();
const mockIsPerformanceMonitoringEnabled = jest.fn();
const mockGetPerformanceReport = jest.fn();
const mockGetAlertStats = jest.fn();

jest.mock("../../../../src/utils/performance/integration", () => ({
    getAllMetricNames: (...args: unknown[]) => mockGetAllMetricNames(...args),
    getMetricData: (...args: unknown[]) => mockGetMetricData(...args),
    isPerformanceMonitoringEnabled: (...args: unknown[]) =>
        mockIsPerformanceMonitoringEnabled(...args),
    getPerformanceReport: (...args: unknown[]) => mockGetPerformanceReport(...args),
    getAlertStats: (...args: unknown[]) => mockGetAlertStats(...args),
}));

const mockStartTimer = jest.fn();

jest.mock("../../../../src/utils/performance/monitor", () => ({
    startTimer: (...args: unknown[]) => mockStartTimer(...args),
}));

jest.mock("../../../../src/utils/log", () => ({
    logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

describe("performance-service", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockStartTimer.mockReturnValue({ stop: jest.fn() });
    });

    it("should start timer via utils", () => {
        const timer = startTimer("metric.test");
        expect(mockStartTimer).toHaveBeenCalledWith("metric.test");
        expect(logger.debug).toHaveBeenCalledWith(
            expect.stringContaining("Starting timer for metric"),
        );
        expect(timer).toEqual({ stop: expect.any(Function) });
    });

    it("should return performance stats", async () => {
        mockGetAllMetricNames.mockReturnValue(["a", "b"]);
        mockGetMetricData.mockImplementation((name: string) =>
            name === "a"
                ? { name: "a", count: 2, avg: 10, min: 5, max: 15 }
                : undefined,
        );
        mockIsPerformanceMonitoringEnabled.mockReturnValue(true);

        const stats = await getPerformanceStats();

        expect(stats.totalMetrics).toBe(2);
        expect(stats.metrics).toHaveLength(1);
        expect(stats.monitoringEnabled).toBe(true);
    });

    it("should return empty stats when no metrics", async () => {
        mockGetAllMetricNames.mockReturnValue([]);
        mockIsPerformanceMonitoringEnabled.mockReturnValue(false);

        const stats = await getPerformanceStats();

        expect(stats.totalMetrics).toBe(0);
        expect(stats.metrics).toHaveLength(0);
        expect(stats.monitoringEnabled).toBe(false);
    });

    it("should render summary with top metrics", async () => {
        mockGetAllMetricNames.mockReturnValue(["a", "b", "c", "d", "e", "f"]);
        const counts: Record<string, number> = { a: 6, b: 5, c: 4, d: 3, e: 2, f: 1 };
        mockGetMetricData.mockImplementation((name: string) => ({
            name,
            count: counts[name],
            avg: 12.345,
            min: 1,
            max: 200,
        }));
        mockIsPerformanceMonitoringEnabled.mockReturnValue(false);

        const summary = await getPerformanceSummary();

        expect(summary).toContain("i18n:performance.summaryTitle");
        expect(summary).toContain("i18n:performance.topMetrics");
        expect(summary).toContain("i18n:performance.metricLine");
        expect(summary).toContain("\"name\":\"a\"");
        expect(summary).not.toContain("\"name\":\"f\"");
    });

    it("should render summary without metrics section", async () => {
        mockGetAllMetricNames.mockReturnValue([]);
        mockIsPerformanceMonitoringEnabled.mockReturnValue(true);

        const summary = await getPerformanceSummary();

        expect(summary).toContain("i18n:performance.summaryTitle");
        expect(summary).toContain("i18n:common.enabled");
        expect(summary).not.toContain("i18n:performance.topMetrics");
    });

    it("should report OK health when no issues", async () => {
        mockGetAllMetricNames.mockReturnValue(["a"]);
        mockGetMetricData.mockReturnValue({
            name: "a",
            count: 1,
            avg: 10,
            min: 1,
            max: 20,
        });
        mockIsPerformanceMonitoringEnabled.mockReturnValue(true);

        const health = await checkPerformanceHealth();

        expect(health).toContain("Performance health: OK");
    });

    it("should report issues when avg is high", async () => {
        mockGetAllMetricNames.mockReturnValue(["slow"]);
        mockGetMetricData.mockReturnValue({
            name: "slow",
            count: 1,
            avg: 6000,
            min: 100,
            max: 12000,
        });
        mockIsPerformanceMonitoringEnabled.mockReturnValue(true);

        const health = await checkPerformanceHealth();

        expect(health).toContain("ISSUES DETECTED");
        expect(health).toContain("slow");
    });

    it("should list multiple performance issues", async () => {
        mockGetAllMetricNames.mockReturnValue(["slow1", "slow2"]);
        mockGetMetricData.mockImplementation((name: string) => ({
            name,
            count: 1,
            avg: 7000,
            min: 1,
            max: 9000,
        }));
        mockIsPerformanceMonitoringEnabled.mockReturnValue(true);

        const health = await checkPerformanceHealth();

        expect(health).toContain("slow1");
        expect(health).toContain("slow2");
        expect(health).toContain("\n  - ");
    });

    it("should build performance report", async () => {
        mockGetAllMetricNames.mockReturnValue(["a"]);
        mockGetMetricData.mockReturnValue({
            name: "a",
            count: 1,
            avg: 10,
            min: 1,
            max: 20,
        });
        mockIsPerformanceMonitoringEnabled.mockReturnValue(true);
        mockGetPerformanceReport.mockReturnValue("report-body");
        mockGetAlertStats.mockReturnValue({ total: 3 });

        const showContent = jest.fn();
        await showPerformanceReport(showContent);

        expect(showContent).toHaveBeenCalled();
        const content = showContent.mock.calls[0][0];
        expect(content).toContain("report-body");
        expect(content).toContain("i18n:performance.reportGenerated");
        expect(content).toContain("i18n:performance.totalMetricsLabel");
        expect(content).toContain("i18n:performance.totalAlerts");
        expect(logger.info).toHaveBeenCalledWith(
            "i18n:performance.reportGeneratedLog",
        );
    });

    it("should expose performance metrics constants", () => {
        expect(PERFORMANCE_METRICS).toBeDefined();
        expect(PERFORMANCE_METRICS.SHFMT_FORMAT_DURATION).toBeDefined();
    });
});
