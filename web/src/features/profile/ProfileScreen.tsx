import { Lock, Pencil, Play, Settings, Trash2, Trophy, ImageOff } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Page } from '@/app/AppShell'
import { useMe } from '@/app/auth'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Sheet } from '@/components/ui/sheet'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { errorMessage } from '@/lib/utils'
import { signedMediaUrl, useDeleteMedia, useGallery, type MediaAsset } from '../gallery/api'
import { useMyTags } from '../tags/api'
import { TagPill } from '../tags/TagPicker'
import { ProfileEditSheet } from './ProfileEditSheet'
import { TagManagerSheet } from './TagManagerSheet'

export function ProfileScreen() {
  const { data: me } = useMe()
  const { data: tags = [] } = useMyTags()
  const { data: gallery, isLoading } = useGallery()
  const [editOpen, setEditOpen] = useState(false)
  const [tagsOpen, setTagsOpen] = useState(false)
  const [viewing, setViewing] = useState<MediaAsset | null>(null)
  const p = me?.profile
  if (!p) return null
  const publicTags = tags.filter((t) => t.is_public)
  const privateTags = tags.filter((t) => !t.is_public)

  return (
    <Page title={<span>@{p.username}</span>} actions={<Button variant="ghost" size="icon-sm" asChild><Link to="/settings" aria-label="Settings"><Settings className="size-5" /></Link></Button>}>
      <section className="relative px-5 pt-6">
        <div className="pointer-events-none absolute inset-x-0 -top-10 h-48 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.35),transparent_70%)]" />
        <div className="relative flex items-center gap-5">
          <Avatar path={p.avatar_path} name={p.display_name} size="xl" ring />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-2xl font-extrabold">{p.display_name}</h2>
            <p className="text-sm text-muted">@{p.username}{p.is_private && <Lock className="ml-1.5 inline size-3.5" />}</p>
            <Button variant="glass" size="sm" className="mt-3" onClick={() => setEditOpen(true)}><Pencil className="size-3.5" /> Edit profile</Button>
          </div>
        </div>
        {p.bio && <p className="relative mt-4 text-[15px] whitespace-pre-wrap">{p.bio}</p>}

        <div className="relative mt-5 grid grid-cols-3 gap-2">
          <Stat label="Friends" value="0" />
          <Stat label="Points" value={String(p.points_balance)} accent />
          <Stat label="Interests" value={String(tags.length)} />
        </div>
      </section>

      <section className="mt-7 px-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-bold">Interests</h3>
          <button className="text-sm font-semibold text-brand-2" onClick={() => setTagsOpen(true)}>Manage</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {publicTags.map((t) => <TagPill key={t.tag_id} tag={t.tag} size="sm" />)}
        </div>
        {privateTags.length > 0 && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted"><Lock className="size-3" /> {privateTags.length} private interest{privateTags.length > 1 ? 's' : ''}, visible only to you</p>
        )}
      </section>

      <section className="mx-5 mt-7">
        <div className="glass flex items-center gap-4 rounded-3xl p-4">
          <div className="grid size-12 place-items-center rounded-2xl bg-brand-gradient"><Trophy className="size-6 text-white" /></div>
          <div className="flex-1">
            <p className="font-semibold">Community points</p>
            <p className="text-sm text-muted">Earn points when you connect with people who share your interests. Unlocks with friends in Phase 2.</p>
          </div>
        </div>
      </section>

      <section className="mt-7 px-5">
        <h3 className="mb-3 flex items-center gap-2 font-bold"><Lock className="size-4 text-muted" /> Private gallery</h3>
        {isLoading ? (
          <div className="grid grid-cols-3 gap-1.5">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="aspect-[9/16] animate-pulse rounded-xl bg-[var(--glass)]" />)}</div>
        ) : !gallery?.length ? (
          <EmptyState icon={ImageOff} title="Nothing saved yet" body="Photos and videos you save from the camera appear here. Only you can see them." action={<Button asChild size="sm"><Link to="/camera">Open camera</Link></Button>} />
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {gallery.map((m) => (
              <button key={m.id} onClick={() => setViewing(m)} className="relative aspect-[9/16] overflow-hidden rounded-xl bg-elevated">
                {m.thumbUrl && <img src={m.thumbUrl} alt="" loading="lazy" className="size-full object-cover" />}
                {m.kind === 'video' && <Play className="absolute top-2 left-2 size-4 fill-white text-white drop-shadow" />}
              </button>
            ))}
          </div>
        )}
      </section>

      <ProfileEditSheet open={editOpen} onOpenChange={setEditOpen} />
      <TagManagerSheet open={tagsOpen} onOpenChange={setTagsOpen} />
      <MediaViewer media={viewing} onClose={() => setViewing(null)} />
    </Page>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="glass rounded-2xl py-3 text-center">
      <p className={accent ? 'text-brand-gradient text-xl font-extrabold' : 'text-xl font-extrabold'}>{value}</p>
      <p className="text-xs font-medium text-muted">{label}</p>
    </div>
  )
}

function MediaViewer({ media, onClose }: { media: MediaAsset | null; onClose: () => void }) {
  const del = useDeleteMedia()
  const toast = useToast()
  const [url, setUrl] = useState<string | null>(null)
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  if (media && loadedFor !== media.id) {
    setLoadedFor(media.id)
    setUrl(null)
    signedMediaUrl(media.path).then(setUrl).catch(() => toast('Could not load media', 'error'))
  }
  return (
    <Sheet open={!!media} onOpenChange={(o) => !o && onClose()} title={media?.kind === 'video' ? 'Video' : 'Photo'} description={media ? new Date(media.created_at).toLocaleString() : undefined} full>
      <div className="overflow-hidden rounded-2xl bg-black">
        {!url ? <div className="grid aspect-[9/16] place-items-center"><Spinner /></div> : media?.kind === 'video' ? <video src={url} controls playsInline className="w-full" /> : <img src={url} alt="" className="w-full" />}
      </div>
      <Button variant="danger" className="mt-4 w-full" loading={del.isPending} onClick={() => media && del.mutate(media, { onSuccess: () => { toast('Deleted', 'success'); onClose() }, onError: (e) => toast(errorMessage(e), 'error') })}>
        <Trash2 className="size-4" /> Delete permanently
      </Button>
    </Sheet>
  )
}
