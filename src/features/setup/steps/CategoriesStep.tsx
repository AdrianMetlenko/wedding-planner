import { useShallow } from 'zustand/react/shallow'
import { useStore } from '../../../store/store'
import { NamedListEditor } from '../NamedListEditor'
import { validateNamedList } from '../validation'

export function CategoriesStep() {
  const categories = useStore((s) => s.categories)
  const usage = useStore(useShallow((s) => {
    const u: Record<string, number> = {}
    for (const g of s.guests) u[g.categoryId] = (u[g.categoryId] ?? 0) + 1
    return u
  }))
  const setCollection = useStore((s) => s.setCollection)

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-600">
        A category says whose guest someone is, or which circle they belong to (for example one partner&rsquo;s family,
        friends, work). Every guest has exactly one category.
      </p>
      <NamedListEditor
        items={categories}
        noun="category"
        idPrefix="cat"
        usage={usage}
        minItems={1}
        reassignOnDelete
        errors={validateNamedList(categories, 'category', 1)}
        onChange={(items) => setCollection('categories', items)}
        onRemove={(id, to) => {
          const s = useStore.getState()
          if (to) {
            s.setCollection('guests', s.guests.map((g) => (g.categoryId === id ? { ...g, categoryId: to } : g)))
          }
          s.remove('categories', id)
        }}
      />
    </div>
  )
}
