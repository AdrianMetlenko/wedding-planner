// Persisted data model. Everything here is serialised to localStorage and to the JSON backup.
// Derived values (counts, costs, remaining budget, per-head gift value) live in calc.ts, never here.

export type GuestType = 'adult' | 'child' | 'staff'
export const GUEST_TYPES: GuestType[] = ['adult', 'child', 'staff']

export type Rsvp = 'pending' | 'yes' | 'no'

export interface Address {
  line1?: string
  city?: string
  state?: string
  postcode?: string
  country?: string
}

export interface Guest {
  id: string
  title?: string
  firstName: string
  lastName: string
  householdId: string
  categoryId: string
  tagIds: string[]
  /** balance attribute id → one of that attribute's values */
  attributes: Record<string, string>
  type: GuestType
  /** Forecast: part of the plan to reach the goal (A-list). */
  planned: boolean
  rsvp: Rsvp
  tableId?: string
  seat?: number
  email?: string
  phone?: string
  address?: Address
  notes?: string
}

export interface Household {
  id: string
  name: string
}

export interface Category {
  id: string
  name: string
  color: string
}

export interface Tag {
  id: string
  name: string
  color: string
}

export interface BalanceAttribute {
  id: string
  name: string
  values: string[]
  enabled: boolean
}

export type TableShape = 'round' | 'long' | 'custom'

export interface Table {
  id: string
  name: string
  theme?: string
  capacity: number
  order: number
  shape: TableShape
}

export type GiftKind = 'money' | 'item' | 'experience'

export interface Gift {
  id: string
  from: string
  /** Households the gift came from; empty for givers who were not invited. */
  householdIds: string[]
  kind: GiftKind
  amount?: number
  description?: string
  thankYouSent: boolean
}

export type ExpenseModule = 'wedding' | 'honeymoon'

export interface ExpenseCategory {
  id: string
  name: string
  color: string
}

export interface Expense {
  id: string
  item: string
  categoryId: string
  estimate: number
  paid: number
  module: ExpenseModule
  notes?: string
}

export type BudgetMode = 'percent' | 'fixed' | 'off'

/** How one expense category takes part in the top-down budget plan. */
export interface BudgetLine {
  categoryId: string
  /** percent: a share of what's left after non-negotiables; fixed: a non-negotiable at its estimate; off: excluded. */
  mode: BudgetMode
  /** Share of the remainder, 0–100. Kept for 'fixed'/'off' lines so switching back restores it. */
  percent: number
  /** Locked shares don't move when other sliders are dragged. */
  locked: boolean
}

export interface BudgetPlan {
  /** Overall wedding budget. */
  total?: number
  lines: BudgetLine[]
}

export interface LiquorEvent {
  id: string
  name: string
}

export interface LiquorVendor {
  id: string
  name: string
}

export interface LiquorItem {
  id: string
  name: string
  kind: string
  /** event id → bottles needed */
  bottles: Record<string, number>
  /** vendor id → price per bottle */
  prices: Record<string, number>
}

export type VenueDrinks = 'included' | 'bar-tab' | 'byo'

/** Something not included at a venue that the couple would buy separately (DJ, cake…). */
export interface VenueExtra {
  id: string
  name: string
  cost: number
  per: 'flat' | 'head'
}

/** One priced option at a venue (a package, room or season). */
export interface VenuePackage {
  id: string
  name: string
  /** Hire fee charged regardless of headcount. */
  flatFee: number
  /** Adult price per head at or above the highest tier threshold. */
  pricePerHead: number
  /** Adult price while the headcount is below each threshold (same rule as Settings.tiers). */
  tiers: PriceTier[]
  /** Optional child and staff prices; copied to settings when the package is chosen. */
  childPrice?: number
  staffPrice?: number
  minGuests?: number
  maxGuests?: number
  /** Fractions, e.g. 0.1 = 10%. Discount applies to per-head charges; gratuity and tax to the venue charges. */
  discount: number
  gratuity: number
  tax: number
  drinks: VenueDrinks
  /** Estimated drinks cost per guest when drinks are a bar tab or bring-your-own. */
  drinksPerHead?: number
  extras: VenueExtra[]
  /** Inclusion name (from AppState.venueInclusions) → 'yes' | 'no' | a short note. */
  inclusions: Record<string, string>
  hours?: number
  notes?: string
  chosen: boolean
}

export interface Venue {
  id: string
  name: string
  location?: string
  url?: string
  notes?: string
  packages: VenuePackage[]
}

export interface PriceTier {
  /** Applies while the counted headcount is below this number. */
  below: number
  price: number
}

export type HoneymoonMode = 'in-budget' | 'separate' | 'off'

export interface Modules {
  gifts: boolean
  thankYous: boolean
  expenses: boolean
  liquor: boolean
  venues: boolean
  honeymoon: HoneymoonMode
}

export interface ThankYouRule {
  /** Gifts from households with nobody attending need a card. */
  nonAttendees: boolean
  /** Gifts worth more than this per attending head need a card. */
  perHeadOver?: number
}

export interface Settings {
  coupleNames: [string, string]
  /** ISO date, yyyy-mm-dd */
  date: string
  capacity: {
    min?: number
    goal?: number
    max: number
    /** Guest types counted toward min/max and price tiers. */
    countsTypes: GuestType[]
  }
  /** Price per head by guest type. For adults this is the price at or above the highest tier threshold. */
  pricePerHead: Record<GuestType, number>
  /** Adult price while the counted headcount is below each threshold, e.g. [{below:180,price:179},{below:220,price:157}] with adult 139. */
  tiers: PriceTier[]
  /** Venue hire fee charged regardless of headcount. */
  flatFee?: number
  /** Fraction off per-head charges. */
  discount?: number
  /** Gratuity + tax as one fraction, applied to the venue charges. */
  serviceCharge?: number
  averageGift?: number
  defaultTableCapacity: number
  modules: Modules
  thankYouRule: ThankYouRule
}

export interface SetupState {
  /** Highest wizard step completed (0 = none). */
  completedStep: number
  done: boolean
}

export interface AppState {
  schemaVersion: number
  setup: SetupState
  settings: Settings
  guests: Guest[]
  households: Household[]
  categories: Category[]
  tags: Tag[]
  balanceAttributes: BalanceAttribute[]
  tables: Table[]
  gifts: Gift[]
  expenseCategories: ExpenseCategory[]
  expenses: Expense[]
  liquorEvents: LiquorEvent[]
  liquorVendors: LiquorVendor[]
  liquor: LiquorItem[]
  venues: Venue[]
  /** Rows of the venue "what's included" comparison. */
  venueInclusions: string[]
  budgetPlan: BudgetPlan
}

/** Keys of AppState that hold arrays of `{ id }` records. */
export type CollectionKey = {
  [K in keyof AppState]: AppState[K] extends { id: string }[] ? K : never
}[keyof AppState]

export type ItemOf<K extends CollectionKey> = AppState[K][number]
