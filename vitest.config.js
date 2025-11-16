"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("vitest/config");
const node_url_1 = require("node:url");
exports.default = (0, config_1.defineConfig)({
    resolve: {
        alias: {
            'figma-sync-core': (0, node_url_1.fileURLToPath)(new URL('./packages/core/src/index.ts', import.meta.url)),
        },
    },
    test: {
        include: ['packages/*/src/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            all: true,
            thresholds: {
                100: true,
            },
        },
    },
});
