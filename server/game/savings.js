// 재구매 할인 보상: buying an item again for less than the last price pays the
// difference as points (1원 = 1P, no cap; decided 2026-10-06). Computed from the
// device's server-side locker copy, like quests, and paid once per purchase.
import { transaction } from './db.js'
import { ensureLockerTable, getLocker } from '../locker.js'

/**
 * Every repurchase that cost less than the purchase before it.
 * Prices come from purchaseDetails (date → { price }); only dates that are real
 * repurchases (in purchaseHistory) can earn, and sample items never do.
 */
export function findSavings(items) {
  const savings = []
  for (const item of items ?? []) {
    if (String(item.id).startsWith('seed-')) continue
    const repurchases = new Set(item.purchaseHistory ?? [])
    const priced = Object.entries(item.purchaseDetails ?? {})
      .filter(([, detail]) => detail && Number.isFinite(detail.price) && detail.price >= 0)
      .sort(([a], [b]) => a.localeCompare(b))
    for (let i = 1; i < priced.length; i++) {
      const [date, { price }] = priced[i]
      const before = priced[i - 1][1].price
      if (repurchases.has(date) && price < before) {
        savings.push({ itemId: String(item.id), name: item.name, date, from: before, to: price, saved: before - price })
      }
    }
  }
  return savings
}

/** Pays every saving not paid yet; returns what was paid now. */
export function claimSavings(db, userId, now = new Date()) {
  ensureLockerTable(db)
  const nowIso = now.toISOString()
  const items = getLocker(db, userId)?.state.items ?? []
  return transaction(db, () => {
    const paid = []
    const insertClaim = db.prepare(
      'INSERT OR IGNORE INTO savings_claims (user_id, item_id, purchase_date, amount, claimed_at) VALUES (?, ?, ?, ?, ?)'
    )
    const insertPoints = db.prepare(
      "INSERT INTO point_history (user_id, amount, type, source_id, created_at) VALUES (?, ?, 'SAVINGS_REWARD', ?, ?)"
    )
    for (const saving of findSavings(items)) {
      db.prepare('INSERT OR IGNORE INTO users (id, created_at) VALUES (?, ?)').run(userId, nowIso)
      if (insertClaim.run(userId, saving.itemId, saving.date, saving.saved, nowIso).changes === 0) continue
      insertPoints.run(userId, saving.saved, `${saving.itemId}:${saving.date}`, nowIso)
      paid.push(saving)
    }
    return { paid, pointsAwarded: paid.reduce((sum, s) => sum + s.saved, 0) }
  })
}
