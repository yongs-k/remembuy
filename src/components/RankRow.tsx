import { Icon } from '../data/materialIcons'

const CHIP: Record<number, string> = {
  1: 'bg-tertiary-fixed text-tertiary',
  2: 'bg-surface-container-high text-outline',
  3: 'bg-tertiary-fixed/40 text-tertiary',
}

export function RankRow({
  rank,
  title,
  subtitle,
  icon,
  hero,
  onClick,
}: {
  rank: number
  title: string
  subtitle: string
  icon: string
  hero?: boolean
  onClick: () => void
}) {
  const chip = CHIP[rank] ?? 'bg-surface-container-high text-outline'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-space-sm rounded-xl bg-surface-container-lowest text-left ${
        hero
          ? 'border border-tertiary/40 p-space-lg shadow-card'
          : 'p-space-md border border-hairline shadow-card'
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-heading text-label-lg ${chip}`}
        >
          {rank}위
        </div>
        <div
          className={`flex shrink-0 items-center justify-center rounded-lg bg-surface-container text-on-surface-variant ${
            hero ? 'h-14 w-14' : 'h-12 w-12'
          }`}
        >
          <Icon name={icon} className="text-[24px]" />
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-heading text-headline-md text-on-surface">{title}</span>
          <span className="text-body-sm text-on-surface-variant">{subtitle}</span>
        </div>
      </div>
      <Icon name="chevron_right" className="text-[20px] text-on-surface-variant" />
    </button>
  )
}
