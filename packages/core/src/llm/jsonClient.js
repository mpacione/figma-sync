"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonLLMClient = void 0;
exports.extractFirstJson = extractFirstJson;
function extractFirstJson(text) {
    const start = text.search(/[\[{]/);
    if (start === -1)
        return null;
    const open = text[start];
    const close = open === '{' ? '}' : ']';
    let depth = 0;
    for (let i = start; i < text.length; i += 1) {
        const ch = text[i];
        if (ch === open)
            depth += 1;
        else if (ch === close)
            depth -= 1;
        if (depth === 0) {
            return text.slice(start, i + 1);
        }
    }
    return null;
}
class JsonLLMClient {
    constructor(raw) {
        this.raw = raw;
    }
    generate(prompt, options) {
        return this.raw.generate(prompt, options);
    }
    async generateJSON(prompt, schema, options) {
        const text = await this.generate(prompt, options);
        const jsonSegment = extractFirstJson(text);
        if (!jsonSegment) {
            throw new Error('LLM response did not contain JSON block');
        }
        let parsed;
        try {
            parsed = JSON.parse(jsonSegment);
        }
        catch (err) {
            throw new Error(`Failed to parse JSON from LLM response: ${err.message}`);
        }
        return schema.parse(parsed);
    }
}
exports.JsonLLMClient = JsonLLMClient;
