# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: the person who keeps a household stocked with consumables (typically 20s–40s), across 욕실 / 주방 / 세탁실 / 옷장. Their job is to restock before things run out and to remember which of the products they have tried is worth buying again.

## Product Purpose

REMEMBUY records the consumables a household uses: where each lives, whether it's worth rebuying (추천/비추천), where it was bought, and how often it runs out. It then reminds the user when to restock. Success means the user logs real purchases often and without being pushed, and restocks on time without having to remember.

## Positioning

The act of recording is the game, and the records feed the AI. Logging items powers the gamification layer (points from slot claims, boxes, the 도감 collection). That same data (`recommendation`, `place`, `restockCycle`, `note`, restock timestamps) becomes the training ground for a personalized consumption AI. The roadmap runs rule-based restock nudges first, then observed-cadence statistics, then learned or conversational recommendation (`docs/product-roadmap.md`). Fun and data collection must be the same action, never two competing goals.

## Operating Context

- Mobile-first responsive web app (React 18 + Vite + Tailwind, react-router). Express-style game server in `server/`.
- Information structure: 장소 (Location) → 카테고리 → 상품 (Item). Four default locations: 욕실, 주방, 세탁실, 옷장.
- Current routes: 홈 `/`, item detail `/item/:id`, 랭킹 `/ranking`, 알림 `/notifications`, 구매 `/purchase`, 새로 기록 `/new`, 컬렉션 `/collection`, 상점 `/store`, 도감 `/dex`, admin `/admin`.
- Restock loop: restock-cycle due dates merge into 알림, the 재구매함 reset lives on 알림 and item detail, and adding an item can use Gemini-backed product image search.

## Terminology

- **도감** always means the real-consumable collection: standard items per room/category, its 수집률, and the 컬렉션 tab.
- **아이템 수집함** (`/dex`) is the game's virtual-item collection filled by box fragments. Never call it 도감 in the UI.

## Capabilities and Constraints

- **Registration pays no reward.** Points come only from slot claims. Never build a registration-reward path.
- **The Stitch PRD is reference-only.** Vision features with no backing API (3D room placement, house tiers, gacha pulls, social room tours, receipt OCR, commerce deep-links or auto-refill, group-buy) are out of scope until a backing API exists.
- Preference signal is binary: `Item.recommendation` ('recommend' | 'notRecommend') replaced the 1–5 star rating.
- Storage (decided 2026-10-01): records live in a server DB keyed by the device ID (`lockers` table, `/api/locker`), with localStorage as the offline copy. There is no login yet, so a device whose storage is cleared gets a new ID and can't reach its old records until a recovery path exists.
- Reminders (decided 2026-10-01): until the app is complete, restock nudges appear only in-app (the header bell → 만료 임박 제품). No push notifications yet.
- Undecided: whether the UI stays Korean-only; whether the share feed returns (it has no route today).

## Evidence on Hand

- Specs: `REMEMBUY_스펙_안티그래비티용.md` (original MVP spec) and `docs/product-roadmap.md` (the AI vision).
- Stitch mockups: `stitch/stitch_remembuy_gamified_purchase_tracker/` (reference only).
- Data today is seed data (`src/data/seedItems.ts`). 가족 케어 was removed on 2026-09-30 until family sharing has a backend. There are no real users, testimonials, metrics, or affiliate partnerships. Do not fabricate any.

## Product Principles

1. Logging should feel like play. Every record earns progress in the game layer (except raw registration rewards, see above).
2. Every feature should both be useful now and produce data the future AI will need.
3. Rules before models: ship the simplest nudge that works, then refine it with observed data.
4. Build what the backend actually supports. The PRD is a horizon, not a checklist.
5. Remembering for the user is the core value. Restock timing and "다시 살 제품" come before anything else.
