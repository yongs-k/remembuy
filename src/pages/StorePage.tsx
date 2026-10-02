import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../state/GameContext'
import { BoxOpenResultModal } from '../components/BoxOpenResultModal'
import { GameCatalogStatus } from '../components/GameCatalogStatus'
import { AttendanceCard } from '../components/AttendanceBox'
import { Icon } from '../data/materialIcons'
import type { OpenBoxResult } from '../lib/gameApi'

export default function StorePage() {
  const { boxes, state, openBox, catalogError } = useGame()
  const navigate = useNavigate()
  const [opening, setOpening] = useState<string | null>(null)
  const [result, setResult] = useState<OpenBoxResult | null>(null)
  const [failedBoxId, setFailedBoxId] = useState<string | null>(null)
  const points = state?.points ?? 0

  async function handleOpen(boxId: string) {
    setOpening(boxId)
    setFailedBoxId(null)
    const opened = await openBox(boxId)
    setOpening(null)
    if (opened) {
      setResult(opened)
    } else {
      setFailedBoxId(boxId)
    }
  }

  return (
    <div className="space-y-space-md p-margin">
      <div className="flex items-end justify-between gap-space-sm rounded-2xl bg-inverse-surface p-space-lg text-inverse-on-surface">
        <h1 className="font-heading text-display-sm">상자</h1>
        {!catalogError && (
          <span className="flex shrink-0 items-center gap-1 font-heading text-stat-counter tabular-nums text-tertiary-fixed-dim">
            <Icon name="monetization_on" className="text-[20px]" />
            <span>{points}P</span>
          </span>
        )}
      </div>
      <p className="text-body-sm text-on-surface-variant">
        포인트로 상자를 열면 아이템 조각이 나와요. 조각을 다 모으면 아이템 수집함에 완성돼요.
      </p>

      <AttendanceCard />

      {boxes.length === 0 ? (
        <GameCatalogStatus label="상자 정보를" />
      ) : (
        boxes.map((box) => {
          const affordable = points >= box.costPoints
          return (
            <div
              key={box.id}
              className="space-y-3 rounded-2xl bg-inverse-surface p-space-lg text-inverse-on-surface shadow-float"
            >
              <div className="flex items-center justify-between">
                <span className="font-heading text-headline-md">{box.name}</span>
                <span className="flex items-center gap-1 text-label-lg font-bold tabular-nums text-tertiary-fixed-dim">
                  <Icon name="monetization_on" className="text-[16px]" />
                  <span>{box.costPoints}P</span>
                </span>
              </div>
              {affordable ? (
                <button
                  type="button"
                  disabled={opening === box.id}
                  onClick={() => handleOpen(box.id)}
                  className="min-h-12 w-full rounded-xl bg-tertiary-fixed-dim text-label-lg text-on-tertiary-fixed active:scale-[0.98] disabled:bg-inverse-on-surface/15 disabled:text-inverse-on-surface/70"
                >
                  {opening === box.id ? '여는 중...' : '1개 열기'}
                </button>
              ) : (
                <>
                  <p className="text-center text-body-sm tabular-nums text-inverse-on-surface/70">
                    {box.costPoints - points}P 더 모으면 열 수 있어요
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/collection')}
                    className="min-h-12 w-full rounded-xl border border-inverse-on-surface/20 text-label-lg text-inverse-on-surface transition-colors hover:bg-inverse-on-surface/10"
                  >
                    도감 채우러 가기
                  </button>
                </>
              )}
              {failedBoxId === box.id && (
                <p role="alert" className="text-center text-body-sm text-inverse-primary">
                  상자를 열지 못했어요. 다시 시도해 주세요.
                </p>
              )}
            </div>
          )
        })
      )}

      {result && (
        <BoxOpenResultModal
          result={result}
          onClose={() => setResult(null)}
          onViewDex={() => {
            setResult(null)
            navigate('/dex')
          }}
        />
      )}
    </div>
  )
}
