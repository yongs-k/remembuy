import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import { getSoonestRemaining, getUpcomingNotifications } from '../state/selectors'
import { RestockCard } from '../components/RestockCard'
import { Icon } from '../data/materialIcons'

const WINDOW_DAYS = 30
const listCls =
  'divide-y divide-hairline overflow-hidden rounded-2xl border border-hairline bg-surface-container-lowest shadow-card'

export default function PurchasePage() {
  const { items } = useLocker()
  const navigate = useNavigate()
  const upcoming = useMemo(() => getUpcomingNotifications(items, WINDOW_DAYS), [items])
  const thisWeek = useMemo(() => getUpcomingNotifications(items, 7).length, [items])
  // Products the user said they'd buy again, minus the ones already listed above.
  const recommended = useMemo(() => {
    const dueIds = new Set(upcoming.map((item) => item.id))
    const soonest = (item: (typeof items)[number]) => getSoonestRemaining(item) ?? Number.POSITIVE_INFINITY
    return items
      .filter((item) => item.recommendation === 'recommend' && !dueIds.has(item.id))
      .sort((a, b) => soonest(a) - soonest(b))
  }, [items, upcoming])

  return (
    <div className="space-y-space-lg p-margin">
      <h1 className="font-heading text-display-sm text-on-surface">구매</h1>

      {thisWeek > 0 && (
        <button
          type="button"
          onClick={() => navigate('/shopping')}
          className="flex w-full items-center gap-3 rounded-2xl border border-hairline bg-surface-container-lowest p-space-md text-left shadow-card transition-colors hover:bg-surface-container-low"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-container-low text-on-surface">
            <Icon name="checklist" className="text-[22px]" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-label-lg text-on-surface">이번 주 장보기</span>
            <span className="block text-body-sm text-on-surface-variant">
              {thisWeek}개를 구매처별로 묶어 체크하며 사요
            </span>
          </span>
          <Icon name="chevron_right" className="text-[20px] text-on-surface-variant" />
        </button>
      )}

      <section aria-labelledby="due-title" className="space-y-space-sm">
        <div>
          <h2 id="due-title" className="font-heading text-headline-md text-on-surface">
            곧 다시 살 때예요
          </h2>
          <p className="mt-0.5 text-body-sm text-on-surface-variant">
            {WINDOW_DAYS}일 안에 떨어지거나 재구매 주기가 돌아오는 상품이에요
          </p>
        </div>
        {upcoming.length === 0 ? (
          <div className="flex flex-col items-center gap-space-sm rounded-2xl border border-hairline bg-surface-container-lowest p-space-xl text-center shadow-card">
            <Icon name="task_alt" className="text-[32px] text-secondary" />
            <p className="text-body-sm text-on-surface-variant">
              {WINDOW_DAYS}일 안에 다시 살 상품이 없어요.
              <br />
              상품에 소진일이나 재구매 주기를 기록하면 여기에 모여요.
            </p>
            <button
              type="button"
              onClick={() => navigate('/new')}
              className="min-h-11 rounded-lg bg-primary px-4 text-label-md text-on-primary active:scale-[0.98]"
            >
              기록하기
            </button>
          </div>
        ) : (
          <ul className={listCls}>
            {upcoming.map((item) => (
              <RestockCard key={item.id} item={item} showLastPurchase />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="recommended-title" className="space-y-space-sm">
        <div>
          <h2 id="recommended-title" className="font-heading text-headline-md text-on-surface">
            추천한 상품
          </h2>
          <p className="mt-0.5 text-body-sm text-on-surface-variant">"추천해요"를 누른 상품이에요. 지금 바로 살 때가 아닌 것만 모았어요.</p>
        </div>
        {recommended.length === 0 ? (
          <p className="rounded-2xl border border-hairline bg-surface-container-lowest px-space-md py-space-lg text-body-sm text-on-surface-variant">
            상품 상세에서 "추천해요"를 누르면 여기에 모여요.
          </p>
        ) : (
          <ul className={listCls}>
            {recommended.map((item) => (
              <RestockCard key={item.id} item={item} showLastPurchase />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
