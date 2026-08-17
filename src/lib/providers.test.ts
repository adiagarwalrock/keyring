import { describe, expect, it, vi } from 'vitest'

import { inspectProvider, likelyProviders, providerById } from './providers'

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } })
}

describe('provider adapters', () => {
  it('uses the documented auth headers without placing a key in the URL', () => {
    const openAi = providerById('openai').request('sk-example-secret')
    const gemini = providerById('gemini').request('AIza-example-secret')

    expect(openAi.url).not.toContain('sk-example-secret')
    expect(openAi.headers.get('authorization')).toBe('Bearer sk-example-secret')
    expect(gemini.url).not.toContain('AIza-example-secret')
    expect(gemini.headers.get('x-goog-api-key')).toBe('AIza-example-secret')
  })

  it('uses prefixes only as hints', () => {
    expect(likelyProviders('sk-ant-test').map((provider) => provider.id)).toEqual(['anthropic'])
    expect(likelyProviders('xai-test').map((provider) => provider.id)).toEqual(['xai'])
    expect(likelyProviders('')).toEqual([])
    expect(likelyProviders('unrecognised-value')).toHaveLength(8)
  })

  it('confirms and sanitizes a successful model response', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ data: [{ id: 'gpt-safe' }, { id: 'gpt-second' }] }, 200, { 'x-ratelimit-remaining-requests': '499' }))
    const result = await inspectProvider(providerById('openai'), 'sk-test', new AbortController().signal, fetcher)

    expect(result.status).toBe('confirmed')
    expect(result.models).toEqual(['gpt-safe', 'gpt-second'])
    expect(result.rateLimits).toEqual({ 'x-ratelimit-remaining-requests': '499' })
  })

  it.each([
    [401, 'invalid-or-revoked'],
    [403, 'valid-but-insufficient-permission'],
    [429, 'rate-limited'],
    [500, 'inconclusive'],
  ] as const)('classifies HTTP %s as %s', async (status, expected) => {
    const result = await inspectProvider(providerById('groq'), 'gsk_test', new AbortController().signal, vi.fn().mockResolvedValue(jsonResponse({}, status)))
    expect(result.status).toBe(expected)
  })

  it('classifies unreadable browser failures without leaking an error', async () => {
    const result = await inspectProvider(providerById('together'), 'sk-test', new AbortController().signal, vi.fn().mockRejectedValue(new TypeError('network')))
    expect(result.status).toBe('cors-or-network-blocked')
    expect(result.evidence).not.toContain('network')
  })

  it('only exposes allowlisted OpenRouter metadata and redacts token-like values', async () => {
    const result = await inspectProvider(
      providerById('openrouter'),
      'sk-or-v1-test',
      new AbortController().signal,
      vi.fn().mockResolvedValue(jsonResponse({ data: { name: 'Primary', usage: 12.5, secret: 'sk-hidden-123456789', ignored: 'nope' } })),
    )
    expect(result.metadata).toEqual({ name: 'Primary', usage: 12.5 })
  })
})
