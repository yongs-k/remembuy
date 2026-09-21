import { Icon } from '../data/materialIcons'

const CHIP: Record<number, string> = {
  1: 'bg-tertiary-fixed text-tertiary shadow-[0_2px_0px_#a36700]',
  2: 'bg-surface-container-high text-outline shadow-[0_2px_0px_#8d716a]',
  3: 'bg-tertiary-fixed/40 text-tertiary shadow-[0_2px_0px_#a36700]',
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
          ? 'border-2 border-tertiary/30 p-space-lg shadow-[0_4px_12px_rgba(130,81,0,0.12),0_3px_0px_#eae0de]'
          : 'p-space-md shadow-[0_3px_0px_#eae0de]'
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
          {hero && (
            <span className="text-label-sm uppercase tracking-wider text-tertiary">GOLD DEX</span>
          )}
          <span className="truncate font-heading text-headline-md text-on-surface">{title}</span>
          <span className="text-body-sm text-on-surface-variant">{subtitle}</span>
        </div>
      </div>
      <Icon name="chevron_right" className="text-[20px] text-on-surface-variant" />
    </button>
  )
}
