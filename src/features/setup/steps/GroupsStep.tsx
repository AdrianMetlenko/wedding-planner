import { useShallow } from 'zustand/react/shallow'
import { useStore } from '../../../store/store'
import { NamedListEditor } from '../NamedListEditor'
import { validateNamedList } from '../validation'

export function GroupsStep() {
  const tags = useStore((s) => s.tags)
  const usage = useStore(useShallow((s) => {
    const u: Record<string, number> = {}
    for (const g of s.guests) for (const t of g.tagIds) u[t] = (u[t] ?? 0) + 1
    return u
  }))
  const setCollection = useStore((s) => s.setCollection)

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-600">
        Guest groups are optional labels that cut across categories, so a guest can be in several. Examples:
        international, needs accommodation, choir, bridal party, reader, dietary needs. You can have none.
      </p>
      <NamedListEditor
        items={tags}
        noun="group"
        idPrefix="tag"
        usage={usage}
        minItems={0}
        reassignOnDelete={false}
        errors={validateNamedList(tags, 'group', 0)}
        onChange={(items) => setCollection('tags', items)}
        onRemove={(id) => {
          const s = useStore.getState()
          s.setCollection('guests', s.guests.map((g) => (g.tagIds.includes(id) ? { ...g, tagIds: g.tagIds.filter((t) => t !== id) } : g)))
          s.remove('tags', id)
        }}
      />
    </div>
  )
}
