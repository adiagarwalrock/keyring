export type ProviderId = 'openai' | 'anthropic' | 'gemini' | 'groq' | 'together' | 'openrouter' | 'cohere' | 'xai' | 'mistral' | 'cerebras' | 'fireworks' | 'deepinfra' | 'replicate' | 'baseten' | 'sambanova' | 'nebius' | 'novita' | 'hyperbolic' | 'huggingface' | 'nvidia'

export type InspectionStatus =
  | 'confirmed'
  | 'valid-but-insufficient-permission'
  | 'invalid-or-revoked'
  | 'rate-limited'
  | 'cors-or-network-blocked'
  | 'inconclusive'

export type SafeMetadata = Readonly<Record<string, string | number | boolean>>

export type InspectionResult = {
  provider: ProviderId
  providerName: string
  status: InspectionStatus
  evidence: string
  models: string[]
  metadata: SafeMetadata
  rateLimits: SafeMetadata
  response: unknown
  organization?: unknown
  docsUrl: string
}

export type ProviderAdapter = {
  id: ProviderId
  name: string
  endpoint: string
  docsUrl: string
  prefixHints: readonly string[]
  privilege: (key: string) => 'privileged' | 'possible-management' | 'standard'
  request: (key: string) => Request
  organization?: { endpoint: string; docsUrl: string; request: (key: string) => Request }
  extract: (body: unknown) => { models: string[]; metadata: SafeMetadata }
}

export type ConfigurationRequiredProvider = {
  id: 'bedrock' | 'vertex' | 'azure' | 'firefly'
  name: string
  requirement: string
  docsUrl: string
}

const MAX_VALUE_LENGTH = 160
const MAX_MODELS = 50
const SAFE_METADATA_KEYS = new Set([
  'id', 'name', 'label', 'created_at', 'updated_at', 'expires_at', 'disabled',
  'limit', 'limit_remaining', 'limit_reset', 'usage', 'usage_daily',
  'usage_weekly', 'usage_monthly', 'workspace_id', 'tier',
])

function readRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function safeValue(value: unknown): string | number | boolean | undefined {
  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (typeof value !== 'string') return undefined
  if (/\b(?:sk|AIza|gsk|token|secret|bearer)[-_a-zA-Z0-9]{8,}\b/i.test(value)) return '[redacted]'
  return value.slice(0, MAX_VALUE_LENGTH)
}

function isSensitiveField(name: string) {
  return /(?:api[-_]?key|authorization|bearer|token|secret|password|credential)/i.test(name)
}

/** Keeps the provider's response inspectable without rendering credentials it may echo. */
export function safeResponse(value: unknown, key = ''): unknown {
  if (isSensitiveField(key)) return '[redacted]'
  if (typeof value === 'string') return safeValue(value) ?? '[redacted]'
  if (Array.isArray(value)) return value.map((item) => safeResponse(item))
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([name, item]) => [name, safeResponse(item, name)]))
  }
  return value
}

function pickMetadata(value: unknown): SafeMetadata {
  const record = readRecord(value)
  return Object.fromEntries(
    Object.entries(record)
      .filter(([key]) => SAFE_METADATA_KEYS.has(key))
      .flatMap(([key, entry]) => {
        const safe = safeValue(entry)
        return safe === undefined ? [] : [[key, safe]]
      }),
  )
}

function modelIds(value: unknown): string[] {
  const record = readRecord(value)
  const data = Array.isArray(value) ? value : Array.isArray(record.data) ? record.data : Array.isArray(record.models) ? record.models : Array.isArray(record.results) ? record.results : []
  return data
    .map((model) => {
      const item = readRecord(model)
      return typeof item.id === 'string' ? item.id : typeof item.name === 'string' ? item.name : typeof item.model_name === 'string' ? item.model_name : undefined
    })
    .filter((model): model is string => Boolean(model))
    .slice(0, MAX_MODELS)
}

