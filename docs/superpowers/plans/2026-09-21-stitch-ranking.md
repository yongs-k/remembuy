# Stitch Ranking Page Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the Stitch ranking mockups (`remembuy_4`, `_5`) onto `RankingPage.tsx` — visual only.

**Architecture:** Two small presentational components (`RankRow`, `PodiumItemCard`) plus a JSX-only rewrite of `RankingPage.tsx`. All state, effects, selectors and handlers are copied verbatim.

**Tech Stack:** React + TypeScript + Tailwind; `Icon` helper from `src/data/materialIcons.tsx`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-21-stitch-ranking-design.md`.
- Tailwind: font-size scale classes are `text-display-lg|display-sm|headline-lg|headline-md|body-lg|body-md|body-sm|label-lg|label-md|label-sm|stat-counter`. There is NO `font-<scale>` class — only `font-heading` and `font-body` exist. Never write `font-headline-md`, `font-label-sm`, etc.
- Spacing tokens: `space-xs|sm|md|lg|xl`, `gutter`, `margin` (e.g. `p-space-md`, `gap-space-sm`).
- Icons only via `<Icon name="..." className="..." />`; never raw emoji for new UI.
- `RecommendationBadge`, `Badge`, selectors, routes, and `chunky-*` classes must not be modified.
- `RankingPage` effects (podium POST, global-ranking fetch), `DrillLevel`, `setPodiumRank(item.id, item.categoryId, isAssigned ? null : rank)`, `aria-label={`${rank}등으로 지정`}` and `e.stopPropagation()` on medal buttons stay exactly as they are.
- `npx tsc --noEmit` clean and vitest 50/50 after every task.

## File Structure

```
src/components/RankRow.tsx          # Create: numbered/medal row for levels 1-2
src/components/PodiumItemCard.tsx   # Create: level-3 product card
src/pages/RankingPage.tsx           # Modify: JSX rewrite, logic verbatim
```

---

### Task 1: `RankRow`

**Files:**
- Create: `src/components/RankRow.tsx`

**Interfaces:**
- Produces: `RankRow({ rank, title, subtitle, icon, hero, onClick }: { rank: number; title: string; subtitle: string; icon: string; hero?: boolean; onClick: () => void })`

- [ ] **Step 1: Create the file**

```tsx
import { Icon } from '../data/materialIcons'

const CHIP: Record<number, string> = {
  1: 'bg-tertiary-fixed text-tertiary shadow-[0_2px_0px_#a36700]',
  2: 'bg-surface-container-high text-outline shadow-[0_2px_0px_#8d716a]',
  3: 'bg-tertiary-fixed/40 text-tertiary shadow-[0_2px_0px_#a36700]',
}

