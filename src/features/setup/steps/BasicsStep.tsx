import { Field, Input } from '../../../components/ui'
import { useStore } from '../../../store/store'
import { validateBasics } from '../validation'

export function BasicsStep() {
  const settings = useStore((s) => s.settings)
  const updateSettings = useStore((s) => s.updateSettings)
  const errors = validateBasics(settings)
  const [a, b] = settings.coupleNames

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="First partner's name" error={errors.name1}>
        <Input value={a} autoComplete="off" onChange={(e) => updateSettings({ coupleNames: [e.target.value, b] })} />
      </Field>
      <Field label="Second partner's name" error={errors.name2}>
        <Input value={b} autoComplete="off" onChange={(e) => updateSettings({ coupleNames: [a, e.target.value] })} />
      </Field>
      <Field label="Wedding date" error={errors.date} hint="Used for the countdown on your dashboard.">
        <Input type="date" value={settings.date} onChange={(e) => updateSettings({ date: e.target.value })} />
      </Field>
    </div>
  )
}
