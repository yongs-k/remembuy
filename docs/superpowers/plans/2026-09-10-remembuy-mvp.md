# REMEMBUY MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the REMEMBUY MVP — a local-only (localStorage) React web app for tracking household consumables by location/category, ranking favorites, getting restock alerts, browsing a dummy share feed, viewing dummy family lockers, and a gamified "collection completion" screen with circular progress gauges.

**Architecture:** Vite + React + TypeScript SPA, no backend. A single global `LockerContext` (React Context + `useReducer`) holds all user items and syncs to `localStorage` via a custom hook. Pure selector functions compute derived data (rankings, notifications, completion %). `react-router-dom` provides 8 routes rendered inside a shared layout with a bottom tab bar. Tailwind CSS implements the kraft-paper/index-card design tokens from the spec.

**Tech Stack:** Vite, React 18, TypeScript, Tailwind CSS, react-router-dom, Vitest + @testing-library/react (for logic/component unit tests), manual browser verification for full-page flows.

## Global Constraints

- Dev server MUST run on fixed port `7777` (`vite.config.ts` → `server.port: 7777`).
- No backend/server calls anywhere — all data is localStorage or in-memory dummy datasets.
- Design tokens (exact hex values) from the spec, applied via Tailwind theme, not ad-hoc classes:
  - background `#E9DFC3`, card `#F8F2E2`, text `#2A2420`, accent-stamp `#B0472E`, accent-secondary `#3F6459`, warning/d-day `#B9822C`
  - location colors: bathroom `#6E8F87`, kitchen `#C98F2B`, laundry `#7D93A6`, closet `#B0472E`, vanity `#A9789A`, bedroom `#8A8F6E`, livingroom `#9C8B5E`, entrance `#6F7D5C`, medicine `#B0763F`, car `#5C7A8B`
  - fonts: headings `Gowun Batang`, body `IBM Plex Sans KR` (Google Fonts)
- `rating` and `daysUntilEmpty` on an `Item` are mutually exclusive — never set both.
- `masterItemId` links an `Item` to a category's standard-item checklist; items without a match don't count toward completion.
- 9 default locations, each with the categories and master-item checklists defined in the design doc (`docs/superpowers/specs/2026-09-10-remembuy-mvp-design.md`).

---

## File Structure

```
remembuy/
  package.json
  tsconfig.json
  vite.config.ts
  tailwind.config.ts
  postcss.config.js
  index.html
  src/
    main.tsx
    App.tsx
    index.css
    types.ts
    data/
      locations.ts          # LOCATIONS + CATEGORIES (with masterItems) seed definitions
      locations.test.ts
      seedItems.ts           # seed Item[] for first run
      seedItems.test.ts
      feedData.ts            # dummy 공유 피드 posts
      familyData.ts          # dummy 가족 locker summaries
    hooks/
      useLocalStorage.ts
      useLocalStorage.test.ts
    state/
      LockerContext.tsx      # context + reducer + provider + useLocker hook (items + user-editable locations/categories)
      LockerContext.test.tsx
      selectors.ts           # completion %, missing items, ranking, notifications
      selectors.test.ts
    components/
      ProgressRing.tsx
      ProgressRing.test.tsx
      LocationIcon.tsx
      ItemCard.tsx
      RatingStars.tsx
      Badge.tsx
      AppLayout.tsx
    pages/
      HomePage.tsx
      ItemDetailPage.tsx
      RankingPage.tsx
      NotificationsPage.tsx
      FeedPage.tsx
      FamilyPage.tsx
      NewItemPage.tsx
      CollectionPage.tsx
```

---

### Task 1: Project scaffold, Tailwind theme, fonts, fixed port

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/index.css`
- Create: `.gitignore`

**Interfaces:**
- Produces: Tailwind theme tokens usable as `bg-paper`, `bg-card`, `text-ink`, `text-stamp`, `bg-stamp`, `text-accent`, `bg-accent`, `text-warn`, `bg-warn`, and `bg-loc-<name>`/`text-loc-<name>` for each of the 9 locations. Also produces `font-heading` (Gowun Batang) and `font-body` (IBM Plex Sans KR).
- Produces: dev server fixed at `http://localhost:7777`.
- Consumes: nothing (first task).

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "remembuy",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.8",
    "@testing-library/react": "^16.0.0",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.19",
    "jsdom": "^24.1.1",
    "postcss": "^8.4.40",
    "tailwindcss": "^3.4.7",
    "typescript": "^5.5.4",
    "vite": "^5.3.4",
    "vitest": "^2.0.5"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 3: Create `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 4: Create `vite.config.ts`**

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 7777,
    strictPort: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
  },
})
```

- [ ] **Step 5: Create `tailwind.config.ts`**

```ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#E9DFC3',
        card: '#F8F2E2',
        ink: '#2A2420',
        stamp: '#B0472E',
        accent: '#3F6459',
        warn: '#B9822C',
        loc: {
          bathroom: '#6E8F87',
          kitchen: '#C98F2B',
          laundry: '#7D93A6',
          closet: '#B0472E',
          vanity: '#A9789A',
          bedroom: '#8A8F6E',
          livingroom: '#9C8B5E',
          entrance: '#6F7D5C',
          medicine: '#B0763F',
          car: '#5C7A8B',
        },
      },
      fontFamily: {
        heading: ['"Gowun Batang"', 'serif'],
        body: ['"IBM Plex Sans KR"', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
```

- [ ] **Step 6: Create `postcss.config.js`**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 7: Create `index.html`**

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>REMEMBUY</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&family=IBM+Plex+Sans+KR:wght@400;500;600&display=swap"
      rel="stylesheet"
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 8: Create `src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-paper text-ink font-body;
}

h1, h2, h3 {
  @apply font-heading;
}
```

- [ ] **Step 9: Create `src/main.tsx`**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
```

- [ ] **Step 10: Create placeholder `src/App.tsx`** (real routing added in Task 8)

```tsx
export default function App() {
  return (
    <div className="p-4">
      <h1 className="text-2xl">REMEMBUY</h1>
    </div>
  )
}
```

- [ ] **Step 11: Create `.gitignore`**

```
node_modules
dist
.DS_Store
```

- [ ] **Step 12: Install dependencies and verify dev server**

Run: `npm install`
Run: `npm run dev`
Expected: Terminal prints `http://localhost:7777/`. Open it in a browser and confirm the page shows "REMEMBUY" styled with the paper background and serif heading font.

- [ ] **Step 13: Commit**

```bash
git add package.json tsconfig.json tsconfig.node.json vite.config.ts tailwind.config.ts postcss.config.js index.html src/main.tsx src/App.tsx src/index.css .gitignore package-lock.json
git commit -m "chore: scaffold Vite+React+TS+Tailwind app on fixed port 7777"
```

---

### Task 2: Core types

**Files:**
- Create: `src/types.ts`

**Interfaces:**
- Produces: `Location`, `MasterItem`, `Category`, `Item`, `FeedPost`, `FamilyMember` types used by every later task.
- Consumes: nothing.

- [ ] **Step 1: Write `src/types.ts`**

```ts
export type Location = {
  id: string
  name: string
  colorToken: string // key into tailwind `loc` palette, e.g. "bathroom"
}

export type MasterItem = {
  id: string
  name: string
}

export type Category = {
  id: string
  locationId: string
  name: string
  masterItems: MasterItem[]
}

export type Item = {
  id: string
  name: string
  locationId: string
  categoryId: string
  masterItemId?: string
  note?: string
  rating?: number // 1-5, mutually exclusive with daysUntilEmpty
  daysUntilEmpty?: number
  place?: string
  restockCycle?: string | null
  affiliateUrl?: string | null
  createdAt: string
}

export type FeedPost = {
  id: string
  nickname: string
  itemName: string
  rating: number
  comment: string
  locationId: string
  categoryId: string
}

export type FamilyMember = {
  id: string
  name: string
  relation: string
  items: Array<{ itemName: string; daysUntilEmpty: number }>
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add core domain types"
```

---

### Task 3: Location/category/master-item seed data

**Files:**
- Create: `src/data/locations.ts`
- Test: `src/data/locations.test.ts`

**Interfaces:**
- Consumes: `Location`, `Category`, `MasterItem` from `src/types.ts` (Task 2).
- Produces: `LOCATIONS: Location[]`, `CATEGORIES: Category[]` (the fixed 9-location/23-category seed data), and helper `getCategoriesForLocation(locationId: string): Category[]`. These are consumed **only** as the initial/seed values inside `LockerContext` (Task 7) — every page reads the live, user-editable locations/categories from `useLocker()` instead.

- [ ] **Step 1: Write the failing test `src/data/locations.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { LOCATIONS, CATEGORIES, getCategoriesForLocation } from './locations'

describe('locations seed data', () => {
  it('has exactly 9 locations with unique ids', () => {
    expect(LOCATIONS).toHaveLength(9)
    const ids = new Set(LOCATIONS.map((l) => l.id))
    expect(ids.size).toBe(9)
  })

  it('every category belongs to a real location', () => {
    const locationIds = new Set(LOCATIONS.map((l) => l.id))
    for (const category of CATEGORIES) {
      expect(locationIds.has(category.locationId)).toBe(true)
    }
  })

  it('every category has at least one master item', () => {
    for (const category of CATEGORIES) {
      expect(category.masterItems.length).toBeGreaterThan(0)
    }
  })

  it('getCategoriesForLocation returns only that location categories', () => {
    const bathroomCategories = getCategoriesForLocation('bathroom')
    expect(bathroomCategories.length).toBeGreaterThan(0)
    expect(bathroomCategories.every((c) => c.locationId === 'bathroom')).toBe(true)
  })

  it('master item ids are globally unique', () => {
    const allIds = CATEGORIES.flatMap((c) => c.masterItems.map((m) => m.id))
    expect(new Set(allIds).size).toBe(allIds.length)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/locations.test.ts`
Expected: FAIL — `./locations` module does not exist.

- [ ] **Step 3: Write `src/data/locations.ts`**

