import { useLayoutEffect, useRef, type ReactNode } from 'react'

/**
 * Bottom sheet on the native <dialog>: showModal() keeps focus inside and makes
 * the page behind inert; Escape and a tap on the backdrop call onClose.
 * Mount it only while it should be open. Mark the control that should get
 * focus first with `data-autofocus`.
 */
export function Sheet({
  labelledBy,
  onClose,
  children,
}: {
  labelledBy: string
  onClose: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)

  // Layout effect so close() runs while the dialog is still in the DOM, which
  // hands focus back to whatever opened the sheet.
  useLayoutEffect(() => {
    const dialog = ref.current
    if (!dialog || dialog.open) return
    // jsdom has no showModal; the open attribute is enough there.
    if (typeof dialog.showModal === 'function') dialog.showModal()
    else dialog.setAttribute('open', '')
    // showModal focuses the first control, which can be a destructive button.
    // React's autoFocus never reaches the DOM attribute, so use data-autofocus.
    dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    return () => {
      if (dialog.open && typeof dialog.close === 'function') dialog.close()
    }
  }, [])

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        // Only the dialog box itself is outside the padded content: that is the backdrop.
        if (e.target === e.currentTarget) onClose()
      }}
      className="fixed inset-x-0 bottom-0 top-auto m-0 mx-auto max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-surface-container-lowest text-on-surface shadow-float backdrop:bg-black/40"
    >
      <div className="space-y-2 p-4 pb-[calc(2rem+env(safe-area-inset-bottom))]">{children}</div>
    </dialog>
  )
}
