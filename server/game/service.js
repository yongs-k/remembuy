import { transaction } from './db.js'
import { percentOf, tiersReached, highestTier, nextTier, bonusPoints, benefitActive, pointRateBp } from './rules.js'

const ACTIVE_SLOTS = `
  FROM slots s
  JOIN product_groups g ON g.id = s.group_id
  JOIN spaces sp ON sp.id = g.space_id
  WHERE s.active = 1 AND g.active = 1 AND sp.active = 1`

const plain = (rows) => rows.map((row) => ({ ...row }))

function loadTiers(db) {
  return plain(
    db
      .prepare('SELECT code, name, min_percent, sort, color_token, reward_points FROM title_tiers ORDER BY sort')
      .all()
  )
}

function loadBenefits(db) {
  return plain(
    db
      .prepare('SELECT id, tier_code, type, value, payload, start_at, end_at, event_id FROM title_benefits ORDER BY id')
      .all()
  )
}

function ruleAmount(db, key) {
  const row = db.prepare('SELECT amount FROM point_rules WHERE key = ?').get(key)
  return row ? row.amount : 0
}

function spaceCounts(db, userId, spaceId) {
  const total = db.prepare(`SELECT COUNT(*) AS n ${ACTIVE_SLOTS} AND sp.id = ?`).get(spaceId).n
  const claimed = db
    .prepare(
      `SELECT COUNT(*) AS n ${ACTIVE_SLOTS} AND sp.id = ?
       AND s.id IN (SELECT slot_id FROM slot_claims WHERE user_id = ?)`
    )
    .get(spaceId, userId).n
  return { claimed, total }
}

function groupCounts(db, userId, groupId) {
  const total = db.prepare(`SELECT COUNT(*) AS n ${ACTIVE_SLOTS} AND g.id = ?`).get(groupId).n
  const claimed = db
    .prepare(
      `SELECT COUNT(*) AS n ${ACTIVE_SLOTS} AND g.id = ?
       AND s.id IN (SELECT slot_id FROM slot_claims WHERE user_id = ?)`
    )
    .get(groupId, userId).n
  return { claimed, total }
}

function earnedCodes(db, userId, spaceId) {
  return db
    .prepare('SELECT tier_code FROM user_titles WHERE user_id = ? AND space_id = ?')
    .all(userId, spaceId)
    .map((row) => row.tier_code)
}

export function getCatalog(db) {
  const spaces = plain(db.prepare('SELECT id, name FROM spaces WHERE active = 1 ORDER BY sort, id').all())
  const groups = plain(
    db.prepare('SELECT id, space_id, name FROM product_groups WHERE active = 1 ORDER BY sort, id').all()
  )
  const slots = plain(db.prepare('SELECT id, group_id, name FROM slots WHERE active = 1 ORDER BY sort, id').all())
  return {
    spaces: spaces.map((space) => ({
      id: space.id,
      name: space.name,
      groups: groups
        .filter((group) => group.space_id === space.id)
        .map((group) => ({
          id: group.id,
          name: group.name,
          slots: slots.filter((s) => s.group_id === group.id).map((s) => ({ id: s.id, name: s.name })),
        })),
    })),
    titleTiers: loadTiers(db).map((tier) => ({
      code: tier.code,
      name: tier.name,
      minPercent: tier.min_percent,
      colorToken: tier.color_token,
      rewardPoints: tier.reward_points,
    })),
  }
}

export function getState(db, userId, now = new Date()) {
  const tiers = loadTiers(db)
  const benefits = loadBenefits(db)
  const points = db
    .prepare('SELECT COALESCE(SUM(amount), 0) AS n FROM point_history WHERE user_id = ?')
    .get(userId).n
  const titles = plain(
    db
      .prepare('SELECT space_id, tier_code, earned_at FROM user_titles WHERE user_id = ? ORDER BY earned_at, tier_code')
      .all(userId)
  ).map((row) => ({ spaceId: row.space_id, tierCode: row.tier_code, earnedAt: row.earned_at }))
  const spaceRows = db.prepare('SELECT id FROM spaces WHERE active = 1 ORDER BY sort, id').all()

  const spaces = []
  const activeBenefits = []
  for (const { id: spaceId } of spaceRows) {
    const { claimed, total } = spaceCounts(db, userId, spaceId)
    const percent = percentOf(claimed, total)
    const earned = earnedCodes(db, userId, spaceId)
    const highest = highestTier(tiers.filter((tier) => earned.includes(tier.code)))
    const next = nextTier(earned, tiers)
    spaces.push({
      spaceId,
      claimed,
      total,
      percent,
      highestTier: highest ? highest.code : null,
      nextTier: next ? next.code : null,
      percentToNext: next ? Math.max(0, next.min_percent - percent) : 0,
      bonusRateBp: pointRateBp(benefits, highest ? highest.code : null, now),
    })
    if (highest) {
      for (const b of benefits) {
        if (b.tier_code === highest.code && benefitActive(b, now)) {
          activeBenefits.push({
            spaceId,
            tierCode: b.tier_code,
            type: b.type,
            value: b.value,
            payload: b.payload,
            startAt: b.start_at,
            endAt: b.end_at,
            eventId: b.event_id,
          })
        }
      }
    }
  }
  return { points, spaces, titles, benefits: activeBenefits }
}

