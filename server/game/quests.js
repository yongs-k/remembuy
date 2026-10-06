// 퀘스트: points for recording habits. Progress is computed on the server from
// the device's synced locker copy and the attendance log, never from what the
// page says, and each reward can be claimed once (daily ones once per day).
import { transaction } from './db.js'
import { attendanceDay } from './itemService.js'
import { ensureLockerTable, getLocker } from '../locker.js'

// Rewards are sized so a new user who records ~5 items, rates and links a few
// and checks in can open the first 500P box within a day.
export const QUESTS = [
  { id: 'daily-attend', kind: 'daily', title: '오늘 출석 상자 열기', metric: 'attendedToday', target: 1, reward: 30 },
  { id: 'daily-record', kind: 'daily', title: '오늘 상품 1개 기록하기', metric: 'recordsToday', target: 1, reward: 50 },
  { id: 'daily-restock', kind: 'daily', title: '오늘 재구매 기록하기', metric: 'restocksToday', target: 1, reward: 50 },
  { id: 'record-1', kind: 'once', title: '상품 1개 기록하기', metric: 'records', target: 1, reward: 50 },
  { id: 'record-5', kind: 'once', title: '상품 5개 기록하기', metric: 'records', target: 5, reward: 100 },
  { id: 'record-10', kind: 'once', title: '상품 10개 기록하기', metric: 'records', target: 10, reward: 200 },
  { id: 'record-20', kind: 'once', title: '상품 20개 기록하기', metric: 'records', target: 20, reward: 300 },
  { id: 'rate-3', kind: 'once', title: '추천·비추천 3개 남기기', metric: 'rated', target: 3, reward: 50 },
  { id: 'rate-10', kind: 'once', title: '추천·비추천 10개 남기기', metric: 'rated', target: 10, reward: 150 },
  { id: 'link-3', kind: 'once', title: '도감 품목 3개 연결하기', metric: 'linked', target: 3, reward: 100 },
  { id: 'link-10', kind: 'once', title: '도감 품목 10개 연결하기', metric: 'linked', target: 10, reward: 300 },
  { id: 'restock-1', kind: 'once', title: '재구매 1번 기록하기', metric: 'restocks', target: 1, reward: 50 },
  { id: 'restock-5', kind: 'once', title: '재구매 5번 기록하기', metric: 'restocks', target: 5, reward: 200 },
  { id: 'price-1', kind: 'once', title: '구매 가격 1번 입력하기', metric: 'pricedPurchases', target: 1, reward: 50 },
  { id: 'price-5', kind: 'once', title: '구매 가격 5번 입력하기', metric: 'pricedPurchases', target: 5, reward: 150 },
  { id: 'attend-3', kind: 'once', title: '출석 3일 하기', metric: 'attendanceDays', target: 3, reward: 100 },
  { id: 'attend-7', kind: 'once', title: '출석 7일 하기', metric: 'attendanceDays', target: 7, reward: 300 },
]

/** What the device has done, from its server-side locker copy and attendance. */
export function computeMetrics(db, userId, now = new Date()) {
  ensureLockerTable(db)
  const items = getLocker(db, userId)?.state.items ?? []
  // Sample items come pre-filled; only the user's own records count.
  const own = items.filter((item) => !String(item.id).startsWith('seed-'))
  // ponytail: item dates are the client's UTC date (toISOString().slice(0, 10)),
  // so "today" for record/restock is UTC while the daily claim period is KST;
  // a record made 00:00–09:00 KST counts toward the previous KST day's quest.
  const utcToday = now.toISOString().slice(0, 10)
  const purchases = items.flatMap((item) => item.purchaseHistory ?? [])
  const priced = items.flatMap((item) =>
    Object.values(item.purchaseDetails ?? {}).filter((detail) => detail && detail.price != null)
  )
  const attendanceDays = db.prepare('SELECT COUNT(*) AS n FROM attendance WHERE user_id = ?').get(userId).n
  const attendedToday = db
    .prepare('SELECT COUNT(*) AS n FROM attendance WHERE user_id = ? AND day = ?')
    .get(userId, attendanceDay(now)).n
  return {
    records: own.length,
    linked: own.filter((item) => item.masterItemId).length,
    rated: own.filter((item) => item.recommendation === 'recommend' || item.recommendation === 'notRecommend').length,
    restocks: purchases.length,
    pricedPurchases: priced.length,
    attendanceDays,
    attendedToday,
    recordsToday: own.filter((item) => item.createdAt === utcToday).length,
    restocksToday: purchases.filter((date) => date === utcToday).length,
  }
}

function periodOf(quest, now) {
  return quest.kind === 'daily' ? attendanceDay(now) : 'once'
}

export function getQuests(db, userId, now = new Date()) {
  const metrics = computeMetrics(db, userId, now)
  const claimed = db.prepare('SELECT 1 AS x FROM quest_claims WHERE user_id = ? AND quest_id = ? AND period = ?')
  return QUESTS.map((quest) => {
    const progress = Math.min(metrics[quest.metric] ?? 0, quest.target)
    const isClaimed = Boolean(claimed.get(userId, quest.id, periodOf(quest, now)))
    return {
      id: quest.id,
      kind: quest.kind,
      title: quest.title,
      target: quest.target,
      progress,
      reward: quest.reward,
      claimed: isClaimed,
      claimable: progress >= quest.target && !isClaimed,
    }
  })
}

export function claimQuest(db, userId, questId, now = new Date()) {
  const quest = QUESTS.find((q) => q.id === questId)
  if (!quest) throw new Error('quest not found')
  const nowIso = now.toISOString()
  const period = periodOf(quest, now)
  return transaction(db, () => {
    const metric = computeMetrics(db, userId, now)[quest.metric] ?? 0
    if (metric < quest.target) throw new Error('not complete')
    db.prepare('INSERT OR IGNORE INTO users (id, created_at) VALUES (?, ?)').run(userId, nowIso)
    const inserted = db
      .prepare('INSERT OR IGNORE INTO quest_claims (user_id, quest_id, period, claimed_at) VALUES (?, ?, ?, ?)')
      .run(userId, quest.id, period, nowIso)
    if (inserted.changes === 0) throw new Error('already claimed')
    db.prepare(
      "INSERT INTO point_history (user_id, amount, type, source_id, created_at) VALUES (?, ?, 'QUEST_REWARD', ?, ?)"
    ).run(userId, quest.reward, `${quest.id}:${period}`, nowIso)
    return { pointsAwarded: quest.reward }
  })
}
