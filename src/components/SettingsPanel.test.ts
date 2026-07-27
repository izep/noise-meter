import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/svelte'
import SettingsPanel from './SettingsPanel.svelte'
import { settings, DEFAULT_SETTINGS } from '../lib/settings/settings'
import { resetDbConnection } from '../lib/storage/db'
import { saveMovementEvent, getMovementHistorySince } from '../lib/storage/movementHistory'

describe('SettingsPanel', () => {
  beforeEach(() => {
    localStorage.clear()
    settings.set({ ...DEFAULT_SETTINGS })
    resetDbConnection()
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

  it('does not resurrect a stale "0" when the field is cleared then retyped', async () => {
    render(SettingsPanel)
    const input = screen.getByLabelText(/threshold/i) as HTMLInputElement

    // Simulate the real sequence a user (or tablet keyboard) produces:
    // clearing the field to empty, then typing a single new digit.
    await fireEvent.input(input, { target: { value: '' } })
    expect(input.value).toBe('')

    await fireEvent.input(input, { target: { value: '1' } })

    expect(input.value).toBe('1')
  })

  it('does not commit an empty field to the store, and reformats on blur', async () => {
    render(SettingsPanel)
    const input = screen.getByLabelText(/threshold/i) as HTMLInputElement

    await fireEvent.input(input, { target: { value: '' } })
    // Store should remain untouched (still the default) -- an empty field
    // must never commit as `0`.
    expect(JSON.parse(localStorage.getItem('noise-meter:settings')!).thresholdDb).toBe(
      DEFAULT_SETTINGS.thresholdDb,
    )

    await fireEvent.blur(input)
    expect(input.value).toBe(String(DEFAULT_SETTINGS.thresholdDb))
  })

  it('requires confirmation before clearing history', async () => {
    render(SettingsPanel)
    await fireEvent.click(screen.getByRole('button', { name: /^clear history$/i }))

    expect(screen.getByText(/permanently deletes all stored/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /yes, clear everything/i })).toBeInTheDocument()
  })

  it('cancelling the confirmation leaves history untouched', async () => {
    render(SettingsPanel)
    await fireEvent.click(screen.getByRole('button', { name: /^clear history$/i }))
    await fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

    expect(screen.queryByText(/permanently deletes all stored/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^clear history$/i })).toBeInTheDocument()
  })

  it('clears all stored history and notifies the parent on confirm', async () => {
    await saveMovementEvent({ timestamp: 1000, magnitude: 12, durationMs: 300 })
    const onHistoryCleared = vi.fn()

    render(SettingsPanel, { onHistoryCleared })
    await fireEvent.click(screen.getByRole('button', { name: /^clear history$/i }))
    await fireEvent.click(screen.getByRole('button', { name: /yes, clear everything/i }))

    expect(await screen.findByText(/history cleared/i)).toBeInTheDocument()
    expect(onHistoryCleared).toHaveBeenCalledTimes(1)
    expect(await getMovementHistorySince(0)).toHaveLength(0)
  })
})
