// In-app confirmation dialog. Replaces window.confirm(), which iOS silently suppresses in
// home-screen apps, in-app browsers and after "block dialogs" (it then returns false, so the
// action never happens).
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from './ui'

export interface ConfirmOptions {
  title: string
  message?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** 'danger' for destructive actions (red confirm button). */
  tone?: 'default' | 'danger'
}

type Confirm = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<Confirm | null>(null)

interface Pending extends ConfirmOptions {
  resolve: (ok: boolean) => void
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null)

  const confirm = useCallback<Confirm>(
    (options) => new Promise<boolean>((resolve) => setPending({ ...options, resolve })),
    [],
  )

  const close = (ok: boolean) => {
    pending?.resolve(ok)
    setPending(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && <Dialog options={pending} onClose={close} />}
    </ConfirmContext.Provider>
  )
}

function Dialog({ options, onClose }: { options: ConfirmOptions; onClose: (ok: boolean) => void }) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose })

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    dialogRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeRef.current(false) }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      previous?.focus?.()
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/40 p-4 sm:items-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(false) }}
    >
      <div
        ref={dialogRef} tabIndex={-1}
        role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message"
        className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl focus:outline-none"
      >
        <h2 id="confirm-title" className="text-base font-semibold text-stone-900">{options.title}</h2>
        {options.message && <div id="confirm-message" className="mt-2 text-sm text-stone-600">{options.message}</div>}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button onClick={() => onClose(false)}>{options.cancelLabel ?? 'Cancel'}</Button>
          <Button variant={options.tone === 'danger' ? 'danger' : 'primary'} onClick={() => onClose(true)}>
            {options.confirmLabel ?? 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  )
}

/** `const confirm = useConfirm(); if (await confirm({ title: 'Delete?' })) …` */
export function useConfirm(): Confirm {
  const confirm = useContext(ConfirmContext)
  if (!confirm) throw new Error('useConfirm must be used inside <ConfirmProvider>')
  return confirm
}
