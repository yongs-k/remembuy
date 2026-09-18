# Stitch Design Port — Home Screen — Design Spec

Date: 2026-09-18

## Purpose

Sub-project 2 of 6 in porting the Google Stitch design export onto
REMEMBUY (see `docs/superpowers/specs/2026-09-18-stitch-foundation-design.md`
for the token foundation this depends on, already shipped). This
sub-project ports the Home screen mockup
(`stitch/.../remembuy_2/code.html` and `screen.png`) onto the app's
existing `AppLayout` shell (header + nav) and `HomePage`'s top-level
(no-location-selected) view — visual only. Drill-down navigation, the
record-options sheet, and all real data bindings are unchanged.

## Why this ports cleanly

`src/data/locations.ts`'s 10 locations match the mockup's 10 category
tiles exactly — same 10 names, same order (욕실, 주방, 세탁실/다용도실,
옷장/드레스룸, 화장대, 침실, 거실, 현관/신발장, 상비약함, 차량). No data
model change is needed; only the per-location Material Symbols icon
mapping and the tile's visual structure change.

## Icon System

New file `src/data/materialIcons.ts`, a small reusable component and a
per-location icon map, replacing emoji everywhere Home currently uses
one. Material Symbols renders as ligature text inside a styled `<span>`:

```tsx
export function Icon({ name, className }: { name: string; className?: string }) {
  return <span className={`material-symbols-outlined ${className ?? ''}`}>{name}</span>
}
```

`LOCATION_MATERIAL_ICON` (keyed by the same `colorToken` as the existing
`LOCATION_EMOJI` map, so both can coexist — `LOCATION_EMOJI` stays for
any not-yet-ported screen that still uses it):

| colorToken | icon name |
|---|---|
| bathroom | bathtub |
| kitchen | soup_kitchen |
| laundry | local_laundry_service |
| closet | checkroom |
| vanity | brush |
| bedroom | bed |
| livingroom | weekend |
| entrance | roller_skating |
| medicine | medication |
| car | directions_car |

Other icons used on Home, referenced directly by name where used (no
map needed — one-off usages): `token` (brand mark), `notifications`,
`person`, `star`, `auto_awesome`, `expand_more`, `tune`, `water_drop`
(quest), `redeem`/`check_circle` (claim button), `stars` (reward pill),
`search`, `qr_code_scanner`, `chevron_right`, `add`, and nav icons
`cottage`/`leaderboard`/`local_fire_department`/`groups_2`/`menu_book`.

## Component-by-component port

**`AppLayout.tsx`** (header + sidebar + bottom nav — shared shell, so
this also affects every other page, acceptable since the new tokens are
additive and this is the intended first visual touch-point):
- Header: brand mark becomes a small rounded-square icon badge
  (`bg-primary-container text-on-primary-container`, `token` icon) next
  to the "REMEMBUY" wordmark (now `text-primary`, using the new
  `headline-md` type scale). Notification bell becomes the `notifications`
  icon with the existing unread-dot logic unchanged, now `bg-primary`.
  Avatar/profile icon becomes a `bg-primary` circle with a `person` icon.
- Sidebar nav items (tablet+) and bottom nav items (mobile) get the
  Material Symbols icon set above in place of the current emoji, and
  active/inactive colors move to `text-primary`/`text-on-surface-variant`
  (replacing `text-stamp`/`text-ink/60`).
- Structural positioning (fixed bottom bar on mobile, `hidden md:flex`
  sidebar, the tablet-width cap) is UNCHANGED — only colors, icons, and
  the chunky-vs-new-shadow treatment on active states change.

**`HomeProfileCard.tsx`** — rebuilt to match the mockup's card:
avatar circle (`bg-secondary`) with a small `star`-icon badge at its
corner, name + a pill "title" button (`bg-secondary-container/60`,
`auto_awesome` icon, `expand_more` caret) replacing the current plain
`Badge`, and the 4-stat grid gets a nested `bg-surface-container-low`
background strip with per-stat colors (기록 상품 → `text-primary`, 누적
절약 → `text-secondary`, 포인트 → `text-tertiary` with a `monetization_on`
icon, 칭호 → `text-on-surface`). Card container:
`bg-surface-container-lowest rounded-xl shadow-[0_4px_0px_#eae0de]`.

