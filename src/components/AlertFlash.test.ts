import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/svelte'
import AlertFlash from './AlertFlash.svelte'

describe('AlertFlash', () => {
  it('renders nothing when no alert is active', () => {
    render(AlertFlash, { volumeAlert: false, movementAlert: false })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows a volume alert message', () => {
    render(AlertFlash, { volumeAlert: true, movementAlert: false })
    expect(screen.getByRole('alert')).toHaveTextContent('Volume too loud!')
  })

  it('shows a movement alert message', () => {
    render(AlertFlash, { volumeAlert: false, movementAlert: true })
    expect(screen.getByRole('alert')).toHaveTextContent('Movement detected!')
  })

  it('prioritizes the movement alert when both are active', () => {
    render(AlertFlash, { volumeAlert: true, movementAlert: true })
    expect(screen.getByRole('alert')).toHaveTextContent('Movement detected!')
  })
})
