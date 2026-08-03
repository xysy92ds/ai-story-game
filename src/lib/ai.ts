export type AIProviderId = 'openai' | 'deepseek' | 'kimi';

export interface AIProvider {
  id: AIProviderId;
  name: string;
  baseUrl: string;
  models: string[];
}

export const AI_PROVIDERS: Record<AIProviderId, AIProvider> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o-mini', 'gpt-4o'],
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    models: ['deepseek-chat', 'deepseek-reasoner'],
  },
  kimi: {
    id: 'kimi',
    name: 'Kimi（Moonshot）',
    baseUrl: 'https://api.moonshot.cn/v1',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k'],
  },
};

export function getProviderEnvKey(provider: AIProviderId): string {
  if (provider === 'openai') return process.env.OPENAI_API_KEY || '';
  if (provider === 'deepseek') return process.env.DEEPSEEK_API_KEY || '';
  return process.env.MOONSHOT_API_KEY || '';
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CallAIOptions {
  provider: AIProviderId;
  model: string;
  apiKey: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

/**
 * 调用任意一家 OpenAI 兼容的 chat/completions 接口。
 * 总时限 50 秒（低于 Vercel Hobby 的 60 秒上限），失败自动回退普通模式重试一次。
 */
export async function callAI(opts: CallAIOptions): Promise<string> {
  const deadline = Date.now() + 50000;
  const provider = AI_PROVIDERS[opts.provider];
  if (!provider) throw new Error('未知的 AI 服务商');

  const baseBody: Record<string, unknown> = {
    model: opts.model,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.9,
    max_tokens: opts.maxTokens ?? 2400,
  };

  try {
    return await requestChat(provider, opts.apiKey, { ...baseBody, response_format: { type: 'json_object' } }, deadline);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/response_format|json|400|4001|invalid_request/i.test(msg)) {
      return await requestChat(provider, opts.apiKey, baseBody, deadline);
    }
    throw e;
  }
}

async function requestChat(provider: AIProvider, apiKey: string, body: Record<string, unknown>, deadline: number): Promise<string> {
  const remaining = deadline - Date.now();
  if (remaining <= 1000) throw new Error('AI 请求超时');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), remaining);
  try {
    const res = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`AI 请求失败（${res.status}）：${text.slice(0, 400)}`);
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) throw new Error('AI 返回内容为空');
    return content;
  } finally {
    clearTimeout(timer);
  }
}