**`QuestCarousel.tsx`** — each card gets: an icon chip
(`bg-secondary-container text-secondary`, `water_drop` or similar per
quest), a "도감 완성!" tag when complete, a gradient progress bar
(`bg-gradient-to-r from-secondary to-primary-container`) replacing the
flat `bg-stamp` bar, a reward pill (`bg-tertiary-fixed`, `stars` icon),
and the claim button restyled to the mockup's tactile press button
(`bg-primary` → `active:translate-y-0.5` + shadow swap, `redeem` icon,
label "보상받기"). Dot pagination becomes an active-dot-is-a-pill shape
(`w-4 h-1.5` vs `w-1.5 h-1.5`) matching the mockup, using the carousel's
existing `activeIndex` state — no new state needed.

**`HomePage.tsx`** top-level view:
- Search bar: pill container (`bg-surface-container-lowest rounded-xl
  shadow-[0_3px_0px_#eae0de]`) with a leading `search` icon and a
  trailing barcode-scan button (`qr_code_scanner` icon) — the scan
  button is visual-only (no real barcode scanning; clicking it does
  nothing, consistent with this app's established pattern for
  not-yet-built input methods, same as the home record-sheet's camera/
  photo options).
- Location grid: changes from the current 3-column plain icon grid to a
  2-column grid of richer tiles (each `h-[126px]`, icon chip top-left,
  donut percent-ring top-right, name + count below) — this REPLACES
  `LocationIcon`'s usage on this specific grid with a new, more detailed
  tile that still calls the same `onClick={() => setSelectedLocationId(...)}`
  handler and reads the same `getLocationCompletion` percent. `LocationIcon`
  itself is left unchanged (still used by `CollectionPage`, out of scope
  for this sub-project) — a new component, `HomeLocationTile.tsx`, is
  added specifically for this richer Home-only presentation, to avoid
  turning `LocationIcon` into an overloaded two-shapes-in-one component.
- Floating action button: becomes a pill (`bg-primary rounded-full`,
  `add` icon in a small circle + "물품 등록" label), tactile press shadow.
  Its `onClick` still opens the existing record-options sheet — the
  sheet's own visual restyle (colors/icons for the 4 options) happens in
  this same task, since it's part of the same interactive surface, using
  the new tokens (`bg-surface-container-lowest`, Material icons for
  camera/photo/link/manual: `photo_camera`, `image`, `link`,
  `edit_note`).

## Explicitly unchanged

- All routing, state, click handlers, data reads/writes (`useLocker()`,
  `getLocationCompletion`, `setSelectedLocationId`, etc.).
- The record-options sheet's flow (4 options → link-analysis sub-flow →
  `/new` navigation) — only its visual presentation changes.
- Any other page's rendering (Ranking, Purchase, Notifications, Item
  Detail, New Item, Collection, Family) — those are sub-projects 3-6.
- The `chunky-*` classes remain defined in `src/index.css` and are simply
  no longer referenced by the files this sub-project touches — they stay
  in place for the not-yet-ported pages.

## Testing

No automated test — pure visual/markup port, consistent with this
codebase's precedent for page/shell-level components. Verification:
`tsc --noEmit` clean, all 50 existing tests passing unchanged (none
render `AppLayout`/`HomePage`/`HomeProfileCard`/`QuestCarousel`), and a
manual visual comparison against `remembuy_2/screen.png` at both mobile
and tablet+ widths, confirming every existing interaction (drill-down,
record sheet, search) still works exactly as before.

## Out of Scope (explicitly)

- Sub-projects 3-6 (Ranking/Collection family, Purchase, New Item, and
  the remaining pages).
- Real barcode scanning, real avatar upload/editing, real title-badge
  switching (the `expand_more` caret is decorative, same as today's `▾`).
- Removing `LocationIcon`, `LOCATION_EMOJI`, or any token/class used by
  not-yet-ported pages.
