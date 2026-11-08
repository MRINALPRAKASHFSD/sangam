import { Eye, EyeOff, X } from 'lucide-react'
import { Sheet } from '@/components/ui/sheet'
import { useToast } from '@/components/ui/toast'
import { cn, errorMessage } from '@/lib/utils'
import { useMyTags, useTagMutations } from '../tags/api'
import { TagPicker } from '../tags/TagPicker'

export function TagManagerSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data: mine = [] } = useMyTags()
  const { follow, unfollow, setVisibility } = useTagMutations()
  const toast = useToast()
  const selected = new Set(mine.map((m) => m.tag_id))
  const onErr = (e: unknown) => toast(errorMessage(e), 'error')

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Your interests" description="Public tags help people who share them find you" full>
      <div className="space-y-2">
        {mine.map((m) => (
          <div key={m.tag_id} className="glass flex items-center gap-3 rounded-2xl px-4 py-2.5">
            <span className="text-lg">{m.tag.emoji ?? '#'}</span>
            <span className="flex-1 truncate font-semibold">{m.tag.name}{m.tag.status === 'pending' && <span className="ml-2 text-[10px] text-muted">in review</span>}</span>
            <button
              onClick={() => setVisibility.mutate({ tagId: m.tag_id, isPublic: !m.is_public }, { onError: onErr })}
              className={cn('flex h-8 items-center gap-1 rounded-full px-3 text-xs font-bold', m.is_public ? 'bg-accent/15 text-accent' : 'bg-white/10 text-muted')}
            >
              {m.is_public ? <><Eye className="size-3.5" /> Public</> : <><EyeOff className="size-3.5" /> Private</>}
            </button>
            <button onClick={() => unfollow.mutate(m.tag_id, { onError: onErr })} className="grid size-8 place-items-center rounded-full text-muted hover:bg-white/10 hover:text-fg" aria-label={`Remove ${m.tag.name}`}>
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
      <h3 className="mt-6 mb-3 text-sm font-bold text-muted uppercase">Add more</h3>
      <TagPicker selected={selected} onToggle={(t) => (selected.has(t.id) ? unfollow.mutate(t.id, { onError: onErr }) : follow.mutate({ tagId: t.id }, { onError: onErr }))} />
    </Sheet>
  )
}
