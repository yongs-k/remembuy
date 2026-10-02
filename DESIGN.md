---
name: REMEMBUY
description: A quiet household pantry ledger with a small, lit collector's cabinet for the game layer.
colors:
  primary: "#aa3015"
  primary-container: "#cc482b"
  on-primary: "#ffffff"
  secondary: "#48645d"
  secondary-container: "#c7e6dd"
  tertiary: "#825100"
  tertiary-fixed: "#ffddb8"
  tertiary-fixed-dim: "#ffb95f"
  on-tertiary-fixed: "#2a1700"
  surface: "#faf8f5"
  surface-container-lowest: "#ffffff"
  surface-container-low: "#f4f1ec"
  surface-container: "#eeeae4"
  surface-container-high: "#e7e2db"
  surface-container-highest: "#dfd9d1"
  on-surface: "#1d1a17"
  on-surface-variant: "#58504a"
  outline: "#6b5f58"
  outline-variant: "#d8d0c7"
  hairline: "#e6e0d8"
  inverse-surface: "#352f2e"
  inverse-on-surface: "#f9eeec"
  error: "#ba1a1a"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, Noto Sans KR, sans-serif"
    fontSize: "28px"
    fontWeight: 800
    lineHeight: "36px"
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Plus Jakarta Sans, Noto Sans KR, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: "24px"
    letterSpacing: "-0.01em"
  stat:
    fontFamily: "Plus Jakarta Sans, Noto Sans KR, sans-serif"
    fontSize: "24px"
    fontWeight: 800
    lineHeight: "28px"
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  body:
    fontFamily: "Noto Sans, Noto Sans KR, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
    letterSpacing: "-0.01em"
  label:
    fontFamily: "Noto Sans, Noto Sans KR, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: "16px"
    letterSpacing: "0.02em"
  label-sm:
    fontFamily: "Noto Sans, Noto Sans KR, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: "15px"
    letterSpacing: "0.02em"
rounded:
  lg: "12px"
  xl: "16px"
  2xl: "20px"
  full: "9999px"
spacing:
  space-xs: "4px"
  space-sm: "8px"
  space-md: "14px"
  space-lg: "20px"
  space-xl: "28px"
  margin: "16px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.xl}"
    height: "48px"
  button-quiet:
    backgroundColor: "{colors.surface-container-lowest}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    height: "44px"
  button-game:
    backgroundColor: "{colors.tertiary-fixed-dim}"
    textColor: "{colors.on-tertiary-fixed}"
    rounded: "{rounded.xl}"
    height: "44px"
  card:
    backgroundColor: "{colors.surface-container-lowest}"
    rounded: "{rounded.2xl}"
    padding: "14px"
  card-game:
    backgroundColor: "{colors.inverse-surface}"
    textColor: "{colors.inverse-on-surface}"
    rounded: "{rounded.2xl}"
    padding: "20px"
  chip:
    backgroundColor: "{colors.surface-container}"
    textColor: "{colors.on-surface-variant}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    height: "36px"
  chip-selected:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
  input:
    backgroundColor: "{colors.surface-container-low}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: "10px"
---

# Design System: REMEMBUY

## Overview

**Creative North Star: "The Quiet Pantry, with a Collector's Cabinet"**

Most of REMEMBUY is a pantry ledger: warm off-white paper, hairline edges, near-black ink, and one terracotta accent kept for the few things that need a hand on them now. It should feel like a well-kept shelf, not a dashboard. The things that run out soon are the loudest thing on screen, and everything else steps back.

The game layer (points, boxes, the 아이템 수집함) lives in a separate, darker place: a lit cabinet in warm espresso with gold numerals. It appears only in game surfaces: the home game card, the Store and 아이템 수집함 headers, the Store box cards, the box-result sheet and the completion celebration. Game actions (상자 열기, 1개 열기, 아이템 수집함 보기) are gold buttons on that espresso. That contrast is what makes the reward feel like a reward without dragging the utility screens toward a toy look.

This world replaced the Stitch "tactile soft-brutalism" skin on 2026-09-30. The pink surface tint, ink-black 2px rules and zero-blur offset shadows are retired.

**Key Characteristics:**
- Warm-neutral paper surfaces; white cards with a hairline edge and a barely-there shadow.
- A single accent (terracotta) that means "act on this": the primary button and urgent D-days.
- A dark espresso + gold surface reserved for the game layer.
- Each item is identified by its photo, or by its room's icon in that room's color.
- Large page titles, few labels, no icon in front of a heading.

## Colors

The palette is warm neutrals with three accents: terracotta for action, sage for "saved/owned", and gold for the game.

### Primary
- **Kiln Terracotta** (primary): the one action per screen (등록하기, 다시 시도, 구매하기), the selected chip, and urgent D-days. Nothing decorative is ever terracotta.
- **Ember** (primary-container): the brand mark tile and the "추천 순 1위" podium band only.

