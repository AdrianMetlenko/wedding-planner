import Papa from 'papaparse'
import { describe, expect, it } from 'vitest'
import { DEFAULT_BALANCE_ATTRIBUTES, DEFAULT_CATEGORIES, DEFAULT_TAGS } from '../../lib/defaults'

// Fixtures: the defaults plus names these tests rely on, so they don't depend on default content.
const CATEGORIES = [...DEFAULT_CATEGORIES, { id: 'cat-work', name: 'Work', color: '#000000' }]
const TAGS = [...DEFAULT_TAGS, { id: 'tag-choir', name: 'Choir', color: '#000000' }]
import type { BalanceAttribute, Guest, Household } from '../../lib/types'
import { cleanRows, unknownCategories, unknownTags } from './clean'
import { autoMap, missingRequired } from './mapping'
import { buildPlan, duplicateWarnings, type ExistingData } from './merge'
import {
  isFormulaJunk, matchAttrValue, normaliseState, normaliseTitle, parseBool, parseGuestType, parseRsvp, splitList,
} from './normalise'
import { parseCsv } from './parse'
import { BASE_COLUMNS, buildTemplateCsv, buildTemplateRows, templateHeaders } from './template'

const attrs: BalanceAttribute[] = DEFAULT_BALANCE_ATTRIBUTES.map((a) => ({ ...a, enabled: a.id !== 'attr-rel' }))
const empty: ExistingData = { guests: [], households: [], categories: CATEGORIES, tags: TAGS }

function clean(headers: string[], rows: string[][], attributes = attrs) {
  return cleanRows(rows, autoMap(headers, attributes), attributes)
}

describe('normalise', () => {
  it('normalises titles', () => {
    expect(normaliseTitle(' mr ')).toBe('Mr.')
    expect(normaliseTitle('MRS.')).toBe('Mrs.')
    expect(normaliseTitle('ms')).toBe('Ms.')
    expect(normaliseTitle('dr')).toBe('Dr.')
    expect(normaliseTitle('prof')).toBe('Prof.')
    expect(normaliseTitle('  Rev   Canon ')).toBe('Rev Canon')
  })
  it('normalises state', () => {
    expect(normaliseState('vic ')).toBe('VIC')
    expect(normaliseState('Victoria')).toBe('Victoria')
    expect(normaliseState('n.s.w')).toBe('n.s.w')
  })
  it('parses guest type', () => {
    expect(parseGuestType('Kid').value).toBe('child')
    expect(parseGuestType('VENDOR').value).toBe('staff')
    expect(parseGuestType('crew').value).toBe('staff')
    expect(parseGuestType('')).toEqual({})
    expect(parseGuestType('dog').warning).toMatch(/Unknown guest type/)
  })
  it('parses booleans and rsvp', () => {
    for (const t of ['yes', 'Y', '1', 'TRUE']) expect(parseBool(t, 'x').value).toBe(true)
    for (const f of ['no', 'N', '0', 'false']) expect(parseBool(f, 'x').value).toBe(false)
    expect(parseBool('', 'x')).toEqual({})
    expect(parseBool('maybe?', 'Planned').warning).toMatch(/Planned/)
    expect(parseRsvp('Y').value).toBe('yes')
    expect(parseRsvp('no').value).toBe('no')
    expect(parseRsvp('pending').value).toBe('pending')
    expect(parseRsvp('').value).toBeUndefined()
    expect(parseRsvp('later-ish').warning).toBeTruthy()
  })
  it('detects formula junk', () => {
    for (const j of ['#REF!', '#N/A', '#VALUE!', '#NAME?', '#DIV/0!', ' #ref! ']) expect(isFormulaJunk(j)).toBe(true)
    expect(isFormulaJunk('#1 fan')).toBe(false)
  })
  it('splits lists on ; and ,', () => {
    expect(splitList('Choir; Reader,Choir ,, ')).toEqual(['Choir', 'Reader'])
    expect(splitList('')).toEqual([])
  })
  it('matches attribute values tolerantly', () => {
    expect(matchAttrValue('m.', ['M', 'F'])).toBe('M')
    expect(matchAttrValue(' young ADULT ', ['Child', 'Young adult'])).toBe('Young adult')
    expect(matchAttrValue('z', ['M', 'F'])).toBeUndefined()
    expect(matchAttrValue('', ['M'])).toBeUndefined()
  })
})

