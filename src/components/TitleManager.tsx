import { useState } from 'react'
import { useGame } from '../state/GameContext'
import { LOCATIONS } from '../data/locations'
import { tierName, useMainTitle } from '../state/gameProgress'
import { Icon } from '../data/materialIcons'
import { Sheet } from './Sheet'

/** 칭호 관리: the 대표 칭호 on top of 컬렉션, and a sheet to pick it and see the next ones. */
export function TitleManager() {
  const { state } = useGame()
  const [mainTitle, setMainTitle] = useMainTitle(state)
  const [open, setOpen] = useState(false)
  if (!state) return null

  const placeName = (spaceId: string) => LOCATIONS.find((location) => location.id === spaceId)?.name ?? spaceId
  const label = (spaceId: string, tierCode: string) => `${placeName(spaceId)} ${tierName(tierCode)}`
  const earned = [...state.titles].sort((a, b) => b.earnedAt.localeCompare(a.earnedAt))
  const upcoming = state.spaces
    .filter((space) => space.nextTier && space.total > 0)
    .sort((a, b) => a.percentToNext - b.percentToNext)

  return (
    <section
      aria-labelledby="main-title-label"
      className="flex items-center justify-between gap-space-sm rounded-2xl bg-inverse-surface p-space-lg text-inverse-on-surface shadow-float"
    >
      <div className="min-w-0">
        <h2 id="main-title-label" className="text-label-md text-inverse-on-surface/70">
          대표 칭호
        </h2>
        <p className="flex items-center gap-1 font-heading text-headline-md text-tertiary-fixed-dim">
          <Icon name="workspace_premium" className="text-[22px]" />
          <span className="truncate">
            {mainTitle ? label(mainTitle.spaceId, mainTitle.tierCode) : earned.length ? '골라보세요' : '아직 없어요'}
          </span>
        </p>
        <p className="text-body-sm text-inverse-on-surface/70">
          받은 칭호 {earned.length}개 · 직접 기록한 상품으로 장소를 25% 채울 때마다 받아요
        </p>
      </div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-11 shrink-0 rounded-xl border border-inverse-on-surface/20 px-3 text-label-md transition-colors hover:bg-inverse-on-surface/10"
      >
        칭호 관리
      </button>

      {open && (
        <Sheet labelledBy="title-sheet-title" tone="cabinet" onClose={() => setOpen(false)}>
          <h2 id="title-sheet-title" className="pb-1 text-center text-label-lg">
            칭호 관리
          </h2>
          <h3 className="text-label-md text-inverse-on-surface/70">받은 칭호 · 눌러서 대표로</h3>
          {earned.length === 0 ? (
            <p className="text-body-sm text-inverse-on-surface/70">
              직접 기록한 상품으로 장소를 25% 채우면 첫 칭호를 받아요. 예시 상품은 세지 않아요.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {earned.map((title) => {
                const selected = mainTitle?.spaceId === title.spaceId && mainTitle.tierCode === title.tierCode
                return (
                  <button
                    key={`${title.spaceId}:${title.tierCode}`}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setMainTitle(selected ? null : `${title.spaceId}:${title.tierCode}`)}
                    className={`min-h-9 rounded-full px-3 text-label-md transition-colors ${
                      selected
                        ? 'bg-tertiary-fixed-dim text-on-tertiary-fixed'
                        : 'border border-inverse-on-surface/20 hover:bg-inverse-on-surface/10'
                    }`}
                  >
                    {label(title.spaceId, title.tierCode)}
                  </button>
                )
              })}
            </div>
          )}

          {upcoming.length > 0 && (
            <>
              <h3 className="pt-2 text-label-md text-inverse-on-surface/70">다음 칭호</h3>
              <ul className="space-y-2">
                {upcoming.map((space) => (
                  <li key={space.spaceId} className="space-y-1">
                    <div className="flex items-baseline justify-between gap-2 text-body-sm">
                      <span>{label(space.spaceId, space.nextTier!)}</span>
                      <span className="shrink-0 tabular-nums text-inverse-on-surface/70">
                        {space.percentToNext}% 더
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-inverse-on-surface/15">
                      <div
                        className="h-full rounded-full bg-tertiary-fixed-dim"
                        style={{ width: `${(space.percent / (space.percent + space.percentToNext || 1)) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}

          <button
            type="button"
            data-autofocus
            onClick={() => setOpen(false)}
            className="mt-2 min-h-11 w-full rounded-xl border border-inverse-on-surface/20 text-label-lg transition-colors hover:bg-inverse-on-surface/10"
          >
            닫기
          </button>
        </Sheet>
      )}
    </section>
  )
}
