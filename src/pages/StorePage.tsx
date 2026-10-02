import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../state/GameContext'
import { BoxOpenResultModal } from '../components/BoxOpenResultModal'
import { BoxMultiResultModal } from '../components/BoxMultiResultModal'
import { GameCatalogStatus } from '../components/GameCatalogStatus'
import { AttendanceCard } from '../components/AttendanceBox'
import { Icon } from '../data/materialIcons'
import { GRADE_ORDER, gradeColor, gradeLabel } from '../data/gradeColors'
import type { OpenBoxResult } from '../lib/gameApi'
import { PuzzlePiece } from '../components/Puzzle'

const STEPS = [
  { icon: 'task_alt', text: '퀘스트로\n포인트 모으기' },
  { icon: 'redeem', text: '상자 열고\n장소 조각 받기' },
  { icon: 'cottage', text: '조각 4개면\n장소 등급 상승' },
]

// How long the hero box takes to open before the result sheet rises (index.css hero-* timings).
const HERO_OPEN_MS = 1500

/** 10개 한번에 열기. */
const MULTI_COUNT = 10

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

/**
 * The store's hero: a leather gift box with a gold ribbon, floating in its own light.
 * While `open`, it shakes, the lid and bow fly off and light pours out of it.
 */
function HeroGiftBox({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 240 220"
      className={`${open ? 'hero-shake' : 'store-hero-float'} mx-auto h-auto w-full max-w-[17rem] overflow-visible`}
    >
      <defs>
        <radialGradient id="hero-glow">
          <stop offset="0%" stopColor="#ffd38a" stopOpacity="0.55" />
          <stop offset="55%" stopColor="#ffb95f" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#ffb95f" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hero-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a2a1f" />
          <stop offset="100%" stopColor="#1c140e" />
        </linearGradient>
        <linearGradient id="hero-side" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#21170f" />
          <stop offset="100%" stopColor="#120c08" />
        </linearGradient>
        <linearGradient id="hero-lid-top" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#4a3627" />
          <stop offset="100%" stopColor="#2c1f16" />
        </linearGradient>
        <linearGradient id="hero-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fbe3a6" />
          <stop offset="45%" stopColor="#d9a24c" />
          <stop offset="100%" stopColor="#f2c56c" />
        </linearGradient>
      </defs>

      <circle cx="120" cy="112" r="118" fill="url(#hero-glow)" />
      <ellipse cx="124" cy="206" rx="96" ry="9" fill="#000" opacity="0.45" />

      {/* base */}
      <path d="M40 104 H198 V204 H40 Z" fill="url(#hero-front)" />
      <path d="M198 104 L220 92 V190 L198 204 Z" fill="url(#hero-side)" />
      <path d="M198 146 L220 134 V146 L198 158 Z" fill="url(#hero-gold)" opacity="0.85" />
      <rect x="40" y="198" width="158" height="6" fill="#0d0906" opacity="0.6" />
      <text
        x="119"
        y="160"
        textAnchor="middle"
        fill="url(#hero-gold)"
        fontFamily="'Plus Jakarta Sans', sans-serif"
        fontWeight="600"
        fontSize="15"
        letterSpacing="4"
      >
        REMEMBUY
      </text>
      <rect x="95" y="168" width="48" height="1" fill="url(#hero-gold)" opacity="0.7" />

      {/* light from inside, once the lid is off */}
      {open && (
        <g className="hero-burst">
          <path d="M44 104 L10 0 H230 L196 104 Z" fill="url(#hero-glow)" />
          <g stroke="#ffe3a8" strokeLinecap="round" strokeWidth="3" opacity="0.9">
            <line x1="120" y1="96" x2="120" y2="8" />
            <line x1="92" y1="98" x2="58" y2="20" />
            <line x1="148" y1="98" x2="182" y2="20" />
            <line x1="70" y1="100" x2="24" y2="50" />
            <line x1="170" y1="100" x2="216" y2="50" />
          </g>
          <ellipse cx="120" cy="104" rx="76" ry="10" fill="#ffd98a" />
        </g>
      )}

      <g className={open ? 'hero-lid-off' : undefined}>
      {/* lid */}
      <path d="M32 80 L54 66 H228 L206 80 Z" fill="url(#hero-lid-top)" />
      <path d="M32 80 H206 V108 H32 Z" fill="#2e2118" />
      <path d="M206 80 L228 66 V94 L206 108 Z" fill="#170f0a" />
      <rect x="32" y="104" width="174" height="4" fill="#0d0906" opacity="0.5" />
      <path d="M111 80 H127 V108 H111 Z" fill="url(#hero-gold)" />
      <path d="M111 80 L133 66 H149 L127 80 Z" fill="url(#hero-gold)" />
      <path d="M52 73 L206 73 L203 75 L49 75 Z" fill="url(#hero-gold)" opacity="0.35" />

      {/* bow */}
      <path d="M130 66 C112 40 86 44 92 60 C96 70 116 70 130 66 Z" fill="url(#hero-gold)" />
      <path d="M130 66 C150 38 178 44 170 60 C165 70 144 70 130 66 Z" fill="url(#hero-gold)" />
      <path d="M130 66 C120 76 112 88 104 96 L112 98 C118 88 124 78 130 68 Z" fill="#c8913a" />
      <path d="M130 66 C142 76 152 86 160 94 L152 97 C146 87 138 78 130 68 Z" fill="#c8913a" />
      <ellipse cx="130" cy="65" rx="8" ry="6" fill="#e9b85c" />
      </g>

      {/* sparkles */}
      {[
        [36, 40, 1],
        [206, 30, 0.8],
        [222, 118, 0.6],
        [18, 132, 0.7],
        [168, 18, 0.5],
      ].map(([x, y, s], i) => (
        <path
          key={i}
          className="store-sparkle"
          style={{ animationDelay: `${i * 0.45}s` }}
          d={`M${x} ${y - 8 * s} L${x + 2 * s} ${y - 2 * s} L${x + 8 * s} ${y} L${x + 2 * s} ${y + 2 * s} L${x} ${y + 8 * s} L${x - 2 * s} ${y + 2 * s} L${x - 8 * s} ${y} L${x - 2 * s} ${y - 2 * s} Z`}
          fill="#ffe3a8"
        />
      ))}
    </svg>
  )
}