```ts
import type { Location, Category, MasterItem } from '../types'

function mi(id: string, name: string): MasterItem {
  return { id, name }
}

export const LOCATIONS: Location[] = [
  { id: 'bathroom', name: '욕실', colorToken: 'bathroom' },
  { id: 'kitchen', name: '주방', colorToken: 'kitchen' },
  { id: 'laundry', name: '세탁실/다용도실', colorToken: 'laundry' },
  { id: 'closet', name: '옷장/드레스룸', colorToken: 'closet' },
  { id: 'vanity', name: '화장대', colorToken: 'vanity' },
  { id: 'bedroom', name: '침실', colorToken: 'bedroom' },
  { id: 'livingroom', name: '거실', colorToken: 'livingroom' },
  { id: 'entrance', name: '현관/신발장', colorToken: 'entrance' },
  { id: 'medicine', name: '상비약함', colorToken: 'medicine' },
  { id: 'car', name: '차량', colorToken: 'car' },
]

export const CATEGORIES: Category[] = [
  {
    id: 'bathroom-haircare',
    locationId: 'bathroom',
    name: '헤어케어',
    masterItems: [
      mi('bathroom-haircare-shampoo', '샴푸'),
      mi('bathroom-haircare-rinse', '린스'),
      mi('bathroom-haircare-treatment', '트리트먼트'),
      mi('bathroom-haircare-essence', '헤어에센스'),
      mi('bathroom-haircare-scaler', '두피스케일러'),
    ],
  },
  {
    id: 'bathroom-bodycare',
    locationId: 'bathroom',
    name: '바디케어',
    masterItems: [
      mi('bathroom-bodycare-wash', '바디워시'),
      mi('bathroom-bodycare-lotion', '바디로션'),
      mi('bathroom-bodycare-scrub', '각질제거제'),
      mi('bathroom-bodycare-handcream', '핸드크림'),
    ],
  },
  {
    id: 'bathroom-oralcare',
    locationId: 'bathroom',
    name: '구강케어',
    masterItems: [
      mi('bathroom-oralcare-toothpaste', '치약'),
      mi('bathroom-oralcare-toothbrush', '칫솔'),
      mi('bathroom-oralcare-floss', '치실'),
      mi('bathroom-oralcare-mouthwash', '가글'),
    ],
  },
  {
    id: 'bathroom-skincare',
    locationId: 'bathroom',
    name: '스킨케어',
    masterItems: [
      mi('bathroom-skincare-cleanser', '클렌징폼'),
      mi('bathroom-skincare-toner', '스킨/토너'),
      mi('bathroom-skincare-lotion', '로션'),
      mi('bathroom-skincare-essence', '에센스'),
      mi('bathroom-skincare-cream', '크림'),
      mi('bathroom-skincare-sunscreen', '선크림'),
    ],
  },
  {
    id: 'bathroom-hygiene',
    locationId: 'bathroom',
    name: '위생용품',
    masterItems: [
      mi('bathroom-hygiene-razor', '면도기'),
      mi('bathroom-hygiene-swab', '면봉'),
      mi('bathroom-hygiene-cottonpad', '화장솜'),
      mi('bathroom-hygiene-toiletpaper', '두루마리 휴지'),
      mi('bathroom-hygiene-wetwipe', '물티슈'),
    ],
  },
  {
    id: 'kitchen-grocery',
    locationId: 'kitchen',
    name: '식료품',
    masterItems: [
      mi('kitchen-grocery-coffee', '원두/커피'),
      mi('kitchen-grocery-teabag', '티백'),
      mi('kitchen-grocery-salt', '소금'),
      mi('kitchen-grocery-sugar', '설탕'),
      mi('kitchen-grocery-oil', '식용유'),
      mi('kitchen-grocery-soysauce', '간장'),
    ],
  },
  {
    id: 'kitchen-household',
    locationId: 'kitchen',
    name: '생활용품',
    masterItems: [
      mi('kitchen-household-detergent', '주방세제'),
      mi('kitchen-household-sponge', '수세미'),
      mi('kitchen-household-towel', '키친타올'),
      mi('kitchen-household-wrap', '랩'),
      mi('kitchen-household-foil', '호일'),
    ],
  },
  {
    id: 'kitchen-storage',
    locationId: 'kitchen',
    name: '보관용품',
    masterItems: [
      mi('kitchen-storage-ziplock', '지퍼백'),
      mi('kitchen-storage-container', '밀폐용기'),
      mi('kitchen-storage-trashbag', '종량제 봉투'),
    ],
  },
  {
    id: 'laundry-supplies',
    locationId: 'laundry',
    name: '세탁용품',
    masterItems: [
      mi('laundry-supplies-detergent', '세탁세제'),
      mi('laundry-supplies-softener', '섬유유연제'),
      mi('laundry-supplies-bleach', '표백제'),
      mi('laundry-supplies-net', '세탁망'),
    ],
  },
  {
    id: 'laundry-cleaning',
    locationId: 'laundry',
    name: '청소용품',
    masterItems: [
      mi('laundry-cleaning-allpurpose', '다목적세제'),
      mi('laundry-cleaning-moldremover', '곰팡이 제거제'),
      mi('laundry-cleaning-gloves', '고무장갑'),
    ],
  },
  {
    id: 'closet-clothing',
    locationId: 'closet',
    name: '상의·하의·아우터',
    masterItems: [
      mi('closet-clothing-tshirt', '티셔츠'),
      mi('closet-clothing-knit', '니트'),
      mi('closet-clothing-pants', '바지'),
      mi('closet-clothing-jacket', '재킷'),
    ],
  },
  {
    id: 'closet-care',
    locationId: 'closet',
    name: '의류관리용품',
    masterItems: [
      mi('closet-care-dehumidifier', '제습제'),
      mi('closet-care-freshener', '방향제'),
      mi('closet-care-mothball', '좀약'),
      mi('closet-care-lintremover', '보풀제거기'),
    ],
  },
  {
    id: 'vanity-makeup',
    locationId: 'vanity',
    name: '메이크업',
    masterItems: [
      mi('vanity-makeup-foundation', '파운데이션'),
      mi('vanity-makeup-lipstick', '립스틱'),
      mi('vanity-makeup-eyeshadow', '아이섀도우'),
      mi('vanity-makeup-blusher', '블러셔'),
    ],
  },
  {
    id: 'vanity-hairstyling',
    locationId: 'vanity',
    name: '헤어스타일링',
    masterItems: [
      mi('vanity-hairstyling-wax', '왁스'),
      mi('vanity-hairstyling-spray', '헤어스프레이'),
      mi('vanity-hairstyling-dryessence', '드라이 에센스'),
    ],
  },
  {
    id: 'vanity-fragrance',
    locationId: 'vanity',
    name: '향',
    masterItems: [
      mi('vanity-fragrance-perfume', '향수'),
      mi('vanity-fragrance-mist', '바디미스트'),
    ],
  },
  {
    id: 'bedroom-bedding',
    locationId: 'bedroom',
    name: '침구',
    masterItems: [
      mi('bedroom-bedding-cover', '이불커버'),
      mi('bedroom-bedding-pillowcase', '베개커버'),
      mi('bedroom-bedding-mattresspad', '매트리스 패드'),
    ],
  },
  {
    id: 'bedroom-air',
    locationId: 'bedroom',
    name: '공기관리',
    masterItems: [
      mi('bedroom-air-diffuser', '디퓨저'),
      mi('bedroom-air-humidifierfilter', '가습기 필터'),
      mi('bedroom-air-freshener', '방향제'),
    ],
  },
  {
    id: 'livingroom-cleaning',
    locationId: 'livingroom',
    name: '청소용품',
    masterItems: [
      mi('livingroom-cleaning-wetwipe', '물티슈'),
      mi('livingroom-cleaning-dustcloth', '먼지제거포'),
      mi('livingroom-cleaning-cleaningpad', '청소포'),
    ],
  },
  {
    id: 'livingroom-misc',
    locationId: 'livingroom',
    name: '소모 잡화',
    masterItems: [
      mi('livingroom-misc-battery', '리모컨 건전지'),
      mi('livingroom-misc-freshener', '방향제'),
      mi('livingroom-misc-candle', '초'),
    ],
  },
  {
    id: 'entrance-shoecare',
    locationId: 'entrance',
    name: '신발관리',
    masterItems: [
      mi('entrance-shoecare-deodorizer', '신발탈취제'),
      mi('entrance-shoecare-waterproof', '방수스프레이'),
      mi('entrance-shoecare-polish', '구두약'),
    ],
  },
  {
    id: 'entrance-outing',
    locationId: 'entrance',
    name: '외출용품',
    masterItems: [
      mi('entrance-outing-umbrella', '우산'),
      mi('entrance-outing-mask', '여분 마스크'),
    ],
  },
  {
    id: 'medicine-firstaid',
    locationId: 'medicine',
    name: '구급용품',
    masterItems: [
      mi('medicine-firstaid-antacid', '소화제'),
      mi('medicine-firstaid-coldmed', '감기약'),
      mi('medicine-firstaid-bandage', '밴드'),
      mi('medicine-firstaid-ointment', '연고'),
      mi('medicine-firstaid-thermometer', '체온계'),
    ],
  },
  {
    id: 'car-supplies',
    locationId: 'car',
    name: '차량용품',
    masterItems: [
      mi('car-supplies-washerfluid', '워셔액'),
      mi('car-supplies-freshener', '방향제'),
      mi('car-supplies-wetwipe', '실내용 물티슈'),
    ],
  },
]

export function getCategoriesForLocation(locationId: string): Category[] {
  return CATEGORIES.filter((c) => c.locationId === locationId)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/locations.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/data/locations.ts src/data/locations.test.ts
git commit -m "feat: add 9-location/23-category master-item seed data"
```

---

### Task 4: Seed items dataset

**Files:**
- Create: `src/data/seedItems.ts`
- Test: `src/data/seedItems.test.ts`

**Interfaces:**
- Consumes: `Item` type (Task 2), `LOCATIONS`/`CATEGORIES` (Task 3).
- Produces: `SEED_ITEMS: Item[]` consumed by `useLocalStorage`/`LockerContext` initial state (Task 6) for first-run population.

- [ ] **Step 1: Write the failing test `src/data/seedItems.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { LOCATIONS, CATEGORIES } from './locations'
import { SEED_ITEMS } from './seedItems'

describe('seed items', () => {
  it('every seed item references a real location and category', () => {
    const locationIds = new Set(LOCATIONS.map((l) => l.id))
    const categoryIds = new Set(CATEGORIES.map((c) => c.id))
    for (const item of SEED_ITEMS) {
      expect(locationIds.has(item.locationId)).toBe(true)
      expect(categoryIds.has(item.categoryId)).toBe(true)
    }
  })

  it('never sets both rating and daysUntilEmpty', () => {
    for (const item of SEED_ITEMS) {
      const hasBoth = item.rating !== undefined && item.daysUntilEmpty !== undefined
      expect(hasBoth).toBe(false)
    }
  })

  it('every referenced masterItemId exists in its category', () => {
    const categoryById = new Map(CATEGORIES.map((c) => [c.id, c]))
    for (const item of SEED_ITEMS) {
      if (!item.masterItemId) continue
      const category = categoryById.get(item.categoryId)!
      const found = category.masterItems.some((m) => m.id === item.masterItemId)
      expect(found).toBe(true)
    }
  })

  it('covers every location with at least one item', () => {
    const coveredLocations = new Set(SEED_ITEMS.map((i) => i.locationId))
    for (const location of LOCATIONS) {
      expect(coveredLocations.has(location.id)).toBe(true)
    }
  })

  it('has unique item ids', () => {
    const ids = SEED_ITEMS.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/seedItems.test.ts`
Expected: FAIL — `./seedItems` module does not exist.

- [ ] **Step 3: Write `src/data/seedItems.ts`**

