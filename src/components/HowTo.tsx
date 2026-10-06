import { useState, type ReactNode } from 'react'
import { Icon } from '../data/materialIcons'
import { GRADE_ORDER, gradeColor, gradeLabel } from '../data/gradeColors'
import { CountBadge, PuzzleBoard } from './Puzzle'
import { Sheet } from './Sheet'

type Topic = 'tiles' | 'box' | 'combine'
type Step = { visual: ReactNode; title: string; text: string }

const gradeRow = (
  <span className="grid grid-cols-2 gap-1" aria-hidden>
    {GRADE_ORDER.map((grade) => (
      <span key={grade} className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: gradeColor(grade).hex }} />
    ))}
  </span>
)

const iconVisual = (name: string) => <Icon name={name} className="text-[22px]" />

/** What each tile signal and game step means, in the order a first-timer meets them. */
const TOPICS: Record<Topic, { title: string; steps: Step[] }> = {
  tiles: {
    title: '장소 타일 읽는 법',
    steps: [
      {
        visual: iconVisual('donut_large'),
        title: '링과 % · 도감 수집률',
        text: '그 장소에 필요한 소모품 중 몇 %를 기록했는지예요. "3개"는 기록한 상품 수예요.',
      },
      {
        visual: gradeRow,
        title: '테두리 색 · 장소 등급',
        text: `${GRADE_ORDER.map(gradeLabel).join(' → ')} 순서로 올라가요. 지금 모으는 등급의 색이에요.`,
      },
      {
        visual: <CountBadge count={2} />,
        title: '+N · 장소 조각',
        text: '상자에서 그 장소의 지금 등급 조각이 나올 때마다 +1. 퍼즐 칸이 하나씩 채워져요.',
      },
      {
        visual: <PuzzleBoard grade="COMMON" pieces={[1, 1, 1, 1]} className="h-7 w-7 text-on-surface-variant" />,
        title: '+4 · 달성',
        text: '달성 버튼을 누르면 조각 4개를 쓰고 다음 등급으로 올라가요. "일반 욕실" 같은 칭호도 받아요.',
      },
    ],
  },
  box: {
    title: '상자는 이렇게 써요',
    steps: [
      { visual: iconVisual('task_alt'), title: '포인트 모으기', text: '기록하면서 퀘스트를 채우면 포인트를 받아요. 하루 한 번은 무료 출석 상자도 있어요.' },
      { visual: gradeRow, title: '장소 조각 받기', text: '상자에서 일반·고급·레어·전설 장소 조각 중 하나가 나와요. 장소는 무작위예요.' },
      {
        visual: <CountBadge count={1} />,
        title: '같은 등급이면 +1',
        text: '그 장소가 지금 모으는 등급이면 +1. 다른 등급은 조합 재료로 보관돼요.',
      },
      {
        visual: <PuzzleBoard grade="ADVANCED" pieces={[1, 1, 1, 1]} className="h-7 w-7 text-inverse-on-surface" />,
        title: '+4면 달성',
        text: '홈이나 컬렉션의 장소 타일에서 달성을 누르면 등급이 올라가요. 아이템 조각도 함께 쌓여 아이템 수집함이 채워져요.',
      },
    ],
  },
  combine: {
    title: '장소 조각 조합',
    steps: [
      { visual: iconVisual('filter_9_plus'), title: '같은 등급 10개', text: '같은 등급 장소 조각 10개를 넣으면 다음 등급 장소 조각 1개가 무작위로 나와요.' },
      { visual: iconVisual('auto_awesome'), title: '자동 넣기', text: '4개 이상 쌓인 조각만 쓰고, 보관 조각부터 넣어요. 달성할 단계 조각 4개는 남겨요.' },
      { visual: iconVisual('touch_app'), title: '직접 넣기', text: '3개 이하로 쌓인 조각은 아래 목록에서 눌러 넣어요. 슬롯을 누르면 빠져요.' },
      { visual: iconVisual('warning'), title: '단계 조각 주의', text: '단계 조각을 넣으면 그 장소의 +N이 줄어서 달성이 늦어질 수 있어요.' },
    ],
  },
}

/** A quiet "어떻게 하나요?" link that opens a short, illustrated explainer. */
export function HowToButton({ topic, tone = 'paper' }: { topic: Topic; tone?: 'paper' | 'cabinet' }) {
  const [open, setOpen] = useState(false)
  const { title, steps } = TOPICS[topic]
  const cabinet = tone === 'cabinet'
  const titleId = `howto-${topic}`

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`-my-2 inline-flex min-h-11 shrink-0 items-center gap-1 text-label-md ${
          cabinet ? 'text-inverse-on-surface/70' : 'text-on-surface-variant'
        }`}
      >
        <Icon name="help" className="text-[18px]" />
        어떻게 하나요?
      </button>
      {open && (
        <Sheet labelledBy={titleId} tone={tone} onClose={() => setOpen(false)}>
          <h2 id={titleId} className="pb-1 text-center text-label-lg">
            {title}
          </h2>
          <ol className="space-y-3 text-left">
            {steps.map((step) => (
              <li key={step.title} className="flex items-start gap-3">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    cabinet ? 'bg-white/[0.06] text-tertiary-fixed-dim' : 'bg-surface-container-low text-on-surface-variant'
                  }`}
                >
                  {step.visual}
                </span>
                <span className="space-y-0.5">
                  <span className="block text-label-lg">{step.title}</span>
                  <span className={`block text-body-sm ${cabinet ? 'text-inverse-on-surface/70' : 'text-on-surface-variant'}`}>
                    {step.text}
                  </span>
                </span>
              </li>
            ))}
          </ol>
          <button
            type="button"
            data-autofocus
            onClick={() => setOpen(false)}
            className={`mt-2 min-h-12 w-full rounded-xl text-label-lg transition-colors ${
              cabinet ? 'bg-white/[0.08] hover:bg-white/[0.12]' : 'border border-hairline hover:bg-surface-container-low'
            }`}
          >
            알겠어요
          </button>
        </Sheet>
      )}
    </>
  )
}
