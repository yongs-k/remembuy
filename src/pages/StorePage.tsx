import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../state/GameContext'
import { BoxOpenResultModal } from '../components/BoxOpenResultModal'
import { Icon } from '../data/materialIcons'
import type { OpenBoxResult } from '../lib/gameApi'

export default function StorePage() {
  const { boxes, state, openBox } = useGame()
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
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 rounded-full bg-surface-container px-3 py-1.5 text-label-md text-on-surface-variant"
      >
        <Icon name="arrow_back" className="text-[16px]" />
        뒤로
      </button>

      <div className="flex items-center justify-between">
        <h1 className="font-heading text-headline-lg text-on-surface">선물상자 상점</h1>
        <span className="flex items-center gap-1 rounded-full bg-surface-container-high px-space-sm py-1 text-label-md font-bold text-tertiary">
          <Icon name="monetization_on" className="text-[16px]" />
          <span>{points}P</span>
        </span>
      </div>

      {boxes.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">상자 정보를 불러오는 중...</p>
      ) : (
        boxes.map((box) => {
          const affordable = points >= box.costPoints
          return (
            <div
              key={box.id}
              className="space-y-3 rounded-xl bg-surface-container-lowest p-space-md shadow-[0_4px_0px_#eae0de]"
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
                className="w-full rounded-xl bg-primary py-2.5 text-label-lg text-on-primary shadow-[0_3px_0px_#8b1901] active:translate-y-0.5 active:shadow-[0_1px_0px_#8b1901] disabled:opacity-40 disabled:active:translate-y-0 disabled:active:shadow-[0_3px_0px_#8b1901]"
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
