"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const zod_1 = require("zod");
const jsonClient_1 = require("./jsonClient");
(0, vitest_1.describe)('extractFirstJson', () => {
    (0, vitest_1.it)('extracts first JSON object from text', () => {
        const text = 'Some preamble```json {"a": 1}``` trailing';
        const json = (0, jsonClient_1.extractFirstJson)(text);
        (0, vitest_1.expect)(json).toBe('{"a": 1}');
    });
    (0, vitest_1.it)('returns null if no JSON found', () => {
        (0, vitest_1.expect)((0, jsonClient_1.extractFirstJson)('no json here')).toBeNull();
    });
});
(0, vitest_1.describe)('JsonLLMClient.generateJSON', () => {
    const schema = zod_1.z.object({ a: zod_1.z.number() });
    (0, vitest_1.it)('parses and validates JSON from LLM response', async () => {
        const raw = {
            async generate() {
                return 'Here is JSON: {"a": 1}';
            },
        };
        const client = new jsonClient_1.JsonLLMClient(raw);
        const result = await client.generateJSON('prompt', schema);
        (0, vitest_1.expect)(result).toEqual({ a: 1 });
    });
    (0, vitest_1.it)('throws if no JSON is found', async () => {
        const raw = {
            async generate() {
                return 'no json here';
            },
        };
        const client = new jsonClient_1.JsonLLMClient(raw);
        await (0, vitest_1.expect)(client.generateJSON('prompt', schema)).rejects.toThrow(/did not contain JSON block/);
    });
    (0, vitest_1.it)('throws if JSON is invalid against schema', async () => {
        const raw = {
            async generate() {
                return '{"a": "not-a-number"}';
            },
        };
        const client = new jsonClient_1.JsonLLMClient(raw);
        await (0, vitest_1.expect)(client.generateJSON('prompt', schema)).rejects.toThrow();
    });
});
