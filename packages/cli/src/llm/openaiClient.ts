import type { FigmaSyncConfig, LLMClient, LLMGenerateOptions, RawLLMClient } from 'figma-sync-core';
import { JsonLLMClient } from 'figma-sync-core';

// Very small fetch abstraction so we don't rely on DOM types
// and can work with globalThis.fetch in Node 18+.
type FetchLike = (url: string, init: any) => Promise<any>;

const OPENAI_CHAT_COMPLETIONS_URL = 'https://api.openai.com/v1/chat/completions';

class OpenAIChatRawClient implements RawLLMClient {
  constructor(
    private readonly apiKey: string,
    private readonly llmConfig: FigmaSyncConfig['llm'],
    private readonly fetchImpl: FetchLike,
  ) {}

  async generate(prompt: string, options?: LLMGenerateOptions): Promise<string> {
    const temperature = options?.temperature ?? this.llmConfig.temperature;
    const maxTokens = options?.maxTokens ?? this.llmConfig.maxTokens;

    const body = {
      model: this.llmConfig.model,
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: prompt },
      ],
      temperature,
      max_tokens: maxTokens,
    };

    const response = await this.fetchImpl(OPENAI_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response || !response.ok) {
      const status = response?.status ?? 'unknown';
      const text = response && (await response.text?.());
      throw new Error(`OpenAI API error: ${status} ${text ?? ''}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
      throw new Error('OpenAI API returned no message content');
    }
    return content;
  }
}

/**
 * Create an LLMClient for OpenAI using environment variables.
 *
 * - Only active when config.llm.provider === 'openai'.
 * - Reads FIGMA_SYNC_OPENAI_API_KEY from process.env.
 * - Returns null when no key is present so callers can gracefully
 *   fall back to non-LLM behaviour.
 */
export function createOpenAiLLMClientFromEnv(
  config: FigmaSyncConfig,
): LLMClient | null {
  if (config.llm.provider !== 'openai') {
    return null;
  }

  const apiKey = process.env.FIGMA_SYNC_OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const fetchImpl: FetchLike | undefined = (globalThis as any).fetch;
  if (!fetchImpl) {
    throw new Error(
      'Global fetch is not available. Run on Node 18+ or provide a fetch polyfill.',
    );
  }

  const raw = new OpenAIChatRawClient(apiKey, config.llm, fetchImpl);
  return new JsonLLMClient(raw);
}

