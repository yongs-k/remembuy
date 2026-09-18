import { Badge } from './Badge'
import { DUMMY_PROFILE, DUMMY_STATS } from '../data/homeDummy'

export function HomeProfileCard({ itemCount }: { itemCount: number }) {
  return (
    <div className="chunky-card space-y-3 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white">
          나
        </div>
        <div className="flex flex-1 items-center gap-2">
          <span className="font-medium">{DUMMY_PROFILE.name}</span>
          <Badge>{DUMMY_PROFILE.titleBadge}</Badge>
          <span className="text-ink/40">▾</span>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        <div>
          <p className="font-heading text-lg">{itemCount}개</p>
          <p className="text-xs text-ink/50">기록 상품</p>
        </div>
        <div>
          <p className="font-heading text-lg">₩{DUMMY_STATS.totalSaved.toLocaleString()}</p>
          <p className="text-xs text-ink/50">누적 절약</p>
        </div>
        <div>
          <p className="font-heading text-lg">{DUMMY_STATS.points}P</p>
          <p className="text-xs text-ink/50">포인트</p>
        </div>
        <div>
          <p className="font-heading text-lg">
            {DUMMY_STATS.titleProgress.current}/{DUMMY_STATS.titleProgress.total}
          </p>
          <p className="text-xs text-ink/50">칭호</p>
        </div>
      </div>
    </div>
  )
}