```ts
import type { Item } from '../types'

export const SEED_ITEMS: Item[] = [
  {
    id: 'seed-1',
    name: '톤업 선크림',
    locationId: 'bathroom',
    categoryId: 'bathroom-skincare',
    masterItemId: 'bathroom-skincare-sunscreen',
    note: '올해 세 번째 재구매',
    rating: 5,
    place: '올리브영',
    restockCycle: '약 2개월마다',
    affiliateUrl: null,
    createdAt: '2026-07-01',
  },
  {
    id: 'seed-2',
    name: '아윤채 샴푸',
    locationId: 'bathroom',
    categoryId: 'bathroom-haircare',
    masterItemId: 'bathroom-haircare-shampoo',
    note: '두피 진정에 좋음',
    daysUntilEmpty: 5,
    place: '쿠팡',
    restockCycle: '약 1.5개월마다',
    affiliateUrl: null,
    createdAt: '2026-08-01',
  },
  {
    id: 'seed-3',
    name: '센소다인 치약',
    locationId: 'bathroom',
    categoryId: 'bathroom-oralcare',
    masterItemId: 'bathroom-oralcare-toothpaste',
    rating: 4,
    place: '다이소',
    restockCycle: '약 1개월마다',
    affiliateUrl: null,
    createdAt: '2026-08-10',
  },
  {
    id: 'seed-4',
    name: '연세우유 크림빵 원두',
    locationId: 'kitchen',
    categoryId: 'kitchen-grocery',
    masterItemId: 'kitchen-grocery-coffee',
    rating: 5,
    place: '이마트',
    restockCycle: '약 3주마다',
    affiliateUrl: null,
    createdAt: '2026-08-15',
  },
  {
    id: 'seed-5',
    name: '피죤 3배 농축 주방세제',
    locationId: 'kitchen',
    categoryId: 'kitchen-household',
    masterItemId: 'kitchen-household-detergent',
    daysUntilEmpty: 3,
    place: '쿠팡',
    restockCycle: '약 2개월마다',
    affiliateUrl: null,
    createdAt: '2026-07-20',
  },
  {
    id: 'seed-6',
    name: '지퍼락 냉동실용',
    locationId: 'kitchen',
    categoryId: 'kitchen-storage',
    masterItemId: 'kitchen-storage-ziplock',
    rating: 4,
    place: '이마트',
    restockCycle: '약 4개월마다',
    affiliateUrl: null,
    createdAt: '2026-06-01',
  },
  {
    id: 'seed-7',
    name: '퍼실 액체세제',
    locationId: 'laundry',
    categoryId: 'laundry-supplies',
    masterItemId: 'laundry-supplies-detergent',
    rating: 5,
    place: '쿠팡',
    restockCycle: '약 2개월마다',
    affiliateUrl: null,
    createdAt: '2026-07-05',
  },
  {
    id: 'seed-8',
    name: '고무장갑 (중형)',
    locationId: 'laundry',
    categoryId: 'laundry-cleaning',
    masterItemId: 'laundry-cleaning-gloves',
    rating: 3,
    place: '다이소',
    restockCycle: '약 6개월마다',
    affiliateUrl: null,
    createdAt: '2026-05-01',
  },
  {
    id: 'seed-9',
    name: '유니클로 히트텍 니트',
    locationId: 'closet',
    categoryId: 'closet-clothing',
    masterItemId: 'closet-clothing-knit',
    rating: 5,
    place: '유니클로',
    restockCycle: null,
    affiliateUrl: null,
    createdAt: '2025-11-01',
  },
  {
    id: 'seed-10',
    name: '옷장 제습제',
    locationId: 'closet',
    categoryId: 'closet-care',
    masterItemId: 'closet-care-dehumidifier',
    daysUntilEmpty: 10,
    place: '다이소',
    restockCycle: '약 3개월마다',
    affiliateUrl: null,
    createdAt: '2026-06-15',
  },
  {
    id: 'seed-11',
    name: '맥팩토리 쿠션 파운데이션',
    locationId: 'vanity',
    categoryId: 'vanity-makeup',
    masterItemId: 'vanity-makeup-foundation',
    rating: 5,
    place: '올리브영',
    restockCycle: '약 4개월마다',
    affiliateUrl: null,
    createdAt: '2026-04-01',
  },
  {
    id: 'seed-12',
    name: '조말론 우드세이지 향수',
    locationId: 'vanity',
    categoryId: 'vanity-fragrance',
    masterItemId: 'vanity-fragrance-perfume',
    rating: 5,
    place: '백화점',
    restockCycle: '약 6개월마다',
    affiliateUrl: null,
    createdAt: '2026-03-01',
  },
  {
    id: 'seed-13',
    name: '이케아 극세사 베개커버',
    locationId: 'bedroom',
    categoryId: 'bedroom-bedding',
    masterItemId: 'bedroom-bedding-pillowcase',
    rating: 4,
    place: '이케아',
    restockCycle: null,
    affiliateUrl: null,
    createdAt: '2026-02-01',
  },
  {
    id: 'seed-14',
    name: '무드 디퓨저 우디향',
    locationId: 'bedroom',
    categoryId: 'bedroom-air',
    masterItemId: 'bedroom-air-diffuser',
    daysUntilEmpty: 20,
    place: '무인양품',
    restockCycle: '약 3개월마다',
    affiliateUrl: null,
    createdAt: '2026-06-01',
  },
  {
    id: 'seed-15',
    name: '리모컨 건전지 AAA',
    locationId: 'livingroom',
    categoryId: 'livingroom-misc',
    masterItemId: 'livingroom-misc-battery',
    rating: 3,
    place: '다이소',
    restockCycle: '약 6개월마다',
    affiliateUrl: null,
    createdAt: '2026-05-10',
  },
  {
    id: 'seed-16',
    name: '극세사 청소포',
    locationId: 'livingroom',
    categoryId: 'livingroom-cleaning',
    masterItemId: 'livingroom-cleaning-cleaningpad',
    rating: 4,
    place: '쿠팡',
    restockCycle: '약 2개월마다',
    affiliateUrl: null,
    createdAt: '2026-07-01',
  },
  {
    id: 'seed-17',
    name: '가죽 구두약',
    locationId: 'entrance',
    categoryId: 'entrance-shoecare',
    masterItemId: 'entrance-shoecare-polish',
    rating: 4,
    place: '다이소',
    restockCycle: '약 6개월마다',
    affiliateUrl: null,
    createdAt: '2026-01-01',
  },
  {
    id: 'seed-18',
    name: '3단 자동우산',
    locationId: 'entrance',
    categoryId: 'entrance-outing',
    masterItemId: 'entrance-outing-umbrella',
    rating: 5,
    place: '쿠팡',
    restockCycle: null,
    affiliateUrl: null,
    createdAt: '2025-09-01',
  },
  {
    id: 'seed-19',
    name: '대일 밴드 모음',
    locationId: 'medicine',
    categoryId: 'medicine-firstaid',
    masterItemId: 'medicine-firstaid-bandage',
    daysUntilEmpty: 15,
    place: '약국',
    restockCycle: '약 6개월마다',
    affiliateUrl: null,
    createdAt: '2026-03-15',
  },
  {
    id: 'seed-20',
    name: '2500 워셔액',
    locationId: 'car',
    categoryId: 'car-supplies',
    masterItemId: 'car-supplies-washerfluid',
    rating: 4,
    place: '홈플러스',
    restockCycle: '약 4개월마다',
    affiliateUrl: null,
    createdAt: '2026-05-20',
  },
]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/seedItems.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/data/seedItems.ts src/data/seedItems.test.ts
git commit -m "feat: add 20-item seed dataset covering all locations"
```

---

### Task 5: Dummy feed and family data

**Files:**
- Create: `src/data/feedData.ts`
- Create: `src/data/familyData.ts`

**Interfaces:**
- Consumes: `FeedPost`, `FamilyMember` types (Task 2), `CATEGORIES`/`LOCATIONS` ids (Task 3) for realistic references.
- Produces: `FEED_POSTS: FeedPost[]` and `FAMILY_MEMBERS: FamilyMember[]` used by `FeedPage` (Task 14) and `FamilyPage` (Task 15).

- [ ] **Step 1: Write `src/data/feedData.ts`**

```ts
import type { FeedPost } from '../types'

export const FEED_POSTS: FeedPost[] = [
  {
    id: 'feed-1',
    nickname: '정리요정',
    itemName: '이니스프리 그린티 클렌징폼',
    rating: 5,
    comment: '순하고 세정력 좋아서 3통째 재구매 중이에요',
    locationId: 'bathroom',
    categoryId: 'bathroom-skincare',
  },
  {
    id: 'feed-2',
    nickname: '주방덕후',
    itemName: '쿠쿠 압력밥솥용 세제',
    rating: 4,
    comment: '기름때 잘 빠져요, 향도 안 남아서 좋아요',
    locationId: 'kitchen',
    categoryId: 'kitchen-household',
  },
  {
    id: 'feed-3',
    nickname: '미니멀라이프',
    itemName: '다우니 섬유유연제',
    rating: 5,
    comment: '향 지속력 최고, 이거 한 번 쓰면 못 벗어남',
    locationId: 'laundry',
    categoryId: 'laundry-supplies',
  },
  {
    id: 'feed-4',
    nickname: '뷰티에디터',
    itemName: '록시땅 핸드크림',
    rating: 5,
    comment: '건조한 계절엔 필수템, 선물용으로도 좋아요',
    locationId: 'bathroom',
    categoryId: 'bathroom-bodycare',
  },
  {
    id: 'feed-5',
    nickname: '집사6년차',
    itemName: '3M 극세사 먼지제거포',
    rating: 4,
    comment: '반려동물 털 청소에 진심 최고',
    locationId: 'livingroom',
    categoryId: 'livingroom-cleaning',
  },
]
```

- [ ] **Step 2: Write `src/data/familyData.ts`**

```ts
import type { FamilyMember } from '../types'

export const FAMILY_MEMBERS: FamilyMember[] = [
  {
    id: 'family-1',
    name: '엄마',
    relation: '부모님',
    items: [
      { itemName: '주방세제', daysUntilEmpty: 4 },
      { itemName: '섬유유연제', daysUntilEmpty: 12 },
      { itemName: '치약', daysUntilEmpty: 2 },
    ],
  },
  {
    id: 'family-2',
    name: '아빠',
    relation: '부모님',
    items: [
      { itemName: '면도날', daysUntilEmpty: 6 },
      { itemName: '워셔액', daysUntilEmpty: 20 },
    ],
  },
]
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/data/feedData.ts src/data/familyData.ts
git commit -m "feat: add dummy share-feed and family-care data"
```

---

### Task 6: `useLocalStorage` hook

**Files:**
- Create: `src/hooks/useLocalStorage.ts`
- Test: `src/hooks/useLocalStorage.test.ts`

**Interfaces:**
- Consumes: nothing domain-specific (generic hook).
- Produces: `useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void]`, consumed by `LockerContext` (Task 7).

- [ ] **Step 1: Write the failing test `src/hooks/useLocalStorage.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLocalStorage } from './useLocalStorage'

describe('useLocalStorage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('returns the initial value when nothing is stored', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', { count: 0 }))
    expect(result.current[0]).toEqual({ count: 0 })
  })

  it('persists updates to localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', { count: 0 }))
    act(() => {
      result.current[1]({ count: 5 })
    })
    expect(result.current[0]).toEqual({ count: 5 })
    expect(JSON.parse(window.localStorage.getItem('test-key')!)).toEqual({ count: 5 })
  })

  it('supports functional updates', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 1))
    act(() => {
      result.current[1]((prev) => prev + 1)
    })
    expect(result.current[0]).toBe(2)
  })

  it('reads an existing stored value on mount instead of the initial value', () => {
    window.localStorage.setItem('test-key', JSON.stringify({ count: 42 }))
    const { result } = renderHook(() => useLocalStorage('test-key', { count: 0 }))
    expect(result.current[0]).toEqual({ count: 42 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/useLocalStorage.test.ts`
Expected: FAIL — `./useLocalStorage` module does not exist.

- [ ] **Step 3: Write `src/hooks/useLocalStorage.ts`**

```ts
import { useState } from 'react'

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? (JSON.parse(item) as T) : initialValue
    } catch {
      return initialValue
    }
  })

  function setValue(value: T | ((prev: T) => T)) {
    setStoredValue((prev) => {
      const next = value instanceof Function ? value(prev) : value
      try {
        window.localStorage.setItem(key, JSON.stringify(next))
      } catch {
        // ignore write errors (e.g. storage full or disabled)
      }
      return next
    })
  }

  return [storedValue, setValue]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/useLocalStorage.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useLocalStorage.ts src/hooks/useLocalStorage.test.ts
git commit -m "feat: add generic useLocalStorage hook"
```

---

### Task 7: `LockerContext` (global state)

**Files:**
- Create: `src/state/LockerContext.tsx`
- Test: `src/state/LockerContext.test.tsx`

