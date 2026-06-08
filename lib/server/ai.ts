interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | any[]
}

interface ChatCompletionOptions {
  model?: string
  messages: ChatMessage[]
  temperature?: number
  max_tokens?: number
  response_format?: { type: 'json_object' }
}

export class OpenRouterHttpError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'OpenRouterHttpError'
    this.status = status
  }
}

/**
 * Reusable helper to execute chat completions via the OpenRouter API.
 */
export async function queryOpenRouter(options: ChatCompletionOptions): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OpenAI/OpenRouter API key is missing from environment variables.')
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: options.model || 'openai/gpt-4o',
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens,
      response_format: options.response_format
    })
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error('[OpenRouter Error]:', errorData)
    throw new OpenRouterHttpError(
      errorData?.error?.message || `OpenRouter failed with HTTP status ${response.status}`,
      response.status
    )
  }

  const data = await response.json()
  if (!data?.choices?.[0]?.message?.content) {
    throw new Error('Invalid or empty response format from OpenRouter')
  }

  return data.choices[0].message.content.trim()
}
