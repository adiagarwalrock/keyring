import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'

import Home from './page'

afterEach(() => {
  window.localStorage.clear()
  window.sessionStorage.clear()
})

describe('Key Ring browser state', () => {
  it('keeps entered values in memory and clear removes them', async () => {
    const user = userEvent.setup()
    render(<Home />)
    const input = screen.getByLabelText('API key')
    await user.type(input, 'example-key-value')
    expect(window.localStorage.length).toBe(0)
    expect(window.sessionStorage.length).toBe(0)
    await user.click(screen.getByRole('button', { name: 'Clear' }))
    expect(input).toHaveProperty('value', '')
    expect(window.localStorage.length).toBe(0)
    expect(window.sessionStorage.length).toBe(0)
  })
})
