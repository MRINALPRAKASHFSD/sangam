import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Download, Lock, RotateCw, Send, SlidersHorizontal, Bookmark, CircleDashed, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useMe, useUserId } from '@/app/auth'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { draftStore } from '@/lib/drafts'
import { useObjectUrl } from '@/lib/use-object-url'
import { encodeCanvas, extFor, qualityProfile } from '@/lib/media'
import { cn, errorMessage } from '@/lib/utils'
import { renderFrame } from '../filters/engine'
import { useSaveMedia } from '../gallery/api'

export interface Capture {
  kind: 'image' | 'video'
  blob: Blob
  thumb: Blob
  width: number
  height: number
  durationMs?: number
  filterSlug?: string
  draftId?: string
}

type Adjust = { brightness: number; contrast: number; saturate: number; rotate: 0 | 90 | 180 | 270 }
const NEUTRAL: Adjust = { brightness: 100, contrast: 100, saturate: 100, rotate: 0 }
const adjustCss = (a: Adjust) => `brightness(${a.brightness}%) contrast(${a.contrast}%) saturate(${a.saturate}%)`

export function CapturePreview({ capture, onClose }: { capture: Capture; onClose: () => void }) {
  const url = useObjectUrl(capture.blob)
  const { data: me } = useMe()
  const quality = qualityProfile(!!me?.prefs.low_data_mode)
  const save = useSaveMedia()
  const toast = useToast()
  const qc = useQueryClient()
  const uid = useUserId()
  const drafts = useMemo(() => draftStore(uid!), [uid])
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [adj, setAdj] = useState<Adjust>(NEUTRAL)
  const [busy, setBusy] = useState<'draft' | null>(null)
  const edited = capture.kind === 'image' && (adj.brightness !== 100 || adj.contrast !== 100 || adj.saturate !== 100 || adj.rotate !== 0)

  /** Bakes adjustments into the image using the same canvas pipeline as the camera. */
  async function finalize(): Promise<Capture> {
    if (!edited) return capture
    const bmp = await createImageBitmap(capture.blob)
    const swap = adj.rotate % 180 !== 0
    const rot = document.createElement('canvas')
    rot.width = swap ? bmp.height : bmp.width
    rot.height = swap ? bmp.width : bmp.height
    const rctx = rot.getContext('2d')!
    rctx.translate(rot.width / 2, rot.height / 2)
    rctx.rotate((adj.rotate * Math.PI) / 180)
    rctx.drawImage(bmp, -bmp.width / 2, -bmp.height / 2)
    bmp.close()
    const out = document.createElement('canvas')
    out.width = rot.width; out.height = rot.height
    renderFrame(out.getContext('2d')!, rot, { css: adjustCss(adj) })
    const { blob, width, height } = await encodeCanvas(out, quality.image)
    const thumb = (await encodeCanvas(out, quality.thumb)).blob
    return { ...capture, blob, thumb, width, height }
  }

  async function saveToGallery() {
    try {
      const c = await finalize()
      await save.mutateAsync(c)
      if (capture.draftId) { await drafts.remove(capture.draftId); qc.invalidateQueries({ queryKey: ['drafts'] }) }
      toast('Saved to your private gallery', 'success')
      onClose()
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  async function saveDraft() {
    setBusy('draft')
    try {
      const c = await finalize()
      await drafts.put({ id: capture.draftId ?? crypto.randomUUID(), kind: c.kind, blob: c.blob, thumb: c.thumb, width: c.width, height: c.height, durationMs: c.durationMs, filterSlug: c.filterSlug, createdAt: Date.now() })
      qc.invalidateQueries({ queryKey: ['drafts'] })
      toast('Draft saved on this device', 'success')
      onClose()
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setBusy(null)
    }
  }

  async function download() {
    const c = await finalize()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(c.blob)
    a.download = `sangam-${Date.now()}.${extFor(c.blob.type)}`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  return (
    <motion.div className="absolute inset-0 z-50 flex flex-col bg-black text-white" initial={{ opacity: 0, scale: 1.03 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.18 }}>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {capture.kind === 'image' ? (
          <img src={url} alt="Captured photo" className="size-full object-cover transition" style={{ filter: adjustCss(adj), transform: `rotate(${adj.rotate}deg)` }} />
        ) : (
          <video src={url} className="size-full object-cover" autoPlay loop playsInline controls={false} />
        )}

        <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent px-4 pt-safe pb-6">
          <button onClick={onClose} className="glass grid size-10 place-items-center rounded-full" aria-label="Retake"><X className="size-5" /></button>
          <div className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"><Lock className="size-3.5" /> Private until you share</div>
          {capture.kind === 'image' ? (
            <button onClick={() => setAdjustOpen((v) => !v)} className={cn('glass grid size-10 place-items-center rounded-full', adjustOpen && 'bg-white/25')} aria-label="Adjust"><SlidersHorizontal className="size-5" /></button>
          ) : <span className="size-10" />}
        </div>

        {adjustOpen && capture.kind === 'image' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-strong absolute inset-x-4 bottom-4 space-y-3 rounded-3xl p-4">
            {(['brightness', 'contrast', 'saturate'] as const).map((k) => (
              <label key={k} className="flex items-center gap-3 text-xs font-semibold capitalize">
                <span className="w-20">{k === 'saturate' ? 'Saturation' : k}</span>
                <input type="range" min={50} max={150} value={adj[k]} onChange={(e) => setAdj((a) => ({ ...a, [k]: Number(e.target.value) }))} className="flex-1 accent-violet-500" />
                <span className="w-9 text-right tabular-nums text-white/70">{adj[k]}</span>
              </label>
            ))}
            <div className="flex gap-2">
              <Button variant="glass" size="sm" onClick={() => setAdj((a) => ({ ...a, rotate: ((a.rotate + 90) % 360) as Adjust['rotate'] }))}><RotateCw className="size-4" /> Rotate</Button>
              <Button variant="ghost" size="sm" onClick={() => setAdj(NEUTRAL)}>Reset</Button>
            </div>
          </motion.div>
        )}
      </div>

      <div className="flex items-center gap-2 bg-black px-4 pt-3 pb-safe">
        <Button variant="glass" size="icon" onClick={download} aria-label="Download to device"><Download className="size-5" /></Button>
        <Button variant="glass" size="icon" onClick={saveDraft} loading={busy === 'draft'} aria-label="Save draft"><Bookmark className="size-5" /></Button>
        <Button variant="glass" className="flex-1" onClick={saveToGallery} loading={save.isPending}>Save</Button>
        <Button variant="glass" size="icon" disabled title="Stories arrive in Phase 2" aria-label="Post to story (coming soon)"><CircleDashed className="size-5" /></Button>
        <Button size="icon" disabled title="Sending to friends arrives in Phase 2" aria-label="Send to friends (coming soon)"><Send className="size-5" /></Button>
      </div>
    </motion.div>
  )
}
