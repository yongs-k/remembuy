import { useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react'

/**
 * Opens a <dialog> as a modal for as long as the component is mounted:
 * showModal() keeps focus inside and makes the page behind inert, the control
 * marked `data-autofocus` gets first focus, and closing on unmount hands focus
 * back to whatever opened it.
 */
export function useModalDialog(ref: RefObject<HTMLDialogElement>) {
  // Layout effect so close() runs while the dialog is still in the DOM.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

const TONE = {
  // Utility screens: Card White.
  paper: 'bg-surface-container-lowest text-on-surface',
  // The game layer's cabinet: espresso with cream text (DESIGN.md Cabinet Rule).
  cabinet: 'bg-inverse-surface text-inverse-on-surface',
}

/**
 * Bottom sheet on the native <dialog> (see useModalDialog). Escape and a tap
 * on the backdrop call onClose. Mount it only while it should be open.
 */
export function Sheet({
  labelledBy,
  onClose,
  tone = 'paper',
  children,
}: {
  labelledBy: string
  onClose: () => void
  tone?: keyof typeof TONE
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useModalDialog(ref)

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
      className={`fixed inset-x-0 bottom-0 top-auto m-0 mx-auto max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-2xl shadow-float backdrop:bg-black/40 ${TONE[tone]}`}
    >
      <div className="space-y-2 p-4 pb-[calc(2rem+env(safe-area-inset-bottom))]">{children}</div>
    </dialog>
  )
}