**Interfaces:**
- Consumes: `Item`/`Location`/`Category` types (Task 2), `SEED_ITEMS` (Task 4), `LOCATIONS`/`CATEGORIES` as seed values (Task 3), `useLocalStorage` (Task 6).
- Produces: `LockerProvider` component, `useLocker()` hook returning `{ items: Item[], locations: Location[], categories: Category[], addItem, updateItem, removeItem, addLocation(name: string): Location, renameLocation(id, name), removeLocation(id), addCategory(locationId: string, name: string): Category, renameCategory(id, name), removeCategory(id) }`. This is the **only** source pages should read locations/categories from — later tasks (9–19) must call `useLocker()` for locations/categories, never import `LOCATIONS`/`CATEGORIES` directly from `src/data/locations.ts` (that module only supplies seed/initial values here). Consumed by `App.tsx` (Task 11) and every page (Tasks 12–19).

- [ ] **Step 1: Write the failing test `src/state/LockerContext.test.tsx`**

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { LockerProvider, useLocker } from './LockerContext'
import type { Item } from '../types'

function wrapper({ children }: { children: React.ReactNode }) {
  return <LockerProvider>{children}</LockerProvider>
}

const sampleItem: Item = {
  id: 'x1',
  name: '테스트 상품',
  locationId: 'bathroom',
  categoryId: 'bathroom-haircare',
  rating: 4,
  createdAt: '2026-09-10',
}

