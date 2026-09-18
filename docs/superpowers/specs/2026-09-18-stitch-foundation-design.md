# Stitch Design System — Foundation — Design Spec

Date: 2026-09-18

## Purpose

The user provided a full UI/UX design export from Google Stitch
(`D:\remembuy\stitch\stitch_remembuy_gamified_purchase_tracker\...`) — a
Material-3-flavored "tactile game deck" design system (see its
`remembuy_tactile_inventory_system/DESIGN.md`), plus ~13 exported
per-screen mockups (`code.html` + `screen.png` pairs). The user wants
each screen reproduced near-identically. That is too large for one
plan — it is decomposed into sub-projects, confirmed with the user:

1. **Foundation** (this spec) — color/typography/spacing tokens, fonts,
   and the Material Symbols icon system every later screen depends on.
2. Home screen (`remembuy_2`)
3. Ranking/Collection screen family (`remembuy_1`, `remembuy_3`,
   `remembuy_4`, `_4`, `_5`)
4. Purchase/deals screen (`remembuy_5`)
5. New-item registration screens (`remembuy_6`, `_3`, `ai`)
6. Remaining pages (Notifications, Item Detail, Family) — adapted to the
   new tokens without a dedicated mockup

This spec covers only #1. It must not visually break any existing page,
since sub-projects 2-6 will land over several later sessions/turns and
the app must keep looking coherent in the meantime.

## Scope: purely additive

- **Add** the full Material 3 color token set, the Stitch typography
  scale, and the Stitch spacing scale to `tailwind.config.ts` — these
  are new token names (e.g. `primary`, `on-surface`, `text-headline-lg`,
  `p-space-md`) that don't collide with anything existing.
- **Repoint** (not add) the existing `heading`/`body` `fontFamily` tokens
  to the new fonts (Plus Jakarta Sans / Noto Sans) and update the Google
  Fonts `<link>` in `index.html` accordingly. Every existing `h1`/`h2`/
  `h3` and body text across the whole app already goes through these two
  tokens (`src/index.css`'s `h1, h2, h3 { @apply font-heading }` and
  `body { @apply font-body }`), so this one small change re-skins all
  existing typography app-wide with zero per-page edits — the single
  highest-leverage, lowest-risk change in this spec.
- **Add** the Material Symbols Google Fonts stylesheet link to
  `index.html`, available for later per-page icon swaps (emoji →
  `<span class="material-symbols-outlined">icon_name</span>`). No emoji
  are replaced in this sub-project — that's per-screen work in #2-6.
- **Add** four generic elevation `boxShadow` tokens
  (`elevation-1`..`elevation-4`) matching `DESIGN.md`'s Level 1-4
  descriptions, as a sensible default for later pages that don't have a
  bespoke Stitch mockup (sub-project 6). Pages WITH a mockup will mostly
  use Tailwind arbitrary-value shadows (`shadow-[0_3px_0px_#8b1901]`)
  copied from their `code.html` for pixel fidelity, since the real
  designs key each shadow's color to that specific element's own
  background — a handful of reusable tokens can't capture that.

## Explicitly NOT touched in this sub-project

- **`paper`/`card`/`ink`/`stamp`/`accent`/`warn`** (the current color
  tokens) and the **`chunky-card`/`chunky-btn`/`chunky-input`** component
  classes stay exactly as they are. Every existing page still renders
  correctly through this sub-project and the next several, until each
  page's own migration task ports it to the new Material tokens.
- **Tailwind's default `borderRadius` scale is NOT overridden.** The
  Stitch `code.html` files redefine `rounded-lg`/`rounded-xl` to smaller
  values (8px/12px) than Tailwind's own defaults (32px/12px — Tailwind's
  actual defaults are `lg: 0.5rem`/`xl: 0.75rem`, closer than it sounds,
  but still a global redefinition risk). Overriding this globally now
  would shift the rounding of every already-shipped card/button/input in
  the app before those pages are migrated. Later per-screen tasks that
  need a specific radius from a `code.html` file use an arbitrary value
  (`rounded-[0.5rem]`) instead of relying on a redefined default.
- **No emoji-to-icon-font swap anywhere yet** — purely per-page work for
  sub-projects 2-6.
- **No new pages, routes, or data-model fields** — this is styling
  infrastructure only.

## Exact additions

**`tailwind.config.ts`** — inside `theme.extend`:

- `colors`: add all Material 3 roles from `DESIGN.md`'s frontmatter
  (`surface`, `surface-dim`, `surface-bright`, `surface-container-lowest`,
  `surface-container-low`, `surface-container`, `surface-container-high`,
  `surface-container-highest`, `on-surface`, `on-surface-variant`,
  `inverse-surface`, `inverse-on-surface`, `outline`, `outline-variant`,
  `surface-tint`, `primary`, `on-primary`, `primary-container`,
  `on-primary-container`, `inverse-primary`, `secondary`, `on-secondary`,
  `secondary-container`, `on-secondary-container`, `tertiary`,
  `on-tertiary`, `tertiary-container`, `on-tertiary-container`, `error`,
  `on-error`, `error-container`, `on-error-container`, `primary-fixed`,
  `primary-fixed-dim`, `on-primary-fixed`, `on-primary-fixed-variant`,
  `secondary-fixed`, `secondary-fixed-dim`, `on-secondary-fixed`,
  `on-secondary-fixed-variant`, `tertiary-fixed`, `tertiary-fixed-dim`,
  `on-tertiary-fixed`, `on-tertiary-fixed-variant`, `background`,
  `on-background`, `surface-variant`) — exact hex values from
  `DESIGN.md`'s frontmatter, added as a NEW nested-key-free flat object
  (Tailwind color keys use literal hyphenated strings, e.g.
  `"on-surface": '#1f1b1a'`), alongside (not replacing) the existing
  `paper`/`card`/`ink`/`stamp`/`accent`/`warn`/`loc` block.
- `fontFamily`: change `heading` from `['"Gowun Batang"', 'serif']` to
  `['"Plus Jakarta Sans"', 'sans-serif']`, and `body` from
  `['"IBM Plex Sans KR"', 'sans-serif']` to
  `['"Noto Sans"', 'sans-serif']`.
- `fontSize`: add the 11 Stitch type-scale entries (`display-lg`,
  `display-sm`, `headline-lg`, `headline-md`, `body-lg`, `body-md`,
  `body-sm`, `label-lg`, `label-md`, `label-sm`, `stat-counter`), each
  with the `[size, { lineHeight, letterSpacing, fontWeight }]` tuple from
  `DESIGN.md`.
- `spacing`: add `gutter` (0.75rem), `gutter-mobile` (0.5rem), `margin`
  (1rem), `margin-mobile` (1rem), `space-xs` (0.25rem), `space-sm`
  (0.5rem), `space-md` (0.875rem), `space-lg` (1.25rem), `space-xl`
  (1.75rem).
- `boxShadow`: add `elevation-1` (`0px 3px 0px rgba(43,38,37,0.08)`),
  `elevation-2` (`0px 4px 0px #1E3A34`), `elevation-3`
  (`0px 4px 0px #A3361E`), `elevation-4`
  (`0px 12px 24px -4px rgba(30,58,52,0.12), 0px 4px 0px #1E3A34`) —
  alongside (not replacing) the existing `chunky` shadow token.

**`index.html`**:

- Add a `<link>` for `Plus+Jakarta+Sans:wght@700;800` and
  `Noto+Sans:wght@400;500;700` (replacing the Gowun Batang / IBM Plex
  Sans KR link — the old fonts are dropped entirely since nothing will
  reference them once `fontFamily.heading`/`body` are repointed).
- Add a separate `<link>` for the Material Symbols Outlined font
  (`family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200`),
  matching the exact URL used across the Stitch `code.html` exports.

## Testing

No automated test — this is a Tailwind config + `index.html` change with
no logic. Verification is: `npx tsc --noEmit` clean, `npx vitest run`
all 50 tests passing unchanged (nothing here touches test-covered code),
`npm run build` succeeds, and a manual visual check that every existing
page still renders with its current look (chunky borders/shadows intact)
— only the heading/body font faces should visibly change app-wide.

## Out of Scope (explicitly)

- Sub-projects 2-6 (per-screen rebuilds) — separate specs/plans, to
  follow this one.
- Removing the old `paper`/`card`/`ink`/`stamp`/`accent`/`warn` tokens or
  the `chunky-*` classes — happens only once every page has migrated off
  them (a final cleanup task after sub-project 6, not scheduled yet).
- Any new feature depicted in the Stitch mockups (achievement badges, XP
  leveling, barcode scanning, AI photo-scan analysis, real-time group-buy
  parties) — those are new features layered on top of the visual system,
  decided screen-by-screen in sub-projects 2-6, likely as further
  visual-only mockups consistent with this app's established pattern
  (e.g. the home gamification mockup, the purchase-tab mockup) unless the
  user asks for real backend logic behind them.
