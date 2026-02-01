jest.mock("../../../src/i18n", () => ({
    t: (key: string) => `i18n:${key}`,
}));

jest.mock("../../../src/config", () => ({
    SettingInfo: {
        isShfmtEnabled: jest.fn(() => false),
        isShellcheckEnabled: jest.fn(() => false),
    },
    PackageInfo: {
        displayName: "Shell Formatter",
    },
}));

jest.mock("../../../src/utils/performance/integration", () => ({
    getAllMetricNames: jest.fn(() => []),
    getMetricData: jest.fn(),
    isPerformanceMonitoringEnabled: jest.fn(() => true),
    getPerformanceReport: jest.fn(() => "report"),
    getAlertStats: jest.fn(() => ({ total: 0 })),
}));

jest.mock("../../../src/utils/performance/monitor", () => ({
    startTimer: jest.fn(() => ({ stop: jest.fn() })),
}));

jest.mock("../../../src/utils/log", () => ({
    logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

describe("application/index exports", () => {
    it("should export application APIs", async () => {
        const app = await import("../../../src/application/index");

        expect(app.initializeDIContainer).toBeDefined();
        expect(app.reinitializeDIContainer).toBeDefined();
        expect(app.diagnoseDocument).toBeDefined();
        expect(app.formatDocument).toBeDefined();
        expect(app.checkPerformanceHealth).toBeDefined();
        expect(app.getPerformanceStats).toBeDefined();
        expect(app.getPerformanceSummary).toBeDefined();
        expect(app.showPerformanceReport).toBeDefined();
        expect(app.startTimer).toBeDefined();
        expect(app.getAllPluginStatus).toBeDefined();
        expect(app.isPluginAvailable).toBeDefined();
        expect(app.showPluginStatus).toBeDefined();
    });
});
