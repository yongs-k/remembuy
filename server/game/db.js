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
}

export function openDb(file, { catalog = loadDefaultCatalog() } = {}) {
  if (file !== ':memory:') mkdirSync(path.dirname(file), { recursive: true })
  const db = new DatabaseSync(file)
  db.exec('PRAGMA foreign_keys = ON')
  if (file !== ':memory:') db.exec('PRAGMA journal_mode = WAL')
  migrate(db, { catalog })
  return db
}