describe('LockerContext', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('starts with the seed items, locations, and categories', () => {
    const { result } = renderHook(() => useLocker(), { wrapper })
    expect(result.current.items.length).toBeGreaterThan(0)
    expect(result.current.locations.length).toBe(9)
    expect(result.current.categories.length).toBeGreaterThan(0)
  })

  it('addItem appends a new item', () => {
    const { result } = renderHook(() => useLocker(), { wrapper })
    const initialCount = result.current.items.length
    act(() => {
      result.current.addItem(sampleItem)
    })
    expect(result.current.items.length).toBe(initialCount + 1)
    expect(result.current.items.find((i) => i.id === 'x1')).toEqual(sampleItem)
  })

  it('updateItem patches an existing item', () => {
    const { result } = renderHook(() => useLocker(), { wrapper })
    act(() => {
      result.current.addItem(sampleItem)
    })
    act(() => {
      result.current.updateItem('x1', { note: '수정됨' })
    })
    expect(result.current.items.find((i) => i.id === 'x1')?.note).toBe('수정됨')
  })

  it('removeItem deletes an item', () => {
    const { result } = renderHook(() => useLocker(), { wrapper })
    act(() => {
      result.current.addItem(sampleItem)
    })
    act(() => {
      result.current.removeItem('x1')
    })
    expect(result.current.items.find((i) => i.id === 'x1')).toBeUndefined()
  })

  it('addLocation appends a new location and returns it', () => {
    const { result } = renderHook(() => useLocker(), { wrapper })
    const initialCount = result.current.locations.length
    let created
    act(() => {
      created = result.current.addLocation('베란다')
    })
    expect(result.current.locations.length).toBe(initialCount + 1)
    expect(result.current.locations.find((l) => l.id === created!.id)?.name).toBe('베란다')
  })

  it('renameLocation updates the name', () => {
    const { result } = renderHook(() => useLocker(), { wrapper })
    act(() => {
      result.current.renameLocation('bathroom', '메인 욕실')
    })
    expect(result.current.locations.find((l) => l.id === 'bathroom')?.name).toBe('메인 욕실')
  })

  it('removeLocation deletes the location, its categories, and its items', () => {
    const { result } = renderHook(() => useLocker(), { wrapper })
    act(() => {
      result.current.removeLocation('bathroom')
    })
    expect(result.current.locations.find((l) => l.id === 'bathroom')).toBeUndefined()
    expect(result.current.categories.some((c) => c.locationId === 'bathroom')).toBe(false)
    expect(result.current.items.some((i) => i.locationId === 'bathroom')).toBe(false)
  })

  it('addCategory appends a new category under a location', () => {
    const { result } = renderHook(() => useLocker(), { wrapper })
    let created
    act(() => {
      created = result.current.addCategory('bathroom', '반려동물 목욕용품')
    })
    expect(result.current.categories.find((c) => c.id === created!.id)).toMatchObject({
      locationId: 'bathroom',
      name: '반려동물 목욕용품',
    })
  })

  it('removeCategory deletes the category and its items', () => {
    const { result } = renderHook(() => useLocker(), { wrapper })
    act(() => {
      result.current.removeCategory('bathroom-haircare')
    })
    expect(result.current.categories.find((c) => c.id === 'bathroom-haircare')).toBeUndefined()
    expect(result.current.items.some((i) => i.categoryId === 'bathroom-haircare')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/state/LockerContext.test.tsx`
Expected: FAIL — `./LockerContext` module does not exist.

- [ ] **Step 3: Write `src/state/LockerContext.tsx`**

```tsx
import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react'
import type { Item, Location, Category } from '../types'
import { SEED_ITEMS } from '../data/seedItems'
import { LOCATIONS as SEED_LOCATIONS, CATEGORIES as SEED_CATEGORIES } from '../data/locations'
import { useLocalStorage } from '../hooks/useLocalStorage'

type State = { items: Item[]; locations: Location[]; categories: Category[] }

type Action =
  | { type: 'ADD_ITEM'; item: Item }
  | { type: 'UPDATE_ITEM'; id: string; patch: Partial<Item> }
  | { type: 'REMOVE_ITEM'; id: string }
  | { type: 'ADD_LOCATION'; location: Location }
  | { type: 'RENAME_LOCATION'; id: string; name: string }
  | { type: 'REMOVE_LOCATION'; id: string }
  | { type: 'ADD_CATEGORY'; category: Category }
  | { type: 'RENAME_CATEGORY'; id: string; name: string }
  | { type: 'REMOVE_CATEGORY'; id: string }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_ITEM':
      return { ...state, items: [...state.items, action.item] }
    case 'UPDATE_ITEM':
      return {
        ...state,
        items: state.items.map((i) => (i.id === action.id ? { ...i, ...action.patch } : i)),
      }
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter((i) => i.id !== action.id) }
    case 'ADD_LOCATION':
      return { ...state, locations: [...state.locations, action.location] }
    case 'RENAME_LOCATION':
      return {
        ...state,
        locations: state.locations.map((l) =>
          l.id === action.id ? { ...l, name: action.name } : l
        ),
      }
    case 'REMOVE_LOCATION':
      return {
        ...state,
        locations: state.locations.filter((l) => l.id !== action.id),
        categories: state.categories.filter((c) => c.locationId !== action.id),
        items: state.items.filter((i) => i.locationId !== action.id),
      }
    case 'ADD_CATEGORY':
      return { ...state, categories: [...state.categories, action.category] }
    case 'RENAME_CATEGORY':
      return {
        ...state,
        categories: state.categories.map((c) =>
          c.id === action.id ? { ...c, name: action.name } : c
        ),
      }
    case 'REMOVE_CATEGORY':
      return {
        ...state,
        categories: state.categories.filter((c) => c.id !== action.id),
        items: state.items.filter((i) => i.categoryId !== action.id),
      }
    default:
      return state
  }
}

type LockerContextValue = {
  items: Item[]
  locations: Location[]
  categories: Category[]
  addItem: (item: Item) => void
  updateItem: (id: string, patch: Partial<Item>) => void
  removeItem: (id: string) => void
  addLocation: (name: string) => Location
  renameLocation: (id: string, name: string) => void
  removeLocation: (id: string) => void
  addCategory: (locationId: string, name: string) => Category
  renameCategory: (id: string, name: string) => void
  removeCategory: (id: string) => void
}

const LockerContext = createContext<LockerContextValue | null>(null)

const INITIAL_STATE: State = {
  items: SEED_ITEMS,
  locations: SEED_LOCATIONS,
  categories: SEED_CATEGORIES,
}

export function LockerProvider({ children }: { children: ReactNode }) {
  const [persisted, setPersisted] = useLocalStorage<State>('remembuy:state', INITIAL_STATE)
  const [state, dispatch] = useReducer(reducer, persisted)

  useEffect(() => {
    setPersisted(state)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  const value: LockerContextValue = {
    items: state.items,
    locations: state.locations,
    categories: state.categories,
    addItem: (item) => dispatch({ type: 'ADD_ITEM', item }),
    updateItem: (id, patch) => dispatch({ type: 'UPDATE_ITEM', id, patch }),
    removeItem: (id) => dispatch({ type: 'REMOVE_ITEM', id }),
    addLocation: (name) => {
      const location: Location = { id: `loc-${Date.now()}`, name, colorToken: 'bathroom' }
      dispatch({ type: 'ADD_LOCATION', location })
      return location
    },
    renameLocation: (id, name) => dispatch({ type: 'RENAME_LOCATION', id, name }),
    removeLocation: (id) => dispatch({ type: 'REMOVE_LOCATION', id }),
    addCategory: (locationId, name) => {
      const category: Category = { id: `cat-${Date.now()}`, locationId, name, masterItems: [] }
      dispatch({ type: 'ADD_CATEGORY', category })
      return category
    },
    renameCategory: (id, name) => dispatch({ type: 'RENAME_CATEGORY', id, name }),
    removeCategory: (id) => dispatch({ type: 'REMOVE_CATEGORY', id }),
  }

  return <LockerContext.Provider value={value}>{children}</LockerContext.Provider>
}

export function useLocker(): LockerContextValue {
  const ctx = useContext(LockerContext)
  if (!ctx) throw new Error('useLocker must be used within a LockerProvider')
  return ctx
}
```

Note: new locations created via `addLocation` default to the `bathroom` color token (a safe, always-defined fallback) since a hand-picked hex isn't available for user-created locations.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/state/LockerContext.test.tsx`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add src/state/LockerContext.tsx src/state/LockerContext.test.tsx
git commit -m "feat: add LockerContext with items/locations/categories state and localStorage sync"
```

---

### Task 8: Selectors (completion %, ranking, notifications, missing items)

**Files:**
- Create: `src/state/selectors.ts`
- Test: `src/state/selectors.test.ts`

**Interfaces:**
- Consumes: `Item`, `Category` types (Task 2), `CATEGORIES`/`LOCATIONS` (Task 3).
- Produces:
  - `getCategoryCompletion(items: Item[], category: Category): number` (0–100)
  - `getLocationCompletion(items: Item[], locationId: string): number` (0–100, average of its categories)
  - `getMissingMasterItems(items: Item[], category: Category): MasterItem[]`
  - `getRankingForCategory(items: Item[], categoryId: string): Item[]` (sorted by rating desc, unrated last)
  - `getUpcomingNotifications(items: Item[], thresholdDays?: number): Item[]` (default threshold 7, sorted ascending by `daysUntilEmpty`)
  Consumed by `CollectionPage` (Task 16), `RankingPage` (Task 12), `NotificationsPage` (Task 13), `HomePage` (Task 9).

- [ ] **Step 1: Write the failing test `src/state/selectors.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import {
  getCategoryCompletion,
  getLocationCompletion,
  getMissingMasterItems,
  getRankingForCategory,
  getUpcomingNotifications,
} from './selectors'
import type { Category, Item } from '../types'

const category: Category = {
  id: 'cat-1',
  locationId: 'loc-1',
  name: '테스트 카테고리',
  masterItems: [
    { id: 'm1', name: '샴푸' },
    { id: 'm2', name: '린스' },
    { id: 'm3', name: '트리트먼트' },
    { id: 'm4', name: '에센스' },
  ],
}

const category2: Category = {
  id: 'cat-2',
  locationId: 'loc-1',
  name: '카테고리2',
  masterItems: [
    { id: 'm5', name: 'A' },
    { id: 'm6', name: 'B' },
  ],
}

function makeItem(overrides: Partial<Item>): Item {
  return {
    id: overrides.id ?? 'i1',
    name: overrides.name ?? '상품',
    locationId: overrides.locationId ?? 'loc-1',
    categoryId: overrides.categoryId ?? 'cat-1',
    createdAt: '2026-09-01',
    ...overrides,
  }
}

describe('getCategoryCompletion', () => {
  it('returns 0 when no items match', () => {
    expect(getCategoryCompletion([], category)).toBe(0)
  })

  it('returns percentage of unique master items covered', () => {
    const items = [
      makeItem({ id: 'i1', masterItemId: 'm1' }),
      makeItem({ id: 'i2', masterItemId: 'm2' }),
    ]
    expect(getCategoryCompletion(items, category)).toBe(50)
  })

  it('does not double-count duplicate master item matches', () => {
    const items = [
      makeItem({ id: 'i1', masterItemId: 'm1' }),
      makeItem({ id: 'i2', masterItemId: 'm1' }),
    ]
    expect(getCategoryCompletion(items, category)).toBe(25)
  })

  it('ignores items without a masterItemId', () => {
    const items = [makeItem({ id: 'i1', masterItemId: undefined })]
    expect(getCategoryCompletion(items, category)).toBe(0)
  })
})

describe('getLocationCompletion', () => {
  it('averages completion across the location categories', () => {
    const items = [
      makeItem({ id: 'i1', categoryId: 'cat-1', masterItemId: 'm1' }), // cat-1: 1/4 = 25%
      makeItem({ id: 'i2', categoryId: 'cat-2', masterItemId: 'm5' }), // cat-2: 1/2 = 50%
    ]
    // NOTE: getLocationCompletion needs the full category list to know which
    // categories belong to a location; tested via a small local categories array.
    const completion = getLocationCompletion(items, 'loc-1', [category, category2])
    expect(completion).toBe(38) // (25 + 50) / 2 = 37.5 rounded to 38
  })
})

describe('getMissingMasterItems', () => {
  it('returns master items with no owned match', () => {
    const items = [makeItem({ id: 'i1', masterItemId: 'm1' })]
    const missing = getMissingMasterItems(items, category)
    expect(missing.map((m) => m.id)).toEqual(['m2', 'm3', 'm4'])
  })
})

describe('getRankingForCategory', () => {
  it('sorts rated items by rating descending, unrated last', () => {
    const items = [
      makeItem({ id: 'i1', categoryId: 'cat-1', rating: 3 }),
      makeItem({ id: 'i2', categoryId: 'cat-1', rating: 5 }),
      makeItem({ id: 'i3', categoryId: 'cat-1' }),
      makeItem({ id: 'i4', categoryId: 'other-cat', rating: 4 }),
    ]
    const ranked = getRankingForCategory(items, 'cat-1')
    expect(ranked.map((i) => i.id)).toEqual(['i2', 'i1', 'i3'])
  })
})

describe('getUpcomingNotifications', () => {
  it('returns only items within the threshold, sorted ascending', () => {
    const items = [
      makeItem({ id: 'i1', daysUntilEmpty: 10 }),
      makeItem({ id: 'i2', daysUntilEmpty: 2 }),
      makeItem({ id: 'i3', daysUntilEmpty: 5 }),
      makeItem({ id: 'i4', rating: 5 }),
    ]
    const result = getUpcomingNotifications(items, 7)
    expect(result.map((i) => i.id)).toEqual(['i2', 'i3'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/state/selectors.test.ts`
Expected: FAIL — `./selectors` module does not exist.

- [ ] **Step 3: Write `src/state/selectors.ts`**

```ts
import type { Category, Item, MasterItem } from '../types'

export function getCategoryCompletion(items: Item[], category: Category): number {
  if (category.masterItems.length === 0) return 0
  const owned = new Set(
    items
      .filter((i) => i.categoryId === category.id && i.masterItemId)
      .map((i) => i.masterItemId as string)
  )
  const coveredCount = category.masterItems.filter((m) => owned.has(m.id)).length
  return Math.round((coveredCount / category.masterItems.length) * 100)
}

export function getLocationCompletion(
  items: Item[],
  locationId: string,
  categories: Category[]
): number {
  const locationCategories = categories.filter((c) => c.locationId === locationId)
  if (locationCategories.length === 0) return 0
  const total = locationCategories.reduce(
    (sum, category) => sum + getCategoryCompletion(items, category),
    0
  )
  return Math.round(total / locationCategories.length)
}

export function getMissingMasterItems(items: Item[], category: Category): MasterItem[] {
  const owned = new Set(
    items
      .filter((i) => i.categoryId === category.id && i.masterItemId)
      .map((i) => i.masterItemId as string)
  )
  return category.masterItems.filter((m) => !owned.has(m.id))
}

export function getRankingForCategory(items: Item[], categoryId: string): Item[] {
  return items
    .filter((i) => i.categoryId === categoryId)
    .slice()
    .sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1))
}

export function getUpcomingNotifications(items: Item[], thresholdDays = 7): Item[] {
  return items
    .filter((i) => i.daysUntilEmpty !== undefined && i.daysUntilEmpty <= thresholdDays)
    .slice()
    .sort((a, b) => (a.daysUntilEmpty as number) - (b.daysUntilEmpty as number))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/state/selectors.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add src/state/selectors.ts src/state/selectors.test.ts
git commit -m "feat: add completion/ranking/notification selectors"
```

---

### Task 9: `ProgressRing` gauge component

**Files:**
- Create: `src/components/ProgressRing.tsx`
- Test: `src/components/ProgressRing.test.tsx`

**Interfaces:**
- Consumes: nothing domain-specific.
- Produces: `<ProgressRing percent={number} color={string} size={number} strokeWidth={number}>{children}</ProgressRing>` consumed by `LocationIcon` (Task 10) and `CollectionPage` (Task 16).

- [ ] **Step 1: Write the failing test `src/components/ProgressRing.test.tsx`**

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProgressRing } from './ProgressRing'

describe('ProgressRing', () => {
  it('renders the percent label', () => {
    render(<ProgressRing percent={62} color="#6E8F87" size={64} strokeWidth={4} />)
    expect(screen.getByText('62%')).toBeInTheDocument()
  })

  it('sets a full-circle dasharray and a dashoffset proportional to percent', () => {
    const { container } = render(
      <ProgressRing percent={50} color="#6E8F87" size={64} strokeWidth={4} />
    )
    const progressCircle = container.querySelector('circle.progress-ring__progress')!
    const radius = 32 - 4 / 2 // (size / 2) - strokeWidth / 2
    const circumference = 2 * Math.PI * radius
    expect(progressCircle.getAttribute('stroke-dasharray')).toBe(String(circumference))
    expect(Number(progressCircle.getAttribute('stroke-dashoffset'))).toBeCloseTo(
      circumference * 0.5,
      2
    )
  })

  it('clamps percent to the 0-100 range', () => {
    render(<ProgressRing percent={150} color="#6E8F87" size={64} strokeWidth={4} />)
    expect(screen.getByText('100%')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ProgressRing.test.tsx`
Expected: FAIL — `./ProgressRing` module does not exist.

- [ ] **Step 3: Write `src/components/ProgressRing.tsx`**

```tsx
import type { ReactNode } from 'react'

type ProgressRingProps = {
  percent: number
  color: string
  size?: number
  strokeWidth?: number
  showLabel?: boolean
  children?: ReactNode
}

export function ProgressRing({
  percent,
  color,
  size = 64,
  strokeWidth = 4,
  showLabel = true,
  children,
}: ProgressRingProps) {
  const clamped = Math.min(100, Math.max(0, percent))
  const radius = size / 2 - strokeWidth / 2
  const circumference = 2 * Math.PI * radius
  const dashoffset = circumference * (1 - clamped / 100)

  return (
    <div className="relative inline-flex flex-col items-center gap-1" style={{ width: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          className="progress-ring__track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#D9CBA0"
          strokeWidth={strokeWidth}
        />
        <circle
          className="progress-ring__progress"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center rotate-0">
        {children}
      </div>
      {showLabel && <span className="text-xs text-ink">{clamped}%</span>}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/ProgressRing.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/ProgressRing.tsx src/components/ProgressRing.test.tsx
git commit -m "feat: add circular ProgressRing gauge component"
```

---

### Task 10: Shared UI primitives (`LocationIcon`, `ItemCard`, `RatingStars`, `Badge`)

**Files:**
- Create: `src/components/LocationIcon.tsx`
- Create: `src/components/ItemCard.tsx`
- Create: `src/components/RatingStars.tsx`
- Create: `src/components/Badge.tsx`

**Interfaces:**
- Consumes: `ProgressRing` (Task 9), `Item`/`Location` types (Task 2), `getLocationCompletion` (Task 8).
- Produces: `<LocationIcon location={Location} percent={number} selected?={boolean} onClick?={() => void} />`, `<ItemCard item={Item} onClick={() => void} />`, `<RatingStars rating={number} />`, `<Badge>{children}</Badge>`. Consumed by `HomePage`, `RankingPage`, `CollectionPage`, `ItemDetailPage` (Tasks 11–16).

- [ ] **Step 1: Write `src/components/RatingStars.tsx`**

```tsx
export function RatingStars({ rating }: { rating: number }) {
  return (
    <span className="text-stamp" aria-label={`평점 ${rating}점`}>
      {'★'.repeat(rating)}
      <span className="text-ink/30">{'★'.repeat(5 - rating)}</span>
    </span>
  )
}
```

- [ ] **Step 2: Write `src/components/Badge.tsx`**

```tsx
import type { ReactNode } from 'react'

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block rotate-[-3deg] rounded-full border-2 border-stamp px-2 py-0.5 text-xs font-bold text-stamp">
      {children}
    </span>
  )
}
```

- [ ] **Step 3: Write `src/components/LocationIcon.tsx`**

```tsx
import { ProgressRing } from './ProgressRing'
import type { Location } from '../types'

const LOCATION_COLOR_HEX: Record<string, string> = {
  bathroom: '#6E8F87',
  kitchen: '#C98F2B',
  laundry: '#7D93A6',
  closet: '#B0472E',
  vanity: '#A9789A',
  bedroom: '#8A8F6E',
  livingroom: '#9C8B5E',
  entrance: '#6F7D5C',
  medicine: '#B0763F',
  car: '#5C7A8B',
}

export function LocationIcon({
  location,
  percent,
  selected = false,
  onClick,
}: {
  location: Location
  percent: number
  selected?: boolean
  onClick?: () => void
}) {
  const color = LOCATION_COLOR_HEX[location.colorToken] ?? '#3F6459'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1 ${selected ? 'opacity-100' : 'opacity-80'}`}
    >
      <ProgressRing percent={percent} color={color} size={56} strokeWidth={4}>
        <span className="text-lg">📦</span>
      </ProgressRing>
      <span className="text-xs">{location.name}</span>
    </button>
  )
}
```

- [ ] **Step 4: Write `src/components/ItemCard.tsx`**

```tsx
import type { Item } from '../types'
import { RatingStars } from './RatingStars'

export function ItemCard({ item, onClick }: { item: Item; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg border border-ink/10 bg-card p-3 text-left shadow-sm"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded bg-paper text-xl">
        🧴
      </div>
      <div className="flex-1">
        <p className="font-medium">{item.name}</p>
        {item.rating !== undefined ? (
          <RatingStars rating={item.rating} />
        ) : item.daysUntilEmpty !== undefined ? (
          <span className="text-sm text-warn">D-{item.daysUntilEmpty}</span>
        ) : null}
      </div>
    </button>
  )
}
```

- [ ] **Step 5: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/LocationIcon.tsx src/components/ItemCard.tsx src/components/RatingStars.tsx src/components/Badge.tsx
git commit -m "feat: add shared LocationIcon/ItemCard/RatingStars/Badge components"
```

---

### Task 11: `AppLayout` and routing wired in `App.tsx`

**Files:**
- Create: `src/components/AppLayout.tsx`
- Modify: `src/App.tsx` (replace placeholder from Task 1)
- Create: `src/pages/HomePage.tsx` (temporary stub, filled in Task 12)
- Create: `src/pages/ItemDetailPage.tsx` (temporary stub, filled in Task 13)
- Create: `src/pages/RankingPage.tsx` (temporary stub, filled in Task 14)
- Create: `src/pages/NotificationsPage.tsx` (temporary stub, filled in Task 15)
- Create: `src/pages/FeedPage.tsx` (temporary stub, filled in Task 16)
- Create: `src/pages/FamilyPage.tsx` (temporary stub, filled in Task 17)
- Create: `src/pages/NewItemPage.tsx` (temporary stub, filled in Task 18)
- Create: `src/pages/CollectionPage.tsx` (temporary stub, filled in Task 19)

**Interfaces:**
- Consumes: `LockerProvider` (Task 7).
- Produces: working route tree with a bottom tab bar; each page task below replaces its stub without touching routing.

- [ ] **Step 1: Write minimal stub pages** (identical pattern for each of the 8 files)

`src/pages/HomePage.tsx`:
```tsx
export default function HomePage() {
  return <div className="p-4">홈</div>
}
```

`src/pages/ItemDetailPage.tsx`:
```tsx
export default function ItemDetailPage() {
  return <div className="p-4">상품 상세</div>
}
```

`src/pages/RankingPage.tsx`:
```tsx
export default function RankingPage() {
  return <div className="p-4">랭킹</div>
}
```

`src/pages/NotificationsPage.tsx`:
```tsx
export default function NotificationsPage() {
  return <div className="p-4">알림</div>
}
```

`src/pages/FeedPage.tsx`:
```tsx
export default function FeedPage() {
  return <div className="p-4">공유 피드</div>
}
```

`src/pages/FamilyPage.tsx`:
```tsx
export default function FamilyPage() {
  return <div className="p-4">가족 케어</div>
}
```

`src/pages/NewItemPage.tsx`:
```tsx
export default function NewItemPage() {
  return <div className="p-4">새로 기록하기</div>
}
```

`src/pages/CollectionPage.tsx`:
```tsx
export default function CollectionPage() {
  return <div className="p-4">컬렉션</div>
}
```

- [ ] **Step 2: Write `src/components/AppLayout.tsx`**

```tsx
import { NavLink, Outlet } from 'react-router-dom'

const TABS = [
  { to: '/', label: '홈', icon: '🏠' },
  { to: '/ranking', label: '랭킹', icon: '🏆' },
  { to: '/notifications', label: '알림', icon: '🔔' },
  { to: '/feed', label: '공유', icon: '👥' },
  { to: '/family', label: '가족', icon: '👪' },
  { to: '/collection', label: '컬렉션', icon: '📔' },
]

export function AppLayout() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-paper">
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-1/2 grid w-full max-w-md -translate-x-1/2 grid-cols-6 border-t border-ink/10 bg-card">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2 text-xs ${
                isActive ? 'text-stamp' : 'text-ink/60'
              }`
            }
          >
            <span>{tab.icon}</span>
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
```

- [ ] **Step 3: Write `src/App.tsx`**

```tsx
import { Routes, Route } from 'react-router-dom'
import { LockerProvider } from './state/LockerContext'
import { AppLayout } from './components/AppLayout'
import HomePage from './pages/HomePage'
import ItemDetailPage from './pages/ItemDetailPage'
import RankingPage from './pages/RankingPage'
import NotificationsPage from './pages/NotificationsPage'
import FeedPage from './pages/FeedPage'
import FamilyPage from './pages/FamilyPage'
import NewItemPage from './pages/NewItemPage'
import CollectionPage from './pages/CollectionPage'

export default function App() {
  return (
    <LockerProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/item/:id" element={<ItemDetailPage />} />
          <Route path="/ranking" element={<RankingPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/family" element={<FamilyPage />} />
          <Route path="/new" element={<NewItemPage />} />
          <Route path="/collection" element={<CollectionPage />} />
        </Route>
      </Routes>
    </LockerProvider>
  )
}
```

- [ ] **Step 4: Manual browser verification**

Run: `npm run dev`
Open `http://localhost:7777` and click through all 6 bottom tabs plus manually visit `/item/seed-1` and `/new` in the address bar.
Expected: each route renders its stub text, the active tab is highlighted in stamp-red, no console errors.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/components/AppLayout.tsx src/pages/
git commit -m "feat: wire up 8-route app shell with bottom tab bar"
```

---

### Task 12: Home page

**Files:**
- Modify: `src/pages/HomePage.tsx`

**Interfaces:**
- Consumes: `useLocker()` (Task 7, for `items`, `locations`, `categories`), `getLocationCompletion` (Task 8), `LocationIcon`/`ItemCard` (Tasks 9–10), `useNavigate` from react-router-dom.
- Produces: fully working home screen. No new exports consumed elsewhere.

- [ ] **Step 1: Write `src/pages/HomePage.tsx`**

```tsx
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import { getLocationCompletion } from '../state/selectors'
import { LocationIcon } from '../components/LocationIcon'
import { ItemCard } from '../components/ItemCard'

export default function HomePage() {
  const { items, locations, categories } = useLocker()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)
  const [showUrgentOnly, setShowUrgentOnly] = useState(false)

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedLocationId && item.locationId !== selectedLocationId) return false
      if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false
      if (showUrgentOnly && !(item.daysUntilEmpty !== undefined && item.daysUntilEmpty <= 7))
        return false
      return true
    })
  }, [items, selectedLocationId, search, showUrgentOnly])

  const itemsByCategory = useMemo(() => {
    const map = new Map<string, typeof filteredItems>()
    for (const item of filteredItems) {
      const list = map.get(item.categoryId) ?? []
      list.push(item)
      map.set(item.categoryId, list)
    }
    return map
  }, [filteredItems])

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold">REMEMBUY</h1>

      <input
        type="search"
        placeholder="상품 검색"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-lg border border-ink/20 bg-card p-2"
      />

      <div className="flex gap-3 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setSelectedLocationId(null)}
          className={`flex flex-col items-center gap-1 text-xs ${
            selectedLocationId === null ? 'text-stamp' : 'text-ink/60'
          }`}
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-card text-lg">
            🗂️
          </span>
          전체
        </button>
        {locations.map((location) => (
          <LocationIcon
            key={location.id}
            location={location}
            percent={getLocationCompletion(items, location.id, categories)}
            selected={selectedLocationId === location.id}
            onClick={() => setSelectedLocationId(location.id)}
          />
        ))}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setShowUrgentOnly(false)}
          className={`rounded-full px-3 py-1 text-sm ${
            !showUrgentOnly ? 'bg-stamp text-white' : 'bg-card text-ink'
          }`}
        >
          전체
        </button>
        <button
          type="button"
          onClick={() => setShowUrgentOnly(true)}
          className={`rounded-full px-3 py-1 text-sm ${
            showUrgentOnly ? 'bg-stamp text-white' : 'bg-card text-ink'
          }`}
        >
          임박만
        </button>
      </div>

      {Array.from(itemsByCategory.entries()).map(([categoryId, categoryItems]) => {
        const category = categories.find((c) => c.id === categoryId)
        return (
          <section key={categoryId} className="space-y-2">
            <h2 className="text-sm font-semibold text-ink/70">{category?.name}</h2>
            <div className="space-y-2">
              {categoryItems.map((item) => (
                <ItemCard key={item.id} item={item} onClick={() => navigate(`/item/${item.id}`)} />
              ))}
            </div>
          </section>
        )
      })}

      <button
        type="button"
        onClick={() => navigate('/new')}
        className="fixed bottom-24 right-1/2 -mr-[calc(50%-2.5rem)] flex h-14 w-14 items-center justify-center rounded-full bg-stamp text-2xl text-white shadow-lg"
        aria-label="새로 기록하기"
      >
        +
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Manual browser verification**

