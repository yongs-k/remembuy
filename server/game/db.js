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

const DEFAULT_ITEMS = [
  { id: 'item-basin-basic', name: '기본 세면대', grade: 'COMMON', fragmentsRequired: 10, fragmentWeight: 40 },
  { id: 'item-towel-rack', name: '수건 선반', grade: 'COMMON', fragmentsRequired: 10, fragmentWeight: 40 },
  { id: 'item-soap-dispenser', name: '비누 디스펜서', grade: 'COMMON', fragmentsRequired: 10, fragmentWeight: 40 },
  { id: 'item-bath-mat', name: '욕실 매트', grade: 'COMMON', fragmentsRequired: 10, fragmentWeight: 40 },
  { id: 'item-basin-modern', name: '모던 세면대', grade: 'ADVANCED', fragmentsRequired: 15, fragmentWeight: 25 },
  { id: 'item-shower-rain', name: '레인 샤워기', grade: 'ADVANCED', fragmentsRequired: 15, fragmentWeight: 25 },
  { id: 'item-vanity-shelf', name: '수납 선반장', grade: 'ADVANCED', fragmentsRequired: 15, fragmentWeight: 25 },
  { id: 'item-heated-rack', name: '온열 수건걸이', grade: 'ADVANCED', fragmentsRequired: 15, fragmentWeight: 25 },
  { id: 'item-mirror-gold', name: '골드 거울', grade: 'RARE', fragmentsRequired: 20, fragmentWeight: 12 },
  { id: 'item-tub-stone', name: '스톤 욕조', grade: 'RARE', fragmentsRequired: 20, fragmentWeight: 12 },
  { id: 'item-faucet-brass', name: '브라스 수전', grade: 'RARE', fragmentsRequired: 20, fragmentWeight: 12 },
  { id: 'item-tub-premium', name: '프리미엄 욕조', grade: 'LEGENDARY', fragmentsRequired: 30, fragmentWeight: 5 },
  { id: 'item-chandelier', name: '크리스탈 조명', grade: 'LEGENDARY', fragmentsRequired: 30, fragmentWeight: 5 },
  { id: 'item-spa-set', name: '스파 세트', grade: 'LEGENDARY', fragmentsRequired: 30, fragmentWeight: 5 },
]

const DEFAULT_BOXES = [{ id: 'box-starter', name: '시작 상자', costPoints: 500 }]

function seedItemsAndBoxes(db) {
  const existing = db.prepare('SELECT COUNT(*) AS n FROM virtual_items').get().n
  if (existing > 0) return
  transaction(db, () => {
    const insertItem = db.prepare(
      'INSERT INTO virtual_items (id, name, grade, fragments_required) VALUES (?, ?, ?, ?)'
    )
    for (const item of DEFAULT_ITEMS) {
      insertItem.run(item.id, item.name, item.grade, item.fragmentsRequired)
    }
    const insertBox = db.prepare('INSERT INTO boxes (id, name, cost_points) VALUES (?, ?, ?)')
    for (const box of DEFAULT_BOXES) {
      insertBox.run(box.id, box.name, box.costPoints)
    }
    const insertEntry = db.prepare(
      'INSERT INTO box_drop_entries (box_id, item_id, result_type, weight) VALUES (?, ?, ?, ?)'
    )
    for (const box of DEFAULT_BOXES) {
      for (const item of DEFAULT_ITEMS) {
        insertEntry.run(box.id, item.id, 'FRAGMENT', item.fragmentWeight)
        insertEntry.run(box.id, item.id, 'FULL_ITEM', 1)
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

export function migrate(db, { catalog } = {}) {
  db.exec(SCHEMA)
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
