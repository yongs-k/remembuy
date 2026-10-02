import { useNavigate } from 'react-router-dom'
import { useGame } from '../state/GameContext'
import { Icon } from '../data/materialIcons'
import { useAttendanceBox } from './AttendanceBox'

export function HomeGameCard() {
  const { state, dex, boxes, catalogError, refresh } = useGame()
  const navigate = useNavigate()
  const points = state?.points ?? 0
  const completed = dex.filter((entry) => entry.status === 'COMPLETE').length
  const cheapestBox = boxes.length ? Math.min(...boxes.map((box) => box.costPoints)) : undefined
  // Can't open anything yet: send the user to where points are earned instead of a dead end.
  const needsPoints = !catalogError && cheapestBox !== undefined && points < cheapestBox
  const attendanceBox = useAttendanceBox()
  // Today's free 출석 box comes first: it is the one thing a new user can always open.
  const attendanceOpen = !catalogError && attendanceBox.available === true

  const primary = catalogError
    ? { label: '다시 시도', onClick: () => void refresh() }
    : attendanceOpen
      ? { label: attendanceBox.opening ? '여는 중...' : '오늘의 출석 상자 열기', onClick: () => void attendanceBox.open() }
      : needsPoints
      ? { label: '도감 채우러 가기', onClick: () => navigate('/collection') }
      : { label: '상자 열기', onClick: () => navigate('/store') }

  return (
    <div className="rounded-2xl bg-inverse-surface p-space-lg text-inverse-on-surface shadow-float">
      <div className="flex items-start justify-between gap-space-sm">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="font-heading text-headline-md">상자</h2>
          <p role={catalogError ? 'alert' : undefined} className="text-body-sm text-inverse-on-surface/70">
            {catalogError
              ? '게임 정보를 불러오지 못했어요'
              : attendanceOpen
                ? '하루 한 번 상자를 무료로 열 수 있어요'
                : needsPoints
                ? `상자는 ${cheapestBox}P부터 열 수 있어요. 도감 수집률이 오르면 포인트가 쌓여요`
                : points === 0
                  ? '도감 수집률을 올리면 포인트가 쌓여요'
                  : dex.length === 0
                    ? '상자를 열어 아이템을 모아보세요'
                    : `${completed}/${dex.length} 완성`}
          </p>
        </div>
        {!catalogError && (
          <span className="flex shrink-0 items-center gap-1 font-heading text-stat-counter tabular-nums text-tertiary-fixed-dim">
            <Icon name="monetization_on" className="text-[20px]" />
            <span>{points}P</span>
          </span>
        )}
      </div>
      <div className="mt-space-lg flex items-stretch gap-2">
        <button
          type="button"
          onClick={primary.onClick}
          className="min-h-11 flex-1 rounded-xl bg-tertiary-fixed-dim text-label-lg text-on-tertiary-fixed transition-transform active:scale-[0.98]"
        >
          {primary.label}
        </button>
        <button
          type="button"
          onClick={() => navigate('/dex')}
          className="min-h-11 flex-1 rounded-xl border border-inverse-on-surface/20 text-label-lg text-inverse-on-surface transition-colors hover:bg-inverse-on-surface/10"
        >
          아이템 수집함
        </button>
      </div>
      {attendanceBox.sheet}
    </div>
  )
}
