# LAN Dev Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make both REMEMBUY dev processes (Vite frontend on port 7777, Node backend on port 8787) reachable from other devices on the same LAN, so the photo-analysis feature's camera/gallery flow can be manually verified on a real phone.

**Architecture:** Two one-line config changes — Vite's dev server gets `host: true` (binds `0.0.0.0` instead of `localhost`), and the backend's `server.listen()` call gets an explicit `'0.0.0.0'` host argument. No proxy, build, or application-code changes; the existing `/api` proxy still runs entirely on the PC.

**Tech Stack:** Vite dev server config, Node `http.Server.listen()`. No new dependency.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-28-lan-dev-access-design.md`.
- Dev-only change — no change to `npm run build`, `vite preview`, or production behavior.
- No HTTPS, no CI, no firewall/router configuration (environment-specific, left to the user).
- No automated test applies (dev-server host binding isn't exercised by the existing `vitest`/`node:test` suites) — verification is `npx tsc --noEmit` (sanity check that nothing broke) plus a documented manual LAN trace.
- Commit trailer: `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

## File Structure

```
vite.config.ts     # Modify: add host: true to the server block
server/index.js     # Modify: bind listen() to 0.0.0.0 explicitly
```

---

### Task 1: Bind both dev processes to all network interfaces

**Files:**
- Modify: `vite.config.ts`, `server/index.js`

**Interfaces:** None — this task has no exported functions or types; it only changes what network interfaces two existing processes bind to.

- [ ] **Step 1: Add `host: true` to Vite's dev server config**

Find (the entire current `server` block in `vite.config.ts`):

```ts
  server: {
    port: 7777,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
```

Replace with:

```ts
  server: {
    host: true,
    port: 7777,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
```

- [ ] **Step 2: Bind the backend explicitly to `0.0.0.0`**

Find (the bottom of `server/index.js`):

```js
server.listen(PORT, () => {
  console.log(`podium server listening on http://localhost:${PORT}`)
})
```

Replace with:

```js
server.listen(PORT, '0.0.0.0', () => {
  console.log(`podium server listening on http://localhost:${PORT} (and on your LAN IP)`)
})
```

- [ ] **Step 3: Verify nothing broke**

Run: `npx tsc --noEmit` — expected clean (no output). This is a config-only
change with no new types, so a clean type-check plus a successful start
in Step 4 is the extent of automated verification available — there is
no test suite that exercises dev-server host binding (both `vitest run`
and `node --test` run against build/logic output, not against which
network interface a dev server happens to bind).

- [ ] **Step 4: Start both dev servers and confirm they report listening**

Run in one terminal: `npm run dev:server`
Expected output: `podium server listening on http://localhost:8787 (and on your LAN IP)`

Run in another terminal: `npm run dev`
Expected output includes both a `Local:` URL (`http://localhost:7777/`)
and a `Network:` URL (`http://<your-LAN-IP>:7777/`) — Vite prints the
`Network:` line automatically once `host: true` is set; if it's missing,
`host: true` didn't take effect and Step 1 needs re-checking.

- [ ] **Step 5: Manual LAN trace (the spec's actual verification)**

This step is a documented manual check, not an automated one — do it
once both dev servers are confirmed listening (Step 4):

1. On the PC, find its LAN IPv4 address: Windows → `ipconfig` in a
   terminal, look for the active network adapter's "IPv4 Address" line
   (typically `192.168.x.x`).
2. On a phone connected to the **same Wi-Fi network** as the PC, open a
   browser and navigate to `http://<that-IP>:7777`.
3. Confirm the app loads (home screen renders).
4. Tap into the record-options sheet and try "카메라로 촬영" or "사진
   선택" with a real photo — confirm the loading overlay appears, the
   request reaches the backend (visible as activity in the
   `dev:server` terminal, or by the `/new` page ending up prefilled or
   showing the "사진을 분석하지 못했어요." + "직접 입력하기" fallback if
   `GEMINI_API_KEY` isn't set in this environment).
5. If the phone can't reach the PC at all (page doesn't load): this is
   almost always the PC's local firewall blocking inbound connections on
   ports 7777/8787 from LAN peers, not a code problem — out of scope
   for this plan per the spec (environment-specific, left to the user
   to allow those ports through their firewall if needed).

- [ ] **Step 6: Commit**

```bash
git add vite.config.ts server/index.js
git commit -m "feat: bind dev servers to all network interfaces for LAN testing"
```

---

Related: `docs/superpowers/specs/2026-09-28-lan-dev-access-design.md`.
