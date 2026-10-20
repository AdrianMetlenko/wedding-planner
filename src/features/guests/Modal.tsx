import { useEffect, useRef, type ReactNode } from 'react'

/** Minimal modal: fixed overlay, Esc or backdrop click closes, focuses the dialog on open. */
export function Modal({ title, onClose, wide, children }: {
  title: string; onClose: () => void; wide?: boolean; children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose })

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    ref.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeRef.current() }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      previous?.focus?.()
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`w-full rounded-lg bg-white p-5 shadow-xl outline-none ${wide ? 'max-w-3xl' : 'max-w-xl'}`}
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded p-1 text-xl leading-none text-stone-500 hover:bg-stone-100"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
