import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/svelte'
import SettingsPanel from './SettingsPanel.svelte'
import { settings, DEFAULT_SETTINGS } from '../lib/settings/settings'

describe('SettingsPanel', () => {
  beforeEach(() => {
    localStorage.clear()
    settings.set({ ...DEFAULT_SETTINGS })
  })

  it('renders current settings values', () => {
    render(SettingsPanel)
    expect(screen.getByLabelText(/threshold/i)).toHaveValue(DEFAULT_SETTINGS.thresholdDb)
  })

  it('updates the threshold setting and persists it', async () => {
    render(SettingsPanel)
    const input = screen.getByLabelText(/threshold/i)
    await fireEvent.input(input, { target: { value: '80' } })

    expect(JSON.parse(localStorage.getItem('noise-meter:settings')!).thresholdDb).toBe(80)
  })

  it('resets to defaults on button click', async () => {
    render(SettingsPanel)
    const input = screen.getByLabelText(/threshold/i)
    await fireEvent.input(input, { target: { value: '90' } })
    await fireEvent.click(screen.getByRole('button', { name: /reset/i }))

    expect(screen.getByLabelText(/threshold/i)).toHaveValue(DEFAULT_SETTINGS.thresholdDb)
  })
})