export function getHistory(db, userId, { limit = 50, before } = {}) {
  const rows = plain(
    before === undefined
      ? db
          .prepare(
            'SELECT id, amount, type, source_id, created_at FROM point_history WHERE user_id = ? ORDER BY id DESC LIMIT ?'
          )
          .all(userId, limit + 1)
      : db
          .prepare(
            'SELECT id, amount, type, source_id, created_at FROM point_history WHERE user_id = ? AND id < ? ORDER BY id DESC LIMIT ?'
          )
          .all(userId, before, limit + 1)
  )
  const page = rows.slice(0, limit).map((row) => ({
    id: row.id,
    amount: row.amount,
    type: row.type,
    sourceId: row.source_id,
    createdAt: row.created_at,
  }))
  return { items: page, nextBefore: rows.length > limit ? page[page.length - 1].id : null }
}

export function claimSlots(db, userId, slotIds, now = new Date()) {
  const nowIso = now.toISOString()
  return transaction(db, () => {
    db.prepare('INSERT OR IGNORE INTO users (id, created_at) VALUES (?, ?)').run(userId, nowIso)
    const tiers = loadTiers(db)
    const benefits = loadBenefits(db)

    const lookup = db.prepare(
      `SELECT s.id AS slot_id, g.id AS group_id, sp.id AS space_id ${ACTIVE_SLOTS} AND s.id = ?`
    )
    const alreadyClaimed = db.prepare('SELECT 1 AS x FROM slot_claims WHERE user_id = ? AND slot_id = ?')
    const newSlots = []
    const ignored = []
    const groupSpace = new Map()
    const heldBefore = new Map()
    for (const slotId of [...new Set(slotIds)]) {
      const row = lookup.get(slotId)
      if (!row) {
        ignored.push(slotId)
        continue
      }
      if (alreadyClaimed.get(userId, slotId)) continue
      newSlots.push(slotId)
      groupSpace.set(row.group_id, row.space_id)
      if (!heldBefore.has(row.space_id)) {
        const codes = earnedCodes(db, userId, row.space_id)
        const held = highestTier(tiers.filter((tier) => codes.includes(tier.code)))
        heldBefore.set(row.space_id, held ? held.code : null)
      }
    }

    const insertClaim = db.prepare('INSERT INTO slot_claims (user_id, slot_id, claimed_at) VALUES (?, ?, ?)')
    for (const slotId of newSlots) insertClaim.run(userId, slotId, nowIso)

    const history = []
    const insertHistory = db.prepare(
      'INSERT INTO point_history (user_id, amount, type, source_id, created_at) VALUES (?, ?, ?, ?, ?)'
    )
    const addHistory = (type, amount, sourceId) => {
      const result = insertHistory.run(userId, amount, type, sourceId, nowIso)
      const id = Number(result.lastInsertRowid)
      history.push({ id, amount, type, sourceId, createdAt: nowIso })
      return id
    }

    const completeAmount = ruleAmount(db, 'COLLECTION_COMPLETE')
    const completed = db.prepare('SELECT 1 AS x FROM group_completions WHERE user_id = ? AND group_id = ?')
    const insertCompletion = db.prepare(
      'INSERT INTO group_completions (user_id, group_id, completed_at) VALUES (?, ?, ?)'
    )
    for (const [groupId, spaceId] of groupSpace) {
      if (completed.get(userId, groupId)) continue
      const { claimed, total } = groupCounts(db, userId, groupId)
      if (total === 0 || claimed < total) continue
      insertCompletion.run(userId, groupId, nowIso)
      if (completeAmount > 0) {
        const parentId = addHistory('COLLECTION_COMPLETE', completeAmount, groupId)
        const bonus = bonusPoints(completeAmount, pointRateBp(benefits, heldBefore.get(spaceId), now))
        if (bonus > 0) addHistory('TITLE_BONUS', bonus, String(parentId))
      }
    }

    const insertTitle = db.prepare(
      'INSERT INTO user_titles (user_id, space_id, tier_code, earned_at) VALUES (?, ?, ?, ?)'
    )
    for (const spaceId of new Set(groupSpace.values())) {
      const { claimed, total } = spaceCounts(db, userId, spaceId)
      const have = earnedCodes(db, userId, spaceId)
      for (const tier of tiersReached(claimed, total, tiers)) {
        if (have.includes(tier.code)) continue
        insertTitle.run(userId, spaceId, tier.code, nowIso)
        if (tier.reward_points > 0) addHistory('TITLE_REWARD', tier.reward_points, `${spaceId}:${tier.code}`)
      }
    }

    return {
      newSlots,
      ignored,
      pointsAwarded: history.reduce((sum, row) => sum + row.amount, 0),
      history,
      state: getState(db, userId, now),
    }
  })
}
