# Noise Meter

A browser-based (installable PWA) noise and movement monitor built for a Fire tablet, but
works in any modern browser. No backend — everything runs and is stored locally on the device.

- **Live volume graph** of approximate dB SPL, computed from the microphone via the Web Audio API.
- **Flashes a full-screen alert** when volume exceeds a configurable threshold (default 65 dB).
- **Keeps several hours of history** (downsampled volume buckets) in IndexedDB.
- **Detects tablet movement** via the DeviceMotion accelerometer and flashes a distinct alert,
  keeping a separate movement history log.
- **Keeps the screen awake** while monitoring, using the Screen Wake Lock API (with a muted
  looping-video fallback for browsers where it's unsupported).
- Installable as a PWA (works offline once loaded, add-to-homescreen icon).

## Stack

Svelte 5 + TypeScript + Vite, `vite-plugin-pwa`, `uPlot` for the graph, `idb` for IndexedDB.
Tested with Vitest + Testing Library. Linted with ESLint + Prettier. Deployed to GitHub Pages
via GitHub Actions.

## Getting started

```bash
npm install
npm run dev       # start the dev server (https not required for localhost getUserMedia)
```

Open the printed local URL in a browser. Microphone and motion permission prompts appear when
you tap "Start Monitoring".

## Scripts

| Command              | Description                                        |
| -------------------- | -------------------------------------------------- |
| `npm run dev`        | Start the Vite dev server with HMR                 |
| `npm run build`      | Type-check-free production build (Vite build)      |
| `npm run check`      | Svelte + TypeScript type checking (`svelte-check`) |
| `npm run test`       | Run the unit/component test suite once (Vitest)    |
| `npm run test:watch` | Run tests in watch mode                            |
| `npm run lint`       | ESLint + Prettier check                            |
| `npm run format`     | Auto-format with Prettier                          |
| `npm run preview`    | Preview the production build locally               |

## Project structure

```
src/
  lib/
    audio/       # dB SPL math (dsp.ts) + Web Audio microphone monitor
    motion/      # movement-spike math + DeviceMotion monitor
    storage/     # IndexedDB schema, volume history aggregation/pruning, movement log
    wakelock/    # Screen Wake Lock API + fallback
    settings/    # persisted user settings (threshold, sensitivity, retention, calibration)
  components/    # Svelte UI: graph, alert overlay, history panel, settings panel, onboarding
  App.svelte     # wires everything together
```

Each `lib/` module is small, single-purpose, and has a co-located `*.test.ts` file. Browser
APIs (`getUserMedia`, `AudioContext`, `DeviceMotionEvent`, `navigator.wakeLock`, IndexedDB) are
injected/mocked in tests so the logic can run without real hardware.

## dB calibration

The Web Audio API only gives relative signal level (dBFS), not real-world dB SPL. This app
converts dBFS to an _approximate_ dB SPL reading using a calibration offset (Settings panel).
For a reasonably accurate reading on your specific tablet/microphone, compare the displayed
value against a reference sound level meter (or phone SPL app) at a known volume and adjust the
offset until they match.

## Movement detection

Movement is detected from sudden changes in accelerometer magnitude versus a slow-adapting
baseline (to ignore normal ambient vibration). Sensitivity is configurable in Settings. This is
expected to trigger rarely — only when the tablet is actually picked up, bumped, or relocated.

## Deploying to GitHub Pages

The `deploy.yml` workflow builds and deploys the `dist/` output to GitHub Pages automatically on
every push to `main`. One-time setup:

1. In the repo's **Settings → Pages**, set **Source** to **GitHub Actions**.
2. Push to `main` — the workflow builds, tests, and deploys.
3. The site is served at `https://<owner>.github.io/<repo-name>/`.

The Vite `base` path defaults to `/noise-meter/` (this repo's folder name). If your GitHub repo
name differs, override it by setting a `VITE_BASE` repository variable/secret (e.g.
`/my-repo-name/`) consumed during the build, or edit `REPO_NAME` in `vite.config.ts`.

## Installing on a Fire tablet

1. Open the deployed GitHub Pages URL in the Silk browser.
2. Use the browser menu → "Add to Home screen" to install it as a standalone app.
3. Launch it from the home screen, grant microphone + motion permissions, and tap
   "Start Monitoring". Keep it open/foregrounded for continuous monitoring and to keep the
   Wake Lock active.

## Continuous Integration

`ci.yml` runs lint, type-check, unit tests, and a production build on every push/PR to any
branch, so regressions are caught before merge.
