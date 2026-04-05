/**
 * LLM Client — OpenAI API wrapper
 * Raw fetch wrapper around the OpenAI API.
 * No external LLM libraries — uses raw fetch.
 */

export class LLMTimeoutError extends Error {
  constructor(message = 'LLM request timed out') {
    super(message);
    this.name = 'LLMTimeoutError';
  }
}

export class LLMRateLimitError extends Error {
  constructor(message = 'LLM rate limit exceeded') {
    super(message);
    this.name = 'LLMRateLimitError';
  }
}

export class LLMError extends Error {
  public statusCode: number;
  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = 'LLMError';
    this.statusCode = statusCode;
  }
}

interface LLMMessage {
  role: string;
  content: string;
}

const OPENAI_API_URL = 'https://api.openai.com/v1/responses';
const MODEL = 'gpt-4o-mini';
const MAX_RETRIES = 3;
const TIMEOUT_MS = 30000;
const RETRY_BASE_MS = 1000;

/**
 * Call the OpenAI API with a system prompt and message history.
 * Includes retry logic with exponential backoff for 429/500 errors.
 */
export async function callLLM(
  systemPrompt: string,
  messages: LLMMessage[],
  maxTokens: number = 2048
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new LLMError('OPENAI_API_KEY is not set', 401);
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: MODEL,
          max_output_tokens: maxTokens,
          input: [
            {
              role: 'system',
              content: systemPrompt,
            },
            ...messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          ],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 429) {
        throw new LLMRateLimitError();
      }

      if (!response.ok) {
        const errorBody = await response.text().catch(() => 'Unknown error');
        throw new LLMError(`API error: ${response.status} - ${errorBody}`, response.status);
      }

      const data = await response.json();

      // Extract text from OpenAI Responses API format
      // data.output is an array of output items; find the message with text content
      if (data.output && Array.isArray(data.output)) {
        for (const item of data.output) {
          if (item.type === 'message' && Array.isArray(item.content)) {
            const textBlock = item.content.find((b: { type: string }) => b.type === 'output_text');
            if (textBlock?.text) {
              return textBlock.text;
            }
          }
        }
      }

      throw new LLMError('Unexpected response format from OpenAI API');
    } catch (error) {
      lastError = error as Error;

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new LLMTimeoutError();
      }

      // Only retry on rate limit or server errors
      if (
        error instanceof LLMRateLimitError ||
        (error instanceof LLMError && error.statusCode >= 500)
      ) {
        const delay = RETRY_BASE_MS * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }

  throw lastError ?? new LLMError('Max retries exceeded');
}

// Backward-compatible alias
export const callClaude = callLLM;
