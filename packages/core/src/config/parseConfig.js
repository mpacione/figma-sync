"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseConfig = parseConfig;
const schema_1 = require("./schema");
function parseConfig(raw) {
    const result = schema_1.zFigmaSyncConfig.safeParse(raw);
    if (!result.success) {
        throw new Error(`Invalid figma-sync config: ${result.error.message}`);
    }
    return result.data;
}
