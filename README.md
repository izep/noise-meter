# Noise Meter

**👉 [Open the app](https://izep.github.io/noise-meter/)**

A simple noise and movement monitor that runs entirely in your browser — no account, no
server, no data leaving your device. Built for a Fire tablet placed in a room, but works on any
phone, tablet, or computer.

## What it does

- Shows a **live graph** of the volume in the room.
- **Flashes the screen** when it gets too loud (default 65 dB, adjustable).
- Keeps **hours of history** of both volume and how many times the limit was exceeded.
- Detects if the tablet has been **picked up or moved**, flashes a different alert, and logs it.
- **Keeps the screen on** the whole time it's monitoring.
- Can be **installed** like a regular app (add to home screen) and works offline once loaded.

## Using it

1. Open **[the app](https://izep.github.io/noise-meter/)** and tap **Start Monitoring**.
2. Allow microphone access (and motion access, if asked) when prompted.
3. Leave it running — the graph updates live, and it'll flash if it gets too loud or gets moved.

Everything you need is in the **Settings** panel:

| Setting                     | What it does                                                      |
| --------------------------- | ----------------------------------------------------------------- |
| Volume alert threshold (dB) | How loud is "too loud" before it flashes. Default 65 dB.          |
| Movement sensitivity        | How sensitive movement detection is. Higher = harder to trigger.  |
| History retention (hours)   | How long volume/violation/movement history is kept.               |
| Calibration offset (dB)     | Tunes the displayed dB reading to match a real meter — see below. |
| Clear history               | Wipes all stored history. Doesn't touch your settings.            |

### Calibrating the dB reading

Phones and tablets don't report a real "dB SPL" reading out of the box, so this app needs a
one-time offset to make the number match reality:

1. Get a reference reading, e.g. install a free sound level meter app on your phone
   ("Decibel X", "Sound Meter", "NIOSH SLM"), or use a dedicated meter if you have one.
2. Put the phone right next to the tablet and start monitoring here.
3. Play a steady sound near both (talking, music, a fan) and compare the two readings.
4. If this app reads lower than the reference, raise the calibration offset by the difference;
   if it reads higher, lower it.

You only need to do this once per tablet.

### Installing on a Fire tablet (or any device)

1. Open the app link above in Silk (or Chrome/Safari/etc).
2. Use the browser menu → **"Add to Home screen"**.
3. Launch it from the home screen icon like any other app.

### Troubleshooting: "No motion data detected"

Some Fire tablets running Silk silently block motion sensors until you allow them for the site.
If you see this warning in the app:

1. Open **Silk Settings → Site Settings → Motion & Orientation Access**.
2. Allow it for this site.
3. Reload the page and tap **Start Monitoring** again.

---

## Development

Svelte 5 + TypeScript + Vite, no backend. `uPlot` for the graph, `idb` for IndexedDB storage,
Vitest + Testing Library for tests, ESLint + Prettier for linting, deployed to GitHub Pages via
GitHub Actions on every push to `main`.

```bash
npm install
npm run dev     # start a local dev server
npm run test    # run the test suite
npm run lint    # ESLint + Prettier check
npm run check   # Svelte + TypeScript type checking
npm run build   # production build
```

Code lives under `src/lib/` (audio, motion, storage, wakelock, settings — each a small,
independently-tested module) and `src/components/` (the Svelte UI), wired together in
`App.svelte`. The Vite `base` path in `vite.config.ts` assumes this repo is deployed at
`/noise-meter/`; override with a `VITE_BASE` env var if deploying elsewhere.
