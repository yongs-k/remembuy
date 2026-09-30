import { useEffect } from 'react'
import { Icon } from '../data/materialIcons'

const SCAN_ICONS = ['soap', 'dry_cleaning', 'cleaning_services', 'local_pharmacy']
const CYCLE_DELAYS = ['0s', '1.2s', '2.4s', '3.6s']
const ICON_DELAYS = ['0s', '0.8s', '1.6s', '2.4s']

const STATUS_LABELS = [
  '비슷한 상품 탐색 중…',
  '카테고리 후보 비교 중…',
  '가장 근접한 상품 확정 중…',
  '소진 주기 계산 중…',
]

const PERCENTS = [38, 64, 82, 97]

export function AnalyzingOverlay({
  onCancel,
  dialogLabel = '분석 중',
}: {
  onCancel: () => void
  dialogLabel?: string
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={dialogLabel}
      className="fixed inset-0 z-[60] overflow-y-auto bg-[#1e1512] text-white"
    >
      <div className="mx-auto flex min-h-full w-full max-w-sm flex-col items-center justify-center gap-space-md p-margin">
        <div className="relative h-[120px] w-[120px] shrink-0">
          <div className="absolute inset-0 animate-ring-glow rounded-full bg-[radial-gradient(circle,rgba(255,185,95,0.35),transparent_70%)] motion-reduce:animate-none" />
          <div className="absolute inset-2 animate-spin rounded-full border-4 border-transparent border-r-primary-container border-t-tertiary-fixed-dim motion-reduce:animate-none" />
          <div className="absolute inset-3.5 overflow-hidden rounded-full">
            {SCAN_ICONS.map((name, i) => (
              <span
                key={name}
                className={`absolute inset-0 flex animate-icon-cycle items-center justify-center opacity-0 ${
                  i === 0 ? 'motion-reduce:animate-none motion-reduce:opacity-100' : 'motion-reduce:hidden'
                }`}
                style={{ animationDelay: ICON_DELAYS[i] }}
              >
                <Icon name={name} className="text-[34px] text-tertiary-fixed-dim" />
              </span>
            ))}
            <div className="absolute inset-x-0 h-3.5 animate-scan-sweep bg-gradient-to-b from-transparent via-tertiary-fixed-dim/90 to-transparent motion-reduce:hidden" />
          </div>
        </div>

        <div className="relative h-8 w-full max-w-[10rem] shrink-0 text-center">
          {PERCENTS.map((pct, i) => (
            <span
              key={pct}
              className={`absolute inset-0 animate-text-cycle text-headline-lg font-bold text-tertiary-fixed-dim opacity-0 ${
                i === 0 ? 'motion-reduce:animate-none motion-reduce:opacity-100' : 'motion-reduce:hidden'
              }`}
              style={{ animationDelay: CYCLE_DELAYS[i] }}
            >
              {pct}%
            </span>
          ))}
        </div>

        <div className="relative h-5 w-full max-w-xs shrink-0 px-space-sm text-center">
          {STATUS_LABELS.map((label, i) => (
            <span
              key={label}
              className={`absolute inset-0 animate-text-cycle truncate text-body-sm text-outline-variant opacity-0 ${
                i === 0 ? 'motion-reduce:animate-none motion-reduce:opacity-100' : 'motion-reduce:hidden'
              }`}
              style={{ animationDelay: CYCLE_DELAYS[i] }}
            >
              {label}
            </span>
          ))}
        </div>

        <button
          type="button"
          autoFocus
          onClick={onCancel}
          className="mt-space-sm flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-white/10 px-5 py-2.5 text-label-lg text-outline-variant active:translate-y-0.5"
        >
          <Icon name="close" className="text-[18px]" />
          분석 중단 및 취소
        </button>
      </div>
    </div>
  )
}
