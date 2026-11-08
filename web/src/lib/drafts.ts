/** On-device drafts in IndexedDB. Drafts never leave the device until the user saves or sends them. */
export interface Draft {
  id: string
  kind: 'image' | 'video'
  blob: Blob
  thumb: Blob
  width: number
  height: number
  durationMs?: number
  filterSlug?: string
  createdAt: number
}

const STORE = 'drafts'

function open(uid: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(`sangam-drafts-${uid}`, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx<T>(uid: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open(uid)
  return new Promise((resolve, reject) => {
    const r = fn(db.transaction(STORE, mode).objectStore(STORE))
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}

/** Each account gets its own database so drafts never leak between users on a shared device. */
export const draftStore = (uid: string) => ({
  list: async () => (await tx<Draft[]>(uid, 'readonly', (s) => s.getAll())).sort((a, b) => b.createdAt - a.createdAt),
  put: (d: Draft) => tx(uid, 'readwrite', (s) => s.put(d)),
  remove: (id: string) => tx(uid, 'readwrite', (s) => s.delete(id)),
})
