import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import { useBack } from '../hooks/useBack'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { getSoonestRemaining, getUpcomingNotifications } from '../state/selectors'
import { DdayLabel, SampleTag } from '../components/Badge'
import { Icon } from '../data/materialIcons'
import type { Item } from '../types'

/** Items running out within this many days make the week's list. */
export const SHOPPING_WINDOW_DAYS = 7
const NO_PLACE = '구매처 미정'

/** The week's list grouped by where each item was last bought; the most urgent store first. */
export function groupByPlace(items: Item[]): Array<{ place: string; items: Item[] }> {
  const groups = new Map<string, Item[]>()
  for (const item of items) {
    const place = item.place?.trim() || NO_PLACE
    groups.set(place, [...(groups.get(place) ?? []), item])
  }
  const soonest = (list: Item[]) => Math.min(...list.map((i) => getSoonestRemaining(i) ?? Infinity))
  return [...groups.entries()]
    .map(([place, list]) => ({ place, items: list }))
    .sort((a, b) => (a.place === NO_PLACE ? 1 : b.place === NO_PLACE ? -1 : soonest(a.items) - soonest(b.items)))
}

/** The list as plain text for a memo or a message. */
export function shoppingText(groups: Array<{ place: string; items: Item[] }>, checked: string[]): string {
  return [
    '이번 주 장보기',
    ...groups.map(
      (group) =>
        `\n[${group.place}]\n` +
        group.items.map((item) => `${checked.includes(item.id) ? '☑' : '☐'} ${item.name}`).join('\n')
    ),
  ].join('\n')
}

/** 이번 주 장보기: what runs out this week, by store, checked off while shopping. */
export default function ShoppingListPage() {
  const { items, recordPurchase } = useLocker()
  const navigate = useNavigate()
  const goBack = useBack()
  const [checked, setChecked] = useLocalStorage<string[]>('remembuy.shoppingChecked', [])
  const [copied, setCopied] = useState(false)
  const [done, setDone] = useState<number | null>(null)

  const due = useMemo(() => getUpcomingNotifications(items, SHOPPING_WINDOW_DAYS), [items])
  const groups = useMemo(() => groupByPlace(due), [due])
  // Ticks for items no longer on the list (bought, deleted) don't count.
  const ticked = checked.filter((id) => due.some((item) => item.id === id))

  function toggle(id: string) {
    setChecked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(shoppingText(groups, ticked))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  function finish() {
    for (const id of ticked) recordPurchase(id)
    setDone(ticked.length)
    setChecked([])
  }

  return (
    <div className="space-y-space-lg p-margin pb-28">
      <button
        type="button"
        onClick={() => goBack(() => navigate('/purchase'))}
        className="relative inline-flex items-center gap-1 rounded-full bg-surface-container px-3 py-1.5 text-label-md text-on-surface-variant transition-colors before:absolute before:inset-x-0 before:-inset-y-2 before:content-[''] hover:bg-surface-container-high"
      >
        <Icon name="arrow_back" className="text-[16px]" />
        뒤로
      </button>

      <div className="flex items-end justify-between gap-space-sm">
        <div>
          <h1 className="font-heading text-display-sm text-on-surface">이번 주 장보기</h1>
          <p className="mt-0.5 text-body-sm text-on-surface-variant">
            {SHOPPING_WINDOW_DAYS}일 안에 떨어질 상품을 구매처별로 모았어요.
          </p>
        </div>
        {due.length > 0 && (
          <button
            type="button"
            onClick={() => void copy()}
            className="-my-2 inline-flex min-h-11 shrink-0 items-center gap-1 text-label-md text-on-surface-variant"
          >
            <Icon name={copied ? 'check' : 'content_copy'} className="text-[18px]" />
            {copied ? '복사했어요' : '복사'}
          </button>
        )}
      </div>

      {done !== null && (
        <p role="status" className="rounded-2xl bg-secondary-container px-space-md py-3 text-body-sm text-on-secondary-container">
          {done}개를 재구매 완료로 기록했어요.
        </p>
      )}

      {due.length === 0 ? (
        <div className="flex flex-col items-center gap-space-sm rounded-2xl border border-hairline bg-surface-container-lowest p-space-xl text-center shadow-card">
          <Icon name="task_alt" className="text-[32px] text-secondary" />
          <p className="text-body-sm text-on-surface-variant">이번 주에 살 상품이 없어요.</p>
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.place} aria-label={group.place} className="space-y-space-sm">
            <h2 className="flex items-baseline justify-between text-label-lg text-on-surface">
              {group.place}
              <span className="text-label-sm tabular-nums text-on-surface-variant">{group.items.length}개</span>
            </h2>
            <ul className="divide-y divide-hairline overflow-hidden rounded-2xl border border-hairline bg-surface-container-lowest shadow-card">
              {group.items.map((item) => {
                const on = checked.includes(item.id)
                const remaining = getSoonestRemaining(item)
                return (
                  <li key={item.id}>
                    <label className="flex min-h-14 cursor-pointer items-center gap-3 px-space-md py-2">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggle(item.id)}
                        className="h-5 w-5 shrink-0 accent-[#1d1a17]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className={`line-clamp-2 text-label-lg ${on ? 'text-on-surface-variant line-through' : 'text-on-surface'}`}>
                          {item.name}
                        </span>
                        {item.id.startsWith('seed-') && (
                          <span className="mt-0.5 block">
                            <SampleTag />
                          </span>
                        )}
                      </span>
                      {remaining !== undefined && <DdayLabel days={remaining} />}
                    </label>
                  </li>
                )
              })}
            </ul>
          </section>
        ))
      )}

      {ticked.length > 0 && (
        <div className="fixed inset-x-0 bottom-20 z-30 mx-auto max-w-3xl px-4 pb-[env(safe-area-inset-bottom)]">
          <button
            type="button"
            onClick={finish}
            className="flex min-h-12 w-full items-center justify-center gap-1.5 rounded-xl bg-primary text-label-lg text-on-primary shadow-float active:scale-[0.98]"
          >
            <Icon name="check" className="text-[18px]" />
            장보기 끝내기 · {ticked.length}개 재구매 완료
          </button>
        </div>
      )}
    </div>
  )
}
