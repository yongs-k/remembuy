# LAN Dev Access — Design Spec

Date: 2026-09-28

## Purpose

The just-shipped photo-analysis feature (camera capture, gallery picker)
can only be manually verified on a real phone, and REMEMBUY's dev servers
currently only bind to localhost — unreachable from any other device on
the network. This makes both the Vite dev server (`npm run dev`, port
7777) and the backend (`npm run dev:server`, port 8787) reachable from
other devices on the same Wi-Fi/LAN, so a phone can open
`http://<PC-LAN-IP>:7777` and exercise the real camera/file-picker flow
end-to-end against the real backend.

This is deliberately the smallest possible slice of "deployment": no
hosting provider, no build/CI changes, no HTTPS, no domain. Local network
only, dev-server only (not the production `vite preview`/build output).

## Scope

- **In scope:** binding both dev processes to all network interfaces
  (`0.0.0.0`) instead of localhost-only, so a LAN peer can reach them.
- **Out of scope (explicitly):**
  - Any external/cloud hosting.
  - HTTPS/TLS — not needed. `<input type="file" capture="environment">`
    (used by the photo-analysis feature) is a plain form input attribute,
    not the `navigator.mediaDevices.getUserMedia()` API, and does not
    require a secure context. Plain HTTP over LAN works for it.
  - Firewall/router configuration — environment-specific, left to the
    user; this plan only makes the *processes* listen on all interfaces,
    which is necessary but not sufficient if a local firewall blocks the
    ports.
  - Any change to the production build (`npm run build` / `vite preview`)
    or to how the app behaves once actually deployed — this is a dev-only
    convenience change.

## Changes

- **`vite.config.ts`**: add `host: true` to the existing `server` block
  (alongside `port: 7777` and `strictPort: true`). This makes Vite's dev
  server bind `0.0.0.0` instead of `localhost`, and Vite's own terminal
  output then prints the LAN URL(s) automatically alongside the local one
  — no extra code needed to discover the IP.
- **`server/index.js`**: change `server.listen(PORT, () => {...})` to
  `server.listen(PORT, '0.0.0.0', () => {...})`. Node's default (no host
  argument) already binds all interfaces on most platforms, but this
  makes the intent explicit and removes any platform-dependent ambiguity
  — the same reasoning as the plan's other explicit-over-implicit
  choices elsewhere in this codebase.
- No change to Vite's `/api` proxy config — it already forwards to
  `http://localhost:8787` from the Vite dev server's own process (which
  runs on the PC, not the phone), so this keeps working once both
  processes listen on `0.0.0.0`: the phone talks to the PC's Vite server
  over the LAN, and Vite's proxy (running on the PC) talks to the PC's
  own backend on `localhost:8787` as before — no LAN hop needed there.

## Verification

No automated test applies (this is dev-server configuration, not
application code). Verified by manual trace: start both dev servers,
find the PC's LAN IPv4 address (Windows: `ipconfig`, look for the active
adapter's "IPv4 Address" — typically `192.168.x.x`), open
`http://<that-IP>:7777` on a phone connected to the same Wi-Fi, and
confirm the app loads and the photo-analysis camera/gallery flow works
against the real backend.

## Out of Scope (recap)

- Cloud/production hosting of any kind.
- HTTPS, custom domain, CI/CD.
- Firewall/router configuration.