### Secondary
- **Sage** (secondary): confirmation and ownership, e.g. the 추천해요 state, the collection-rate bar on the record form, and "이미지가 선택됐어요".
- **Mist Sage** (secondary-container): the soft backing of the collection-rate hint.

### Tertiary
- **Cabinet Gold** (tertiary-fixed-dim): points and the box-opening button on the dark game surface. Used only on espresso.
- **Honey** (tertiary-fixed): the assigned rank on podium buttons and the Badge chip.

### Neutral
- **Pantry Paper** (surface): the page background.
- **Card White** (surface-container-lowest): every card and list container.
- **Linen / Oat / Stone** (surface-container-low → highest): input wells, quiet button fills, and ring tracks, in that order of depth.
- **Ink** (on-surface): all primary text.
- **Walnut** (on-surface-variant): secondary text and meta lines.
- **Driftwood** (outline): placeholder text and rank numbers; tuned to stay at or above 4.5:1 on Stone.
- **Hairline** (hairline): the 1px edge on cards, list dividers, and quiet buttons.
- **Espresso** (inverse-surface) / **Cream** (inverse-on-surface): the game cabinet.

Rooms each carry their own muted hue (욕실 #6E8F87, 주방 #C98F2B, 세탁실 #7D93A6, 옷장 #B0472E, 화장대 #A9789A, 침실 #8A8F6E, 거실 #9C8B5E, 현관 #6F7D5C, 상비약함 #B0763F, 차량 #5C7A8B), defined in `src/data/locationColors.ts`. They appear only as the room icon, its 15–20% tinted well, and its progress ring.

**The One Hand Rule.** Terracotta marks what the user should act on now. If two things on a screen are terracotta and only one is urgent, one of them is wrong.

**The Cabinet Rule.** Espresso and gold belong to the game layer only. A utility screen never borrows them for emphasis.

## Typography

**Display Font:** Plus Jakarta Sans (with Noto Sans KR for Hangul)
**Body Font:** Noto Sans (with Noto Sans KR for Hangul)

**Character:** A compact geometric display face for titles and numbers against a neutral humanist body. Hangul always falls through to Noto Sans KR, so Korean text reads as one family.

### Hierarchy
- **Display** (800, 28px, 36px): one per screen. Tab titles (다시 살 상품, 내 장소 랭킹, 컬렉션, 상자), the bell page and home lead "곧 떨어질 상품". Also the Store and 아이템 수집함 headers on espresso.
- **Headline** (700, 18px, 24px): section titles (장소별 도감, 무엇을 기록할까요?) and item names on the podium.
- **Stat** (800, 24px, tabular): points and dex counts on the game surface.
- **Body** (400, 14px, 20px): paragraphs, input text, empty states.
- **Label** (700, 12–14px): buttons, chips, item names in lists, D-days (tabular).
- **Label-sm** (700, 11px): the smallest text allowed; Hangul below 11px stops being legible on phones.

**The No Eyebrow Rule.** Headings carry no icon, kicker, or pill in front of them. Size and weight do the work.

**The 11px Floor Rule.** Nothing ships smaller than label-sm.

## Layout

Mobile-first, one column, 16px side margins. On desktop the whole app is a centered 768px frame with bottom tabs; there is no sidebar.

The home screen is ordered by urgency: the restock list leads, the room grid follows (3 columns on phones, 5 at ≥640px), and the game card closes the page. Lists that belong together render as one card with hairline dividers rather than a stack of separate cards.

Vertical rhythm uses the space scale: 8px inside groups, 14px inside cards, 20px between sections. Screens with a floating add button reserve 96px of bottom padding so the button never covers content.

## Elevation & Depth

Depth is mostly tonal: white cards on paper, wells one step darker than their card. Shadows are an ambient hint, never a structure.

### Shadow Vocabulary
- **Card** (`box-shadow: 0 1px 2px rgba(29,26,23,0.04)`): paired with the 1px hairline border on every resting card.
- **Float** (`box-shadow: 0 10px 28px -8px rgba(29,26,23,0.28)`): things that sit above the page: the floating add button, the game card, bottom sheets.

**The Hairline First Rule.** A card is defined by its hairline edge. Never replace it with a heavier shadow, and never use a zero-blur offset shadow.

## Shapes

Softly rounded rectangles on a three-step scale: 12px for controls and wells, 16px for cards and primary buttons, 20px for lead cards, grouped lists, and the game cabinet. Chips and avatars are full pills. Thumbnails are 12px squares, never circles.

## Components

### Buttons
- **Shape:** gently rounded (16px), 48px tall for the page's primary action, 44px minimum for everything else.
- **Primary:** terracotta fill, white label. One per screen.
- **Quiet:** white or transparent with a hairline border and ink label; hover fills with Linen.
- **Game:** gold fill with dark brown label, only on espresso. Its partner is a transparent button with a 20% cream border.
- **Press:** `active:scale(0.98)`. There are no 3D press shadows.

### Chips
- **Style:** Oat pill, walnut label, 36px tall.
- **State:** selected filter chips on list screens turn terracotta with a white label and expose `aria-pressed`. On forms, selected choice chips are Ink, because the form's submit button holds the screen's one terracotta.
- **Switchers:** chips that switch which room you are looking at (컬렉션 room strip) select in Ink with a paper label, so the screen's one terracotta stays on its action. The same applies to state toggles such as 비추천해요.

### Cards / Containers
- **Corner Style:** 16–20px.
- **Background:** Card White on Pantry Paper.
- **Shadow Strategy:** Card shadow + hairline border (see Elevation).
- **Internal Padding:** 14px; 20px for the game cabinet.
- Cards never nest inside cards. A card's inner blocks are wells (Linen), not cards.

### Inputs / Fields
- **Style:** Linen well, no visible border at rest, 12px radius, Driftwood placeholder.
- **Focus:** a 2px terracotta border.
- Optional or rarely used fields fold behind a native `<details>` ("+ 새 장소 추가", "구매 정보 · 메모 (선택)").

### Navigation
- Bottom tab bar with five tabs (홈 · 랭킹 · 구매 · 상자 · 컬렉션), white with a hairline top edge. The active tab is terracotta and bold. The header bell opens 곧 떨어질 상품 (the full list behind home's top three), where a terracotta dot marks unread items.
- Header icons (bell, settings) turn terracotta with `aria-current="page"` on their own page, and those pages carry a back pill. On phones, home's 기록하기 is a floating button that hides while the purchase toast is showing (same spot) and while the game card passes under it. On wide screens (md+) it is an inline button beside the 곧 떨어질 상품 title instead.
- Vocabulary: 장소 for rooms, 상자 for the box game, 기록하기 for adding an item, 도감 for the real-item collection, 아이템 수집함 for the game's, 추천해요/추천한 상품 for the buy-again signal, 내 1위 for the podium's first place, 다시 샀어요 for recording a repurchase, and 도감 품목 for a standard item in a category.
- Drill-downs (room → category) live in the URL query (`?loc=`, `?cat=`, `?room=`) so the phone's back gesture steps out one level. In-app back pills step back through history.

### Sheets
- Every choice, confirmation or small form that overlays a page is a bottom sheet on the native `<dialog>` (`src/components/Sheet.tsx`). It is Card White (or the espresso cabinet tone for game results), with 20px top corners, the Float shadow, and a 40% black backdrop. Full-screen moments such as the completion celebration use the same native modal (`useModalDialog`).
- Escape and a backdrop tap close it. Focus is trapped while it is open and returns to the opener when it closes.
- The first focus goes to the safe control, marked `data-autofocus`. In a delete confirmation that is 취소, never the destructive button.
- Destructive confirmations use an Error-red (#ba1a1a) full-width button and say what else will be lost. Never use `window.prompt`, `confirm` or `alert`.

### Toasts
- Short confirmations with an undo (e.g. "재구매로 기록했어요 · 되돌리기") sit above the tab bar for 6 seconds, in an `aria-live` region. They are Ink with a paper label and a light-terracotta (`inverse-primary`) action, never espresso and gold, which belong to the game.

### Signature: D-day label
Plain tabular text, never a pill. When urgent (≤7 days, or ≤3 in the home preview) it turns terracotta with a 6px dot in front.

### Signature: Item thumbnail
The product photo when there is one. Otherwise the item's room icon in the room's color on a 15% tint of that color. The generic box glyph appears only when the room is unknown.

### Signature: Room tile
A compact tile: the room's collection-rate ring wraps its icon, with the name and "N개 · P%" underneath.

## Do's and Don'ts

### Do:
- **Do** keep one terracotta action per screen and use terracotta text + dot for urgency.
- **Do** group related rows into one hairline-divided card.
- **Do** give every tappable target at least 44×44px, even when the visible shape is smaller.
- **Do** mark placeholder content with the "예시" SampleTag. Never ship fabricated data unlabeled.
- **Do** keep espresso and gold inside the game layer.

### Don't:
- **Don't** reintroduce the Stitch pink tint (#fff8f6 family), ink 2px rules, or zero-blur offset shadows.
- **Don't** put tinted pills on meta information. Location, category, and D-day are plain text.
- **Don't** put an icon in front of a page or section heading.
- **Don't** use `error-container` pink for urgency. It is reserved for real errors.
- **Don't** swap the fonts or the Material Symbols icon set, and don't add glassmorphism, grain, or decorative imagery.
