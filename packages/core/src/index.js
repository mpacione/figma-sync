"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FIGMA_SYNC_CORE_VERSION = void 0;
exports.FIGMA_SYNC_CORE_VERSION = '0.1.0';
__exportStar(require("./models/CodeModel"), exports);
__exportStar(require("./models/DesignSpec"), exports);
__exportStar(require("./models/FigmaInstructionSet"), exports);
__exportStar(require("./models/CodePatch"), exports);
__exportStar(require("./models/FigmaChangeSet"), exports);
__exportStar(require("./config/schema"), exports);
__exportStar(require("./config/parseConfig"), exports);
__exportStar(require("./analysis/sources"), exports);
__exportStar(require("./analysis/cssTokens"), exports);
__exportStar(require("./analysis/components"), exports);
__exportStar(require("./analysis/screens"), exports);
__exportStar(require("./analysis/buildCodeModel"), exports);
__exportStar(require("./llm/types"), exports);
__exportStar(require("./llm/jsonClient"), exports);
__exportStar(require("./spec/buildDesignSpec"), exports);
__exportStar(require("./spec/enrichComponentsWithLLM"), exports);
__exportStar(require("./spec/buildFigmaInstructionSet"), exports);
__exportStar(require("./spec/buildCodePatches"), exports);
__exportStar(require("./spec/applyCodePatches"), exports);
