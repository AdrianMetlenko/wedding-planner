// Pure validation for the setup wizard. Each validator returns a map of field key → message;
// an empty map means the step is valid.
import type { AppState, BalanceAttribute, GuestType, PriceTier, Settings } from '../../lib/types'

export type Errors = Record<string, string>

export const LAST_STEP = 7
export const STEP_LABELS = [
  'Welcome', 'Basics', 'Capacity & cost', 'Categories', 'Guest groups', 'Balance', 'Modules', 'Guests',
] as const

export type WizardState = Pick<AppState, 'setup' | 'settings' | 'categories' | 'tags' | 'balanceAttributes'>

const isPositiveInt = (n: number | undefined): n is number => n !== undefined && Number.isInteger(n) && n > 0
const isValidIsoDate = (s: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(`${s}T00:00:00`).getTime())

export function validateBasics(settings: Settings): Errors {
  const e: Errors = {}
  if (!settings.coupleNames[0].trim()) e.name1 = 'Enter the first partner’s name.'
  if (!settings.coupleNames[1].trim()) e.name2 = 'Enter the second partner’s name.'
  if (!settings.date) e.date = 'Choose the wedding date.'
  else if (!isValidIsoDate(settings.date)) e.date = 'Enter a valid date.'
  return e
}

export function validateTiers(tiers: PriceTier[]): Errors {
  const e: Errors = {}
  tiers.forEach((t, i) => {
    if (!isPositiveInt(t.below)) e[`tier-${i}-below`] = 'Enter a whole number of guests above 0.'
    else if (i > 0 && t.below <= tiers[i - 1].below) e[`tier-${i}-below`] = 'Must be higher than the row above.'
    if (!(t.price > 0)) e[`tier-${i}-price`] = 'Enter a price above 0.'
  })
  return e
}

export function validateCapacity(settings: Settings): Errors {
  const e: Errors = {}
  const { min, goal, max, countsTypes } = settings.capacity
  if (!isPositiveInt(max)) e.max = 'Enter the venue maximum as a whole number above 0.'
  if (min !== undefined && !isPositiveInt(min)) e.min = 'Use a whole number above 0, or leave blank.'
  if (goal !== undefined && !isPositiveInt(goal)) e.goal = 'Use a whole number above 0, or leave blank.'
  if (isPositiveInt(max)) {
    if (isPositiveInt(min) && min > max) e.min = 'The minimum cannot be more than the maximum.'
    if (isPositiveInt(goal) && goal > max) e.goal = 'The goal cannot be more than the maximum.'
  }
  if (isPositiveInt(min) && isPositiveInt(goal) && min > goal && !e.goal) e.goal = 'The goal cannot be less than the minimum.'
  if (countsTypes.length === 0) e.countsTypes = 'Choose at least one guest type.'
  for (const t of ['adult', 'child', 'staff'] as GuestType[]) {
    const p = settings.pricePerHead[t]
    if (!(p >= 0)) e[`price-${t}`] = 'Enter a price of 0 or more.'
  }
  Object.assign(e, validateTiers(settings.tiers))
  const { flatFee, discount, serviceCharge } = settings
  if (flatFee !== undefined && !(flatFee >= 0)) e.flatFee = 'Enter 0 or more, or leave blank.'
  if (discount !== undefined && !(discount >= 0 && discount <= 1)) e.discount = 'Enter a percentage from 0 to 100, or leave blank.'
  if (serviceCharge !== undefined && !(serviceCharge >= 0)) e.serviceCharge = 'Enter 0 or more, or leave blank.'
  if (settings.averageGift !== undefined && !(settings.averageGift >= 0)) e.averageGift = 'Enter 0 or more, or leave blank.'
  if (!isPositiveInt(settings.defaultTableCapacity)) e.tableCapacity = 'Enter a whole number of seats above 0.'
  return e
}

/** Categories and tags: names required and unique; `min` items required. */
export function validateNamedList(items: { id: string; name: string }[], noun: string, min: number): Errors {
  const e: Errors = {}
  if (items.length < min) e.list = `Keep at least ${min} ${noun}${min === 1 ? '' : 's'}.`
  const seen = new Set<string>()
  for (const it of items) {
    const key = it.name.trim().toLowerCase()
    if (!key) e[`name-${it.id}`] = 'Give this a name.'
    else if (seen.has(key)) e[`name-${it.id}`] = 'This name is already used.'
    seen.add(key)
  }
  return e
}

export function validateAttributes(attrs: BalanceAttribute[]): Errors {
  const e: Errors = {}
  const names = new Set<string>()
  for (const a of attrs) {
    const key = a.name.trim().toLowerCase()
    if (!key) e[`name-${a.id}`] = 'Give this attribute a name.'
    else if (names.has(key)) e[`name-${a.id}`] = 'This name is already used.'
    names.add(key)
    if (a.enabled) {
      const lower = a.values.map((v) => v.trim().toLowerCase())
      if (a.values.length < 2) e[`values-${a.id}`] = 'An enabled attribute needs at least 2 values.'
      else if (new Set(lower).size !== lower.length) e[`values-${a.id}`] = 'Values must be different from each other.'
    }
  }
  return e
}

export function validateModules(settings: Settings): Errors {
  const e: Errors = {}
  const over = settings.thankYouRule.perHeadOver
  if (over !== undefined && !(over >= 0)) e.perHeadOver = 'Enter 0 or more.'
  return e
}

/** Errors for a wizard step (1–7). Welcome and the import step have none. */
export function stepErrors(step: number, s: WizardState): Errors {
  switch (step) {
    case 1: return validateBasics(s.settings)
    case 2: return validateCapacity(s.settings)
    case 3: return validateNamedList(s.categories, 'category', 1)
    case 4: return validateNamedList(s.tags, 'group', 0)
    case 5: return validateAttributes(s.balanceAttributes)
    case 6: return validateModules(s.settings)
    default: return {}
  }
}

export const isStepValid = (step: number, s: WizardState) => Object.keys(stepErrors(step, s)).length === 0

/** First step in 1..6 that is currently invalid, if any. */
export function firstInvalidStep(s: WizardState): number | undefined {
  for (let i = 1; i < LAST_STEP; i++) if (!isStepValid(i, s)) return i
  return undefined
}

/** Furthest step the user may open. Once setup is done every step is open. */
export function maxReachableStep(s: WizardState): number {
  if (s.setup.done) return LAST_STEP
  const invalid = firstInvalidStep(s)
  const byProgress = Math.min(s.setup.completedStep + 1, LAST_STEP)
  return Math.max(1, invalid === undefined ? byProgress : Math.min(byProgress, invalid))
}

/** Where to land when the wizard opens: the welcome page on a fresh start, else the first incomplete step. */
export function resumeStep(s: WizardState): number {
  if (s.setup.done) return 1
  const untouched = s.setup.completedStep === 0 && !s.settings.coupleNames.some((n) => n.trim()) && !s.settings.date
  return untouched ? 0 : maxReachableStep(s)
}
