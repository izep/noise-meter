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
converts dBFS to an _approximate_ dB SPL reading using a calibration offset (`displayed dB =
raw signal level + offset`), configurable in the Settings panel (default `100`, a reasonable
starting point for most tablet microphones).

**How to pick a value:**

1. Get a reference reading: install a sound level meter app on your phone (e.g. "Decibel X",
   "Sound Meter", or the free NIOSH SLM app on iOS/Android), or use a dedicated SPL meter if you
   have one.
2. Put your phone (running the reference app) right next to the tablet, and start monitoring in
   this app.
3. Play a steady sound at a normal-to-loud volume near both devices (talking, music, a fan,
   etc. — avoid very quiet or clipping-loud sounds for the best fit).
4. Compare the two readings. If this app reads **lower** than the reference, **increase** the
   calibration offset by the difference; if it reads **higher**, **decrease** it. Adjusting the
   offset shifts the displayed value by exactly that many dB.
5. Re-check at a couple of different volumes if you can — a single offset won't be perfectly
   accurate across the whole range (real microphones aren't perfectly linear), but it gets you
   close enough to reliably catch "too loud" moments around your chosen threshold.

You only need to do this once per device/tablet. The app disables the browser's automatic gain
control, echo cancellation, and noise suppression on the microphone stream specifically so the
raw signal level stays consistent over time — with auto gain control left on, the browser would
continuously re-normalize the signal and any calibration you set would drift and become
unreliable.

## Movement detection

Movement is detected from sudden changes in accelerometer magnitude versus a slow-adapting
baseline (to ignore normal ambient vibration). Sensitivity is configurable in Settings. This is
expected to trigger rarely — only when the tablet is actually picked up, bumped, or relocated.

## Threshold violations

Noise threshold violations are tracked as discrete episodes: once the reading rises above the
configured dB limit, the app starts one violation, records the highest dB reached during that
episode, and counts it once when the reading drops back to or below the limit.

The History view shows:

- a total "limit exceeded X times" count,
- the percentage of monitored time spent above the threshold (approximated as total violation
  duration divided by the stored bucket coverage window),
- a per-violation list with peak dB + duration, and
- visual markers for each violation on the graph.

## Clearing / resetting history

Open the **Settings** panel and click **Clear history** at the bottom, then confirm. This
permanently deletes all stored volume history, threshold violations, and movement events from
IndexedDB (retention settings and other preferences are untouched — use **Reset to defaults**
above it for that). The live graph and history view update immediately.

If you'd rather wipe everything (including settings and the installed PWA cache) from the
browser directly: open the site, then use your browser's "Site settings" / "Clear site data" for
this origin (in Chrome-based browsers: address bar → site info icon → "Site settings" → "Clear
data"; in Silk: Settings → Site Settings → find the site → "Clear data").

### Fire tablet / Silk troubleshooting

On some Amazon Fire tablets, Silk can silently block motion sensors at the browser/site-permission
level even when the page itself loads normally. In that state, the app can still monitor the
microphone, but `devicemotion` never delivers usable samples, so movement alerts will never fire.

If you see the in-app “No motion data detected” warning:

1. Open the site in Silk.
2. Open **Silk Settings → Site Settings → Motion & Orientation Access**.
3. Allow motion access for this site.
4. Reload the page, then tap **Start Monitoring** again.

Notes:

- The iOS-only `DeviceMotionEvent.requestPermission()` prompt does **not** appear on Fire OS /
  Android, so a browser-level block can otherwise fail silently.
- This app does not need a custom `Permissions-Policy` header on GitHub Pages for normal top-level
  use: MDN documents the default allowlist for both `accelerometer` and `gyroscope` as `self`.

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
