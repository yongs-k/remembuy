import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../state/GameContext'
import { BoxOpenResultModal } from '../components/BoxOpenResultModal'
import { GameCatalogStatus } from '../components/GameCatalogStatus'
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
    <div className="space-y-4 p-4">
      <div className="flex items-end justify-between gap-space-sm rounded-2xl bg-inverse-surface p-space-lg text-inverse-on-surface">
        <h1 className="font-heading text-display-sm">선물상자 상점</h1>
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

      {boxes.length === 0 ? (
        <GameCatalogStatus label="상자 정보를" />
      ) : (
        boxes.map((box) => {
          const affordable = points >= box.costPoints
          return (
            <div
              key={box.id}
              className="space-y-3 rounded-xl bg-surface-container-lowest p-space-md border border-hairline shadow-card"
            >
              <div className="flex items-center justify-between">
                <span className="font-heading text-headline-md text-on-surface">{box.name}</span>
                <span className="flex items-center gap-1 text-label-lg font-bold text-tertiary">
                  <Icon name="monetization_on" className="text-[16px]" />
                  <span>{box.costPoints}P</span>
                </span>
              </div>
              <button
                type="button"
                disabled={!affordable || opening === box.id}
                onClick={() => handleOpen(box.id)}
                className="w-full rounded-xl bg-primary py-2.5 text-label-lg text-on-primary active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100"
              >
                {opening === box.id ? '여는 중...' : '1개 열기'}
              </button>
              {!affordable && <p className="text-center text-label-sm text-primary">포인트가 부족해요</p>}
              {failedBoxId === box.id && (
                <p className="text-center text-label-sm text-primary">상자를 열지 못했어요, 다시 시도해주세요</p>
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