export function RankRow({
  rank,
  title,
  subtitle,
  icon,
  hero,
  onClick,
}: {
  rank: number
  title: string
  subtitle: string
  icon: string
  hero?: boolean
  onClick: () => void
}) {
  const chip = CHIP[rank] ?? 'bg-surface-container-high text-outline'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-space-sm rounded-xl bg-surface-container-lowest text-left ${
        hero
          ? 'border-2 border-tertiary/30 p-space-lg shadow-[0_4px_12px_rgba(130,81,0,0.12),0_3px_0px_#eae0de]'
          : 'p-space-md shadow-[0_3px_0px_#eae0de]'
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-heading text-label-lg ${chip}`}
        >
          {rank}위
        </div>
        <div
          className={`flex shrink-0 items-center justify-center rounded-lg bg-surface-container text-on-surface-variant ${
            hero ? 'h-14 w-14' : 'h-12 w-12'
          }`}
        >
          <Icon name={icon} className="text-[24px]" />
        </div>
        <div className="flex min-w-0 flex-col">
          {hero && (
            <span className="text-label-sm uppercase tracking-wider text-tertiary">GOLD DEX</span>
          )}
          <span className="truncate font-heading text-headline-md text-on-surface">{title}</span>
          <span className="text-body-sm text-on-surface-variant">{subtitle}</span>
        </div>
      </div>
      <Icon name="chevron_right" className="text-[20px] text-on-surface-variant" />
    </button>
  )
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit` — expected zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/RankRow.tsx
git commit -m "feat: add RankRow component for ranking list levels"
```

---

### Task 2: `PodiumItemCard`

**Files:**
- Create: `src/components/PodiumItemCard.tsx`

**Interfaces:**
- Consumes: `Icon` (`../data/materialIcons`), `RecommendationBadge`, `Badge`, `Item` (`../types`).
- Produces: `PodiumItemCard({ item, index, onOpen, onAssign }: { item: Item; index: number; onOpen: () => void; onAssign: (rank: 1 | 2 | 3 | null) => void })`. `index` is the 0-based position in the ranked list: 0 = first-place card, 1-2 = medal cards, 3+ = compact.

- [ ] **Step 1: Create the file**

```tsx
import type { Item } from '../types'
import { Icon } from '../data/materialIcons'
import { RecommendationBadge } from './RecommendationBadge'
import { Badge } from './Badge'

const RANK_CHIP = [
  'bg-tertiary text-on-tertiary',
  'bg-secondary text-on-secondary',
  'bg-tertiary-container text-on-tertiary-container',
]

export function PodiumItemCard({
  item,
  index,
  onOpen,
  onAssign,
}: {
  item: Item
  index: number
  onOpen: () => void
  onAssign: (rank: 1 | 2 | 3 | null) => void
}) {
  const isFirst = index === 0
  const compact = index >= 3
  const urgent = item.daysUntilEmpty !== undefined && item.daysUntilEmpty <= 7
  const chip = RANK_CHIP[index] ?? 'bg-surface-container-high text-outline'

  return (
    <div
      onClick={onOpen}
      className={`cursor-pointer overflow-hidden rounded-xl bg-surface-container-lowest ${
        isFirst
          ? 'border-2 border-primary/20 shadow-[0_4px_12px_rgba(170,48,21,0.08),0_3px_0px_rgba(43,38,37,0.1)]'
          : 'shadow-[0_3px_0px_rgba(43,38,37,0.08)]'
      }`}
    >
      {isFirst && (
        <div className="flex items-center gap-1.5 bg-primary-container px-space-md py-1.5 text-on-primary-container">
          <Icon name="workspace_premium" className="text-[18px] text-tertiary-fixed" />
          <span className="text-label-md tracking-wider">1ST PLACE</span>
        </div>
      )}
      <div className={`flex gap-space-md ${compact ? 'p-space-sm' : 'p-space-md'}`}>
        <div
          className={`relative flex shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant ${
            compact ? 'h-12 w-12' : isFirst ? 'h-24 w-20' : 'h-20 w-16'
          }`}
        >
          <Icon name="inventory_2" className="text-[28px]" />
          <span
            className={`absolute left-1 top-1 flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-label-sm ${chip}`}
          >
            {index + 1}
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {item.daysUntilEmpty !== undefined && (
              <span
                className={`flex items-center gap-0.5 rounded px-1.5 py-0.5 text-label-sm ${
                  urgent
                    ? 'bg-error-container text-on-error-container'
                    : 'bg-surface-container-high text-on-surface-variant'
                }`}
              >
                <Icon name="alarm" className="text-[12px]" />
                D-{item.daysUntilEmpty}
                {urgent ? ' 소진임박' : ''}
              </span>
            )}
            {item.podiumRank === 1 && <Badge>다시 살래요</Badge>}
          </div>
          <h3
            className={`truncate font-heading text-on-surface ${
              compact ? 'text-label-lg' : 'text-headline-md'
            }`}
          >
            {item.name}
          </h3>
          {item.recommendation !== undefined && (
            <RecommendationBadge recommendation={item.recommendation} />
          )}
          {!compact && (item.price !== undefined || item.restockCycle) && (
            <p className="text-body-sm text-on-surface-variant">
              {item.restockCycle ? `재구매 주기: ${item.restockCycle}` : ''}
              {item.restockCycle && item.price !== undefined ? ' · ' : ''}
              {item.price !== undefined ? `이전 구매가 ${item.price.toLocaleString()}원` : ''}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-surface-container-high px-space-md py-1.5">
        <span className="text-label-sm text-on-surface-variant">순위 지정</span>
        <div className="flex gap-1.5">
          {([1, 2, 3] as const).map((rank) => {
            const isAssigned = item.podiumRank === rank
            return (
              <button
                key={rank}
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onAssign(isAssigned ? null : rank)
                }}
                className={`flex h-7 w-7 items-center justify-center rounded-full text-label-md ${
                  isAssigned
                    ? 'bg-tertiary-fixed text-tertiary shadow-[0_2px_0px_#a36700]'
                    : 'bg-surface-container-high text-outline'
                }`}
                aria-label={`${rank}등으로 지정`}
              >
                {rank}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit` — expected zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/PodiumItemCard.tsx
git commit -m "feat: add PodiumItemCard component for category ranking"
```

---

### Task 3: `RankingPage` JSX rewrite

**Files:**
- Modify: `src/pages/RankingPage.tsx`

**Interfaces:**
- Consumes: `RankRow` (Task 1), `PodiumItemCard` (Task 2), `Icon`, `LOCATION_MATERIAL_ICON` (`../data/materialIcons`), `getLocationCompletion` (existing selector).

- [ ] **Step 1: Replace the imports block**

Find:

```tsx
import {
  getLocationsRankedByItemCount,
  getCategoriesRankedByItemCount,
  getRankingForCategory,
  getCompletedPodium,
} from '../state/selectors'
import { RecommendationBadge } from '../components/RecommendationBadge'
import { Badge } from '../components/Badge'
import { getDeviceId } from '../lib/deviceId'
```

Replace with:

```tsx
import {
  getLocationsRankedByItemCount,
  getCategoriesRankedByItemCount,
  getRankingForCategory,
  getCompletedPodium,
  getLocationCompletion,
} from '../state/selectors'
import { RankRow } from '../components/RankRow'
import { PodiumItemCard } from '../components/PodiumItemCard'
import { Icon, LOCATION_MATERIAL_ICON } from '../data/materialIcons'
import { getDeviceId } from '../lib/deviceId'
```

- [ ] **Step 2: Add shared pieces above `export default function RankingPage()`**

Insert directly after the `DrillLevel` type:

```tsx
function BackPill({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 self-start rounded-full bg-surface-container px-3 py-1.5 text-label-md text-on-surface-variant"
    >
      <Icon name="arrow_back" className="text-[16px]" />
      {label}
    </button>
  )
}
```

- [ ] **Step 3: Replace the three level renderings**

Everything from `if (drill.level === 'locations') {` to the end of the file is replaced by the following (the two `useEffect` blocks above it stay untouched):

```tsx
  if (drill.level === 'locations') {
    const ranked = getLocationsRankedByItemCount(items, locations)
    const totalItems = ranked.reduce((sum, r) => sum + r.itemCount, 0)
    return (
      <div className="space-y-space-md p-margin">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 rounded-full bg-error-container px-2.5 py-1 text-label-sm text-on-error-container">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            실시간 집계중
          </span>
          <span className="flex items-center gap-1 text-label-sm text-on-surface-variant">
            <Icon name="schedule" className="text-[14px]" />
            매주 월요일 00:00 갱신
          </span>
        </div>
        <div>
          <h1 className="flex items-center gap-1.5 font-heading text-headline-lg text-on-surface">
            명예의 전당 · 도감 랭킹
            <Icon name="workspace_premium" className="text-[22px] text-tertiary" />
          </h1>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            공간별로 가장 많이 채운 도감 순위예요. 총 {totalItems}개 등록됨
          </p>
        </div>
        <ul className="space-y-space-sm">
          {ranked.map(({ location, itemCount }, index) => (
            <li key={location.id}>
              <RankRow
                rank={index + 1}
                hero={index === 0}
                title={location.name}
                subtitle={`${itemCount}개 저장됨 · 완성도 ${getLocationCompletion(items, location.id, categories)}%`}
                icon={LOCATION_MATERIAL_ICON[location.colorToken] ?? 'inventory_2'}
                onClick={() => setDrill({ level: 'categories', locationId: location.id })}
              />
            </li>
          ))}
        </ul>
        <div className="rounded-2xl bg-surface-container p-space-md">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-tertiary-container text-on-tertiary-container shadow-[0_3px_0px_#653e00]">
              <Icon name="verified" className="text-[26px]" />
            </div>
            <div className="flex flex-col">
              <span className="text-label-md text-tertiary">내 랭킹 기여도</span>
              <p className="mt-0.5 text-body-sm text-on-surface">
                실사용 인증한 랭킹 아이템으로 도감 신뢰도 점수 <strong className="text-primary">+45점</strong>을
                획득했어요!
              </p>
            </div>
          </div>
          <div className="mt-space-sm h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
            <div className="h-full rounded-full bg-primary" style={{ width: '65%' }} />
          </div>
          <div className="mt-2 flex items-center justify-between text-label-sm text-on-surface-variant">
            <span className="flex items-center gap-1">
              <Icon name="stars" className="text-[15px] text-primary" />
              랭킹 1위 상품 도감 신규 등록 시
            </span>
            <span className="text-primary">+30P 추가 보너스</span>
          </div>
        </div>
      </div>
    )
  }

  if (drill.level === 'categories') {
    const location = locations.find((l) => l.id === drill.locationId)
    const ranked = getCategoriesRankedByItemCount(items, categories, drill.locationId)
    return (
      <div className="flex flex-col gap-space-md p-margin">
        <BackPill label="장소 목록" onClick={() => setDrill({ level: 'locations' })} />
        <h1 className="font-heading text-headline-lg text-on-surface">{location?.name}</h1>
        <ul className="space-y-space-sm">
          {ranked.map(({ category, itemCount }, index) => (
            <li key={category.id}>
              <RankRow
                rank={index + 1}
                title={category.name}
                subtitle={`${itemCount}개 등록됨`}
                icon="category"
                onClick={() =>
                  setDrill({
                    level: 'products',
                    locationId: drill.locationId,
                    categoryId: category.id,
                  })
                }
              />
            </li>
          ))}
        </ul>
      </div>
    )
  }

  const category = categories.find((c) => c.id === drill.categoryId)
  const ranking = getRankingForCategory(items, drill.categoryId)

  return (
    <div className="flex flex-col gap-space-md p-margin">
      <BackPill
        label="카테고리 목록"
        onClick={() => setDrill({ level: 'categories', locationId: drill.locationId })}
      />
      <h1 className="font-heading text-headline-lg text-on-surface">{category?.name}</h1>

      {ranking.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">이 카테고리에는 기록된 상품이 없습니다.</p>
      ) : (
        <ol className="space-y-space-md">
          {ranking.map((item, index) => (
            <li key={item.id}>
              <PodiumItemCard
                item={item}
                index={index}
                onOpen={() => navigate(`/item/${item.id}`)}
                onAssign={(rank) => setPodiumRank(item.id, item.categoryId, rank)}
              />
            </li>
          ))}
        </ol>
      )}

      <div className="flex items-center justify-between rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-space-md">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-container-highest text-outline">
            <Icon name="add" className="text-[24px]" />
          </div>
          <div className="flex flex-col">
            <span className="text-label-lg text-on-surface">{ranking.length + 1}위 상품 등록하기</span>
            <span className="text-body-sm text-on-surface-variant">
              자주 쓰는 다른 상품을 이 카테고리에 추가해보세요
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/new')}
          className="rounded-lg bg-surface-container-lowest px-3 py-1.5 text-label-sm text-primary shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
        >
          추가
        </button>
      </div>

      <div className="space-y-space-sm rounded-xl bg-surface-container-lowest p-space-md shadow-[0_3px_0px_#eae0de]">
        <h2 className="flex items-center gap-1.5 font-heading text-label-lg text-on-surface">
          <Icon name="public" className="text-[18px] text-secondary" />
          전체 유저 인기 랭킹
        </h2>
        {globalRanking === null ? (
          <p className="text-body-sm text-on-surface-variant">불러오는 중...</p>
        ) : globalRanking.length === 0 ? (
          <p className="text-body-sm text-on-surface-variant">아직 데이터가 부족해요.</p>
        ) : (
          <ol className="space-y-1.5">
            {globalRanking.map((entry, i) => (
              <li
                key={`${entry.masterItemId ?? entry.name}-${i}`}
                className="flex items-center justify-between gap-2 text-body-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-label-md ${
                      i === 0
                        ? 'bg-tertiary-fixed text-tertiary'
                        : 'bg-surface-container-high text-outline'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="truncate text-on-surface">{entry.name}</span>
                </span>
                <span className="shrink-0 text-on-surface-variant">{entry.voters}명 선택</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="sticky bottom-20 z-40 flex items-center gap-space-sm md:bottom-4">
        <button
          type="button"
          onClick={() => navigate('/new')}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-surface-container-lowest p-3 text-label-lg text-on-surface shadow-[0_4px_12px_rgba(0,0,0,0.08),0_3px_0px_rgba(43,38,37,0.12)] active:translate-y-0.5"
        >
          <Icon name="add_box" className="text-[20px] text-primary" />
          아이템 직접등록
        </button>
        <button
          type="button"
          aria-label="바코드 스캔"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary p-3 text-label-lg text-on-primary shadow-[0_4px_12px_rgba(170,48,21,0.25),0_4px_0px_#8b1901] active:translate-y-0.5 active:shadow-[0_1px_0px_#8b1901]"
        >
          <Icon name="barcode_scanner" className="text-[20px]" />
          바코드 찍고 랭킹 등록
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` — expected zero errors (in particular no unused-import errors: `RecommendationBadge` and `Badge` imports were removed from this file).
Run: `npx vitest run` — expected 50/50.

- [ ] **Step 5: Commit**

```bash
git add src/pages/RankingPage.tsx
git commit -m "feat: port RankingPage to Stitch ranking design"
```

---

### Task 4: Verification

**Files:** none (verification only)

- [ ] **Step 1: Automated suite**

Run: `npx tsc --noEmit`, `npx vitest run`, `npm run test:server`, `npm run build`. Expected: all pass (50/50 frontend, 8/8 server).

- [ ] **Step 2: Tailwind class existence check**

Write this script to your scratchpad/temp directory (NOT into the repo), then run it from the repo root:

```js
// check-classes.mjs
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const out = join(tmpdir(), 'check-out.css')
execSync(`npx tailwindcss -c tailwind.config.ts -i src/index.css -o "${out}"`, { stdio: 'ignore' })
const css = readFileSync(out, 'utf8')
const files = ['src/components/RankRow.tsx', 'src/components/PodiumItemCard.tsx', 'src/pages/RankingPage.tsx']
let missing = 0
for (const f of files) {
  const src = readFileSync(f, 'utf8')
  for (const m of src.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
    const text = (m[1] ?? m[2]).replace(/\$\{[^}]*\}/g, ' ')
    for (const tok of text.split(/\s+/).filter(Boolean)) {
      const esc = tok.replace(/[^a-zA-Z0-9_-]/g, (c) => '\\' + c)
      if (!css.includes('.' + esc)) { console.log(`MISSING in ${f}: ${tok}`); missing++ }
    }
  }
}
console.log(missing === 0 ? 'ALL CLASSES OK' : `${missing} missing`)
```

Expected: `ALL CLASSES OK`. Any `MISSING` line is a defect to fix (tokens that are intentionally non-Tailwind marker classes do not appear in these files). Also run `grep -rnE "font-(display|headline|body|label|stat)-" src` — expected no output.

- [ ] **Step 3: Manual walkthrough (`npm run dev`)**

Compare against `remembuy_4` / `_5` screenshots at mobile and tablet widths. Confirm: level 1 → click a location → level 2 → click a category → level 3; medal buttons assign/unassign and the "다시 살래요" badge appears on rank 1; card click opens `/item/:id`; "추가"/"아이템 직접등록" go to `/new`; global ranking shows loading/empty/list; the sticky dock does not hide behind the bottom nav.

- [ ] **Step 4: Commit fixes only if needed.**
