// A fully synthetic demo wedding for the "Load demo" button and for screenshots.
// Every name is invented (common first names with generic surnames). Output is deterministic:
// a fresh seeded PRNG is created per call, so two calls return deep-equal data.
import { createInitialState, paletteColor } from './defaults'
import type {
  Address, AppState, BudgetLine, BudgetMode, Expense, Gift, Guest, GuestType, Household, LiquorEvent, LiquorItem,
  LiquorVendor, Rsvp, Table, Venue, VenuePackage,
} from './types'

// The demo uses a fuller set than the minimal defaults. Ids cat-1..3 and tag-1..2 match the defaults.
const DEMO_CATEGORIES = [
  'Jamie family', 'Alex family', 'Jamie friends', 'Alex friends',
  'Shared friends', 'Work', 'Church / community', 'Plus-ones', 'Vendors / staff',
].map((name, i) => ({ id: `cat-${i + 1}`, name, color: paletteColor(i) }))

// Demo guest data was authored against these tag ids: tag-1 international, tag-2 accommodation,
// tag-3 bridal party, tag-4 choir, tag-6 dietary needs.
const DEMO_TAGS = [
  'International', 'Needs accommodation', 'Bridal party', 'Choir', 'Reader', 'Dietary needs',
].map((name, i) => ({ id: `tag-${i + 1}`, name, color: paletteColor(i + 3) }))

type Rand = () => number
type Kind = 'family' | 'couple' | 'trio' | 'single' | 'staff'

const SEED = 20261020

