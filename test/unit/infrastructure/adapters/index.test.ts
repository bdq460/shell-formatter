/**
 * Infrastructure Adapters Index Tests
 */

import {
    ShfmtToolAdapter,
    ShellcheckToolAdapter,
} from "../../../../src/infrastructure/adapters";

describe("Infrastructure Adapters Index", () => {
    it("should export ShfmtToolAdapter", () => {
        expect(ShfmtToolAdapter).toBeDefined();
        expect(typeof ShfmtToolAdapter).toBe("function");
    });

    it("should export ShellcheckToolAdapter", () => {
        expect(ShellcheckToolAdapter).toBeDefined();
        expect(typeof ShellcheckToolAdapter).toBe("function");
    });
});
