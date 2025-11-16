"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyCodePatchSetToFiles = applyCodePatchSetToFiles;
function applyHunkToContent(content, hunk) {
    const before = hunk.before;
    const after = hunk.after;
    if (before.length === 0) {
        throw new Error('CodePatchHunk.before must not be empty');
    }
    let idx = content.indexOf(before);
    if (idx === -1) {
        return { content, occurrences: 0 };
    }
    let occurrences = 0;
    let result = '';
    let start = 0;
    while (idx !== -1) {
        result += content.slice(start, idx) + after;
        start = idx + before.length;
        occurrences += 1;
        idx = content.indexOf(before, start);
    }
    result += content.slice(start);
    return { content: result, occurrences };
}
const CSS_VAR_DECL_RE = /--([a-zA-Z0-9-_]+)\s*:\s*([^;]+);/g;
function applyTokenHunkToContent(content, hunk) {
    if (!hunk.tokenName || !hunk.tokenKind) {
        return applyHunkToContent(content, hunk);
    }
    const before = hunk.before;
    const after = hunk.after;
    if (before.length === 0) {
        throw new Error('CodePatchHunk.before must not be empty');
    }
    const expectedRawName = hunk.tokenName.startsWith('--')
        ? hunk.tokenName.slice(2)
        : hunk.tokenName;
    let result = '';
    let lastIndex = 0;
    let occurrences = 0;
    CSS_VAR_DECL_RE.lastIndex = 0;
    let match;
    while ((match = CSS_VAR_DECL_RE.exec(content)) !== null) {
        const [full, rawName, rawValue] = match;
        const start = match.index;
        const end = start + full.length;
        // Append unchanged content before this match.
        result += content.slice(lastIndex, start);
        if (rawName === expectedRawName && rawValue.includes(before)) {
            const newRawValue = rawValue.replace(before, after);
            const newFull = full.replace(rawValue, newRawValue);
            result += newFull;
            occurrences += 1;
        }
        else {
            result += full;
        }
        lastIndex = end;
    }
    // Append the remainder of the content.
    result += content.slice(lastIndex);
    return { content: result, occurrences };
}
function applyCodePatchSetToFiles(patchSet, files, options = {}) {
    const strict = options.strict ?? true;
    const working = new Map(Object.entries(files));
    const touched = new Set();
    for (const patch of patchSet.patches) {
        for (const hunk of patch.hunks) {
            const current = working.get(hunk.filePath);
            if (current === undefined) {
                if (strict) {
                    throw new Error(`No content provided for filePath ${hunk.filePath}`);
                }
                continue;
            }
            const { content: next, occurrences } = applyTokenHunkToContent(current, hunk);
            if (occurrences === 0 && strict) {
                throw new Error(`No occurrences of before text found for hunk in ${hunk.filePath}`);
            }
            if (occurrences > 0) {
                working.set(hunk.filePath, next);
                touched.add(hunk.filePath);
            }
        }
    }
    const changes = [];
    for (const filePath of touched) {
        const patched = working.get(filePath);
        const original = files[filePath];
        if (patched !== original) {
            changes.push({ filePath, content: patched });
        }
    }
    return { changes };
}
