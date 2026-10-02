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

const PLACEMENT = {
  bottom: 'inset-x-0 bottom-0 top-auto m-0 mx-auto w-full max-w-md rounded-t-2xl',
  // A centred card for moments that deserve the middle of the screen (box results).
  // !m-auto: a parent's space-y margin must not push the card off centre.
  center: 'inset-0 !m-auto h-fit w-[calc(100%-2rem)] max-w-sm rounded-2xl',
}

/**
 * Bottom sheet (or centred card) on the native <dialog> (see useModalDialog).
 * Escape and a tap on the backdrop call onClose. Mount it only while it should be open.
 */
export function Sheet({
  labelledBy,
  onClose,
  tone = 'paper',
  placement = 'bottom',
  children,
}: {
  labelledBy: string
  onClose: () => void
  tone?: keyof typeof TONE
  placement?: keyof typeof PLACEMENT
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
      className={`fixed max-h-[85dvh] overflow-y-auto shadow-float ${placement === 'bottom' ? 'backdrop:bg-black/40' : 'backdrop:bg-black/60'} ${PLACEMENT[placement]} ${TONE[tone]}`}
    >
      <div className={`space-y-2 p-4 ${placement === 'bottom' ? 'pb-[calc(2rem+env(safe-area-inset-bottom))]' : 'pb-5'}`}>{children}</div>
    </dialog>
  )
}
