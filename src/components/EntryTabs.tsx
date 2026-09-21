import { Icon } from '../data/materialIcons'

export function EntryTabs({ onSoon }: { onSoon: () => void }) {
  const base = 'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-label-md'
  return (
    <div className="flex gap-1 rounded-xl bg-surface-container p-1">
      <button type="button" onClick={onSoon} className={`${base} text-on-surface-variant`}>
        <Icon name="barcode_scanner" className="text-[18px]" />
        바코드 스캔
      </button>
      <button type="button" onClick={onSoon} className={`${base} text-on-surface-variant`}>
        <Icon name="receipt_long" className="text-[18px]" />
        구매내역
      </button>
      <button
        type="button"
        aria-current="true"
        className={`${base} bg-surface-container-lowest text-primary shadow-[0_2px_0px_#e1bfb8]`}
      >
        <Icon name="edit_note" className="text-[18px]" />
        직접 입력
      </button>
    </div>
  )
}
