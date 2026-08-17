import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Home from './page'

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  window.sessionStorage.clear()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('Key Ring browser state', () => {
  it('keeps entered values in memory and clear removes them', async () => {
    const user = userEvent.setup()
    render(<Home />)
    await user.click(screen.getByRole('button', { name: 'Start inspecting' }))
    const input = screen.getByLabelText('API key')
    await user.type(input, 'example-key-value')
    expect(window.localStorage.getItem('key-ring.onboarding-seen')).toBe('true')
    expect(window.sessionStorage.length).toBe(0)
    await user.click(screen.getByRole('button', { name: 'Clear' }))
    expect(input).toHaveProperty('value', '')
    expect(window.localStorage.getItem('key-ring.onboarding-seen')).toBe('true')
    expect(window.sessionStorage.length).toBe(0)
  })

  it('asks for confirmation before wiping browser data', async () => {
    const user = userEvent.setup()
    render(<Home />)
    await user.click(screen.getByRole('button', { name: 'Start inspecting' }))
    await user.type(screen.getByLabelText('API key'), 'example-key-value')
    await user.click(screen.getByRole('button', { name: 'Wipe app data' }))

    expect(screen.getByRole('heading', { name: 'Wipe Key Ring data?' })).toBeDefined()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByLabelText('API key')).toHaveProperty('value', 'example-key-value')
    expect(window.localStorage.getItem('key-ring.onboarding-seen')).toBe('true')
  })

  it('keeps the provider menu open while selecting multiple providers', async () => {
    const user = userEvent.setup()
    render(<Home />)
    await user.click(screen.getByRole('button', { name: 'Start inspecting' }))
    await user.click(screen.getByRole('button', { name: 'Likely providers' }))
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'OpenAI' }))

    expect(screen.getByRole('menuitemcheckbox', { name: 'Anthropic' })).toBeDefined()
  })

  it('shows an icon for each provider in the selector', async () => {
    const user = userEvent.setup()
    render(<Home />)
    await user.click(screen.getByRole('button', { name: 'Start inspecting' }))
    await user.click(screen.getByRole('button', { name: 'Likely providers' }))

    expect(screen.getByRole('menuitemcheckbox', { name: 'OpenAI' }).querySelector('.provider-icon')).not.toBeNull()
    expect(screen.getByRole('menuitemcheckbox', { name: 'NVIDIA NIM' }).querySelector('.provider-icon')).not.toBeNull()
  })

  it('downloads a redacted provider response as JSON', async () => {
    const user = userEvent.setup()
    const createObjectURL = vi.fn(() => 'blob:response')
    const revokeObjectURL = vi.fn()
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [{ id: 'gpt-test' }] }), { headers: { 'content-type': 'application/json' }, status: 200 }))
    let filename = ''

    vi.stubGlobal('fetch', fetcher)
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { filename = this.download })

    render(<Home />)
    await user.click(screen.getByRole('button', { name: 'Start inspecting' }))
    await user.click(screen.getByRole('button', { name: 'Likely providers' }))
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'OpenAI' }))
    await user.keyboard('{Escape}')
    await user.type(screen.getByLabelText('API key'), 'sk-test-key')
    await user.click(screen.getByRole('button', { name: 'Review 1 destination' }))
    await user.click(screen.getByRole('button', { name: 'I understand, inspect key' }))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'OpenAI' })).toBeDefined())
    await user.click(screen.getByRole('button', { name: 'Show entire API response' }))
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
    await user.click(screen.getByRole('button', { name: 'Download JSON' }))

    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(filename).toBe('key-ring-openai-response.json')
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:response')
  })
})