describe('parseCsv', () => {
  it('handles BOM, CRLF, trimming and quotes', () => {
    const text = '﻿First Name , Last Name\r\n"  Al  ex ",Example\r\n\r\nSam,"Ex, ample"\r\n'
    const { data, error } = parseCsv(text)
    expect(error).toBeUndefined()
    expect(data?.headers).toEqual(['First Name', 'Last Name'])
    expect(data?.rows).toEqual([['Al ex', 'Example'], ['Sam', 'Ex, ample']])
  })
  it('pads short rows and names blank headers', () => {
    const { data } = parseCsv('A,,C\n1\n')
    expect(data?.headers).toEqual(['A', 'Column 2', 'C'])
    expect(data?.rows).toEqual([['1', '', '']])
  })
  it('reports empty files and header-only files', () => {
    expect(parseCsv('').error).toBeTruthy()
    expect(parseCsv('A,B\n').error).toMatch(/no guests/)
  })
  it('detects semicolon delimiters', () => {
    expect(parseCsv('A;B\n1;2').data?.rows).toEqual([['1', '2']])
  })
})

describe('template', () => {
  const input = { categories: CATEGORIES, tags: TAGS, attributes: attrs }
  it('has the base columns then one per enabled attribute', () => {
    expect(templateHeaders(attrs)).toEqual([...BASE_COLUMNS, 'Sex', 'Age group'])
    expect(BASE_COLUMNS.slice(0, 4)).toEqual(['Household', 'Title', 'First Name', 'Last Name'])
  })
  it('uses the user categories, tags and attribute values in example rows', () => {
    const rows = buildTemplateRows(input)
    const h = templateHeaders(attrs)
    const col = (n: string) => rows.map((r) => r[h.indexOf(n)])
    expect(rows.length).toBe(6)
    for (const c of col('Category')) expect(CATEGORIES.map((x) => x.name)).toContain(c)
    const tagNames = TAGS.map((t) => t.name)
    for (const g of col('Groups').flatMap((x) => x.split(';')).filter(Boolean)) expect(tagNames).toContain(g)
    for (const s of col('Sex')) expect(['M', 'F', 'X']).toContain(s)
    expect(col('Last Name').every((n) => n === 'Example' || n === 'Sample')).toBe(true)
    expect(col('Household').filter((x) => x === 'Example Family').length).toBe(3)
    expect(col('Guest Type')).toContain('Child')
  })
  it('round-trips through the parser, auto-mapping and cleaning with no errors or warnings', () => {
    const parsed = parseCsv(buildTemplateCsv(input)).data!
    const mapping = autoMap(parsed.headers, attrs)
    expect(missingRequired(mapping)).toEqual([])
    const rows = cleanRows(parsed.rows, mapping, attrs)
    expect(rows.flatMap((r) => [...r.errors, ...r.warnings])).toEqual([])
    expect(unknownCategories(rows, CATEGORIES)).toEqual([])
    expect(unknownTags(rows, TAGS)).toEqual([])
    const plan = buildPlan(rows, empty, { mode: 'replace', defaultCategoryId: 'cat-1' })
    expect(plan.guests.length).toBe(6)
    expect(plan.households.length).toBe(4) // Example Family, Sam, Sample Friends, Pat
  })
  it('works with no categories, tags or attributes', () => {
    const rows = buildTemplateRows({ categories: [], tags: [], attributes: [] })
    expect(rows.length).toBe(6)
    expect(rows[0].length).toBe(BASE_COLUMNS.length)
  })
  it('quotes values safely', () => {
    const csv = buildTemplateCsv({ categories: [{ id: 'c', name: 'Mum, Dad & "co"', color: '#000' }], tags: [], attributes: [] })
    const parsed = Papa.parse<string[]>(csv.replace(/^﻿/, '')).data
    expect(parsed[1][5]).toBe('Mum, Dad & "co"')
  })
})

