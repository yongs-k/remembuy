import { Icon } from '../data/materialIcons'

/** One row of a ranked list; the parent <ul> draws the card and dividers. */
export function RankRow({
  rank,
  title,
  subtitle,
  icon,
  color,
  onClick,
}: {
  rank: number
  title: string
  subtitle: string
  icon: string
  color?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-16 w-full items-center gap-3 px-space-md py-2 text-left transition-colors hover:bg-surface-container-low"
    >
      <span
        className={`w-6 shrink-0 text-center font-heading tabular-nums ${
          rank === 1 ? 'text-headline-md text-on-surface' : 'text-label-lg text-on-surface-variant'
        }`}
      >
        {rank}
      </span>
      <span
        aria-hidden
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant"
        style={color ? { backgroundColor: `${color}26`, color } : undefined}
      >
        <Icon name={icon} className="text-[22px]" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-label-lg text-on-surface">{title}</span>
        <span className="truncate text-body-sm text-on-surface-variant">{subtitle}</span>
      </span>
      <Icon name="chevron_right" className="text-[20px] text-on-surface-variant" />
    </button>
  )
}
