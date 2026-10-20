import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { SCHEMA_VERSION, createInitialState } from '../lib/defaults'
import type { AppState, CollectionKey, ItemOf, Settings, SetupState } from '../lib/types'
import { appStateSchema, migrate } from './schema'

export const STORAGE_KEY = 'wedding-planner'

type DeepPartialSettings = Partial<Omit<Settings, 'capacity' | 'modules' | 'thankYouRule' | 'pricePerHead'>> & {
  capacity?: Partial<Settings['capacity']>
  modules?: Partial<Settings['modules']>
  thankYouRule?: Partial<Settings['thankYouRule']>
  pricePerHead?: Partial<Settings['pricePerHead']>
}

export interface Actions {
  updateSettings: (patch: DeepPartialSettings) => void
  updateSetup: (patch: Partial<SetupState>) => void
  /** Insert, or replace the item with the same id. */
  upsert: <K extends CollectionKey>(key: K, item: ItemOf<K>) => void
  /** Patch one item by id. */
  patch: <K extends CollectionKey>(key: K, id: string, patch: Partial<ItemOf<K>>) => void
  /** Patch many items by id at once (bulk edits). */
  patchMany: <K extends CollectionKey>(key: K, ids: string[], patch: Partial<ItemOf<K>>) => void
  remove: <K extends CollectionKey>(key: K, id: string) => void
  /** Replace a whole collection (imports, reordering). */
  setCollection: <K extends CollectionKey>(key: K, items: AppState[K]) => void
  /** Replace everything (JSON load, demo, reset). */
  replaceState: (state: AppState) => void
  reset: () => void
}

export type Store = AppState & Actions

const pickState = (s: Store): AppState => {
  const {
    updateSettings: _a, updateSetup: _b, upsert: _c, patch: _d, patchMany: _e, remove: _f,
    setCollection: _g, replaceState: _h, reset: _i, ...state
  } = s
  return state
}

export const useStore = create<Store>()(
  persist(
    (set) => ({
      ...createInitialState(),

      updateSettings: (p) =>
        set((s) => ({
          settings: {
            ...s.settings,
            ...p,
            capacity: { ...s.settings.capacity, ...p.capacity },
            modules: { ...s.settings.modules, ...p.modules },
            thankYouRule: { ...s.settings.thankYouRule, ...p.thankYouRule },
            pricePerHead: { ...s.settings.pricePerHead, ...p.pricePerHead },
          },
        })),

      updateSetup: (p) => set((s) => ({ setup: { ...s.setup, ...p } })),

      upsert: (key, item) =>
        set((s) => {
          const list = s[key] as { id: string }[]
          const i = list.findIndex((x) => x.id === item.id)
          const next = i === -1 ? [...list, item] : list.map((x, j) => (j === i ? item : x))
          return { [key]: next } as Partial<AppState>
        }),

      patch: (key, id, p) =>
        set((s) => ({
          [key]: (s[key] as { id: string }[]).map((x) => (x.id === id ? { ...x, ...p } : x)),
        }) as Partial<AppState>),

      patchMany: (key, ids, p) => {
        const idSet = new Set(ids)
        set((s) => ({
          [key]: (s[key] as { id: string }[]).map((x) => (idSet.has(x.id) ? { ...x, ...p } : x)),
        }) as Partial<AppState>)
      },

      remove: (key, id) =>
        set((s) => ({
          [key]: (s[key] as { id: string }[]).filter((x) => x.id !== id),
        }) as Partial<AppState>),

      setCollection: (key, items) => set({ [key]: items } as Partial<AppState>),

      replaceState: (state) => set(state),

      reset: () => set(createInitialState()),
    }),
    {
      name: STORAGE_KEY,
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => pickState(s),
      migrate: (persisted) => migrate(persisted) as AppState,
      // Drop a corrupt saved blob rather than crash; the user can restore a JSON backup.
      merge: (persisted, current) => {
        const result = appStateSchema.safeParse(migrate(persisted))
        return result.success ? { ...current, ...result.data } : current
      },
    },
  ),
)

/** Snapshot of the data only (no actions), e.g. for JSON export. */
export const getAppState = (): AppState => pickState(useStore.getState())