function geminiModels(value: unknown): string[] {
  const models = readRecord(value).models
  return Array.isArray(models)
    ? models
      .map((model) => readRecord(model).name)
      .filter((name): name is string => typeof name === 'string')
      .map((name) => name.replace(/^models\//, ''))
      .slice(0, MAX_MODELS)
    : []
}

function request(url: string, headers: Record<string, string>): Request {
  return new Request(url, { method: 'GET', headers, credentials: 'omit', referrer: '' })
}

export const PROVIDERS: readonly ProviderAdapter[] = [
  {
    id: 'openai', name: 'OpenAI', endpoint: 'https://api.openai.com/v1/models',
    docsUrl: 'https://platform.openai.com/docs/api-reference/models/list', prefixHints: ['sk-', 'sk-proj-'],
    privilege: (key) => key.startsWith('sk-admin-') ? 'privileged' : 'standard',
    request: (key) => request('https://api.openai.com/v1/models', { Authorization: `Bearer ${key}` }),
    organization: {
      endpoint: 'https://api.openai.com/v1/organization/projects',
      docsUrl: 'https://platform.openai.com/docs/api-reference/organization/projects/list',
      request: (key) => request('https://api.openai.com/v1/organization/projects', { Authorization: `Bearer ${key}` }),
    },
    extract: (body) => ({ models: modelIds(body), metadata: {} }),
  },
  {
    id: 'anthropic', name: 'Anthropic', endpoint: 'https://api.anthropic.com/v1/models',
    docsUrl: 'https://docs.anthropic.com/en/api/models-list', prefixHints: ['sk-ant-'],
    privilege: () => 'standard',
    request: (key) => request('https://api.anthropic.com/v1/models', { 'x-api-key': key, 'anthropic-version': '2023-06-01' }),
    extract: (body) => ({ models: modelIds(body), metadata: {} }),
  },
  {
    id: 'gemini', name: 'Google Gemini', endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    docsUrl: 'https://ai.google.dev/api/models', prefixHints: ['AIza'],
    privilege: () => 'standard',
    request: (key) => request('https://generativelanguage.googleapis.com/v1beta/models', { 'x-goog-api-key': key }),
    extract: (body) => ({ models: geminiModels(body), metadata: {} }),
  },
  {
    id: 'groq', name: 'Groq', endpoint: 'https://api.groq.com/openai/v1/models',
    docsUrl: 'https://console.groq.com/docs/api-reference#models', prefixHints: ['gsk_'],
    privilege: () => 'standard',
    request: (key) => request('https://api.groq.com/openai/v1/models', { Authorization: `Bearer ${key}` }),
    extract: (body) => ({ models: modelIds(body), metadata: {} }),
  },
  {
    id: 'together', name: 'Together.ai', endpoint: 'https://api.together.xyz/v1/models',
    docsUrl: 'https://docs.together.ai/reference/models-1', prefixHints: ['sk-'],
    privilege: () => 'standard',
    request: (key) => request('https://api.together.xyz/v1/models', { Authorization: `Bearer ${key}` }),
    extract: (body) => ({ models: modelIds(body), metadata: {} }),
  },
  {
    id: 'openrouter', name: 'OpenRouter', endpoint: 'https://openrouter.ai/api/v1/key',
    docsUrl: 'https://openrouter.ai/docs/api/api-reference/keys/get-key', prefixHints: ['sk-or-v1-'],
    privilege: () => 'possible-management',
    request: (key) => request('https://openrouter.ai/api/v1/key', { Authorization: `Bearer ${key}` }),
    extract: (body) => {
      const data = readRecord(body).data
      return { models: [], metadata: pickMetadata(data) }
    },
  },
  {
    id: 'cohere', name: 'Cohere', endpoint: 'https://api.cohere.com/v1/models',
    docsUrl: 'https://docs.cohere.com/v2/reference/list-models', prefixHints: ['co-'],
    privilege: () => 'standard',
    request: (key) => request('https://api.cohere.com/v1/models', { Authorization: `Bearer ${key}` }),
    extract: (body) => ({ models: modelIds(body), metadata: {} }),
  },
  {
    id: 'xai', name: 'Grok (xAI)', endpoint: 'https://api.x.ai/v1/models',
    docsUrl: 'https://docs.x.ai/developers/rest-api-reference/inference/models', prefixHints: ['xai-'],
    privilege: () => 'possible-management',
    request: (key) => request('https://api.x.ai/v1/models', { Authorization: `Bearer ${key}` }),
    extract: (body) => ({ models: modelIds(body), metadata: {} }),
  },
  {
    id: 'mistral', name: 'Mistral AI', endpoint: 'https://api.mistral.ai/v1/models',
    docsUrl: 'https://docs.mistral.ai/api/endpoint/models', prefixHints: [],
    privilege: () => 'standard',
    request: (key) => request('https://api.mistral.ai/v1/models', { Authorization: `Bearer ${key}` }),
    extract: (body) => ({ models: modelIds(body), metadata: {} }),
  },
  {
    id: 'cerebras', name: 'Cerebras', endpoint: 'https://api.cerebras.ai/v1/models',
    docsUrl: 'https://inference-docs.cerebras.ai/api-reference/models/list-models', prefixHints: ['csk-'],
    privilege: () => 'standard',
    request: (key) => request('https://api.cerebras.ai/v1/models', { Authorization: `Bearer ${key}` }),
    extract: (body) => ({ models: modelIds(body), metadata: {} }),
  },
  {
    id: 'fireworks', name: 'Fireworks AI', endpoint: 'https://api.fireworks.ai/inference/v1/models',
    docsUrl: 'https://docs.fireworks.ai/tools-sdks/python-client/api-reference', prefixHints: ['fw_'],
    privilege: () => 'standard',
    request: (key) => request('https://api.fireworks.ai/inference/v1/models', { Authorization: `Bearer ${key}` }),
    extract: (body) => ({ models: modelIds(body), metadata: {} }),
  },
  {
    id: 'deepinfra', name: 'DeepInfra', endpoint: 'https://api.deepinfra.com/models/list',
    docsUrl: 'https://docs.deepinfra.com/api-reference/models/models-list', prefixHints: [],
    privilege: () => 'standard',
    request: (key) => request('https://api.deepinfra.com/models/list', { Authorization: `Bearer ${key}` }),
    extract: (body) => ({ models: modelIds(body), metadata: {} }),
  },
  {
    id: 'replicate', name: 'Replicate', endpoint: 'https://api.replicate.com/v1/models',
    docsUrl: 'https://replicate.com/docs/reference/http/', prefixHints: ['r8_'],
    privilege: () => 'standard',
    request: (key) => request('https://api.replicate.com/v1/models', { Authorization: `Bearer ${key}` }),
    extract: (body) => ({ models: modelIds(body), metadata: {} }),
  },
  {
    id: 'baseten', name: 'Baseten', endpoint: 'https://inference.baseten.co/v1/models',
    docsUrl: 'https://docs.baseten.co/inference/model-apis/overview', prefixHints: [],
    privilege: () => 'standard',
    request: (key) => request('https://inference.baseten.co/v1/models', { Authorization: `Bearer ${key}` }),
    extract: (body) => ({ models: modelIds(body), metadata: {} }),
  },
  {
    id: 'sambanova', name: 'SambaNova Cloud', endpoint: 'https://api.sambanova.ai/v1/models',
    docsUrl: 'https://docs-prod.sambanova.ai/docs/api-reference/endpoints/model-list', prefixHints: [],
    privilege: () => 'standard',
    request: (key) => request('https://api.sambanova.ai/v1/models', { Authorization: `Bearer ${key}` }),
    extract: (body) => ({ models: modelIds(body), metadata: {} }),
  },
  {
    id: 'nebius', name: 'Nebius AI Studio', endpoint: 'https://api.studio.nebius.ai/v1/models',
    docsUrl: 'https://api.studio.nebius.ai/docs', prefixHints: [],
    privilege: () => 'standard',
    request: (key) => request('https://api.studio.nebius.ai/v1/models', { Authorization: `Bearer ${key}` }),
    extract: (body) => ({ models: modelIds(body), metadata: {} }),
  },
  {
    id: 'novita', name: 'Novita AI', endpoint: 'https://api.novita.ai/openai/v1/models',
    docsUrl: 'https://novita.ai/docs/api-reference/model-apis-llm-list-models', prefixHints: [],
    privilege: () => 'standard',
    request: (key) => request('https://api.novita.ai/openai/v1/models', { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }),
    extract: (body) => ({ models: modelIds(body), metadata: {} }),
  },
  {
    id: 'hyperbolic', name: 'Hyperbolic', endpoint: 'https://api.hyperbolic.xyz/v1/models',
    docsUrl: 'https://docs.hyperbolic.xyz/docs/inference-api', prefixHints: [],
    privilege: () => 'standard',
    request: (key) => request('https://api.hyperbolic.xyz/v1/models', { Authorization: `Bearer ${key}` }),
    extract: (body) => ({ models: modelIds(body), metadata: {} }),
  },
  {
    id: 'huggingface', name: 'Hugging Face', endpoint: 'https://huggingface.co/api/whoami-v2',
    docsUrl: 'https://huggingface.co/docs/hub/security-tokens', prefixHints: ['hf_'],
    privilege: () => 'standard',
    request: (key) => request('https://huggingface.co/api/whoami-v2', { Authorization: `Bearer ${key}` }),
    extract: (body) => ({ models: [], metadata: pickMetadata(body) }),
  },
  {
    id: 'nvidia', name: 'NVIDIA NIM', endpoint: 'https://integrate.api.nvidia.com/v1/models',
    docsUrl: 'https://docs.nvidia.com/nim-operator/latest/guardrail.html', prefixHints: ['nvapi-'],
    privilege: () => 'standard',
    request: (key) => request('https://integrate.api.nvidia.com/v1/models', { Authorization: `Bearer ${key}` }),
    extract: (body) => ({ models: modelIds(body), metadata: {} }),
  },
]

export const CONFIGURATION_REQUIRED_PROVIDERS: readonly ConfigurationRequiredProvider[] = [
  {
    id: 'bedrock', name: 'Amazon Bedrock',
    requirement: 'Needs a region-specific endpoint; do not guess a region from a key.',
    docsUrl: 'https://docs.aws.amazon.com/bedrock/latest/userguide/api-keys-use.html',
  },
  {
    id: 'vertex', name: 'Google Vertex AI',
    requirement: 'Uses an OAuth access token plus a Google Cloud project and location, not a Gemini API key.',
    docsUrl: 'https://cloud.google.com/vertex-ai/docs/authentication',
  },
  {
    id: 'azure', name: 'Azure AI Foundry',
    requirement: 'Needs the resource-specific endpoint in addition to its API key or OAuth token.',
    docsUrl: 'https://learn.microsoft.com/en-us/azure/foundry/openai/reference-preview-latest',
  },
  {
    id: 'firefly', name: 'Adobe Firefly',
    requirement: 'Needs both an Adobe client ID and a short-lived access token; never submit a client secret here.',
    docsUrl: 'https://developer.adobe.com/firefly-services/docs/firefly-api/getting-started/',
  },
]

export function providerById(id: ProviderId): ProviderAdapter {
  const provider = PROVIDERS.find((candidate) => candidate.id === id)
  if (!provider) throw new Error(`Unknown provider: ${id}`)
  return provider
}

export function likelyProviders(key: string): ProviderAdapter[] {
  const normalized = key.trim()
  if (!normalized) return []
  const matches = PROVIDERS.filter((provider) => provider.prefixHints.some((hint) => hint.length > 0 && normalized.startsWith(hint)))
  if (!matches.length) return [...PROVIDERS]
  const longestHint = Math.max(...matches.flatMap((provider) => provider.prefixHints
    .filter((hint) => hint.length > 0 && normalized.startsWith(hint))
    .map((hint) => hint.length)))
  return matches.filter((provider) => provider.prefixHints.some((hint) => hint.length > 0 && normalized.startsWith(hint) && hint.length === longestHint))
}

function rateLimits(headers: Headers): SafeMetadata {
  const values: Record<string, string> = {}
  for (const [name, value] of headers.entries()) {
    if (/^(x-)?rate(limit|limit-remaining|limit-reset)|retry-after$/i.test(name)) {
      values[name] = value.slice(0, MAX_VALUE_LENGTH)
    }
  }
  return values
}

function parseResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? ''
  return contentType.includes('application/json') ? response.json().catch(() => ({})) : Promise.resolve({})
}

async function inspectOrganization(
  provider: ProviderAdapter,
  key: string,
  signal: AbortSignal,
  fetcher: typeof fetch,
): Promise<unknown | undefined> {
  if (!provider.organization || provider.privilege(key) !== 'privileged') return undefined
  try {
    const response = await fetcher(provider.organization.request(key), { signal })
    return response.ok ? safeResponse(await parseResponse(response)) : undefined
  } catch {
    return undefined
  }
}

export async function inspectProvider(
  provider: ProviderAdapter,
  key: string,
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
  scope: 'standard' | 'organization' = 'standard',
): Promise<InspectionResult> {
  try {
    const target = scope === 'organization' ? provider.organization : undefined
    if (scope === 'organization' && !target) throw new Error('Organization inspection is not available for this provider.')
    const response = await fetcher((target?.request ?? provider.request)(key), { signal })
    const body = await parseResponse(response)
    const base = {
      provider: provider.id,
      providerName: provider.name,
      models: [] as string[],
      metadata: {} as SafeMetadata,
      rateLimits: rateLimits(response.headers),
      response: safeResponse(body),
      docsUrl: target?.docsUrl ?? provider.docsUrl,
    }

    if (response.ok) {
      const extracted = provider.extract(body)
      const organization = scope === 'standard' ? await inspectOrganization(provider, key, signal, fetcher) : undefined
      return { ...base, ...extracted, organization, status: 'confirmed', evidence: 'The provider accepted this read-only verification request.' }
    }
    if (response.status === 401) return { ...base, status: 'invalid-or-revoked', evidence: 'The provider rejected the credentials.' }
    if (response.status === 403) return { ...base, status: 'valid-but-insufficient-permission', evidence: 'Access was denied. This does not confirm a provider match.' }
    if (response.status === 429) return { ...base, status: 'rate-limited', evidence: 'The verification request was rate limited.' }
    return { ...base, status: 'inconclusive', evidence: `The provider returned HTTP ${response.status}; no match was confirmed.` }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return {
        provider: provider.id, providerName: provider.name, status: 'inconclusive',
        evidence: 'Inspection was cancelled.', models: [], metadata: {}, rateLimits: {}, response: {}, docsUrl: provider.docsUrl,
      }
    }
    return {
      provider: provider.id, providerName: provider.name, status: 'cors-or-network-blocked',
      evidence: 'The browser could not read this response. The provider may block browser cross-origin requests.',
      models: [], metadata: {}, rateLimits: {}, response: {}, docsUrl: provider.docsUrl,
    }
  }
}
