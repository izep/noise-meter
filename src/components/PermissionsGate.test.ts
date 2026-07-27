import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/svelte'
import PermissionsGate from './PermissionsGate.svelte'

describe('PermissionsGate', () => {
  it('invokes onStart when the button is clicked', async () => {
    const onStart = vi.fn().mockResolvedValue(undefined)
    render(PermissionsGate, { onStart })

    await fireEvent.click(screen.getByRole('button', { name: /start monitoring/i }))

    expect(onStart).toHaveBeenCalledTimes(1)
  })

  it('shows an error message when onStart rejects', async () => {
    const onStart = vi.fn().mockRejectedValue(new Error('Permission denied'))
    render(PermissionsGate, { onStart })

    await fireEvent.click(screen.getByRole('button', { name: /start monitoring/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Permission denied')
  })
})
