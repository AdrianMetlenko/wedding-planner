import Papa from 'papaparse'
import { cleanText } from './normalise'

export interface ParsedCsv {
  headers: string[]
  /** Data rows, each padded to the header width, cells trimmed. */
  rows: string[][]
}

/**
 * Parse CSV text. Handles a BOM, CRLF, quoted cells and `;`/tab delimiters (auto-detected).
 * Rows are read as arrays (not keyed objects) so duplicate header names cannot collide.
 */
export function parseCsv(text: string): { data?: ParsedCsv; error?: string } {
  const body = text.replace(/^﻿/, '')
  if (!body.trim()) return { error: 'The file is empty.' }
  const result = Papa.parse<string[]>(body, { skipEmptyLines: 'greedy' })
  const all = result.data
  if (!all.length) {
    const fatal = result.errors.find((e) => e.type === 'Quotes')
    return { error: fatal ? `Could not read the file: ${fatal.message}` : 'The file has no rows.' }
  }
  const headers = all[0].map((h, i) => cleanText(h) || `Column ${i + 1}`)
  const width = Math.max(headers.length, ...all.slice(1).map((r) => r.length))
  while (headers.length < width) headers.push(`Column ${headers.length + 1}`)
  const rows = all.slice(1).map((r) => headers.map((_, i) => cleanText(r[i])))
  if (!rows.length) return { error: 'The file has a header row but no guests.' }
  return { data: { headers, rows } }
}
