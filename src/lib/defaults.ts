import type { AppState, BalanceAttribute, Category, ExpenseCategory, Settings, Tag } from './types'

export const SCHEMA_VERSION = 2

/** Colour palette for categories, tags and charts; cycled when users add items. */
export const PALETTE = [
  '#c2566b', '#3b82a0', '#d4a03a', '#5f9e6e', '#8a63b8',
  '#d9734e', '#4f6bbf', '#9c8a4a', '#c45d9a', '#4aa3a3',
]

export const paletteColor = (index: number) => PALETTE[index % PALETTE.length]

// Deliberately minimal; couples add their own in setup. The demo wedding uses a fuller set.
export const DEFAULT_CATEGORIES: Category[] = ['Partner 1 family', 'Partner 2 family', 'Friends']
  .map((name, i) => ({ id: `cat-${i + 1}`, name, color: paletteColor(i) }))

export const DEFAULT_TAGS: Tag[] = ['Bridal party', 'Needs accommodation']
  .map((name, i) => ({ id: `tag-${i + 1}`, name, color: paletteColor(i + 3) }))

/** Prefilled rows of the venue "what's included" comparison. */
export const DEFAULT_VENUE_INCLUSIONS = [
  'Ceremony space', 'Canapés', 'Main course', 'Dessert', 'Wedding cake', 'Sparkling toast',
  'Dance floor', 'Bridal suite', 'Outdoor area', 'Furniture & linen', 'AV / microphone', 'Coordinator',
]

export const DEFAULT_BALANCE_ATTRIBUTES: BalanceAttribute[] = [
  { id: 'attr-sex', name: 'Sex', values: ['M', 'F', 'X'], enabled: false },
  { id: 'attr-age', name: 'Age group', values: ['Child', 'Young adult', 'Adult', 'Senior'], enabled: false },
  { id: 'attr-rel', name: 'Relationship', values: ['Single', 'Couple'], enabled: false },
]

export const DEFAULT_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Venue & catering', 'Drinks', 'Photo & video', 'Music', 'Ceremony', 'Flowers',
  'Attire', 'Hair & makeup', 'Stationery', 'Gifts & favours', 'Transport', 'Accommodation',
  'Honeymoon', 'Other',
].map((name, i) => ({ id: `exp-${i + 1}`, name, color: paletteColor(i) }))

export const DEFAULT_SETTINGS: Settings = {
  coupleNames: ['', ''],
  date: '',
  capacity: { max: 150, countsTypes: ['adult', 'child', 'staff'] },
  pricePerHead: { adult: 140, child: 75, staff: 95 },
  tiers: [],
  defaultTableCapacity: 10,
  modules: {
    gifts: false,
    thankYous: false,
    expenses: true,
    liquor: false,
    venues: false,
    honeymoon: 'off',
  },
  thankYouRule: { nonAttendees: true },
}

export function createInitialState(): AppState {
  return {
    schemaVersion: SCHEMA_VERSION,
    setup: { completedStep: 0, done: false },
    settings: structuredClone(DEFAULT_SETTINGS),
    guests: [],
    households: [],
    categories: structuredClone(DEFAULT_CATEGORIES),
    tags: structuredClone(DEFAULT_TAGS),
    balanceAttributes: structuredClone(DEFAULT_BALANCE_ATTRIBUTES),
    tables: [],
    gifts: [],
    expenseCategories: structuredClone(DEFAULT_EXPENSE_CATEGORIES),
    expenses: [],
    liquorEvents: [
      { id: 'ev-1', name: 'Reception' },
    ],
    liquorVendors: [],
    liquor: [],
    venues: [],
    venueInclusions: [...DEFAULT_VENUE_INCLUSIONS],
    budgetPlan: { lines: [] },
  }
}
