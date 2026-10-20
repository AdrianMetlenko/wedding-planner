import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Alert, Button, Card, cx } from '../../components/ui'
import { Copyright } from '../../components/Copyright'
import { useStore } from '../../store/store'
import { ImportStep } from '../import/ImportStep'
import { AttributesStep } from './steps/AttributesStep'
import { BasicsStep } from './steps/BasicsStep'
import { CapacityStep } from './steps/CapacityStep'
import { CategoriesStep } from './steps/CategoriesStep'
import { GroupsStep } from './steps/GroupsStep'
import { ModulesStep } from './steps/ModulesStep'
import { WelcomeStep } from './steps/WelcomeStep'
import {
  LAST_STEP, STEP_LABELS, firstInvalidStep, maxReachableStep, resumeStep, stepErrors, type WizardState,
} from './validation'

const STEP_TITLES = [
  'Welcome',
  'The basics',
  'Capacity and cost',
  'Guest categories',
  'Guest groups',
  'Table balance attributes',
  'Modules',
  'Add your guests',
]

function useWizardState(): WizardState {
  const setup = useStore((s) => s.setup)
  const settings = useStore((s) => s.settings)
  const categories = useStore((s) => s.categories)
  const tags = useStore((s) => s.tags)
  const balanceAttributes = useStore((s) => s.balanceAttributes)
  return { setup, settings, categories, tags, balanceAttributes }
}

export default function SetupPage() {
  const navigate = useNavigate()
  const wizard = useWizardState()
  const { setup } = wizard
  const [step, setStep] = useState(() => resumeStep(useStore.getState()))

  const maxReach = maxReachableStep(wizard)
  const current = step === 0 ? (setup.done ? 1 : 0) : Math.min(step, maxReach)
  const errors = stepErrors(current, wizard)
  const valid = Object.keys(errors).length === 0
  const invalidStep = firstInvalidStep(wizard)
  const visible = STEP_LABELS.map((_, i) => i).filter((i) => setup.done ? i > 0 : true)

  const goto = (i: number) => {
    setStep(i)
    window.scrollTo?.({ top: 0 })
  }
  const next = () => {
    const s = useStore.getState()
    if (current >= 1 && s.setup.completedStep < current) s.updateSetup({ completedStep: current })
    goto(current + 1)
  }
  const finish = () => {
    useStore.getState().updateSetup({ done: true, completedStep: LAST_STEP })
    navigate('/dashboard')
  }
  const afterRestore = () => {
    const s = useStore.getState()
    if (s.setup.done) navigate('/dashboard')
    else goto(resumeStep(s))
  }

  const isDone = (i: number) => setup.done || (i >= 1 && i <= setup.completedStep)

  return (
    <div className="min-h-screen">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="font-semibold text-brand-700">Wedding Planner</div>
          <Link to="/data" className="text-sm text-stone-700 underline hover:text-brand-700">Settings &amp; data</Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        <nav aria-label="Setup progress" className="mb-6">
          <ol className="flex flex-wrap gap-1.5">
            {visible.map((i) => {
              const locked = i > maxReach
              const active = i === current
              return (
                <li key={i}>
                  <button
                    type="button"
                    disabled={locked}
                    aria-current={active ? 'step' : undefined}
                    aria-label={`${i}. ${STEP_LABELS[i]}${isDone(i) ? ' (completed)' : ''}`}
                    onClick={() => goto(i)}
                    className={cx(
                      'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                      active ? 'border-brand-600 bg-brand-600 text-white'
                        : isDone(i) ? 'border-brand-300 bg-brand-50 text-brand-800 hover:bg-brand-100'
                          : 'border-stone-300 bg-white text-stone-600',
                      locked && 'cursor-not-allowed opacity-50',
                    )}
                  >
                    <span aria-hidden="true">{isDone(i) && !active ? '✓' : i}</span>
                    <span className={cx(!active && 'hidden sm:inline')}>{STEP_LABELS[i]}</span>
                  </button>
                </li>
              )
            })}
          </ol>
        </nav>

        {current === 0 ? (
          <WelcomeStep onStart={() => goto(1)} onLoaded={afterRestore} onDemo={() => navigate('/dashboard')} />
        ) : (
          <Card>
            <h1 className="mb-4 text-xl font-semibold text-stone-900">
              {STEP_TITLES[current]}
              <span className="ml-2 text-sm font-normal text-stone-500">Step {current} of {LAST_STEP}</span>
            </h1>
            {current === 1 && <BasicsStep />}
            {current === 2 && <CapacityStep />}
            {current === 3 && <CategoriesStep />}
            {current === 4 && <GroupsStep />}
            {current === 5 && <AttributesStep />}
            {current === 6 && <ModulesStep />}
            {current === 7 && (
              <div className="space-y-3">
                {setup.done && (
                  <Alert tone="info">You can also import guests any time from the Guests page.</Alert>
                )}
                <ImportStep onDone={finish} />
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-stone-200 pt-4">
              <div className="flex gap-2">
                <Button onClick={() => goto(current - 1)} disabled={current === 1 && setup.done}>Back</Button>
                {setup.done && (
                  <Button
                    onClick={() => navigate('/dashboard')}
                    disabled={invalidStep !== undefined}
                    title={invalidStep ? `Fix step ${invalidStep} first` : undefined}
                  >
                    Back to planner
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-3">
                {!valid && <span className="text-xs text-red-600" role="status">Fix the highlighted fields to continue.</span>}
                {current < LAST_STEP && (
                  <Button variant="primary" onClick={next} disabled={!valid}>Next</Button>
                )}
              </div>
            </div>
          </Card>
        )}
      </main>
      <footer className="mx-auto max-w-3xl px-4 pb-8 text-xs text-stone-500">
        <Copyright />
      </footer>
    </div>
  )
}
