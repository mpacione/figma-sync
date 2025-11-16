"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_1 = require("./index");
(0, vitest_1.describe)('FIGMA_SYNC_CORE_VERSION', () => {
    (0, vitest_1.it)('is set to 0.1.0', () => {
        (0, vitest_1.expect)(index_1.FIGMA_SYNC_CORE_VERSION).toBe('0.1.0');
    });
});
