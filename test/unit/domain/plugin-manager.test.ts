import { Document } from "../../../src/domain/plugin-interface";
import { PluginManager, getPluginManager, resetPluginManager, setPluginManager } from "../../../src/domain/plugin-manager";
import { setLogger } from "../../../src/utils/log";

const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
};

describe("domain PluginManager", () => {
    beforeAll(() => {
        setLogger(mockLogger);
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    const doc: Document = {
        uri: "file:///test.sh",
        content: "echo test",
        languageId: "shell",
        fileName: "test.sh",
        lineCount: 1,
    };

    it("should return errors when no active plugins for format", async () => {
        const manager = new PluginManager();

        const result = await manager.format(doc, {});

        expect(result.hasErrors).toBe(true);
        expect(result.textEdits).toEqual([]);
    });

    it("should register, get, has and unregister plugin", async () => {
        const manager = new PluginManager();
        const plugin = {
            name: "p-reg",
            displayName: "P-REG",
            version: "1.0.0",
            description: "",
            isAvailable: jest.fn().mockResolvedValue(true),
            check: jest.fn().mockResolvedValue({ hasErrors: false, diagnostics: [] }),
            format: jest.fn().mockResolvedValue({ hasErrors: false, diagnostics: [], textEdits: [] }),
            getCapabilities: jest.fn().mockReturnValue([]),
            getDependencies: jest.fn().mockReturnValue([]),
        };

        manager.register(plugin as any);
        expect(manager.has("p-reg")).toBe(true);
        expect(manager.get("p-reg")).toBeDefined();
        expect(manager.getAll().length).toBe(1);

        await manager.unregister("p-reg");
        expect(manager.has("p-reg")).toBe(false);
    });

    it("should return empty diagnostics when no active plugins for check", async () => {
        const manager = new PluginManager();

        const result = await manager.check(doc, {});

        expect(result.hasErrors).toBe(false);
        expect(result.diagnostics).toEqual([]);
    });

    it("should format with active plugin and return edits", async () => {
        const manager = new PluginManager();
        const plugin = {
            name: "p1",
            displayName: "P1",
            version: "1.0.0",
            description: "",
            isAvailable: jest.fn().mockResolvedValue(true),
            check: jest.fn().mockResolvedValue({ hasErrors: false, diagnostics: [] }),
            format: jest.fn().mockResolvedValue({
                hasErrors: false,
                diagnostics: [],
                textEdits: [{ range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }, newText: "x" }],
            }),
            getCapabilities: jest.fn().mockReturnValue([]),
            getDependencies: jest.fn().mockReturnValue([]),
            onActivate: jest.fn().mockResolvedValue(undefined),
        };

        manager.register(plugin as any);
        await manager.activate("p1");

        const result = await manager.format(doc, {});

        expect(result.textEdits).toHaveLength(1);
        expect(plugin.format).toHaveBeenCalled();
    });

    it("should skip plugin without format and return no edits", async () => {
        const manager = new PluginManager();
        const plugin = {
            name: "p0",
            displayName: "P0",
            version: "1.0.0",
            description: "",
            isAvailable: jest.fn().mockResolvedValue(true),
            check: jest.fn().mockResolvedValue({ hasErrors: false, diagnostics: [] }),
            getCapabilities: jest.fn().mockReturnValue([]),
            getDependencies: jest.fn().mockReturnValue([]),
            onActivate: jest.fn().mockResolvedValue(undefined),
        };

        manager.register(plugin as any);
        await manager.activate("p0");

        const result = await manager.format(doc, {});

        expect(result.textEdits).toEqual([]);
    });

    it("should collect diagnostics when plugin format throws", async () => {
        const manager = new PluginManager();
        const plugin = {
            name: "p2",
            displayName: "P2",
            version: "1.0.0",
            description: "",
            isAvailable: jest.fn().mockResolvedValue(true),
            check: jest.fn().mockResolvedValue({ hasErrors: false, diagnostics: [] }),
            format: jest.fn().mockRejectedValue(new Error("boom")),
            getCapabilities: jest.fn().mockReturnValue([]),
            getDependencies: jest.fn().mockReturnValue([]),
            onActivate: jest.fn().mockResolvedValue(undefined),
        };

        manager.register(plugin as any);
        await manager.activate("p2");

        const result = await manager.format(doc, {});

        expect(result.hasErrors).toBe(true);
        expect(result.diagnostics.length).toBeGreaterThan(0);
    });

    it("should collect diagnostics when plugin returns errors without edits", async () => {
        const manager = new PluginManager();
        const plugin = {
            name: "pdiag",
            displayName: "PDiag",
            version: "1.0.0",
            description: "",
            isAvailable: jest.fn().mockResolvedValue(true),
            check: jest.fn().mockResolvedValue({ hasErrors: false, diagnostics: [] }),
            format: jest.fn().mockResolvedValue({
                hasErrors: true,
                diagnostics: [{ range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }, message: "warn", severity: 1 }],
                textEdits: [],
            }),
            getCapabilities: jest.fn().mockReturnValue([]),
            getDependencies: jest.fn().mockReturnValue([]),
            onActivate: jest.fn().mockResolvedValue(undefined),
        };

        manager.register(plugin as any);
        await manager.activate("pdiag");

        const result = await manager.format(doc, {});

        expect(result.hasErrors).toBe(true);
        expect(result.diagnostics).toHaveLength(1);
        expect(result.textEdits).toEqual([]);
    });

    it("should return diagnostics from check", async () => {
        const manager = new PluginManager();
        const plugin = {
            name: "p3",
            displayName: "P3",
            version: "1.0.0",
            description: "",
            isAvailable: jest.fn().mockResolvedValue(true),
            check: jest.fn().mockResolvedValue({
                hasErrors: true,
                diagnostics: [{ range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }, message: "err", severity: 0 }],
            }),
            format: jest.fn(),
            getCapabilities: jest.fn().mockReturnValue([]),
            getDependencies: jest.fn().mockReturnValue([]),
            onActivate: jest.fn().mockResolvedValue(undefined),
        };

        manager.register(plugin as any);
        await manager.activate("p3");

        const result = await manager.check(doc, {});

        expect(result.hasErrors).toBe(true);
        expect(result.diagnostics).toHaveLength(1);
    });

    it("should collect diagnostics when check throws", async () => {
        const manager = new PluginManager();
        const plugin = {
            name: "pcheck",
            displayName: "PCheck",
            version: "1.0.0",
            description: "",
            isAvailable: jest.fn().mockResolvedValue(true),
            check: jest.fn().mockRejectedValue(new Error("fail")),
            format: jest.fn(),
            getCapabilities: jest.fn().mockReturnValue([]),
            getDependencies: jest.fn().mockReturnValue([]),
            onActivate: jest.fn().mockResolvedValue(undefined),
        };

        manager.register(plugin as any);
        await manager.activate("pcheck");

        const result = await manager.check(doc, {});

        expect(result.hasErrors).toBe(true);
        expect(result.diagnostics.length).toBeGreaterThan(0);
    });

    it("should report available plugins", async () => {
        const manager = new PluginManager();
        const available = {
            name: "p4",
            displayName: "P4",
            version: "1.0.0",
            description: "",
            isAvailable: jest.fn().mockResolvedValue(true),
            check: jest.fn().mockResolvedValue({ hasErrors: false, diagnostics: [] }),
            format: jest.fn().mockResolvedValue({ hasErrors: false, diagnostics: [], textEdits: [] }),
            getCapabilities: jest.fn().mockReturnValue([]),
            getDependencies: jest.fn().mockReturnValue([]),
            onActivate: jest.fn().mockResolvedValue(undefined),
        };
        const unavailable = {
            name: "p5",
            displayName: "P5",
            version: "1.0.0",
            description: "",
            isAvailable: jest.fn().mockResolvedValue(false),
            check: jest.fn().mockResolvedValue({ hasErrors: false, diagnostics: [] }),
            format: jest.fn().mockResolvedValue({ hasErrors: false, diagnostics: [], textEdits: [] }),
            getCapabilities: jest.fn().mockReturnValue([]),
            getDependencies: jest.fn().mockReturnValue([]),
            onActivate: jest.fn().mockResolvedValue(undefined),
        };

        manager.register(available as any);
        manager.register(unavailable as any);

        const plugins = await manager.getAvailablePlugins();

        expect(plugins).toHaveLength(1);
        expect(plugins[0].name).toBe("p4");
    });

    it("should support activateMultiple, reactivate and deactivateAll", async () => {
        const manager = new PluginManager();
        const plugin = {
            name: "pmulti",
            displayName: "PMulti",
            version: "1.0.0",
            description: "",
            isAvailable: jest.fn().mockResolvedValue(true),
            check: jest.fn().mockResolvedValue({ hasErrors: false, diagnostics: [] }),
            format: jest.fn().mockResolvedValue({ hasErrors: false, diagnostics: [], textEdits: [] }),
            getCapabilities: jest.fn().mockReturnValue([]),
            getDependencies: jest.fn().mockReturnValue([]),
            onActivate: jest.fn().mockResolvedValue(undefined),
            onDeactivate: jest.fn().mockResolvedValue(undefined),
        };

        manager.register(plugin as any);

        const count = await manager.activateMultiple(["pmulti"]);
        expect(count).toBe(1);

        const reactivated = await manager.reactivate(["pmulti"]);
        expect(reactivated).toBe(1);

        await manager.deactivateAll();
        expect(manager.isActive("pmulti")).toBe(false);
    });

    it("should activate/deactivate plugins and report stats", async () => {
        const manager = new PluginManager();
        const plugin = {
            name: "p6",
            displayName: "P6",
            version: "1.0.0",
            description: "",
            isAvailable: jest.fn().mockResolvedValue(true),
            check: jest.fn().mockResolvedValue({ hasErrors: false, diagnostics: [] }),
            format: jest.fn().mockResolvedValue({ hasErrors: false, diagnostics: [], textEdits: [] }),
            getCapabilities: jest.fn().mockReturnValue([]),
            getDependencies: jest.fn().mockReturnValue([]),
            onActivate: jest.fn().mockResolvedValue(undefined),
            onDeactivate: jest.fn().mockResolvedValue(undefined),
        };

        manager.register(plugin as any);
        const activated = await manager.activate("p6");

        expect(activated).toBe(true);
        expect(manager.isActive("p6")).toBe(true);

        const stats = manager.getStats();
        expect(stats.total).toBe(1);
        expect(stats.active).toBe(1);

        const deactivated = await manager.deactivate("p6");
        expect(deactivated).toBe(true);
        expect(manager.isActive("p6")).toBe(false);
    });

    it("should clear plugins", () => {
        const manager = new PluginManager();
        const plugin = {
            name: "p7",
            displayName: "P7",
            version: "1.0.0",
            description: "",
            isAvailable: jest.fn().mockResolvedValue(true),
            check: jest.fn().mockResolvedValue({ hasErrors: false, diagnostics: [] }),
            format: jest.fn().mockResolvedValue({ hasErrors: false, diagnostics: [], textEdits: [] }),
            getCapabilities: jest.fn().mockReturnValue([]),
            getDependencies: jest.fn().mockReturnValue([]),
        };

        manager.register(plugin as any);
        manager.clear();

        expect(manager.getAll()).toEqual([]);
    });

    it("should expose global manager helpers", () => {
        const manager = new PluginManager();
        setPluginManager(manager);
        resetPluginManager();
        const globalManager = getPluginManager();
        expect(globalManager).toBeDefined();
    });

    it("should initialize global manager when module is reloaded", () => {
        jest.resetModules();
        const logModule = require("../../../src/utils/log");
        logModule.setLogger({
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        });

        const module = require("../../../src/domain/plugin-manager");

        const manager = module.getPluginManager();
        expect(manager).toBeDefined();
    });

    it("should return active plugin names", async () => {
        const manager = new PluginManager();
        const plugin = {
            name: "pnames",
            displayName: "PNames",
            version: "1.0.0",
            description: "",
            isAvailable: jest.fn().mockResolvedValue(true),
            check: jest.fn().mockResolvedValue({ hasErrors: false, diagnostics: [] }),
            format: jest.fn().mockResolvedValue({ hasErrors: false, diagnostics: [], textEdits: [] }),
            getCapabilities: jest.fn().mockReturnValue([]),
            getDependencies: jest.fn().mockReturnValue([]),
            onActivate: jest.fn().mockResolvedValue(undefined),
        };

        manager.register(plugin as any);
        await manager.activate("pnames");

        const names = manager.getActivePluginNames();
        expect(names).toEqual(["pnames"]);
    });
});
