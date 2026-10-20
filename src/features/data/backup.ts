import { getAppState, useStore } from '../../store/store'
import { parseBackup } from '../../store/schema'

export function downloadFile(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadBackup() {
  const stamp = new Date().toISOString().slice(0, 10)
  downloadFile(`wedding-planner-${stamp}.json`, JSON.stringify(getAppState(), null, 2), 'application/json')
}

/** Validate a backup file and, if valid, replace all current data with it. Returns an error message on failure. */
export async function loadBackup(file: File): Promise<string | undefined> {
  const result = parseBackup(await file.text())
  if (!result.ok) return result.error
  useStore.getState().replaceState(result.state)
  return undefined
}
