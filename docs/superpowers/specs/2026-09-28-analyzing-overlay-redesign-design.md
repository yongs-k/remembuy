# Analyzing Overlay Redesign — Design Spec

Date: 2026-09-28

## Purpose

User feedback after real-device testing of the photo-analysis feature
(LAN access, this same day): the "분석 중" loading screen works but
should feel more "화려하게" (visually rich). The current
`AnalyzingOverlay` (`src/components/AnalyzingOverlay.tsx`) has plenty of
*content* — an "AI 도감 스캐너 V2.4" badge, a mode pill, a source-info
card, a 4-step checklist card with a progress bar hardcoded to a static
70% width, and a tip card — but nothing actually moves. The bar and
steps are permanently frozen decoration, not tied to real request
progress (there is no real progress to track — the underlying fetch is
a single opaque network call).

Explored via the visual-companion brainstorming tool (three initial
style directions, then two refinement rounds); the user picked and
refined one specific direction. This plan replaces the component's
visual design outright — it does not add motion to the existing layout,
it swaps the layout.

## Design

**Overall look:** a dark, full-viewport screen (background `#1e1512`,
one of this app's existing token-adjacent dark tones) replacing today's
light "AI 도감 스캐너" card layout entirely.

**Center: an animated "scanner" ring.**
- A soft radial glow (`radial-gradient`, warm tertiary-family color)
  pulses behind everything via a `scale`+`opacity` CSS animation.
- A ring made of a partial gradient border (`border-top`/`border-right`
  colored, rest transparent) spins continuously.
- Inside the ring, a circular clipped "icon stage": four Material
  Symbols icons representing household products — `soap`,
  `dry_cleaning`, `cleaning_services`, `local_pharmacy` (all valid names
  in the Material Symbols Outlined set this app's `Icon` component
  already wraps, so no new icon dependency) — cross-fade through in a
  loop, each one scaling/rotating slightly in and out (this directly
  answers the user's "여러 제품들이 순차적으로 보이면 좋겠다" request:
  the scanner appears to be examining a sequence of different products,
  not one static camera glyph).
- Layered over the icon stage, inside the same circular clip: a thin
  glowing horizontal bar sweeps top→bottom→top on a continuous loop
  (the "scan line"), plus a faint repeating horizontal-line texture
  (a "sensor grid") behind it — together giving the barcode/document-
  scanner impression the user asked for in the follow-up round.

**Below the ring:**
- A large gradient-text percentage number, animated counting/cycling
  continuously (0→99→0-ish loop) — purely decorative, exactly as
  decorative as today's static "70%" (there is still no real progress
  signal to bind to; this plan does not add one).
- A one-line status label that cycles through 4 phrases every ~1.2s
  each: "비슷한 상품 탐색 중…", "카테고리 후보 비교 중…", "가장 근접한
  상품 확정 중…", "소진 주기 계산 중…" (Korean, matching this app's
  existing copy voice).
- The cancel button (the only interactive element carried over from
  today's design), restyled for the dark background but functionally
  identical — still calls the existing `onCancel` prop, still
  keyboard-accessible (the component's existing `Escape`-key handler in
  a `useEffect` is unchanged).

**All motion is pure CSS `@keyframes`** — no new JS timers, no new
component state. The component remains a simple, stateless functional
component; every animation loops indefinitely on its own via CSS,
independent of the real fetch's actual duration (same "decorative, not
data-driven" nature as today's static bar — this plan changes how
convincing the decoration looks, not its relationship to real progress).

## Interface changes

`AnalyzingOverlay`'s props shrink. Today's signature:

```ts
{
  sourceLabel: string
  entryNumber: number
  onCancel: () => void
  icon?: string
  dialogLabel?: string
}
```

New signature:

```ts
{
  onCancel: () => void
  dialogLabel?: string // default '분석 중' — used only for aria-label, never rendered visibly
}
```

`sourceLabel`, `entryNumber`, and `icon` are dropped — per this plan's
scope decision, the source-info card (which showed the pasted URL or
photo filename) and the numbered "INDEX #003" chip are removed as part
of simplifying everything except the cancel button. `dialogLabel` is
kept only as the modal's `aria-label` (for screen readers); it is never
shown as visible text in the new design, unlike today where it appeared
in the header area implicitly via the dialog's purpose.

**Call-site changes in `src/pages/HomePage.tsx`:** both `<AnalyzingOverlay>`
usages (the link-analysis flow and the photo-analysis flow) drop their
`sourceLabel`/`icon` props. The `dialogLabel` prop stays for each
(`'링크 분석 중'` / `'사진 분석 중'`, matching today's values) since it's
still useful as an aria-label distinguishing the two flows for
accessibility, even though neither is shown as visible text anymore.

## Out of Scope (explicitly)

- Any change to the actual analyze request/response flow, `HomePage.tsx`'s
  `handleAnalyzeLink`/`handlePhotoFile` logic, error handling, or the
  `analyzeError` fallback UI — this plan is the loading *screen* only.
- Real progress tracking (e.g. server-sent events, polling, or breaking
  the single fetch into observable stages) — explicitly out of scope;
  the percentage and status label are decorative, as they always have
  been.
- Any change to `src/lib/imageResize.ts`, the backend routes, or
  anything upstream/downstream of when this overlay is shown/hidden.

## Testing

No automated test exists for `AnalyzingOverlay.tsx` today (confirmed
absent from `src/components/*.test.tsx`), consistent with this
codebase's established precedent of not unit-testing this class of
presentational component with CSS-animation-driven visuals. Verified
by `npx tsc --noEmit` (prop-shape correctness at both call sites) plus
a manual trace: trigger both the link-analysis and photo-analysis flows
in the running dev app and visually confirm the ring, icon cycling,
scan line, percentage, and label all animate, and that Escape / the
cancel button still correctly abort the in-flight request exactly as
before.