/** mulberry32: small seeded PRNG. */
function seeded(seed: number): Rand {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const pick = <T,>(rand: Rand, items: readonly T[]): T => items[Math.floor(rand() * items.length)]

function shuffle<T>(rand: Rand, items: readonly T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

const pad = (n: number, width = 2) => String(n).padStart(width, '0')

const FIRST_NAMES = [
  'Morgan', 'Riley', 'Sam', 'Taylor', 'Casey', 'Jordan', 'Avery', 'Quinn', 'Elliot', 'Harper',
  'Rowan', 'Sage', 'Parker', 'Reese', 'Blair', 'Dakota', 'Emerson', 'Finley', 'Hayden', 'Kendall',
  'Logan', 'Marlow', 'Nico', 'Ivy', 'Maya', 'Luca', 'Priya', 'Tomas', 'Ana', 'Liam', 'Sofia',
  'Hiro', 'Ingrid', 'Omar', 'Lena', 'Mateo', 'Chloe', 'Ravi', 'Nadia', 'Felix', 'Iris', 'Kofi',
  'Elena', 'Gabe', 'Mira', 'Theo', 'Zara', 'Dev', 'Hana', 'Leo', 'Ruby', 'Oscar', 'Freya',
  'Yusuf', 'Clara', 'Malik', 'Pia', 'Ezra', 'Wren', 'Tess', 'Arlo', 'Noor',
]
const KID_NAMES = ['Eli', 'Lola', 'Max', 'Juno', 'Milo', 'Pearl', 'Otto', 'Nell', 'Remy', 'Hazel']
const SURNAMES = [
  'Rivers', 'Oakley', 'Hart', 'Moreno', 'Chen', 'Patel', 'Kowalski', 'Nguyen', "O'Brien", 'Silva',
  'Okafor', 'Brandt', 'Haddad', 'Novak', 'Tran', 'Keller', 'Ferreira', 'Doyle', 'Ruiz', 'Park',
  'Lindqvist', 'Abara', 'Fenwick', 'Marsh',
]
const STREETS = [
  'Lantern Road', 'Maple Court', 'Harbour View', 'Wattle Street', 'Orchard Lane', 'Kestrel Drive',
  'Juniper Avenue', 'Tallow Street', 'Birchwood Way', 'Quarry Hill Road',
]
const DOMESTIC_PLACES = [
  { city: 'Calder Bay', state: 'VIC' }, { city: 'Wenlow', state: 'NSW' },
  { city: 'Pinecrest', state: 'QLD' }, { city: 'Brightwater', state: 'SA' },
  { city: 'Oakridge', state: 'WA' }, { city: 'Fairhaven', state: 'ACT' },
]
const FOREIGN_PLACES = [
  { city: 'Ashworth', country: 'United Kingdom' }, { city: 'Cedar Falls', country: 'United States' },
  { city: 'Port Wren', country: 'New Zealand' }, { city: 'Brackenridge', country: 'Canada' },
  { city: 'Marina Point', country: 'Singapore' },
]
const THEMES = [
  'Family — Jamie', 'Family — Alex', 'Uni friends', 'Work', 'Young couples', 'Kids & parents',
  'Sailing club', 'Choir friends', 'Old school', 'Neighbours', 'Travel buddies', 'Plus-ones',
]
/** Category id per non-family household, cycled so every category gets some guests. */
const CATEGORY_CYCLE = [
  'cat-3', 'cat-4', 'cat-5', 'cat-6', 'cat-5', 'cat-3', 'cat-7',
  'cat-4', 'cat-8', 'cat-5', 'cat-6', 'cat-3', 'cat-4', 'cat-8',
]

// Attire is fixed, Honeymoon is off, Venue & catering is covered by the derived venue cost, and the
// other categories split the remainder (shares total 100).
const DEMO_BUDGET_LINES: BudgetLine[] = [
  ['exp-1', 'off', 0], ['exp-2', 'percent', 18], ['exp-3', 'percent', 20], ['exp-4', 'percent', 8],
  ['exp-5', 'percent', 6], ['exp-6', 'percent', 8], ['exp-7', 'fixed', 0], ['exp-8', 'percent', 5],
  ['exp-9', 'percent', 3], ['exp-10', 'percent', 4], ['exp-11', 'percent', 8], ['exp-12', 'percent', 15],
  ['exp-13', 'off', 0], ['exp-14', 'percent', 5],
].map(([categoryId, mode, percent]) => ({
  categoryId: categoryId as string, mode: mode as BudgetMode, percent: percent as number, locked: categoryId === 'exp-3',
}))

export function createDemoState(): AppState {
  const rand = seeded(SEED)
  const people: Guest[] = []
  const usedNames = new Set<string>()

  const addGuest = (g: Omit<Guest, 'id'>): Guest => {
    const guest: Guest = { id: `g-${pad(people.length + 1, 3)}`, ...g }
    people.push(guest)
    return guest
  }

  const uniqueFirst = (names: readonly string[], surname: string) => {
    let first = pick(rand, names)
    while (usedNames.has(`${first} ${surname}`)) first = pick(rand, names)
    usedNames.add(`${first} ${surname}`)
    return first
  }

  // ---- Households: families, couples, trios, singles (70 in total with staff) ----
  const plan: { kind: Kind; adults: number; kids: number }[] = [
    ...[3, 3, 2, 3, 3, 2, 3, 3].map((kids) => ({ kind: 'family' as const, adults: 2, kids })),
    ...Array.from({ length: 40 }, () => ({ kind: 'couple' as const, adults: 2, kids: 0 })),
    ...Array.from({ length: 12 }, () => ({ kind: 'trio' as const, adults: 3, kids: 0 })),
    ...Array.from({ length: 6 }, () => ({ kind: 'single' as const, adults: 1, kids: 0 })),
  ]

  interface Hh {
    id: string
    name: string
    kind: Kind
    categoryId: string
    members: Guest[]
  }
  const hhs: Hh[] = []
  let cycle = 0
  let familyCount = 0

  plan.forEach((p, n) => {
    const id = `h-${pad(n + 1)}`
    const surname = pick(rand, SURNAMES)
    const first = Array.from({ length: p.adults }, () => uniqueFirst(FIRST_NAMES, surname))
    const name = p.kind === 'family' ? `${surname} family`
      : p.kind === 'single' ? `${first[0]} ${surname}`
        : p.kind === 'couple' ? `${first[0]} & ${first[1]} ${surname}`
          : `${first[0]}, ${first[1]} & ${first[2]} ${surname}`
    let categoryId: string
    if (p.kind === 'family') categoryId = familyCount++ < 4 ? 'cat-1' : 'cat-2'
    else categoryId = CATEGORY_CYCLE[cycle++ % CATEGORY_CYCLE.length]

    const members: Guest[] = first.map((f) => addGuest({
      firstName: f, lastName: surname, householdId: id, categoryId, tagIds: [], type: 'adult',
      attributes: { 'attr-sex': pick(rand, ['M', 'F', 'F', 'M', 'X']), 'attr-age': pick(rand, ['Young adult', 'Adult', 'Adult', 'Adult', 'Senior']) },
      planned: true, rsvp: 'pending',
    }))
    for (let k = 0; k < p.kids; k++) {
      let kid = pick(rand, KID_NAMES)
      while (usedNames.has(`${kid} ${surname}`)) kid = pick(rand, KID_NAMES)
      usedNames.add(`${kid} ${surname}`)
      members.push(addGuest({
        firstName: kid, lastName: surname, householdId: id, categoryId, tagIds: [], type: 'child',
        attributes: { 'attr-sex': pick(rand, ['M', 'F']), 'attr-age': 'Child' },
        planned: true, rsvp: 'pending',
      }))
    }
    hhs.push({ id, name, kind: p.kind, categoryId, members })
  })

  // Staff households: photographer, videographer, DJ, celebrant.
  const staffRoles = [
    { first: 'Nadia', last: 'Okafor', role: 'Photographer' },
    { first: 'Gabe', last: 'Brandt', role: 'Videographer' },
    { first: 'Tomas', last: 'Novak', role: 'DJ' },
    { first: 'Ingrid', last: 'Haddad', role: 'Celebrant' },
  ]
  staffRoles.forEach((s, i) => {
    const id = `h-${pad(plan.length + i + 1)}`
    const member = addGuest({
      firstName: s.first, lastName: s.last, householdId: id, categoryId: 'cat-9', tagIds: [], type: 'staff',
      attributes: { 'attr-sex': pick(rand, ['M', 'F']), 'attr-age': 'Adult' },
      planned: true, rsvp: 'yes', notes: s.role,
    })
    hhs.push({ id, name: `${s.first} ${s.last} (${s.role})`, kind: 'staff', categoryId: 'cat-9', members: [member] })
  })

  // Email on about half the adults.
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')
  people.forEach((g, i) => {
    if (g.type === 'adult' && i % 2 === 0) g.email = `${slug(g.firstName)}.${slug(g.lastName)}@example.com`
  })

  // International households (~15 guests), tagged and given a foreign address.
  const foreignPlace = new Map<string, (typeof FOREIGN_PLACES)[number]>()
  let intlGuests = 0
  for (const h of shuffle(rand, hhs.filter((h) => h.kind === 'couple' || h.kind === 'trio' || h.kind === 'single'))) {
    if (intlGuests >= 15) break
    if (intlGuests + h.members.length > 16) continue
    foreignPlace.set(h.id, pick(rand, FOREIGN_PLACES))
    intlGuests += h.members.length
    for (const m of h.members) m.tagIds.push('tag-1')
  }

  // Addresses: fictional street, domestic or foreign.
  for (const h of hhs) {
    const number = 1 + Math.floor(rand() * 199)
    const street = `${number} ${pick(rand, STREETS)}`
    const foreign = foreignPlace.get(h.id)
    const address: Address = foreign
      ? { line1: street, city: foreign.city, country: foreign.country }
      : { line1: street, ...pick(rand, DOMESTIC_PLACES), postcode: String(3000 + Math.floor(rand() * 900)), country: 'Australia' }
    for (const m of h.members) m.address = { ...address }
  }

  // Needs accommodation (~12 adults), dietary needs (~10 adults).
  const adults = people.filter((g) => g.type === 'adult')
  for (const g of shuffle(rand, adults).slice(0, 12)) g.tagIds.push('tag-2')
  for (const g of shuffle(rand, adults).slice(0, 10)) g.tagIds.push('tag-6')
  // Bridal party (~8) from the partners' friend groups; choir (~6) from the church/community category.
  for (const g of shuffle(rand, adults.filter((g) => g.categoryId === 'cat-3' || g.categoryId === 'cat-4')).slice(0, 8)) {
    g.tagIds.push('tag-3')
  }
  for (const g of shuffle(rand, people.filter((g) => g.categoryId === 'cat-7')).slice(0, 6)) g.tagIds.push('tag-4')

  // ---- RSVP and plan ----
  // Unplanned B-list: six couples and two singles, mostly pending.
  const couples = hhs.filter((h) => h.kind === 'couple')
  const singles = hhs.filter((h) => h.kind === 'single')
  const bList = [...shuffle(rand, couples).slice(0, 6), ...shuffle(rand, singles).slice(0, 2)]
  const bIds = new Set(bList.map((h) => h.id))
  bList.forEach((h, i) => {
    for (const m of h.members) {
      m.planned = false
      m.rsvp = i === 0 ? 'no' : 'pending'
    }
  })

  const rest = shuffle(rand, hhs.filter((h) => h.kind !== 'staff' && !bIds.has(h.id)))
  const statusFor = (i: number): Rsvp => (i < 41 ? 'yes' : i < 51 ? 'no' : 'pending')
  rest.forEach((h, i) => {
    for (const m of h.members) m.rsvp = statusFor(i)
  })

  // ---- Tables and seating ----
  const tables: Table[] = [
    { id: 'tbl-01', name: 'Head table', capacity: 12, order: 1, shape: 'long' },
    ...THEMES.map((theme, i): Table => ({
      id: `tbl-${pad(i + 2)}`, name: `Table ${i + 1}`, theme, capacity: 10, order: i + 2, shape: 'round',
    })),
    { id: 'tbl-14', name: 'Table 13', theme: 'Grandparents', capacity: 8, order: 14, shape: 'round' },
  ]
  // Attending non-staff guests, grouped by category, with about 80% of them seated.
  const attending = people
    .filter((g) => g.rsvp === 'yes' && g.type !== 'staff')
    .sort((a, b) => Number(a.categoryId.split('-')[1]) - Number(b.categoryId.split('-')[1]))
  const seatable = attending.filter((_, i) => i % 5 !== 4)

  const totalCapacity = tables.reduce((sum, t) => sum + t.capacity, 0)
  const sizes = tables.map((t) => Math.floor((seatable.length * t.capacity) / totalCapacity))
  let remainder = seatable.length - sizes.reduce((sum, n) => sum + n, 0)
  for (let i = 0; remainder > 0; i = (i + 1) % sizes.length, remainder--) sizes[i]++

  let cursor = 0
  tables.forEach((table, ti) => {
    for (let seat = 1; seat <= sizes[ti]; seat++) {
      const g = seatable[cursor++]
      g.tableId = table.id
      g.seat = seat
    }
  })

  // ---- Gifts ----
  const households: Household[] = hhs.map((h) => ({ id: h.id, name: h.name }))
  const yesHouseholds = shuffle(rand, hhs.filter((h) => h.kind !== 'staff' && h.members.some((m) => m.rsvp === 'yes')))
  const noHouseholds = shuffle(rand, hhs.filter((h) => h.members.every((m) => m.rsvp === 'no')))
  const gifts: Gift[] = []
  const addGift = (g: Omit<Gift, 'id' | 'thankYouSent'>) => {
    gifts.push({ id: `gift-${pad(gifts.length + 1, 3)}`, thankYouSent: gifts.length % 2 === 0, ...g })
  }
  const itemNames = ['Espresso machine', 'Cookware set', 'Framed print', 'Linen set']
  // 25 gifts from attending households: 21 money, 3 items, 1 experience.
  yesHouseholds.slice(0, 25).forEach((h, i) => {
    if (i < 21) {
      addGift({ from: h.name, householdIds: [h.id], kind: 'money', amount: 50 + 25 * Math.floor(rand() * 15) })
    } else if (i < 24) {
      addGift({ from: h.name, householdIds: [h.id], kind: 'item', amount: 60 + 5 * Math.floor(rand() * 25), description: pick(rand, itemNames) })
    } else {
      addGift({ from: h.name, householdIds: [h.id], kind: 'experience', amount: 250, description: 'Cooking class for two' })
    }
  })
  // 3 gifts from households where nobody is attending.
  noHouseholds.slice(0, 3).forEach((h) => {
    addGift({ from: h.name, householdIds: [h.id], kind: 'money', amount: 50 + 25 * Math.floor(rand() * 15) })
  })
  // 2 gifts from uninvited givers.
  addGift({ from: 'Vera Keller (great-aunt)', householdIds: [], kind: 'money', amount: 150 })
  addGift({ from: 'Marcus Lindqvist (former colleague)', householdIds: [], kind: 'item', amount: 180, description: 'Vintage record player' })

  // ---- Budget ----
  const wedding: [string, string, number, number, string][] = [
    ['Venue hire balance (Greyfield Estate)', 'exp-1', 6500, 3250, 'wedding'],
    ['Catering deposit', 'exp-1', 1800, 1800, 'wedding'],
    ['Bar package top-up', 'exp-2', 2400, 0, 'wedding'],
    ['Photographer, full day', 'exp-3', 3200, 1600, 'wedding'],
    ['Videographer, highlights', 'exp-3', 1900, 0, 'wedding'],
    ['DJ and sound', 'exp-4', 1400, 700, 'wedding'],
    ['Celebrant fee', 'exp-5', 450, 450, 'wedding'],
    ['Ceremony chairs and arch hire', 'exp-5', 380, 0, 'wedding'],
    ['Bridal bouquet and buttonholes', 'exp-6', 620, 620, 'wedding'],
    ['Reception centrepieces (12)', 'exp-6', 980, 200, 'wedding'],
    ['Wedding dress', 'exp-7', 2400, 2400, 'wedding'],
    ['Suit hire, groomsmen (6)', 'exp-7', 780, 0, 'wedding'],
    ['Hair and makeup, trial and day', 'exp-8', 750, 250, 'wedding'],
    ['Invitations and RSVP cards', 'exp-9', 340, 340, 'wedding'],
    ['Order of service printing', 'exp-9', 120, 0, 'wedding'],
    ['Thank-you cards and favours', 'exp-10', 260, 90, 'wedding'],
    ['Guest shuttle (two coaches)', 'exp-11', 1100, 0, 'wedding'],
    ['Car for the couple', 'exp-11', 350, 350, 'wedding'],
    ['Room block deposit (Hillcrest Inn)', 'exp-12', 1500, 500, 'wedding'],
    ['Marriage licence and legal fees', 'exp-14', 210, 210, 'wedding'],
    ['Wedding insurance', 'exp-14', 280, 280, 'wedding'],
    ['Champagne for the toast (24 bottles)', 'exp-2', 480, 0, 'wedding'],
  ]
  const honeymoon: [string, string, number, number, string][] = [
    ['Return flights, two people', 'exp-13', 2800, 2800, 'honeymoon'],
    ['Hotel, five nights', 'exp-13', 1900, 760, 'honeymoon'],
    ['Travel insurance', 'exp-13', 260, 260, 'honeymoon'],
    ['Excursions', 'exp-13', 500, 0, 'honeymoon'],
  ]
  const expenses: Expense[] = [...wedding, ...honeymoon].map(([item, categoryId, estimate, paid, module], i) => ({
    id: `ex-${pad(i + 1, 2)}`,
    item,
    categoryId,
    estimate,
    paid,
    module: module as Expense['module'],
  }))

  // ---- Drinks ----
  const liquorEvents: LiquorEvent[] = [{ id: 'ev-1', name: 'Reception' }, { id: 'ev-2', name: 'Second day' }]
  const liquorVendors: LiquorVendor[] = [{ id: 'lv-1', name: 'Cellar Door Drinks' }, { id: 'lv-2', name: 'Northside Liquor Co.' }]
  const liquor: LiquorItem[] = [
    { id: 'liq-1', name: 'Vodka', kind: 'Spirit', bottles: { 'ev-1': 6, 'ev-2': 2 }, prices: { 'lv-1': 38, 'lv-2': 35 } },
    { id: 'liq-2', name: 'Gin', kind: 'Spirit', bottles: { 'ev-1': 5, 'ev-2': 2 }, prices: { 'lv-1': 44, 'lv-2': 42 } },
    { id: 'liq-3', name: 'Whisky', kind: 'Spirit', bottles: { 'ev-1': 4, 'ev-2': 1 }, prices: { 'lv-1': 62, 'lv-2': 58 } },
    { id: 'liq-4', name: 'Wine', kind: 'Wine', bottles: { 'ev-1': 40, 'ev-2': 12 }, prices: { 'lv-1': 18, 'lv-2': 16 } },
    { id: 'liq-5', name: 'Beer', kind: 'Beer', bottles: { 'ev-1': 60, 'ev-2': 24 }, prices: { 'lv-1': 4.5, 'lv-2': 4.2 } },
  ]

  // ---- Venues ----
  const pkg = (p: Partial<VenuePackage> & Pick<VenuePackage, 'id' | 'name'>): VenuePackage => ({
    flatFee: 0, pricePerHead: 0, tiers: [], discount: 0, gratuity: 0, tax: 0,
    drinks: 'included', extras: [], inclusions: {}, chosen: false, ...p,
  })
  const yes = (...names: string[]) => Object.fromEntries(names.map((n) => [n, 'yes']))
  const venues: Venue[] = [
    {
      id: 'venue-1', name: 'Greyfield Estate', location: 'Calder Bay, VIC',
      notes: 'Deposit paid; final numbers due 6 weeks out.',
      packages: [
        pkg({
          id: 'pkg-1a', name: 'Classic (drinks included)', pricePerHead: 135, childPrice: 70, staffPrice: 90,
          tiers: [{ below: 120, price: 165 }, { below: 150, price: 150 }], minGuests: 120, maxGuests: 170,
          drinks: 'included', hours: 5.5, chosen: true,
          inclusions: { ...yes('Ceremony space', 'Canapés', 'Main course', 'Dessert', 'Sparkling toast', 'Dance floor', 'Bridal suite', 'Furniture & linen', 'AV / microphone', 'Coordinator'), 'Wedding cake': 'no', 'Outdoor area': 'Courtyard' },
          extras: [{ id: 'x-1', name: 'Wedding cake', cost: 750, per: 'flat' }],
        }),
        pkg({
          id: 'pkg-1b', name: 'Premium (top-shelf bar)', pricePerHead: 168, minGuests: 120, maxGuests: 170,
          drinks: 'included', hours: 6,
          inclusions: { ...yes('Ceremony space', 'Canapés', 'Main course', 'Dessert', 'Wedding cake', 'Sparkling toast', 'Dance floor', 'Bridal suite', 'Furniture & linen', 'AV / microphone', 'Coordinator'), 'Outdoor area': 'Courtyard' },
        }),
      ],
    },
    {
      id: 'venue-2', name: 'The Willow Barn', location: 'Wenlow, NSW',
      notes: 'Large hire fee but cheap catering; bring your own drinks with no corkage.',
      packages: [
        pkg({
          id: 'pkg-2a', name: 'Whole-day hire', flatFee: 9000, pricePerHead: 82, maxGuests: 160,
          gratuity: 0, tax: 0.1, drinks: 'byo', drinksPerHead: 28, hours: 8,
          inclusions: { ...yes('Ceremony space', 'Main course', 'Dance floor', 'Outdoor area', 'Furniture & linen'), Canapés: 'no', Dessert: 'no', 'Bridal suite': 'no', Coordinator: 'no' },
          extras: [
            { id: 'x-2', name: 'DJ', cost: 1800, per: 'flat' },
            { id: 'x-3', name: 'Canapés & dessert', cost: 22, per: 'head' },
          ],
        }),
      ],
    },
    {
      id: 'venue-3', name: 'Larkspur House', location: 'Pinecrest, QLD',
      packages: [
        pkg({
          id: 'pkg-3a', name: 'Garden package', flatFee: 2500, pricePerHead: 128, minGuests: 80, maxGuests: 140,
          discount: 0.1, tax: 0.1, drinks: 'bar-tab', drinksPerHead: 35, hours: 5,
          inclusions: { ...yes('Ceremony space', 'Canapés', 'Main course', 'Outdoor area', 'Furniture & linen'), Dessert: 'Add-on', 'Dance floor': 'Small', 'Bridal suite': 'no' },
        }),
      ],
    },
  ]

  const initial = createInitialState()
  return {
    ...initial,
    setup: { completedStep: 7, done: true },
    settings: {
      coupleNames: ['Jamie', 'Alex'],
      date: '2027-07-17',
      capacity: { min: 120, goal: 150, max: 170, countsTypes: ['adult', 'child', 'staff'] as GuestType[] },
      pricePerHead: { adult: 135, child: 70, staff: 90 },
      tiers: [{ below: 120, price: 165 }, { below: 150, price: 150 }],
      averageGift: 105,
      defaultTableCapacity: 10,
      modules: { gifts: true, thankYous: true, expenses: true, liquor: true, venues: true, honeymoon: 'separate' },
      thankYouRule: { nonAttendees: true, perHeadOver: 120 },
    },
    categories: DEMO_CATEGORIES,
    tags: DEMO_TAGS,
    balanceAttributes: initial.balanceAttributes.map((a) =>
      a.id === 'attr-sex' || a.id === 'attr-age' ? { ...a, enabled: true } : a,
    ),
    households,
    guests: people,
    tables,
    gifts,
    expenses,
    liquorEvents,
    liquorVendors,
    liquor,
    venues,
    budgetPlan: {
      total: 60000,
      lines: DEMO_BUDGET_LINES,
    },
  }
}
