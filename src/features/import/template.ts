// Builds the downloadable CSV template from the user's own categories, groups and balance attributes.
import Papa from 'papaparse'
import type { BalanceAttribute, Category, Tag } from '../../lib/types'

export const BASE_COLUMNS = [
  'Household', 'Title', 'First Name', 'Last Name', 'Guest Type', 'Category', 'Groups', 'Planned',
  'RSVP', 'Email', 'Phone', 'Address', 'City', 'State', 'Postcode', 'Country', 'Notes',
] as const

export interface TemplateInput {
  categories: Category[]
  tags: Tag[]
  attributes: BalanceAttribute[]
}

export function templateHeaders(attributes: BalanceAttribute[]): string[] {
  return [...BASE_COLUMNS, ...attributes.filter((a) => a.enabled).map((a) => a.name)]
}

export function buildTemplateRows({ categories, tags, attributes }: TemplateInput): string[][] {
  const enabled = attributes.filter((a) => a.enabled)
  const headers = templateHeaders(attributes)
  const cat = (i: number) => (categories.length ? categories[i % categories.length].name : '')
  const tag = (i: number) => (tags.length ? tags[i % tags.length].name : '')

  type Ex = Partial<Record<(typeof BASE_COLUMNS)[number], string>>
  const examples: Ex[] = [
    {
      Household: 'Example Family', Title: 'Mr.', 'First Name': 'Alex', 'Last Name': 'Example', 'Guest Type': 'Adult',
      Category: cat(0), Groups: [tag(0), tag(1)].filter(Boolean).join(';'), Planned: 'yes', RSVP: 'yes',
      Email: 'alex@example.com', Phone: '0400 000 001', Address: '1 Example Street', City: 'Sampletown',
      State: 'VIC', Postcode: '3000', Country: 'Australia',
    },
    {
      Household: 'Example Family', Title: 'Mrs.', 'First Name': 'Jordan', 'Last Name': 'Example', 'Guest Type': 'Adult',
      Category: cat(0), Groups: tag(0), Planned: 'yes', RSVP: 'yes',
    },
    {
      Household: 'Example Family', 'First Name': 'Casey', 'Last Name': 'Example', 'Guest Type': 'Child',
      Category: cat(0), Planned: 'yes', Notes: 'Needs a high chair',
    },
    {
      Title: 'Dr.', 'First Name': 'Sam', 'Last Name': 'Example', 'Guest Type': 'Adult',
      Category: cat(1), Groups: tag(2), Planned: 'yes', RSVP: 'no', Email: 'sam@example.com',
    },
    {
      Household: 'Sample Friends', 'First Name': 'Riley', 'Last Name': 'Sample', Category: cat(2), Planned: 'no',
    },
    {
      'First Name': 'Pat', 'Last Name': 'Sample', 'Guest Type': 'Staff', Category: cat(categories.length - 1),
      Planned: 'yes', Notes: 'Photographer',
    },
  ]
  return examples.map((ex, n) =>
    headers.map((h) => {
      const base = (ex as Record<string, string | undefined>)[h]
      if (base !== undefined) return base
      const attr = enabled.find((a) => a.name === h)
      return attr && attr.values.length ? attr.values[n % attr.values.length] : ''
    }),
  )
}

/** Template as CSV text, with a BOM so Excel opens it as UTF-8. */
export function buildTemplateCsv(input: TemplateInput): string {
  const csv = Papa.unparse({ fields: templateHeaders(input.attributes), data: buildTemplateRows(input) }, { newline: '\r\n' })
  return `﻿${csv}\r\n`
}
