import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Layers, Play, Trash2 } from 'lucide-react'
import { useMemo } from 'react'
import { useUserId } from '@/app/auth'
import { EmptyState } from '@/components/ui/empty-state'
import { Sheet } from '@/components/ui/sheet'
import { draftStore, type Draft } from '@/lib/drafts'
import { useObjectUrl } from '@/lib/use-object-url'

export function DraftsSheet({ open, onOpenChange, onOpen }: { open: boolean; onOpenChange: (v: boolean) => void; onOpen: (d: Draft) => void }) {
  const qc = useQueryClient()
  const uid = useUserId()
  const drafts = useMemo(() => draftStore(uid!), [uid])
  const { data = [] } = useQuery({ queryKey: ['drafts', uid], queryFn: drafts.list, enabled: open && !!uid })

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Drafts" description="Stored only on this device">
      {data.length === 0 ? (
        <EmptyState icon={Layers} title="No drafts yet" body="Tap the bookmark after capturing to keep something for later." />
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {data.map((d) => (
            <div key={d.id} className="group relative aspect-[9/16] overflow-hidden rounded-2xl bg-elevated">
              <button className="size-full" onClick={() => onOpen(d)} aria-label="Open draft">
                <DraftThumb blob={d.thumb} />
                {d.kind === 'video' && <Play className="absolute top-2 left-2 size-4 fill-white text-white" />}
              </button>
              <button
                onClick={async () => { await drafts.remove(d.id); qc.invalidateQueries({ queryKey: ['drafts'] }) }}
                className="absolute top-1.5 right-1.5 grid size-8 place-items-center rounded-full bg-black/60 text-white"
                aria-label="Delete draft"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  )
}

function DraftThumb({ blob }: { blob: Blob }) {
  const url = useObjectUrl(blob)
  return url ? <img src={url} alt="" className="size-full object-cover" /> : null
}
