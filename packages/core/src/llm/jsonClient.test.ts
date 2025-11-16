import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { JsonLLMClient, extractFirstJson } from './jsonClient';
import type { RawLLMClient } from './types';

describe('extractFirstJson', () => {
  it('extracts first JSON object from text', () => {
    const text = 'Some preamble```json {"a": 1}``` trailing';
    const json = extractFirstJson(text);
    expect(json).toBe('{"a": 1}');
  });

  it('returns null if no JSON found', () => {
    expect(extractFirstJson('no json here')).toBeNull();
  });
});

describe('JsonLLMClient.generateJSON', () => {
  const schema = z.object({ a: z.number() });

  it('parses and validates JSON from LLM response', async () => {
    const raw: RawLLMClient = {
      async generate() {
        return 'Here is JSON: {"a": 1}';
      },
    };

    const client = new JsonLLMClient(raw);
    const result = await client.generateJSON('prompt', schema);
    expect(result).toEqual({ a: 1 });
  });

  it('throws if no JSON is found', async () => {
    const raw: RawLLMClient = {
      async generate() {
        return 'no json here';
      },
    };
    const client = new JsonLLMClient(raw);

    await expect(client.generateJSON('prompt', schema)).rejects.toThrow(
      /did not contain JSON block/,
    );
  });

  it('throws if JSON is invalid against schema', async () => {
    const raw: RawLLMClient = {
      async generate() {
        return '{"a": "not-a-number"}';
      },
    };
    const client = new JsonLLMClient(raw);

    await expect(client.generateJSON('prompt', schema)).rejects.toThrow();
  });
});