describe('autoMap', () => {
  it('matches synonyms', () => {
    const m = autoMap(['Given name', 'Surname', 'Side', 'Tags', 'Type', 'Attending', 'Zip', 'Mobile'], attrs)
    expect(m.firstName).toBe(0)
    expect(m.lastName).toBe(1)
    expect(m.category).toBe(2)
    expect(m.tags).toBe(3)
    expect(m.type).toBe(4)
    expect(m.rsvp).toBe(5)
    expect(m.postcode).toBe(6)
    expect(m.phone).toBe(7)
  })
  it('matches case/punctuation-insensitively and balance attributes by name', () => {
    const m = autoMap(['FIRST_NAME', 'last name', 'age group', 'SEX', 'Group'], attrs)
    expect(m.firstName).toBe(0)
    expect(m.lastName).toBe(1)
    expect(m['attr:attr-age']).toBe(2)
    expect(m['attr:attr-sex']).toBe(3)
    expect(m.category).toBe(4)
  })
  it('uses each column once and leaves unmatched null', () => {
    const m = autoMap(['Name'], attrs)
    expect(m.firstName).toBeNull()
    expect(missingRequired(m).map((f) => f.key)).toEqual(['firstName', 'lastName'])
    const dup = autoMap(['First', 'First'], attrs)
    expect(dup.firstName).toBe(0)
  })
  it('ignores disabled attributes', () => {
    expect(autoMap(['Relationship'], attrs)['attr:attr-rel']).toBeUndefined()
  })
})

describe('cleanRows', () => {
  const H = ['Household', 'Title', 'First Name', 'Last Name', 'Guest Type', 'Category', 'Groups', 'Planned', 'RSVP', 'State', 'Sex', 'Email']
  const row = (o: Partial<Record<string, string>>) => H.map((h) => o[h] ?? '')

  it('requires first and last name', () => {
    const [r] = clean(H, [row({ 'First Name': 'Al' })])
    expect(r.errors).toEqual(['Last name is required'])
    const [s] = clean(H, [row({})])
    expect(s.errors.length).toBe(2)
  })
  it('cleans fields', () => {
    const [r] = clean(H, [row({
      Title: ' mr', 'First Name': '  Alex   Jay ', 'Last Name': 'Example', State: ' vic ', Sex: 'm.', 'Guest Type': 'kid',
      Planned: 'N', RSVP: 'y', Groups: 'Choir; Reader',
    })])
    expect(r).toMatchObject({
      title: 'Mr.', firstName: 'Alex Jay', state: 'VIC', type: 'child', planned: false, rsvp: 'yes',
      tagNames: ['Choir', 'Reader'], attributes: { 'attr-sex': 'M' },
    })
    expect(r.errors).toEqual([])
    expect(r.warnings).toEqual([])
  })
  it('leaves blank type/planned/rsvp undefined', () => {
    const [r] = clean(H, [row({ 'First Name': 'A', 'Last Name': 'B' })])
    expect(r.type).toBeUndefined()
    expect(r.planned).toBeUndefined()
    expect(r.rsvp).toBeUndefined()
  })
  it('warns on unknown type, bool and attribute value', () => {
    const [r] = clean(H, [row({ 'First Name': 'A', 'Last Name': 'B', 'Guest Type': 'alien', Planned: 'maybe', Sex: 'Q' })])
    expect(r.warnings.length).toBe(3)
    expect(r.type).toBeUndefined()
    expect(r.attributes).toEqual({})
  })
  it('treats formula junk as blank with a warning', () => {
    const [r] = clean(H, [row({ 'First Name': '#REF!', 'Last Name': 'B', Email: '#N/A' })])
    expect(r.firstName).toBe('')
    expect(r.errors).toContain('First name is required')
    expect(r.email).toBeUndefined()
    expect(r.warnings.filter((w) => w.includes('treated as blank')).length).toBe(2)
  })
  it('ignores unmapped columns', () => {
    const [r] = cleanRows([['A', 'B', 'x']], { firstName: 0, lastName: 1 }, attrs)
    expect(r.firstName).toBe('A')
    expect(r.email).toBeUndefined()
  })
  it('lists unknown categories and tags once each, case-insensitively', () => {
    const rows = clean(H, [
      row({ 'First Name': 'A', 'Last Name': 'B', Category: 'Cousins', Groups: 'Soccer; Choir' }),
      row({ 'First Name': 'C', 'Last Name': 'D', Category: 'cousins ', Groups: 'soccer' }),
      row({ 'First Name': 'E', 'Last Name': 'F', Category: 'work' }),
    ])
    expect(unknownCategories(rows, CATEGORIES)).toEqual([{ key: 'cousins', name: 'Cousins', count: 2 }])
    expect(unknownTags(rows, TAGS)).toEqual([{ key: 'soccer', name: 'Soccer', count: 2 }])
  })
})

