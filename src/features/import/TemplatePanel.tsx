import { useState } from 'react'
import { Alert, Button, Card } from '../../components/ui'
import type { BalanceAttribute, Category, Tag } from '../../lib/types'
import { downloadFile } from '../data/backup'
import { buildTemplateCsv, buildTemplateRows, templateHeaders } from './template'

interface Props {
  categories: Category[]
  tags: Tag[]
  attributes: BalanceAttribute[]
  onNext: () => void
}

const COLUMN_HELP: [string, string][] = [
  ['Household', 'Any label. Rows with the same label become one household. Leave blank and the guest gets their own household.'],
  ['Title', 'Optional: Mr, Mrs, Ms, Dr, Prof (tidied to Mr., Mrs. and so on).'],
  ['First Name, Last Name', 'Required.'],
  ['Guest Type', 'Adult, Child or Staff. Blank means Adult.'],
  ['Category', 'Which circle the guest belongs to. Blank uses the default you pick during review.'],
  ['Groups', 'Group names separated by semicolons, e.g. Choir;Reader.'],
  ['Planned', 'yes/no (also y/n, 1/0, true/false). Blank means yes: the guest is part of the plan.'],
  ['RSVP', 'yes/no (also y/n, 1/0, true/false). Blank means pending.'],
  ['Email, Phone, Address, City, State, Postcode, Country, Notes', 'Optional contact details. A state of three letters or fewer is upper-cased.'],
]

export function TemplatePanel({ categories, tags, attributes, onNext }: Props) {
  const [showHelp, setShowHelp] = useState(false)
  const enabled = attributes.filter((a) => a.enabled)
  const headers = templateHeaders(attributes)
  const sample = buildTemplateRows({ categories, tags, attributes })

  return (
    <div className="space-y-4">
      <Card title="1. Download the template">
        <p className="text-sm text-stone-600">
          A spreadsheet with the right columns and a few example rows that use your own categories, groups and
          attributes. Fill it in (Excel, Numbers or Google Sheets), save it as CSV, then upload it in the next step.
          Delete the example rows first. You can also upload any other CSV and match its columns yourself.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => downloadFile('guest-template.csv', buildTemplateCsv({ categories, tags, attributes }), 'text/csv;charset=utf-8')}>
            Download CSV template
          </Button>
          <Button onClick={() => setShowHelp((v) => !v)} aria-expanded={showHelp}>
            {showHelp ? 'Hide' : 'How to fill this in'}
          </Button>
          <Button onClick={onNext}>I already have a CSV</Button>
        </div>
      </Card>

      {showHelp && (
        <Card title="How to fill this in">
          <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[14rem_1fr]">
            {COLUMN_HELP.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="font-medium text-stone-800">{k}</dt>
                <dd className="text-stone-600">{v}</dd>
              </div>
            ))}
            {enabled.map((a) => (
              <div key={a.id} className="contents">
                <dt className="font-medium text-stone-800">{a.name}</dt>
                <dd className="text-stone-600">One of: {a.values.join(', ')}. Anything else is left unset.</dd>
              </div>
            ))}
          </dl>
          <div className="mt-3">
            <Alert tone="info">
              Categories and groups that are not in your lists can still be imported: you will be asked whether to
              create them or map them to an existing one.
            </Alert>
          </div>
        </Card>
      )}

      <Card title="What the template looks like">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 text-stone-500">
                {headers.map((h) => <th key={h} className="whitespace-nowrap px-2 py-1 font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {sample.map((r, i) => (
                <tr key={i} className="border-b border-stone-100">
                  {r.map((c, j) => <td key={j} className="whitespace-nowrap px-2 py-1">{c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button variant="primary" onClick={onNext}>Next: upload</Button>
      </div>
    </div>
  )
}
