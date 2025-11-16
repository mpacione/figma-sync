"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractComponentsFromSource = extractComponentsFromSource;
const typescript_1 = __importDefault(require("typescript"));
function classifyComponentKind(name, heuristics) {
    if (heuristics.excludeComponents.includes(name))
        return 'unknown';
    if (heuristics.primitiveComponentPatterns.includes(name))
        return 'primitive';
    return 'pattern';
}
function extractExportedComponentNames(sourceFile) {
    const names = new Set();
    sourceFile.forEachChild((node) => {
        if (typescript_1.default.isFunctionDeclaration(node) && node.name) {
            const hasExport = node.modifiers?.some((m) => m.kind === typescript_1.default.SyntaxKind.ExportKeyword) ??
                false;
            if (hasExport && /^[A-Z]/.test(node.name.text)) {
                names.add(node.name.text);
            }
        }
        if (typescript_1.default.isVariableStatement(node)) {
            const isExported = node.modifiers?.some((m) => m.kind === typescript_1.default.SyntaxKind.ExportKeyword) ??
                false;
            if (!isExported)
                return;
            for (const decl of node.declarationList.declarations) {
                if (typescript_1.default.isIdentifier(decl.name) && /^[A-Z]/.test(decl.name.text)) {
                    names.add(decl.name.text);
                }
            }
        }
    });
    return Array.from(names);
}
function extractTailwindClasses(source) {
    const classes = new Set();
    const CLASSNAME_RE = /className\s*=\s*"([^"]*)"/g;
    let match;
    while ((match = CLASSNAME_RE.exec(source)) !== null) {
        const raw = match[1];
        raw
            .split(/\s+/)
            .map((c) => c.trim())
            .filter(Boolean)
            .forEach((c) => classes.add(c));
    }
    return Array.from(classes);
}
function extractComponentsFromSource(source, filePath, heuristics) {
    const tsSourceFile = typescript_1.default.createSourceFile(filePath, source, typescript_1.default.ScriptTarget.Latest, true, typescript_1.default.ScriptKind.TSX);
    const names = extractExportedComponentNames(tsSourceFile);
    const tailwindClasses = extractTailwindClasses(source);
    return names.map((name) => ({
        name,
        sourceFile: filePath,
        exportedName: name,
        kind: classifyComponentKind(name, heuristics),
        props: [],
        usageExamples: [],
        tailwindClasses,
        childrenStructure: undefined,
    }));
}