describe('buildPlan', () => {
  const H = ['Household', 'First Name', 'Last Name', 'Category', 'Groups', 'Email', 'Planned']
  const mk = (rows: string[][]) => clean(H, rows, [])

  it('groups households by label, case-insensitively; blank gets its own', () => {
    const rows = mk([
      ['Smiths', 'A', 'Smith', '', '', '', ''],
      [' smiths ', 'B', 'Smith', '', '', '', ''],
      ['', 'C', 'Jones', '', '', '', ''],
      ['', 'D', 'Jones', '', '', '', ''],
    ])
    const p = buildPlan(rows, empty, { mode: 'replace', defaultCategoryId: 'cat-1' })
    expect(p.households.map((h) => h.name)).toEqual(['Smiths', 'C Jones', 'D Jones'])
    expect(p.guests[0].householdId).toBe(p.guests[1].householdId)
    expect(p.guests[2].householdId).not.toBe(p.guests[3].householdId)
  })
  it('applies defaults', () => {
    const p = buildPlan(mk([['', 'A', 'B', '', '', '', '']]), empty, { mode: 'replace', defaultCategoryId: 'cat-3' })
    expect(p.guests[0]).toMatchObject({ categoryId: 'cat-3', type: 'adult', planned: true, rsvp: 'pending', tagIds: [] })
    expect(p.guests[0].tableId).toBeUndefined()
  })
  it('resolves categories and tags: existing, created, mapped, skipped', () => {
    const rows = mk([
      ['', 'A', 'B', 'WORK', 'choir;Soccer;Chess', '', ''],
      ['', 'C', 'D', 'Cousins', 'soccer', '', ''],
      ['', 'E', 'F', 'Uncles', '', '', ''],
    ])
    const p = buildPlan(rows, empty, {
      mode: 'replace', defaultCategoryId: 'cat-1',
      categoryChoices: { uncles: { kind: 'map', id: 'cat-2' } },
      tagChoices: { chess: { kind: 'skip' } },
    })
    const work = CATEGORIES.find((c) => c.name === 'Work')!.id
    const choir = TAGS.find((t) => t.name === 'Choir')!.id
    expect(p.guests[0].categoryId).toBe(work)
    expect(p.newCategories.map((c) => c.name)).toEqual(['Cousins'])
    expect(p.guests[1].categoryId).toBe(p.newCategories[0].id)
    expect(p.guests[2].categoryId).toBe('cat-2')
    expect(p.newTags.map((t) => t.name)).toEqual(['Soccer'])
    expect(p.guests[0].tagIds).toEqual([choir, p.newTags[0].id])
    expect(p.guests[1].tagIds).toEqual([p.newTags[0].id])
    expect(p.newCategories[0].color).toMatch(/^#/)
  })
  it('replace mode ignores existing guests and households', () => {
    const existing = existingWith()
    const p = buildPlan(mk([['Smiths', 'New', 'Person', '', '', '', '']]), existing, { mode: 'replace', defaultCategoryId: 'cat-1' })
    expect(p.guests.length).toBe(1)
    expect(p.households.length).toBe(1)
    expect(p.counts).toEqual({ added: 1, updated: 0, unchanged: 0 })
  })

  function existingWith(): ExistingData {
    const households: Household[] = [{ id: 'h1', name: 'Smiths' }]
    const base = { tagIds: [], attributes: {}, type: 'adult', planned: true, rsvp: 'pending', categoryId: 'cat-1' } as Pick<Guest, 'tagIds' | 'attributes' | 'type' | 'planned' | 'rsvp' | 'categoryId'>
    const guests: Guest[] = [
      { ...base, id: 'g1', firstName: 'Ann', lastName: 'Smith', householdId: 'h1', categoryId: 'cat-1', tableId: 't1', seat: 2, email: 'ann@x.com' },
      { ...base, id: 'g2', firstName: 'Bob', lastName: 'Smith', householdId: 'h1', categoryId: 'cat-1' },
    ]
    return { ...empty, guests, households }
  }

  it('merge: updates non-blank fields, keeps seating, adds unmatched, reuses households', () => {
    const rows = mk([
      ['smiths', 'ann', 'SMITH', '', 'Choir', '', 'no'], // updated: tag + planned, email blank so kept
      ['Smiths', 'Bob', 'Smith', '', '', '', ''], // unchanged
      ['Smiths', 'Cy', 'Smith', '', '', 'cy@x.com', ''], // new, joins household h1
      ['Joneses', 'Di', 'Jones', '', '', '', ''], // new household
    ])
    const existing = existingWith()
    const p = buildPlan(rows, existing, { mode: 'merge', defaultCategoryId: 'cat-1' })
    expect(p.counts).toEqual({ added: 2, updated: 1, unchanged: 1 })
    expect(p.actions).toEqual({ 1: 'updated', 2: 'unchanged', 3: 'new', 4: 'new' })
    expect(p.guests.length).toBe(4)
    const ann = p.guests.find((g) => g.id === 'g1')!
    expect(ann).toMatchObject({ planned: false, email: 'ann@x.com', tableId: 't1', seat: 2 })
    expect(ann.tagIds.length).toBe(1)
    expect(p.guests[2].householdId).toBe('h1')
    expect(p.households.map((h) => h.name)).toEqual(['Smiths', 'Joneses'])
    // input not mutated
    expect(existing.guests[0].planned).toBe(true)
  })
  it('merge: same name in a different household is added, not matched', () => {
    const p = buildPlan(mk([['Joneses', 'Ann', 'Smith', '', '', '', '']]), existingWith(), { mode: 'merge', defaultCategoryId: 'cat-1' })
    expect(p.counts.added).toBe(1)
    expect(p.guests.length).toBe(3)
  })
  it('merge: a blank household matches an existing household named "First Last"', () => {
    const existing = existingWith()
    existing.households.push({ id: 'h2', name: 'Eve Solo' })
    existing.guests.push({ ...existing.guests[0], id: 'g3', firstName: 'Eve', lastName: 'Solo', householdId: 'h2' })
    const p = buildPlan(mk([['', 'Eve', 'Solo', '', '', 'eve@x.com', '']]), existing, { mode: 'merge', defaultCategoryId: 'cat-1' })
    expect(p.counts).toEqual({ added: 0, updated: 1, unchanged: 0 })
    expect(p.households.length).toBe(2)
  })
  it('merge: an existing guest matches only one CSV row', () => {
    const rows = mk([
      ['Smiths', 'Ann', 'Smith', '', '', '', ''],
      ['Smiths', 'Ann', 'Smith', '', '', '', ''],
    ])
    const p = buildPlan(rows, existingWith(), { mode: 'merge', defaultCategoryId: 'cat-1' })
    expect(p.counts).toEqual({ added: 1, updated: 0, unchanged: 1 })
  })
})

describe('duplicateWarnings', () => {
  const H = ['Household', 'First Name', 'Last Name']
  it('flags in-file duplicates case-insensitively', () => {
    const rows = clean(H, [['', 'Ann', 'Lee'], ['', 'ANN', 'lee'], ['', 'Bo', 'Lee']], [])
    const w = duplicateWarnings(rows, empty, 'replace')
    expect(Object.keys(w)).toEqual(['2'])
    expect(w[2][0]).toMatch(/row 1/)
  })
  it('flags matches with existing guests in other households when merging only', () => {
    const base = { tagIds: [], attributes: {}, type: 'adult', planned: true, rsvp: 'pending', categoryId: 'cat-1' } as Pick<Guest, 'tagIds' | 'attributes' | 'type' | 'planned' | 'rsvp' | 'categoryId'>
    const existing: ExistingData = {
      ...empty,
      households: [{ id: 'h1', name: 'Lees' }],
      guests: [{ ...base, id: 'g1', firstName: 'Ann', lastName: 'Lee', householdId: 'h1' }],
    }
    const other = clean(H, [['Other', 'Ann', 'Lee']], [])
    const same = clean(H, [['Lees', 'Ann', 'Lee']], [])
    expect(duplicateWarnings(other, existing, 'merge')[1]).toHaveLength(1)
    expect(duplicateWarnings(same, existing, 'merge')[1]).toBeUndefined()
    expect(duplicateWarnings(other, existing, 'replace')[1]).toBeUndefined()
  })
})