Run: `npm run dev`, open `http://localhost:7777`
Expected:
- 9 location rings render with distinct colors and non-zero percentages (seed data has partial completion).
- Typing in search filters the list live.
- Clicking a location ring filters to that location only; clicking it again does not toggle off (clicking "전체" resets).
- "임박만" tab shows only items with `daysUntilEmpty <= 7` (seed items `seed-2` and `seed-5`).
- Clicking an item card navigates to `/item/<id>`.
- The floating "+" button navigates to `/new`.

- [ ] **Step 3: Commit**

```bash
git add src/pages/HomePage.tsx
git commit -m "feat: implement home page with search/filter/location rings"
```

---

### Task 13: Item detail page

**Files:**
- Modify: `src/pages/ItemDetailPage.tsx`

**Interfaces:**
- Consumes: `useLocker()` (Task 7 — `items`, `locations`, `categories`), `RatingStars` (Task 10), `useParams`/`useNavigate` from react-router-dom.

- [ ] **Step 1: Write `src/pages/ItemDetailPage.tsx`**

```tsx
import { useNavigate, useParams } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import { RatingStars } from '../components/RatingStars'

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { items, locations, categories } = useLocker()
  const item = items.find((i) => i.id === id)

  if (!item) {
    return (
      <div className="p-4">
        <p>상품을 찾을 수 없습니다.</p>
        <button type="button" onClick={() => navigate('/')} className="mt-2 text-accent underline">
          홈으로 돌아가기
        </button>
      </div>
    )
  }

  const location = locations.find((l) => l.id === item.locationId)
  const category = categories.find((c) => c.id === item.categoryId)

  return (
    <div className="space-y-4 p-4">
      <button type="button" onClick={() => navigate(-1)} className="text-sm text-ink/60">
        ← 뒤로
      </button>

      <div className="flex h-40 items-center justify-center rounded-lg bg-card text-5xl">
        🧴
      </div>

      <div>
        <p className="text-xs text-ink/50">
          {location?.name} &gt; {category?.name}
        </p>
        <h1 className="text-xl font-bold">{item.name}</h1>
      </div>

      {item.rating !== undefined ? (
        <RatingStars rating={item.rating} />
      ) : item.daysUntilEmpty !== undefined ? (
        <p className="text-warn">D-{item.daysUntilEmpty}</p>
      ) : null}

      {item.note && <p className="rounded-lg bg-card p-3 text-sm">{item.note}</p>}

      <dl className="space-y-1 text-sm">
        {item.place && (
          <div className="flex justify-between">
            <dt className="text-ink/50">구매처</dt>
            <dd>{item.place}</dd>
          </div>
        )}
        {item.restockCycle && (
          <div className="flex justify-between">
            <dt className="text-ink/50">재구매 주기</dt>
            <dd>{item.restockCycle}</dd>
          </div>
        )}
      </dl>

      <div className="flex gap-2">
        <a
          href={item.affiliateUrl ?? '#'}
          className="flex-1 rounded-lg bg-stamp py-2 text-center text-white"
        >
          다시 담기
        </a>
        <button
          type="button"
          onClick={() => navigate(`/new?editId=${item.id}`)}
          className="flex-1 rounded-lg border border-ink/20 py-2 text-center"
        >
          메모 수정하기
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Manual browser verification**

Run: `npm run dev`, navigate to `http://localhost:7777/item/seed-1`
Expected: shows "톤업 선크림", "욕실 > 스킨케어" breadcrumb, 5-star rating, note, place, restock cycle, and both action buttons. Navigating to `/item/does-not-exist` shows the not-found message with a working "홈으로 돌아가기" link.

- [ ] **Step 3: Commit**

```bash
git add src/pages/ItemDetailPage.tsx
git commit -m "feat: implement item detail page"
```

---

### Task 14: Ranking page

**Files:**
- Modify: `src/pages/RankingPage.tsx`

**Interfaces:**
- Consumes: `useLocker()` (Task 7, for `items` and `categories`), `getRankingForCategory` (Task 8), `RatingStars`/`Badge` (Task 10).

