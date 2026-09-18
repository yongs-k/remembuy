import { DUMMY_RECOMMENDATIONS, DUMMY_DISCOUNTS, DUMMY_GROUP_BUYS } from '../data/purchaseDummy'

export default function PurchasePage() {
  return (
    <div className="space-y-6 p-4">
      <h1 className="text-xl font-bold">구매</h1>

      <section className="space-y-2">
        <h2 className="font-heading text-lg">🤖 AI 추천 상품</h2>
        <div className="space-y-2">
          {DUMMY_RECOMMENDATIONS.map((rec) => (
            <div key={rec.id} className="chunky-card p-3">
              <p className="font-medium">{rec.name}</p>
              <p className="text-sm text-ink/50">{rec.reason}</p>
              <p className="mt-1 text-sm font-medium text-stamp">{rec.price.toLocaleString()}원</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-lg">🔥 할인 중</h2>
        <div className="space-y-2">
          {DUMMY_DISCOUNTS.map((deal) => {
            const percentOff = Math.round((1 - deal.discountedPrice / deal.originalPrice) * 100)
            return (
              <div key={deal.id} className="chunky-card p-3">
                <p className="font-medium">{deal.name}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-sm text-ink/40 line-through">
                    {deal.originalPrice.toLocaleString()}원
                  </span>
                  <span className="text-sm font-medium text-stamp">
                    {deal.discountedPrice.toLocaleString()}원
                  </span>
                  <span className="rounded-full border-2 border-ink bg-stamp px-2 py-0.5 text-xs text-white">
                    {percentOff}% 할인
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-lg">👥 공동구매 진행중</h2>
        <div className="space-y-2">
          {DUMMY_GROUP_BUYS.map((gb) => {
            const percent = Math.round((gb.currentParticipants / gb.targetParticipants) * 100)
            return (
              <div key={gb.id} className="chunky-card p-3">
                <p className="font-medium">{gb.name}</p>
                <div className="mt-2 h-2 rounded-full bg-paper">
                  <div className="h-2 rounded-full bg-accent" style={{ width: `${percent}%` }} />
                </div>
                <div className="mt-1 flex items-center justify-between text-sm">
                  <span className="text-ink/50">
                    {gb.currentParticipants}/{gb.targetParticipants}명 참여
                  </span>
                  <span className="font-medium">{gb.pricePerPerson.toLocaleString()}원/인</span>
                </div>
                <button
                  type="button"
                  className="chunky-btn mt-2 w-full rounded-xl bg-stamp py-2 text-sm text-white"
                >
                  참여하기
                </button>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
