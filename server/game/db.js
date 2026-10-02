import { DatabaseSync } from 'node:sqlite'
import { mkdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

const SCHEMA_VERSION = '1'

const SCHEMA = `
CREATE TABLE IF NOT EXISTS schema_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS spaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS product_groups (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES spaces(id),
  name TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS slots (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES product_groups(id),
  name TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS slot_claims (
  user_id TEXT NOT NULL REFERENCES users(id),
  slot_id TEXT NOT NULL REFERENCES slots(id),
  claimed_at TEXT NOT NULL,
  PRIMARY KEY (user_id, slot_id)
);
CREATE TABLE IF NOT EXISTS group_completions (
  user_id TEXT NOT NULL REFERENCES users(id),
  group_id TEXT NOT NULL REFERENCES product_groups(id),
  completed_at TEXT NOT NULL,
  PRIMARY KEY (user_id, group_id)
);
CREATE TABLE IF NOT EXISTS title_tiers (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  min_percent INTEGER NOT NULL,
  sort INTEGER NOT NULL,
  color_token TEXT NOT NULL,
  reward_points INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS user_titles (
  user_id TEXT NOT NULL REFERENCES users(id),
  space_id TEXT NOT NULL REFERENCES spaces(id),
  tier_code TEXT NOT NULL REFERENCES title_tiers(code),
  earned_at TEXT NOT NULL,
  PRIMARY KEY (user_id, space_id, tier_code)
);
CREATE TABLE IF NOT EXISTS title_benefits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tier_code TEXT NOT NULL REFERENCES title_tiers(code),
  type TEXT NOT NULL,
  value INTEGER NOT NULL DEFAULT 0,
  payload TEXT,
  start_at TEXT,
  end_at TEXT,
  event_id TEXT
);
CREATE TABLE IF NOT EXISTS point_rules (
  key TEXT PRIMARY KEY,
  amount INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS point_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  amount INTEGER NOT NULL,
  type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_point_history_user ON point_history (user_id, id);
CREATE TABLE IF NOT EXISTS virtual_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  grade TEXT NOT NULL,
  fragments_required INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  room_type TEXT,
  placement_type TEXT,
  width INTEGER,
  height INTEGER,
  asset_id TEXT,
  theme_id TEXT,
  set_id TEXT
);
CREATE TABLE IF NOT EXISTS boxes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cost_points INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  start_at TEXT,
  end_at TEXT,
  event_id TEXT,
  limited INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS box_drop_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  box_id TEXT NOT NULL REFERENCES boxes(id),
  item_id TEXT NOT NULL REFERENCES virtual_items(id),
  result_type TEXT NOT NULL,
  weight INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS user_item_fragments (
  user_id TEXT NOT NULL REFERENCES users(id),
  item_id TEXT NOT NULL REFERENCES virtual_items(id),
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, item_id)
);
CREATE TABLE IF NOT EXISTS user_items (
  user_id TEXT NOT NULL REFERENCES users(id),
  item_id TEXT NOT NULL REFERENCES virtual_items(id),
  status TEXT NOT NULL,
  completed_at TEXT,
  PRIMARY KEY (user_id, item_id)
);
-- 장소 stages: 4 fragments of a grade complete it (e.g. 일반 욕실) and open the next grade.
CREATE TABLE IF NOT EXISTS user_room_fragments (
  user_id TEXT NOT NULL REFERENCES users(id),
  space_id TEXT NOT NULL,
  grade TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, space_id, grade)
);
-- 장소 puzzle pieces: four slots per grade (0 top-left, 1 top-right, 2 bottom-right,
-- 3 bottom-left). count > 1 means duplicates, which 조합 turns into a higher grade.
CREATE TABLE IF NOT EXISTS user_room_pieces (
  user_id TEXT NOT NULL REFERENCES users(id),
  space_id TEXT NOT NULL,
  grade TEXT NOT NULL,
  slot INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, space_id, grade, slot)
);
-- Quest rewards claimed; period is 'once' or the KST day for daily quests.
CREATE TABLE IF NOT EXISTS quest_claims (
  user_id TEXT NOT NULL REFERENCES users(id),
  quest_id TEXT NOT NULL,
  period TEXT NOT NULL,
  claimed_at TEXT NOT NULL,
  PRIMARY KEY (user_id, quest_id, period)
);
-- One free box per device per Korean calendar day (출석하기).
CREATE TABLE IF NOT EXISTS attendance (
  user_id TEXT NOT NULL REFERENCES users(id),
  day TEXT NOT NULL,
  box_id TEXT NOT NULL,
  claimed_at TEXT NOT NULL,
  PRIMARY KEY (user_id, day)
);
`

const DEFAULT_TIERS = [
  { code: 'SPROUT', name: '새싹', min_percent: 25, sort: 1, color_token: 'gray', reward_points: 200, rate_bp: 0 },
  { code: 'MANAGER', name: '관리자', min_percent: 50, sort: 2, color_token: 'green', reward_points: 500, rate_bp: 300 },
  { code: 'EXPERT', name: '전문가', min_percent: 75, sort: 3, color_token: 'purple', reward_points: 1000, rate_bp: 700 },
  { code: 'MASTER', name: '마스터', min_percent: 100, sort: 4, color_token: 'red', reward_points: 2000, rate_bp: 1200 },
]

export function loadDefaultCatalog() {
  return JSON.parse(readFileSync(new URL('./catalog.seed.json', import.meta.url), 'utf-8'))
}

// roomType ties each item to a 장소 (spaces.id) so 장소 tiles can show its fragments.
const DEFAULT_ITEMS = [
  { id: 'item-basin-basic', name: '기본 세면대', grade: 'COMMON', fragmentsRequired: 10, fragmentWeight: 40, roomType: 'bathroom' },
  { id: 'item-towel-rack', name: '수건 선반', grade: 'COMMON', fragmentsRequired: 10, fragmentWeight: 40, roomType: 'bathroom' },
  { id: 'item-soap-dispenser', name: '비누 디스펜서', grade: 'COMMON', fragmentsRequired: 10, fragmentWeight: 40, roomType: 'bathroom' },
  { id: 'item-bath-mat', name: '욕실 매트', grade: 'COMMON', fragmentsRequired: 10, fragmentWeight: 40, roomType: 'bathroom' },
  { id: 'item-basin-modern', name: '모던 세면대', grade: 'ADVANCED', fragmentsRequired: 15, fragmentWeight: 25, roomType: 'bathroom' },
  { id: 'item-shower-rain', name: '레인 샤워기', grade: 'ADVANCED', fragmentsRequired: 15, fragmentWeight: 25, roomType: 'bathroom' },
  { id: 'item-vanity-shelf', name: '수납 선반장', grade: 'ADVANCED', fragmentsRequired: 15, fragmentWeight: 25, roomType: 'bathroom' },
  { id: 'item-heated-rack', name: '온열 수건걸이', grade: 'ADVANCED', fragmentsRequired: 15, fragmentWeight: 25, roomType: 'bathroom' },
  { id: 'item-mirror-gold', name: '골드 거울', grade: 'RARE', fragmentsRequired: 20, fragmentWeight: 12, roomType: 'bathroom' },
  { id: 'item-tub-stone', name: '스톤 욕조', grade: 'RARE', fragmentsRequired: 20, fragmentWeight: 12, roomType: 'bathroom' },
  { id: 'item-faucet-brass', name: '브라스 수전', grade: 'RARE', fragmentsRequired: 20, fragmentWeight: 12, roomType: 'bathroom' },
  { id: 'item-tub-premium', name: '프리미엄 욕조', grade: 'LEGENDARY', fragmentsRequired: 30, fragmentWeight: 5, roomType: 'bathroom' },
  { id: 'item-chandelier', name: '크리스탈 조명', grade: 'LEGENDARY', fragmentsRequired: 30, fragmentWeight: 5, roomType: 'bathroom' },
  { id: 'item-spa-set', name: '스파 세트', grade: 'LEGENDARY', fragmentsRequired: 30, fragmentWeight: 5, roomType: 'bathroom' },
  { id: 'item-kitchen-cutting-board', name: '원목 도마', grade: 'COMMON', fragmentsRequired: 10, fragmentWeight: 40, roomType: 'kitchen' },
  { id: 'item-kitchen-spice-rack', name: '양념 선반', grade: 'COMMON', fragmentsRequired: 10, fragmentWeight: 40, roomType: 'kitchen' },
  { id: 'item-kitchen-cast-pot', name: '무쇠 냄비', grade: 'ADVANCED', fragmentsRequired: 15, fragmentWeight: 25, roomType: 'kitchen' },
  { id: 'item-kitchen-marble-island', name: '대리석 아일랜드', grade: 'RARE', fragmentsRequired: 20, fragmentWeight: 12, roomType: 'kitchen' },
  { id: 'item-kitchen-chef-oven', name: '셰프의 오븐', grade: 'LEGENDARY', fragmentsRequired: 30, fragmentWeight: 5, roomType: 'kitchen' },
  { id: 'item-laundry-laundry-basket', name: '빨래 바구니', grade: 'COMMON', fragmentsRequired: 10, fragmentWeight: 40, roomType: 'laundry' },
  { id: 'item-laundry-drying-rack', name: '빨래 건조대', grade: 'COMMON', fragmentsRequired: 10, fragmentWeight: 40, roomType: 'laundry' },
  { id: 'item-laundry-drum-washer', name: '드럼 세탁기', grade: 'ADVANCED', fragmentsRequired: 15, fragmentWeight: 25, roomType: 'laundry' },
  { id: 'item-laundry-steam-station', name: '스팀 다림질대', grade: 'RARE', fragmentsRequired: 20, fragmentWeight: 12, roomType: 'laundry' },
  { id: 'item-laundry-silk-styler', name: '실크 케어 스타일러', grade: 'LEGENDARY', fragmentsRequired: 30, fragmentWeight: 5, roomType: 'laundry' },
  { id: 'item-closet-wood-hanger', name: '원목 옷걸이', grade: 'COMMON', fragmentsRequired: 10, fragmentWeight: 40, roomType: 'closet' },
  { id: 'item-closet-storage-box', name: '수납 박스', grade: 'COMMON', fragmentsRequired: 10, fragmentWeight: 40, roomType: 'closet' },
  { id: 'item-closet-full-mirror', name: '전신 거울', grade: 'ADVANCED', fragmentsRequired: 15, fragmentWeight: 25, roomType: 'closet' },
  { id: 'item-closet-walk-in', name: '워크인 드레스룸', grade: 'RARE', fragmentsRequired: 20, fragmentWeight: 12, roomType: 'closet' },
  { id: 'item-closet-heritage-trunk', name: '헤리티지 트렁크', grade: 'LEGENDARY', fragmentsRequired: 30, fragmentWeight: 5, roomType: 'closet' },
  { id: 'item-vanity-brush-set', name: '메이크업 브러시', grade: 'COMMON', fragmentsRequired: 10, fragmentWeight: 40, roomType: 'vanity' },
  { id: 'item-vanity-acrylic-case', name: '아크릴 정리함', grade: 'COMMON', fragmentsRequired: 10, fragmentWeight: 40, roomType: 'vanity' },
  { id: 'item-vanity-lit-mirror', name: '조명 거울', grade: 'ADVANCED', fragmentsRequired: 15, fragmentWeight: 25, roomType: 'vanity' },
  { id: 'item-vanity-antique-vanity', name: '앤틱 화장대', grade: 'RARE', fragmentsRequired: 20, fragmentWeight: 12, roomType: 'vanity' },
  { id: 'item-vanity-crystal-perfume', name: '크리스탈 향수 컬렉션', grade: 'LEGENDARY', fragmentsRequired: 30, fragmentWeight: 5, roomType: 'vanity' },
  { id: 'item-bedroom-linen-pillow', name: '린넨 베개', grade: 'COMMON', fragmentsRequired: 10, fragmentWeight: 40, roomType: 'bedroom' },
  { id: 'item-bedroom-mood-lamp', name: '무드등', grade: 'COMMON', fragmentsRequired: 10, fragmentWeight: 40, roomType: 'bedroom' },
  { id: 'item-bedroom-hotel-bedding', name: '호텔 침구 세트', grade: 'ADVANCED', fragmentsRequired: 15, fragmentWeight: 25, roomType: 'bedroom' },
  { id: 'item-bedroom-canopy-bed', name: '캐노피 침대', grade: 'RARE', fragmentsRequired: 20, fragmentWeight: 12, roomType: 'bedroom' },
  { id: 'item-bedroom-suite-bed', name: '스위트 킹 침대', grade: 'LEGENDARY', fragmentsRequired: 30, fragmentWeight: 5, roomType: 'bedroom' },
  { id: 'item-livingroom-cushion', name: '쿠션', grade: 'COMMON', fragmentsRequired: 10, fragmentWeight: 40, roomType: 'livingroom' },
  { id: 'item-livingroom-rug', name: '러그', grade: 'COMMON', fragmentsRequired: 10, fragmentWeight: 40, roomType: 'livingroom' },
  { id: 'item-livingroom-floor-lamp', name: '플로어 스탠드', grade: 'ADVANCED', fragmentsRequired: 15, fragmentWeight: 25, roomType: 'livingroom' },
  { id: 'item-livingroom-leather-sofa', name: '가죽 소파', grade: 'RARE', fragmentsRequired: 20, fragmentWeight: 12, roomType: 'livingroom' },
  { id: 'item-livingroom-grand-piano', name: '그랜드 피아노', grade: 'LEGENDARY', fragmentsRequired: 30, fragmentWeight: 5, roomType: 'livingroom' },
  { id: 'item-entrance-umbrella-stand', name: '우산꽂이', grade: 'COMMON', fragmentsRequired: 10, fragmentWeight: 40, roomType: 'entrance' },
  { id: 'item-entrance-door-mat', name: '현관 매트', grade: 'COMMON', fragmentsRequired: 10, fragmentWeight: 40, roomType: 'entrance' },
  { id: 'item-entrance-shoe-bench', name: '슈즈 벤치', grade: 'ADVANCED', fragmentsRequired: 15, fragmentWeight: 25, roomType: 'entrance' },
  { id: 'item-entrance-shoe-cabinet', name: '원목 신발장', grade: 'RARE', fragmentsRequired: 20, fragmentWeight: 12, roomType: 'entrance' },
  { id: 'item-entrance-marble-foyer', name: '대리석 현관', grade: 'LEGENDARY', fragmentsRequired: 30, fragmentWeight: 5, roomType: 'entrance' },
  { id: 'item-medicine-first-aid', name: '구급 파우치', grade: 'COMMON', fragmentsRequired: 10, fragmentWeight: 40, roomType: 'medicine' },
  { id: 'item-medicine-thermometer', name: '체온계', grade: 'COMMON', fragmentsRequired: 10, fragmentWeight: 40, roomType: 'medicine' },
  { id: 'item-medicine-pill-organizer', name: '약 정리함', grade: 'ADVANCED', fragmentsRequired: 15, fragmentWeight: 25, roomType: 'medicine' },
  { id: 'item-medicine-antique-cabinet', name: '앤틱 약장', grade: 'RARE', fragmentsRequired: 20, fragmentWeight: 12, roomType: 'medicine' },
  { id: 'item-medicine-master-apothecary', name: '명의의 약상자', grade: 'LEGENDARY', fragmentsRequired: 30, fragmentWeight: 5, roomType: 'medicine' },
  { id: 'item-car-diffuser', name: '차량용 방향제', grade: 'COMMON', fragmentsRequired: 10, fragmentWeight: 40, roomType: 'car' },
  { id: 'item-car-cushion', name: '차량용 쿠션', grade: 'COMMON', fragmentsRequired: 10, fragmentWeight: 40, roomType: 'car' },
  { id: 'item-car-trunk-organizer', name: '트렁크 정리함', grade: 'ADVANCED', fragmentsRequired: 15, fragmentWeight: 25, roomType: 'car' },
  { id: 'item-car-leather-seat', name: '가죽 시트 커버', grade: 'RARE', fragmentsRequired: 20, fragmentWeight: 12, roomType: 'car' },
  { id: 'item-car-classic-key', name: '클래식카 키', grade: 'LEGENDARY', fragmentsRequired: 30, fragmentWeight: 5, roomType: 'car' },
]

const DEFAULT_BOXES = [{ id: 'box-starter', name: '시작 상자', costPoints: 500 }]

// Additive on every start: new default items join existing databases (and the
// default boxes' drop tables); items already there only get a missing roomType.
function seedItemsAndBoxes(db) {
  transaction(db, () => {
    if (db.prepare('SELECT COUNT(*) AS n FROM boxes').get().n === 0) {
      const insertBox = db.prepare('INSERT INTO boxes (id, name, cost_points) VALUES (?, ?, ?)')
      for (const box of DEFAULT_BOXES) insertBox.run(box.id, box.name, box.costPoints)
    }
    const boxIds = DEFAULT_BOXES.map((box) => box.id).filter((id) =>
      db.prepare('SELECT 1 AS x FROM boxes WHERE id = ?').get(id)
    )
    const insertItem = db.prepare(
      'INSERT OR IGNORE INTO virtual_items (id, name, grade, fragments_required, room_type) VALUES (?, ?, ?, ?, ?)'
    )
    const setRoom = db.prepare('UPDATE virtual_items SET room_type = ? WHERE id = ? AND room_type IS NULL')
    const insertEntry = db.prepare(
      'INSERT INTO box_drop_entries (box_id, item_id, result_type, weight) VALUES (?, ?, ?, ?)'
    )
    for (const item of DEFAULT_ITEMS) {
      const inserted = insertItem.run(item.id, item.name, item.grade, item.fragmentsRequired, item.roomType).changes > 0
      if (!inserted) {
        setRoom.run(item.roomType, item.id)
        continue
      }
      for (const boxId of boxIds) {
        insertEntry.run(boxId, item.id, 'FRAGMENT', item.fragmentWeight)
        insertEntry.run(boxId, item.id, 'FULL_ITEM', 1)
      }
    }
  })
}

export function transaction(db, fn) {
  db.exec('BEGIN IMMEDIATE')
  try {
    const result = fn()
    db.exec('COMMIT')
    return result
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

function seedConfig(db) {
  const existing = db.prepare('SELECT COUNT(*) AS n FROM title_tiers').get().n
  if (existing > 0) return
  transaction(db, () => {
    const insertTier = db.prepare(
      'INSERT INTO title_tiers (code, name, min_percent, sort, color_token, reward_points) VALUES (?, ?, ?, ?, ?, ?)'
    )
    const insertBenefit = db.prepare(
      "INSERT INTO title_benefits (tier_code, type, value) VALUES (?, 'POINT_RATE', ?)"
    )
    for (const tier of DEFAULT_TIERS) {
      insertTier.run(tier.code, tier.name, tier.min_percent, tier.sort, tier.color_token, tier.reward_points)
      insertBenefit.run(tier.code, tier.rate_bp)
    }
    db.prepare('INSERT INTO point_rules (key, amount) VALUES (?, ?)').run('COLLECTION_COMPLETE', 500)
  })
}

function seedCatalog(db, catalog) {
  const existing = db.prepare('SELECT COUNT(*) AS n FROM spaces').get().n
  if (existing > 0) return
  transaction(db, () => {
    const insertSpace = db.prepare('INSERT INTO spaces (id, name, sort) VALUES (?, ?, ?)')
    const insertGroup = db.prepare('INSERT INTO product_groups (id, space_id, name, sort) VALUES (?, ?, ?, ?)')
    const insertSlot = db.prepare('INSERT INTO slots (id, group_id, name, sort) VALUES (?, ?, ?, ?)')
    catalog.spaces.forEach((space, spaceIndex) => {
      insertSpace.run(space.id, space.name, spaceIndex)
      space.groups.forEach((group, groupIndex) => {
        insertGroup.run(group.id, space.id, group.name, groupIndex)
        group.slots.forEach((slot, slotIndex) => {
          insertSlot.run(slot.id, group.id, slot.name, slotIndex)
        })
      })
    })
  })
}

// The first stage model counted fragments per grade; each became one puzzle slot.
function migrateRoomFragmentsToPieces(db) {
  if (db.prepare('SELECT COUNT(*) AS n FROM user_room_fragments').get().n === 0) return
  transaction(db, () => {
    const insert = db.prepare(
      `INSERT INTO user_room_pieces (user_id, space_id, grade, slot, count) VALUES (?, ?, ?, ?, 1)
       ON CONFLICT (user_id, space_id, grade, slot) DO UPDATE SET count = count + 1`
    )
    for (const row of db.prepare('SELECT user_id, space_id, grade, count FROM user_room_fragments').all()) {
      for (let i = 0; i < row.count; i++) insert.run(row.user_id, row.space_id, row.grade, Math.min(i, 3))
    }
    db.exec('DELETE FROM user_room_fragments')
  })
}

export function migrate(db, { catalog } = {}) {
  db.exec(SCHEMA)
  migrateRoomFragmentsToPieces(db)
  db.prepare("INSERT OR IGNORE INTO schema_meta (key, value) VALUES ('schema_version', ?)").run(SCHEMA_VERSION)
  seedConfig(db)
  if (catalog) seedCatalog(db, catalog)
  seedItemsAndBoxes(db)
}

export function openDb(file, { catalog = loadDefaultCatalog() } = {}) {
  if (file !== ':memory:') mkdirSync(path.dirname(file), { recursive: true })
  const db = new DatabaseSync(file)
  db.exec('PRAGMA foreign_keys = ON')
  if (file !== ':memory:') db.exec('PRAGMA journal_mode = WAL')
  migrate(db, { catalog })
  return db
}
