import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import { getUpcomingNotifications } from '../state/selectors'
import { RestockCard } from '../components/RestockCard'
import { Icon } from '../data/materialIcons'

const WINDOW_DAYS = 30

export default function PurchasePage() {
  const { items } = useLocker()
  const navigate = useNavigate()
  const upcoming = useMemo(() => getUpcomingNotifications(items, WINDOW_DAYS), [items])

  return (
    <div className="space-y-space-md p-margin">
      <div>
        <h1 className="flex items-center gap-1.5 font-heading text-headline-lg text-on-surface">
          <Icon name="shopping_cart" className="text-[24px] text-primary" />
          다시 살 상품
        </h1>
        <p className="mt-1 text-body-sm text-on-surface-variant">
          {WINDOW_DAYS}일 안에 떨어지거나 재구매 주기가 돌아오는 상품이에요
        </p>
      </div>

      {upcoming.length === 0 ? (
        <div className="flex flex-col items-center gap-space-sm rounded-2xl bg-surface-container-lowest p-space-xl text-center shadow-[0_3px_0px_#eae0de]">
          <Icon name="task_alt" className="text-[32px] text-secondary" />
          <p className="text-body-sm text-on-surface-variant">
            {WINDOW_DAYS}일 안에 다시 살 상품이 없어요.
            <br />
            상품에 소진일이나 재구매 주기를 기록하면 여기에 모여요.
          </p>
          <button
            type="button"
            onClick={() => navigate('/new')}
            className="rounded-lg bg-primary px-4 py-2 text-label-md text-on-primary shadow-[0_2px_0px_#8b1901] active:translate-y-0.5"
          >
            상품 기록하기
          </button>
        </div>
      ) : (
        <ul className="space-y-space-sm">
          {upcoming.map((item) => (
            <RestockCard key={item.id} item={item} showLastPurchase />
          ))}
        </ul>
      )}
    </div>
  )
}
