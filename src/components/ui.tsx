// Small shared UI kit. Feature screens should build from these for a consistent look.
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ')

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const variants: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 disabled:bg-stone-300',
  secondary: 'bg-white text-stone-800 border border-stone-300 hover:bg-stone-100 disabled:text-stone-400',
  ghost: 'text-stone-700 hover:bg-stone-100 disabled:text-stone-400',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-stone-300',
}

export function Button({
  variant = 'secondary', size = 'md', className, ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' }) {
  return (
    <button
      type="button"
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:cursor-not-allowed',
        size === 'sm' ? 'px-2.5 py-1 text-sm' : 'px-4 py-2 text-sm',
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}

export function Card({ title, actions, className, children }: {
  title?: ReactNode; actions?: ReactNode; className?: string; children: ReactNode
}) {
  return (
    <section className={cx('rounded-lg border border-stone-200 bg-white p-4 shadow-sm', className)}>
      {(title || actions) && (
        <header className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-base font-semibold text-stone-900">{title}</h2>}
          {actions && <div className="flex gap-2">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  )
}

export function PageHeader({ title, description, actions }: {
  title: string; description?: ReactNode; actions?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-stone-600">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function Field({ label, hint, error, children }: {
  label: string; hint?: ReactNode; error?: string; children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-stone-700">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs text-red-600">{error}</span>
        : hint && <span className="mt-1 block text-xs text-stone-500">{hint}</span>}
    </label>
  )
}

const inputClass = 'w-full rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(inputClass, className)} {...props} />
}

/** Number input that reports `undefined` when cleared. */
export function NumberInput({ value, onValueChange, className, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  value: number | undefined; onValueChange: (v: number | undefined) => void
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      className={cx(inputClass, className)}
      value={value ?? ''}
      onChange={(e) => onValueChange(e.target.value === '' ? undefined : Number(e.target.value))}
      {...props}
    />
  )
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cx(inputClass, className)} {...props} />
}

export function Checkbox({ label, checked, onChange }: { label: ReactNode; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  )
}

export function StatTile({ label, value, sub, tone = 'default' }: {
  label: string; value: ReactNode; sub?: ReactNode; tone?: 'default' | 'good' | 'warn' | 'bad'
}) {
  const tones = { default: 'text-stone-900', good: 'text-emerald-700', warn: 'text-amber-600', bad: 'text-red-600' }
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</div>
      <div className={cx('mt-1 text-2xl font-semibold tabular-nums', tones[tone])}>{value}</div>
      {sub && <div className="mt-1 text-xs text-stone-500">{sub}</div>}
    </div>
  )
}

export function Badge({ color, children }: { color?: string; children: ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium"
      style={color ? { borderColor: color, color } : undefined}
    >
      {children}
    </span>
  )
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-stone-300 bg-white p-10 text-center">
      <h3 className="font-semibold text-stone-800">{title}</h3>
      {children && <p className="mx-auto mt-1 max-w-md text-sm text-stone-600">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Alert({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'error' | 'success'; children: ReactNode }) {
  const tones = {
    info: 'border-sky-200 bg-sky-50 text-sky-900',
    warn: 'border-amber-200 bg-amber-50 text-amber-900',
    error: 'border-red-200 bg-red-50 text-red-900',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  }
  return <div className={cx('rounded-md border px-3 py-2 text-sm', tones[tone])}>{children}</div>
}

export { cx }