- [ ] **Step 1: Write `src/pages/RankingPage.tsx`**

```tsx
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import { getRankingForCategory } from '../state/selectors'
import { RatingStars } from '../components/RatingStars'
import { Badge } from '../components/Badge'

export default function RankingPage() {
  const { items, categories } = useLocker()
  const navigate = useNavigate()
  const [selectedCategoryId, setSelectedCategoryId] = useState(categories[0].id)

  const ranking = useMemo(
    () => getRankingForCategory(items, selectedCategoryId),
    [items, selectedCategoryId]
  )

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold">랭킹</h1>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => setSelectedCategoryId(category.id)}
            className={`shrink-0 rounded-full px-3 py-1 text-sm ${
              selectedCategoryId === category.id ? 'bg-stamp text-white' : 'bg-card text-ink'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      {ranking.length === 0 ? (
        <p className="text-sm text-ink/50">이 카테고리에는 기록된 상품이 없습니다.</p>
      ) : (
        <ol className="space-y-2">
          {ranking.map((item, index) => (
            <li
              key={item.id}
              onClick={() => navigate(`/item/${item.id}`)}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-ink/10 bg-card p-3"
            >
              <span className="w-6 text-center font-heading text-lg">{index + 1}</span>
              <div className="flex-1">
                <p className="font-medium">{item.name}</p>
                {item.rating !== undefined && <RatingStars rating={item.rating} />}
              </div>
              {index === 0 && <Badge>다시 살래요</Badge>}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Manual browser verification**

Run: `npm run dev`, open `http://localhost:7777/ranking`
Expected: category chip row is scrollable, selecting "스킨케어" (or another category with 1+ items) shows a ranked list sorted by rating descending, and rank #1 shows the "다시 살래요" badge. Selecting a category with zero items shows the empty-state message.

- [ ] **Step 3: Commit**

```bash
git add src/pages/RankingPage.tsx
git commit -m "feat: implement ranking page with category chips"
```

---

### Task 15: Notifications page

**Files:**
- Modify: `src/pages/NotificationsPage.tsx`

**Interfaces:**
- Consumes: `useLocker()` (Task 7), `getUpcomingNotifications` (Task 8).

- [ ] **Step 1: Write `src/pages/NotificationsPage.tsx`**

```tsx
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import { getUpcomingNotifications } from '../state/selectors'

export default function NotificationsPage() {
  const { items } = useLocker()
  const navigate = useNavigate()
  const upcoming = useMemo(() => getUpcomingNotifications(items, 7), [items])

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold">알림</h1>

      {upcoming.length === 0 ? (
        <p className="text-sm text-ink/50">임박한 소모품이 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {upcoming.map((item) => (
            <li key={item.id} className="rounded-lg border border-ink/10 bg-card p-3">
              <div className="flex items-center justify-between">
                <p className="font-medium">{item.name}</p>
                <span className="text-warn">D-{item.daysUntilEmpty}</span>
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => navigate(`/item/${item.id}`)}
                  className="text-sm text-accent underline"
                >
                  상세보기
                </button>
                <a
                  href={item.affiliateUrl ?? '#'}
                  className="ml-auto rounded-full bg-stamp px-3 py-1 text-sm text-white"
                >
                  다시 담기
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Manual browser verification**

Run: `npm run dev`, open `http://localhost:7777/notifications`
Expected: shows `seed-2`(D-5) and `seed-5`(D-3) sorted ascending by days remaining; "다시 담기" and "상세보기" both present per row.

- [ ] **Step 3: Commit**

```bash
git add src/pages/NotificationsPage.tsx
git commit -m "feat: implement notifications page"
```

---

### Task 16: Share feed page (with save-to-locker)

**Files:**
- Modify: `src/pages/FeedPage.tsx`

**Interfaces:**
- Consumes: `useLocker().addItem` (Task 7), `FEED_POSTS` (Task 5), `RatingStars` (Task 10).

- [ ] **Step 1: Write `src/pages/FeedPage.tsx`**

```tsx
import { useState } from 'react'
import { useLocker } from '../state/LockerContext'
import { FEED_POSTS } from '../data/feedData'
import { RatingStars } from '../components/RatingStars'

export default function FeedPage() {
  const { addItem } = useLocker()
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())

  function handleSave(post: (typeof FEED_POSTS)[number]) {
    addItem({
      id: `feed-saved-${post.id}-${Date.now()}`,
      name: post.itemName,
      locationId: post.locationId,
      categoryId: post.categoryId,
      rating: post.rating,
      note: `${post.nickname}님 추천: ${post.comment}`,
      createdAt: new Date().toISOString().slice(0, 10),
    })
    setSavedIds((prev) => new Set(prev).add(post.id))
  }

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold">공유 피드</h1>
      <ul className="space-y-3">
        {FEED_POSTS.map((post) => (
          <li key={post.id} className="rounded-lg border border-ink/10 bg-card p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-ink/50">{post.nickname}</p>
              <RatingStars rating={post.rating} />
            </div>
            <p className="font-medium">{post.itemName}</p>
            <p className="text-sm">{post.comment}</p>
            <button
              type="button"
              disabled={savedIds.has(post.id)}
              onClick={() => handleSave(post)}
              className="mt-2 rounded-full bg-stamp px-3 py-1 text-sm text-white disabled:opacity-50"
            >
              {savedIds.has(post.id) ? '저장됨' : '저장하기'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 2: Manual browser verification**

Run: `npm run dev`, open `http://localhost:7777/feed`, click "저장하기" on any post, then navigate to `/` (home).
Expected: the button becomes "저장됨" and disabled; the home page now shows a new item with the feed post's name under the matching location/category, and it also appears in `/ranking` for that category.

- [ ] **Step 3: Commit**

```bash
git add src/pages/FeedPage.tsx
git commit -m "feat: implement share feed page with save-to-locker"
```

---

### Task 17: Family care page

**Files:**
- Modify: `src/pages/FamilyPage.tsx`

**Interfaces:**
- Consumes: `FAMILY_MEMBERS` (Task 5).

- [ ] **Step 1: Write `src/pages/FamilyPage.tsx`**

```tsx
import { useState } from 'react'
import { FAMILY_MEMBERS } from '../data/familyData'

export default function FamilyPage() {
  const [invited, setInvited] = useState(false)

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold">가족 케어</h1>

      <ul className="space-y-3">
        {FAMILY_MEMBERS.map((member) => (
          <li key={member.id} className="rounded-lg border border-ink/10 bg-card p-3">
            <p className="font-medium">
              {member.name} <span className="text-xs text-ink/50">({member.relation})</span>
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              {member.items.map((item, i) => (
                <li key={i} className="flex justify-between">
                  <span>{item.itemName}</span>
                  <span className="text-warn">D-{item.daysUntilEmpty}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => setInvited(true)}
        className="w-full rounded-lg bg-stamp py-2 text-white"
      >
        가족 초대하기
      </button>
      {invited && (
        <p className="text-center text-sm text-accent">
          초대 링크는 아직 준비 중이에요. (MVP에서는 실제 초대가 불가합니다)
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Manual browser verification**

Run: `npm run dev`, open `http://localhost:7777/family`
Expected: two dummy family members with their item/D-day lists render; clicking "가족 초대하기" shows the "아직 준비 중" message without navigating away or erroring.

- [ ] **Step 3: Commit**

```bash
git add src/pages/FamilyPage.tsx
git commit -m "feat: implement family care page"
```

---

### Task 18: New item form page

**Files:**
- Modify: `src/pages/NewItemPage.tsx`

**Interfaces:**
- Consumes: `useLocker()` (Task 7 — `items`, `locations`, `categories`, `addItem`, `updateItem`, `addLocation`, `addCategory`), `useNavigate`/`useSearchParams` from react-router-dom.

- [ ] **Step 1: Write `src/pages/NewItemPage.tsx`**

```tsx
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import type { Item } from '../types'

type ProgressMode = 'rating' | 'daysUntilEmpty'

export default function NewItemPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('editId')
  const { items, locations, categories, addItem, updateItem, addLocation, addCategory } =
    useLocker()
  const existing = editId ? items.find((i) => i.id === editId) : undefined

  const [name, setName] = useState(existing?.name ?? '')
  const [locationId, setLocationId] = useState(existing?.locationId ?? locations[0].id)
  const categoriesForLocation = useMemo(
    () => categories.filter((c) => c.locationId === locationId),
    [categories, locationId]
  )
  const [categoryId, setCategoryId] = useState(
    existing?.categoryId ?? categoriesForLocation[0]?.id ?? ''
  )
  const [masterItemId, setMasterItemId] = useState(existing?.masterItemId ?? '')
  const [place, setPlace] = useState(existing?.place ?? '')
  const [restockCycle, setRestockCycle] = useState(existing?.restockCycle ?? '')
  const [progressMode, setProgressMode] = useState<ProgressMode>(
    existing?.daysUntilEmpty !== undefined ? 'daysUntilEmpty' : 'rating'
  )
  const [rating, setRating] = useState(existing?.rating ?? 5)
  const [daysUntilEmpty, setDaysUntilEmpty] = useState(existing?.daysUntilEmpty ?? 30)
  const [note, setNote] = useState(existing?.note ?? '')
  const [newLocationName, setNewLocationName] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')

  const selectedCategory = categoriesForLocation.find((c) => c.id === categoryId)

  function handleLocationChange(nextLocationId: string) {
    setLocationId(nextLocationId)
    const nextCategories = categories.filter((c) => c.locationId === nextLocationId)
    setCategoryId(nextCategories[0]?.id ?? '')
    setMasterItemId('')
  }

  function handleAddLocation() {
    if (!newLocationName.trim()) return
    const created = addLocation(newLocationName.trim())
    setNewLocationName('')
    setLocationId(created.id)
    setCategoryId('')
  }

  function handleAddCategory() {
    if (!newCategoryName.trim() || !locationId) return
    const created = addCategory(locationId, newCategoryName.trim())
    setNewCategoryName('')
    setCategoryId(created.id)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const item: Item = {
      id: existing?.id ?? `item-${Date.now()}`,
      name,
      locationId,
      categoryId,
      masterItemId: masterItemId || undefined,
      place: place || undefined,
      restockCycle: restockCycle || null,
      note: note || undefined,
      rating: progressMode === 'rating' ? rating : undefined,
      daysUntilEmpty: progressMode === 'daysUntilEmpty' ? daysUntilEmpty : undefined,
      affiliateUrl: existing?.affiliateUrl ?? null,
      createdAt: existing?.createdAt ?? new Date().toISOString().slice(0, 10),
    }
    if (existing) {
      updateItem(existing.id, item)
    } else {
      addItem(item)
    }
    navigate('/')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      <h1 className="text-xl font-bold">{existing ? '메모 수정하기' : '새로 기록하기'}</h1>

      <label className="block text-sm">
        이름
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-ink/20 bg-card p-2"
        />
      </label>

      <label className="block text-sm">
        장소
        <select
          value={locationId}
          onChange={(e) => handleLocationChange(e.target.value)}
          className="mt-1 w-full rounded-lg border border-ink/20 bg-card p-2"
        >
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </label>
      <div className="flex gap-2">
        <input
          value={newLocationName}
          onChange={(e) => setNewLocationName(e.target.value)}
          placeholder="새 장소 이름 (예: 베란다)"
          className="flex-1 rounded-lg border border-ink/20 bg-card p-2 text-sm"
        />
        <button
          type="button"
          onClick={handleAddLocation}
          className="rounded-lg border border-ink/20 px-3 text-sm"
        >
          장소 추가
        </button>
      </div>

      <label className="block text-sm">
        카테고리
        <select
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value)
            setMasterItemId('')
          }}
          className="mt-1 w-full rounded-lg border border-ink/20 bg-card p-2"
        >
          {categoriesForLocation.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <div className="flex gap-2">
        <input
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          placeholder="새 카테고리 이름"
          className="flex-1 rounded-lg border border-ink/20 bg-card p-2 text-sm"
        />
        <button
          type="button"
          onClick={handleAddCategory}
          className="rounded-lg border border-ink/20 px-3 text-sm"
        >
          카테고리 추가
        </button>
      </div>

      {selectedCategory && (
        <label className="block text-sm">
          표준 품목과 연결 (선택)
          <select
            value={masterItemId}
            onChange={(e) => setMasterItemId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-ink/20 bg-card p-2"
          >
            <option value="">직접 입력 (커스텀 상품)</option>
            {selectedCategory.masterItems.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="block text-sm">
        구매처
        <input
          value={place}
          onChange={(e) => setPlace(e.target.value)}
          className="mt-1 w-full rounded-lg border border-ink/20 bg-card p-2"
        />
      </label>

      <label className="block text-sm">
        재구매 주기
        <input
          value={restockCycle}
          onChange={(e) => setRestockCycle(e.target.value)}
          placeholder="예: 약 2개월마다"
          className="mt-1 w-full rounded-lg border border-ink/20 bg-card p-2"
        />
      </label>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setProgressMode('rating')}
          className={`flex-1 rounded-lg py-2 text-sm ${
            progressMode === 'rating' ? 'bg-stamp text-white' : 'bg-card text-ink'
          }`}
        >
          만족도(별점)
        </button>
        <button
          type="button"
          onClick={() => setProgressMode('daysUntilEmpty')}
          className={`flex-1 rounded-lg py-2 text-sm ${
            progressMode === 'daysUntilEmpty' ? 'bg-stamp text-white' : 'bg-card text-ink'
          }`}
        >
          소진까지 D-day
        </button>
      </div>

      {progressMode === 'rating' ? (
        <label className="block text-sm">
          별점 (1-5)
          <input
            type="number"
            min={1}
            max={5}
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-ink/20 bg-card p-2"
          />
        </label>
      ) : (
        <label className="block text-sm">
          소진까지 남은 일수
          <input
            type="number"
            min={0}
            value={daysUntilEmpty}
            onChange={(e) => setDaysUntilEmpty(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-ink/20 bg-card p-2"
          />
        </label>
      )}

      <label className="block text-sm">
        메모
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="mt-1 w-full rounded-lg border border-ink/20 bg-card p-2"
          rows={3}
        />
      </label>

      <button type="submit" className="w-full rounded-lg bg-stamp py-2 text-white">
        저장하기
      </button>
    </form>
  )
}
```

- [ ] **Step 2: Manual browser verification**

Run: `npm run dev`, open `http://localhost:7777/new`
Expected:
- Changing "장소" updates the "카테고리" options and standard-item dropdown accordingly.
- Toggling 만족도/D-day swaps the numeric input shown.
- Submitting navigates to `/` and the new item appears under the chosen category.
- Visiting `/new?editId=seed-1` pre-fills the form with `seed-1`'s data, and submitting updates (not duplicates) that item — verify by checking `/item/seed-1` reflects the change and total item count on the home page is unchanged.
- Typing a name into "새 장소 이름" and clicking "장소 추가" adds it to the 장소 dropdown and auto-selects it (with an empty 카테고리 dropdown); typing a name into "새 카테고리 이름" and clicking "카테고리 추가" adds it under the currently selected location and auto-selects it. Reloading the page (or revisiting `/collection`) confirms the new location/category persisted.

- [ ] **Step 3: Commit**

```bash
git add src/pages/NewItemPage.tsx
git commit -m "feat: implement new/edit item form with inline location/category creation"
```

---

### Task 19: Collection page

**Files:**
- Modify: `src/pages/CollectionPage.tsx`

**Interfaces:**
- Consumes: `useLocker()` (Task 7 — `items`, `locations`, `categories`, `renameLocation`, `removeLocation`, `renameCategory`, `removeCategory`), `getLocationCompletion`/`getCategoryCompletion`/`getMissingMasterItems` (Task 8), `ProgressRing` (Task 9).

- [ ] **Step 1: Write `src/pages/CollectionPage.tsx`**

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import {
  getLocationCompletion,
  getCategoryCompletion,
  getMissingMasterItems,
} from '../state/selectors'
import { ProgressRing } from '../components/ProgressRing'

const LOCATION_COLOR_HEX: Record<string, string> = {
  bathroom: '#6E8F87',
  kitchen: '#C98F2B',
  laundry: '#7D93A6',
  closet: '#B0472E',
  vanity: '#A9789A',
  bedroom: '#8A8F6E',
  livingroom: '#9C8B5E',
  entrance: '#6F7D5C',
  medicine: '#B0763F',
  car: '#5C7A8B',
}

export default function CollectionPage() {
  const { items, locations, categories, renameLocation, removeLocation, renameCategory, removeCategory } =
    useLocker()
  const navigate = useNavigate()
  const [activeLocationId, setActiveLocationId] = useState(locations[0].id)

  const activeCategories = categories.filter((c) => c.locationId === activeLocationId)

  function handleRenameLocation(id: string, currentName: string) {
    const next = window.prompt('장소 이름 수정', currentName)
    if (next && next.trim()) renameLocation(id, next.trim())
  }

  function handleRemoveLocation(id: string, name: string) {
    if (window.confirm(`"${name}" 장소를 삭제하면 그 안의 카테고리와 상품도 함께 삭제됩니다. 계속할까요?`)) {
      removeLocation(id)
      if (activeLocationId === id) {
        const fallback = locations.find((l) => l.id !== id)
        if (fallback) setActiveLocationId(fallback.id)
      }
    }
  }

  function handleRenameCategory(id: string, currentName: string) {
    const next = window.prompt('카테고리 이름 수정', currentName)
    if (next && next.trim()) renameCategory(id, next.trim())
  }

  function handleRemoveCategory(id: string, name: string) {
    if (window.confirm(`"${name}" 카테고리를 삭제하면 그 안의 상품도 함께 삭제됩니다. 계속할까요?`)) {
      removeCategory(id)
    }
  }

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold">컬렉션</h1>

      <div className="grid grid-cols-3 gap-3">
        {locations.map((location) => {
          const percent = getLocationCompletion(items, location.id, categories)
          const color = LOCATION_COLOR_HEX[location.colorToken] ?? '#3F6459'
          return (
            <div key={location.id} className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveLocationId(location.id)}
                className={`flex flex-col items-center gap-1 rounded-lg p-2 ${
                  activeLocationId === location.id ? 'bg-card' : ''
                }`}
              >
                <ProgressRing percent={percent} color={color} size={56} strokeWidth={4}>
                  <span className="text-lg">📦</span>
                </ProgressRing>
                <span className="text-xs">{location.name}</span>
              </button>
              <div className="flex gap-1 text-xs text-ink/40">
                <button type="button" onClick={() => handleRenameLocation(location.id, location.name)}>
                  ✏️
                </button>
                <button type="button" onClick={() => handleRemoveLocation(location.id, location.name)}>
                  🗑️
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="space-y-3">
        {activeCategories.map((category) => {
          const percent = getCategoryCompletion(items, category)
          const missing = getMissingMasterItems(items, category)
          const owned = category.masterItems.filter(
            (m) => !missing.some((miss) => miss.id === m.id)
          )
          return (
            <div key={category.id} className="rounded-lg border border-ink/10 bg-card p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{category.name}</p>
                  <button
                    type="button"
                    onClick={() => handleRenameCategory(category.id, category.name)}
                    className="text-xs text-ink/40"
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveCategory(category.id, category.name)}
                    className="text-xs text-ink/40"
                  >
                    🗑️
                  </button>
                </div>
                <span className="text-sm text-ink/50">{percent}%</span>
              </div>
              <div className="mb-2 h-2 rounded-full bg-paper">
                <div
                  className="h-2 rounded-full bg-accent"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <ul className="space-y-1 text-sm">
                {owned.map((m) => (
                  <li key={m.id} className="text-ink">
                    ✅ {m.name}
                  </li>
                ))}
                {missing.map((m) => (
                  <li key={m.id} className="flex items-center justify-between text-ink/40">
                    <span>⬜ {m.name}</span>
                    <button
                      type="button"
                      onClick={() => navigate('/new')}
                      className="text-xs text-accent underline"
                    >
                      기록하기
                    </button>
                  </li>
                ))}
                {category.masterItems.length === 0 && (
                  <li className="text-ink/40">표준 품목이 아직 없는 카테고리입니다.</li>
                )}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Manual browser verification**

Run: `npm run dev`, open `http://localhost:7777/collection`
Expected:
- 9 location rings show varying percentages matching the seed data (locations with more matched `masterItemId`s show higher %).
- Clicking a different location ring switches the category list below to that location's categories.
- Each category shows a progress bar, a checklist of owned items (✅) and missing items (⬜) with a "기록하기" shortcut that navigates to `/new`.
- Adding a new item from `/new` with a matched `masterItemId`, then returning to `/collection`, shows the percentage and checklist updated immediately.
- Clicking ✏️ next to a location or category prompts for a new name and updates it in place; clicking 🗑️ asks for confirmation and, once confirmed, removes it (and its nested categories/items for a location, or its items for a category) — verify the home page and ranking page no longer show the deleted items.
- A category created from `/new` with no standard items shows "표준 품목이 아직 없는 카테고리입니다." instead of an empty checklist.

- [ ] **Step 3: Commit**

```bash
git add src/pages/CollectionPage.tsx
git commit -m "feat: implement collection page with per-location gauges, checklists, and rename/delete"
```

---

### Task 20: Full app smoke test (final verification pass)

**Files:**
- None (verification only, no new files).

**Interfaces:**
- Consumes: the entire app built in Tasks 1–19.

- [ ] **Step 1: Run the automated test suite**

Run: `npm run test`
Expected: all unit tests across `src/data/*.test.ts`, `src/hooks/*.test.ts`, `src/state/*.test.ts`, `src/components/*.test.tsx` pass.

- [ ] **Step 2: Type-check and build**

Run: `npm run build`
Expected: TypeScript compiles with no errors and Vite produces a `dist/` bundle.

- [ ] **Step 3: Manual golden-path walkthrough in the browser**

Run: `npm run dev`, open `http://localhost:7777`, and walk through:
1. Home shows 9 rings + seeded items grouped by category; search and "임박만" filter both work.
2. Click an item → detail page shows correct data → "메모 수정하기" → change the note → save → detail page reflects the new note.
3. `/ranking` → pick a category with 2+ items → verify order matches rating and #1 has the badge.
4. `/notifications` → confirm only items with `daysUntilEmpty <= 7` appear, sorted ascending.
5. `/feed` → save a post → confirm it now appears on `/` and in `/ranking` for its category.
6. `/family` → confirm dummy member data renders, "가족 초대하기" shows the placeholder message.
7. `/new` → add a brand-new item with a matched standard item → confirm it appears on `/`, and `/collection`'s relevant category percentage increased.
8. `/collection` → click through a few location rings → confirm percentages and checklists are consistent with what's on `/`.
9. `/new` → add a custom location ("베란다") and a custom category under it → confirm both appear immediately in the dropdowns and persist after a page reload.
10. `/collection` → rename a location and a category via ✏️, then delete a category via 🗑️ → confirm the rename shows immediately everywhere (home page location rail, ranking chips) and the deleted category's items are gone from `/` and `/ranking`.

Expected: no console errors at any step, all interactions behave as described.

- [ ] **Step 4: Commit final state (if any fixes were made during verification)**

```bash
git add -A
git commit -m "test: verify full REMEMBUY MVP golden path"
```

If no fixes were needed, skip this commit — nothing to record.
