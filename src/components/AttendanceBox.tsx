import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../state/GameContext'
import type { OpenBoxResult } from '../lib/gameApi'
import { BoxOpenResultModal } from './BoxOpenResultModal'

/**
 * 출석하기: once a day the cheapest box opens for free (fragments only, never
 * points; PRODUCT.md keeps points to slot claims). Returns whether today's box
 * is still available, an opener, and the result sheet to render.
 */
export function useAttendanceBox() {
  const { attendance, claimAttendance } = useGame()
  const navigate = useNavigate()
  const [opening, setOpening] = useState(false)
  const [result, setResult] = useState<OpenBoxResult | null>(null)
  const [failed, setFailed] = useState(false)

  async function open() {
    setOpening(true)
    setFailed(false)
    const opened = await claimAttendance()
    setOpening(false)
    if (opened) setResult(opened)
    else setFailed(true)
  }

  const sheet = result && (
    <BoxOpenResultModal
      result={result}
      onClose={() => setResult(null)}
      onViewCollection={() => {
        setResult(null)
        navigate('/collection')
      }}
    />
  )

  return {
    /** null while unknown (loading or game server down). */
    available: attendance ? !attendance.claimedToday : null,
    opening,
    failed,
    open,
    sheet,
  }
}

/** Store's 출석 card: a gold-edged panel on the store's espresso page. */
export function AttendanceCard() {
  const box = useAttendanceBox()
  if (box.available === null) return null

  return (
    <div className="space-y-3 rounded-2xl border border-tertiary-fixed-dim/20 bg-white/[0.03] p-space-md text-inverse-on-surface">
      <div>
        <h2 className="text-label-lg font-bold">오늘의 출석 상자</h2>
        <p className="text-body-sm text-inverse-on-surface/70">
          하루 한 번 상자를 무료로 열 수 있어요. 아이템 조각이 나와요.
        </p>
      </div>
      {box.available ? (
        <button
          type="button"
          disabled={box.opening}
          onClick={() => void box.open()}
          className="min-h-12 w-full rounded-full border border-tertiary-fixed-dim/60 text-label-lg text-tertiary-fixed transition-colors hover:bg-white/[0.06] active:scale-[0.98] disabled:opacity-60"
        >
          {box.opening ? '여는 중...' : '무료로 열기'}
        </button>
      ) : (
        <p className="rounded-xl border border-inverse-on-surface/20 px-space-md py-3 text-center text-body-sm text-inverse-on-surface/70">
          오늘은 열었어요. 내일 다시 열 수 있어요.
        </p>
      )}
      {box.failed && (
        <p role="alert" className="text-center text-body-sm text-inverse-primary">
          상자를 열지 못했어요. 잠시 후 다시 시도해 주세요.
        </p>
      )}
      {box.sheet}
    </div>
  )
}