export default function StorePage() {
  const { boxes, state, dex, openBox, openBoxes, catalogError } = useGame()
  const navigate = useNavigate()
  const [opening, setOpening] = useState<string | null>(null)
  // One result (the single card) or several (10개 한번에 열기).
  const [results, setResults] = useState<OpenBoxResult[] | null>(null)
  const [lastBoxId, setLastBoxId] = useState<string | null>(null)
  const [failedBoxId, setFailedBoxId] = useState<string | null>(null)
  // The hero box stays open while its result is on screen.
  const [heroOpen, setHeroOpen] = useState(false)
  const points = state?.points ?? 0

  async function handleOpen(boxId: string, count = 1) {
    setOpening(boxId)
    setFailedBoxId(null)
    setHeroOpen(true)
    setLastBoxId(boxId)
    const still = !window.matchMedia || window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const request = count === 1 ? openBox(boxId).then((r) => r && [r]) : openBoxes(boxId, count)
    // The result waits for the box to finish opening, and for the server.
    const [opened] = await Promise.all([request, wait(still ? 0 : HERO_OPEN_MS)])
    setOpening(null)
    if (opened) {
      setResults(opened)
    } else {
      setFailedBoxId(boxId)
      setHeroOpen(false)
    }
  }

  function closeResults() {
    setResults(null)
    setHeroOpen(false)
  }

  function viewCollection() {
    setResults(null)
    navigate('/collection')
  }

  // 다시 열기: the same box and count again, replaying the hero from a closed lid.
  function reopen(count: number) {
    const boxId = lastBoxId
    closeResults()
    if (boxId) window.setTimeout(() => void handleOpen(boxId, count), 60)
  }

  const balanceAfter = results ? results[results.length - 1].pointsBalance : points
  const lastCost = boxes.find((box) => box.id === lastBoxId)?.costPoints ?? Infinity

  return (
    // The whole store is a game surface: espresso cabinet from edge to edge (DESIGN.md Cabinet Rule).
    // -mb-20 runs it under the layout's bottom padding so no paper strip shows above the tabs.
    <div
      className="-mb-20 min-h-[calc(100%+5rem)] space-y-space-lg bg-inverse-surface px-4 pb-28 pt-space-lg text-inverse-on-surface"
      style={{ backgroundImage: 'radial-gradient(ellipse 90% 45% at 50% 30%, rgb(255 185 95 / 0.16), transparent 70%)' }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-label-sm tracking-[0.3em] text-tertiary-fixed-dim/80">REMEMBUY BOX</span>
        {!catalogError && (
          <span className="flex items-center gap-1 rounded-full border border-tertiary-fixed-dim/30 bg-white/[0.04] px-3 py-1 text-label-md tabular-nums">
            <span className="text-inverse-on-surface/70">내 포인트</span>
            <span className="font-bold text-tertiary-fixed-dim">{points.toLocaleString()}P</span>
          </span>
        )}
      </div>

      <div className="space-y-1 text-center">
        <h1 className="font-heading text-display-sm text-tertiary-fixed">선물상자 열기</h1>
        <p className="text-body-sm text-inverse-on-surface/70">
          모은 포인트로 상자를 열면, 장소를 한 단계씩 키우는 조각이 나와요.
        </p>
      </div>

      <ol className="flex items-start justify-between gap-1 rounded-2xl border border-tertiary-fixed-dim/20 bg-white/[0.03] px-2 py-space-md">
        {STEPS.map((step, i) => (
          <li key={step.icon} className="flex flex-1 items-start justify-center gap-1">
            <div className="flex flex-col items-center gap-1.5 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-tertiary-fixed-dim/40 text-tertiary-fixed-dim">
                <Icon name={step.icon} className="text-[20px]" />
              </span>
              <span className="whitespace-pre-line text-label-sm leading-snug text-inverse-on-surface/85">{step.text}</span>
            </div>
            {i < STEPS.length - 1 && (
              <Icon name="arrow_forward" className="mt-2.5 text-[16px] text-tertiary-fixed-dim/50" />
            )}
          </li>
        ))}
      </ol>

      {boxes.length === 0 ? (
        <div className="rounded-2xl bg-surface p-space-md text-on-surface">
          <GameCatalogStatus label="상자 정보를" />
        </div>
      ) : (
        boxes.map((box) => {
          const affordable = points >= box.costPoints
          return (
            <section key={box.id} aria-labelledby={`box-${box.id}`} className="space-y-space-md">
              <HeroGiftBox open={heroOpen} />
              <div className="space-y-0.5 text-center">
                <h2 id={`box-${box.id}`} className="font-heading text-headline-md">
                  {box.name}
                </h2>
                <p className="text-body-sm text-inverse-on-surface/70">
                  열 때마다 장소 하나의 지금 등급 조각이 나와요.
                </p>
              </div>
              {affordable ? (
                <>
                <button
                  type="button"
                  disabled={opening === box.id}
                  onClick={() => handleOpen(box.id)}
                  className="relative flex min-h-14 w-full items-center justify-center rounded-full bg-gradient-to-b from-[#f8dc9a] to-[#d9a24c] text-label-lg font-bold text-on-tertiary-fixed shadow-[0_10px_30px_-10px_rgba(255,185,95,0.7)] transition-transform active:scale-[0.98] disabled:opacity-70"
                >
                  {opening === box.id ? (
                    '상자를 여는 중...'
                  ) : (
                    <>
                      상자 열기 · {box.costPoints.toLocaleString()}P
                      <Icon name="chevron_right" className="absolute right-5 text-[22px]" />
                    </>
                  )}
                </button>
                <button
                  type="button"
                  disabled={opening === box.id || points < box.costPoints * MULTI_COUNT}
                  onClick={() => handleOpen(box.id, MULTI_COUNT)}
                  className="min-h-12 w-full rounded-full border border-tertiary-fixed-dim/50 text-label-lg text-tertiary-fixed transition-colors hover:bg-white/[0.06] disabled:border-white/10 disabled:text-inverse-on-surface/40"
                >
                  {MULTI_COUNT}개 한번에 열기 · {(box.costPoints * MULTI_COUNT).toLocaleString()}P
                </button>
                </>
              ) : (
                <>
                  <p className="text-center text-body-sm tabular-nums text-inverse-on-surface/70">
                    {box.costPoints - points}P 더 모으면 열 수 있어요
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/quests')}
                    className="min-h-14 w-full rounded-full border border-tertiary-fixed-dim/40 text-label-lg text-tertiary-fixed transition-colors hover:bg-white/[0.06]"
                  >
                    퀘스트 보기
                  </button>
                </>
              )}
              {failedBoxId === box.id && (
                <p role="alert" className="text-center text-body-sm text-inverse-primary">
                  상자를 열지 못했어요. 다시 시도해 주세요.
                </p>
              )}
            </section>
          )
        })
      )}

      <AttendanceCard />

      {dex.length > 0 && (
        <section aria-labelledby="store-grades" className="space-y-space-sm rounded-2xl border border-tertiary-fixed-dim/20 bg-white/[0.03] p-space-md">
          <div className="flex items-center justify-between">
            <h2 id="store-grades" className="text-label-lg font-bold">
              획득 가능한 아이템
            </h2>
            <button
              type="button"
              onClick={() => navigate('/dex')}
              className="-my-2 flex min-h-11 items-center text-label-md text-inverse-on-surface/70"
            >
              전체 보기
              <Icon name="chevron_right" className="text-[18px]" />
            </button>
          </div>
          <ul className="grid grid-cols-4 gap-2">
            {GRADE_ORDER.map((grade) => {
              const hex = gradeColor(grade).hex
              const kinds = dex.filter((entry) => entry.grade === grade).length
              return (
                <li
                  key={grade}
                  className="flex flex-col items-center gap-1.5 rounded-xl border px-1 pb-2 pt-1.5 text-center"
                  style={{ borderColor: `${hex}80`, background: `linear-gradient(180deg, ${hex}33, transparent 75%)` }}
                >
                  <span className="text-label-sm font-bold" style={{ color: hex }}>
                    {gradeLabel(grade)}
                  </span>
                  <PuzzlePiece grade={grade} slot={GRADE_ORDER.indexOf(grade)} className="h-10 w-10" />
                  <span className="text-label-sm tabular-nums text-inverse-on-surface/70">{kinds}종</span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {results?.length === 1 && (
        <BoxOpenResultModal
          result={results[0]}
          intro={false}
          onClose={closeResults}
          onViewCollection={viewCollection}
          onReopen={() => reopen(1)}
          canReopen={balanceAfter >= lastCost}
        />
      )}
      {results && results.length > 1 && (
        <BoxMultiResultModal
          results={results}
          onClose={closeResults}
          onViewCollection={viewCollection}
          onReopen={() => reopen(results.length)}
          canReopen={balanceAfter >= lastCost * results.length}
        />
      )}
    </div>
  )
}
