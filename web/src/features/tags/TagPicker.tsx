import { Check, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { cn, errorMessage } from '@/lib/utils'
import { useAllTags, useCategories, useCreateTag, type Tag } from './api'

export function TagPill({ tag, selected, onClick, size = 'md' }: { tag: Pick<Tag, 'name' | 'emoji' | 'status'>; selected?: boolean; onClick?: () => void; size?: 'sm' | 'md' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-semibold transition-all active:scale-95',
        size === 'sm' ? 'h-8 px-3 text-xs' : 'h-10 px-3.5 text-sm',
        selected ? 'border-transparent bg-brand-gradient text-white shadow-[0_6px_20px_-8px_rgba(168,85,247,0.9)]' : 'border-line bg-[var(--glass)] hover:border-brand/40',
      )}
    >
      {tag.emoji && <span className="text-[1.05em] leading-none">{tag.emoji}</span>}
      <span>{tag.name}</span>
      {tag.status === 'pending' && <span className="rounded-full bg-black/25 px-1.5 text-[10px] font-medium">in review</span>}
      {selected && <Check className="size-3.5" />}
    </button>
  )
}

/** Category-grouped, searchable multi-select for interest tags, with create-your-own. */
export function TagPicker({ selected, onToggle }: { selected: Set<string>; onToggle: (tag: Tag) => void }) {
  const { data: cats } = useCategories()
  const { data: tags, isLoading } = useAllTags()
  const createTag = useCreateTag()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<number | 'all'>('all')

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return (tags ?? []).filter((t) => (cat === 'all' || t.category_id === cat) && (!term || t.name.toLowerCase().includes(term)))
  }, [tags, q, cat])

  const exact = (tags ?? []).some((t) => t.name.toLowerCase() === q.trim().toLowerCase())

  async function create() {
    try {
      const slug = cats?.find((c) => c.id === cat)?.slug ?? 'lifestyle'
      const tag = await createTag.mutateAsync({ name: q.trim(), category: slug })
      onToggle(tag)
      setQ('')
      toast(tag.status === 'pending' ? 'Tag created — visible to others once reviewed' : 'Tag added', 'success')
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  return (
    <div className="space-y-4">
      <Input placeholder="Search interests or communities" value={q} onChange={(e) => setQ(e.target.value)} icon={<Search className="size-4" />} />
      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
        <CatButton active={cat === 'all'} onClick={() => setCat('all')}>All</CatButton>
        {cats?.map((c) => <CatButton key={c.id} active={cat === c.id} onClick={() => setCat(c.id)}>{c.name}</CatButton>)}
      </div>
      {isLoading ? (
        <div className="flex flex-wrap gap-2">{Array.from({ length: 14 }).map((_, i) => <div key={i} className="h-10 w-28 animate-pulse rounded-full bg-[var(--glass)]" />)}</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {filtered.map((t) => <TagPill key={t.id} tag={t} selected={selected.has(t.id)} onClick={() => onToggle(t)} />)}
          {q.trim().length >= 2 && !exact && (
            <Button variant="outline" size="sm" className="h-10" onClick={create} loading={createTag.isPending}>
              <Plus className="size-4" /> Create “{q.trim()}”
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

function CatButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={cn('h-8 shrink-0 rounded-full px-3.5 text-xs font-bold transition', active ? 'bg-fg text-bg' : 'bg-[var(--glass)] text-muted hover:text-fg')}>
      {children}
    </button>
  )
}
