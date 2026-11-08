import { AnimatePresence, motion } from 'framer-motion'
import { CameraOff, Images, Layers, RefreshCw, Search, Settings, Sparkles, SwitchCamera, Zap, ZapOff } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useMe } from '@/app/auth'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { encodeCanvas, imageFileToCanvas, pickRecorderMime, qualityProfile, scaledSize } from '@/lib/media'
import { cn } from '@/lib/utils'
import { CameraError, type Facing } from '@/platform/camera/types'
import { WebCameraProvider } from '@/platform/camera/web'
import { isAvailable, useFilters } from '../filters/api'
import { renderFrame, type FilterParams } from '../filters/engine'
import { FilterCarousel } from '../filters/FilterCarousel'
import { FilterLibrarySheet } from '../filters/FilterLibrarySheet'
import { CapturePreview, type Capture } from './CapturePreview'
import { DraftsSheet } from './DraftsSheet'
import { ShutterButton } from './ShutterButton'

const ASPECT = 9 / 16
const PREVIEW_LONG_EDGE = 1280
const FILTER_KEY = 'sangam.filter'

type Status = 'starting' | 'live' | 'error' | 'paused'

export function CameraScreen() {
  const provider = useMemo(() => new WebCameraProvider(), [])
  const { data: me } = useMe()
  const toast = useToast()
  const quality = qualityProfile(!!me?.prefs.low_data_mode)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const paramsRef = useRef<FilterParams>({})
  const facingRef = useRef<Facing>('user')

  const [facing, setFacing] = useState<Facing>('user')
  const [status, setStatus] = useState<Status>('starting')
  const [error, setError] = useState<CameraError | null>(null)
  const [caps, setCaps] = useState({ torch: false, canSwitch: false })
  const [flash, setFlash] = useState(false)
  const [screenFlash, setScreenFlash] = useState(false)
  const [thumb, setThumb] = useState<string | null>(null)
  const [filterSlug, setFilterSlug] = useState(() => localStorage.getItem(FILTER_KEY) ?? 'original')
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [draftsOpen, setDraftsOpen] = useState(false)
  const [capture, setCapture] = useState<Capture | null>(null)
  const [recording, setRecording] = useState(false)
  const [recProgress, setRecProgress] = useState(0)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const micRef = useRef<MediaStreamTrack | null>(null)
  const wantRecordingRef = useRef(false)

  const { data: filters = [] } = useFilters()
  const available = useMemo(() => filters.filter(isAvailable), [filters])
  const current = filters.find((f) => f.slug === filterSlug) ?? filters.find((f) => f.slug === 'original')

  useEffect(() => { paramsRef.current = current?.params ?? {}; localStorage.setItem(FILTER_KEY, filterSlug) }, [current, filterSlug])
  useEffect(() => { facingRef.current = facing }, [facing])

  const start = useCallback(async (f: Facing) => {
    setStatus('starting')
    setError(null)
    try {
      const stream = await provider.start(f)
      const v = videoRef.current!
      v.srcObject = stream
      await v.play().catch(() => {})
      setCaps(provider.capabilities())
      setStatus('live')
    } catch (e) {
      setError(e instanceof CameraError ? e : new CameraError('unknown', String(e)))
      setStatus('error')
    }
  }, [provider])

  // Start / switch camera; release it whenever the screen is hidden or left.
  useEffect(() => {
    if (capture) return
    start(facing)
    const onVis = () => { if (document.hidden) { provider.stop(); setStatus('paused') } else start(facingRef.current) }
    document.addEventListener('visibilitychange', onVis)
    return () => { document.removeEventListener('visibilitychange', onVis); provider.stop() }
  }, [facing, start, provider, capture])

  useEffect(() => () => { micRef.current?.stop() }, [])

  // Torch follows the flash toggle on cameras that support it.
  useEffect(() => { if (status === 'live' && caps.torch) provider.setTorch(flash) }, [flash, caps.torch, status, provider])

  // Live render loop: identical pipeline to the final capture.
  useEffect(() => {
    if (status !== 'live') return
    const v = videoRef.current!, c = canvasRef.current!
    const ctx = c.getContext('2d', { willReadFrequently: false })!
    let raf = 0
    const tick = (t: number) => {
      if (v.readyState >= 2 && v.videoWidth) {
        const h = Math.min(PREVIEW_LONG_EDGE, Math.max(v.videoHeight, v.videoWidth))
        const w = Math.round(h * ASPECT)
        if (c.width !== w || c.height !== h) { c.width = w; c.height = h }
        renderFrame(ctx, v, paramsRef.current, { mirrorX: facingRef.current === 'user', time: Math.floor(t / 66) })
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    const snap = document.createElement('canvas')
    snap.width = 96; snap.height = 128
    const sctx = snap.getContext('2d')!
    const iv = window.setInterval(() => {
      if (!v.videoWidth) return
      renderFrame(sctx, v, {}, { mirrorX: facingRef.current === 'user' })
      setThumb(snap.toDataURL('image/jpeg', 0.6))
    }, 2500)
    return () => { cancelAnimationFrame(raf); clearInterval(iv) }
  }, [status])

  async function makeThumb(src: HTMLCanvasElement) {
    return (await encodeCanvas(src, quality.thumb)).blob
  }

  async function takePhoto() {
    const v = videoRef.current
    if (!v || status !== 'live' || !v.videoWidth) return
    if (flash && (!caps.torch || facing === 'user')) {
      setScreenFlash(true)
      await new Promise((r) => setTimeout(r, 180))
    }
    const srcH = Math.min(v.videoHeight, v.videoWidth / ASPECT)
    const { width, height } = scaledSize(Math.round(srcH * ASPECT), Math.round(srcH), quality.image.maxEdge)
    const out = document.createElement('canvas')
    out.width = width; out.height = height
    renderFrame(out.getContext('2d')!, v, paramsRef.current, { mirrorX: facing === 'user', time: Date.now() })
    setScreenFlash(false)
    const { blob } = await encodeCanvas(out, quality.image)
    setCapture({ kind: 'image', blob, thumb: await makeThumb(out), width, height, filterSlug })
  }

  async function startRecording() {
    const c = canvasRef.current
    if (!c || status !== 'live') return
    wantRecordingRef.current = true
    const mime = pickRecorderMime()
    if (mime === null || !('captureStream' in c)) { toast('Video recording is not supported in this browser', 'error'); return }
    const stream = c.captureStream(30)
    micRef.current = await provider.requestMicrophone()
    if (micRef.current) stream.addTrack(micRef.current)
    else toast('Recording without sound (microphone unavailable)', 'info')

    const poster = await makeThumb(c)
    if (!wantRecordingRef.current) { releaseMic(); return }
    const rec = new MediaRecorder(stream, { mimeType: mime || undefined, videoBitsPerSecond: quality.videoBitrate })
    const chunks: Blob[] = []
    const started = performance.now()
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
    rec.onstop = () => {
      releaseMic()
      const durationMs = Math.round(performance.now() - started)
      setRecording(false)
      setRecProgress(0)
      if (durationMs < 500) return
      const blob = new Blob(chunks, { type: rec.mimeType || mime || 'video/webm' })
      setCapture({ kind: 'video', blob, thumb: poster, width: c.width, height: c.height, durationMs, filterSlug })
    }
    rec.start(250)
    recorderRef.current = rec
    setRecording(true)
    const iv = window.setInterval(() => {
      const p = (performance.now() - started) / quality.maxVideoMs
      setRecProgress(Math.min(1, p))
      if (p >= 1 || rec.state !== 'recording') { clearInterval(iv); if (rec.state === 'recording') rec.stop() }
    }, 50)
  }

  function releaseMic() {
    micRef.current?.stop()
    micRef.current = null
  }

  function stopRecording() {
    wantRecordingRef.current = false
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
  }

  async function importFile(file: File) {
    try {
      const src = await imageFileToCanvas(file, 4096)
      const srcH = Math.min(src.height, src.width / ASPECT)
      const { width, height } = scaledSize(Math.round(srcH * ASPECT), Math.round(srcH), quality.image.maxEdge)
      const out = document.createElement('canvas')
      out.width = width; out.height = height
      renderFrame(out.getContext('2d')!, src, paramsRef.current)
      const { blob } = await encodeCanvas(out, quality.image)
      setCapture({ kind: 'image', blob, thumb: await makeThumb(out), width, height, filterSlug })
    } catch {
      toast('That file could not be opened as an image', 'error')
    }
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-black text-white">
      <video ref={videoRef} playsInline muted className="hidden" />
      <canvas ref={canvasRef} className={cn('absolute inset-0 size-full object-cover transition-opacity duration-300', status === 'live' ? 'opacity-100' : 'opacity-0')} aria-label="Camera preview" />

      {status === 'starting' && <div className="absolute inset-0 grid place-items-center"><Spinner className="size-8 text-white/70" /></div>}
      {status === 'error' && error && <CameraErrorPanel error={error} onRetry={() => start(facing)} onFile={importFile} />}

      <AnimatePresence>{screenFlash && <motion.div className="absolute inset-0 z-40 bg-white" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.08 }} />}</AnimatePresence>

      {/* Top bar */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent px-4 pt-safe pb-6">
        <div className="flex items-center gap-2">
          <Link to="/profile" aria-label="Profile"><Avatar path={me?.profile.avatar_path} name={me?.profile.display_name} size="sm" ring /></Link>
          <Link to="/discover" className="glass flex h-9 items-center gap-2 rounded-full px-3 text-xs font-semibold text-white" aria-label="Find people by interest">
            <Search className="size-4" /> Find your people
          </Link>
        </div>
        <Link to="/settings" className="glass grid size-9 place-items-center rounded-full" aria-label="Settings"><Settings className="size-4" /></Link>
      </div>

      {/* Right rail */}
      <div className="absolute top-24 right-3 z-20 flex flex-col gap-2.5">
        <RailButton label="Flip camera" onClick={() => setFacing((f) => (f === 'user' ? 'environment' : 'user'))} disabled={!caps.canSwitch || recording}><SwitchCamera className="size-5" /></RailButton>
        <RailButton label={flash ? 'Flash on' : 'Flash off'} onClick={() => setFlash((v) => !v)} active={flash}>{flash ? <Zap className="size-5" /> : <ZapOff className="size-5" />}</RailButton>
        <RailButton label="Filter library" onClick={() => setLibraryOpen(true)}><Sparkles className="size-5" /></RailButton>
        <RailButton label="Drafts" onClick={() => setDraftsOpen(true)}><Layers className="size-5" /></RailButton>
      </div>

      {current && current.slug !== 'original' && status === 'live' && (
        <motion.div key={current.slug} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="glass absolute top-24 left-1/2 z-20 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-bold">
          {current.name}
        </motion.div>
      )}

      {/* Capture controls */}
      <div className="absolute inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-20 flex flex-col items-center gap-3 lg:bottom-8">
        {recording && <div className="flex items-center gap-2 rounded-full bg-danger px-3 py-1 text-xs font-bold"><span className="size-2 animate-pulse rounded-full bg-white" />{Math.ceil((recProgress * quality.maxVideoMs) / 1000)}s</div>}
        {!recording && available.length > 0 && <FilterCarousel filters={available} selected={filterSlug} onSelect={setFilterSlug} thumb={thumb} />}
        <div className="flex w-full items-center justify-center gap-10">
          <label className="glass grid size-12 cursor-pointer place-items-center rounded-2xl" aria-label="Use a photo from your device">
            <Images className="size-5" />
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) importFile(f); e.target.value = '' }} />
          </label>
          <ShutterButton recording={recording} progress={recProgress} disabled={status !== 'live'} onPhoto={takePhoto} onRecordStart={startRecording} onRecordStop={stopRecording} />
          <button className="glass grid size-12 place-items-center rounded-2xl" onClick={() => setLibraryOpen(true)} aria-label="Open filter library"><Sparkles className="size-5" /></button>
        </div>
        <p className="text-[11px] font-medium text-white/60">Tap for photo · Hold for video</p>
      </div>

      <FilterLibrarySheet open={libraryOpen} onOpenChange={setLibraryOpen} filters={filters} selected={filterSlug} onSelect={setFilterSlug} thumb={thumb} />
      <DraftsSheet open={draftsOpen} onOpenChange={setDraftsOpen} onOpen={(d) => { setDraftsOpen(false); setCapture({ ...d, draftId: d.id }) }} />
      <AnimatePresence>{capture && <CapturePreview capture={capture} onClose={() => setCapture(null)} />}</AnimatePresence>
    </div>
  )
}

function RailButton({ label, onClick, children, active, disabled }: { label: string; onClick: () => void; children: React.ReactNode; active?: boolean; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={label} title={label} className={cn('glass grid size-11 place-items-center rounded-full transition active:scale-90 disabled:opacity-35', active && 'bg-white/25 text-yellow-300')}>
      {children}
    </button>
  )
}

function CameraErrorPanel({ error, onRetry, onFile }: { error: CameraError; onRetry: () => void; onFile: (f: File) => void }) {
  const title = { 'permission-denied': 'Camera access needed', 'no-camera': 'No camera found', 'in-use': 'Camera busy', 'insecure-context': 'Secure connection required', unsupported: 'Camera not supported', unknown: 'Camera unavailable' }[error.code]
  return (
    <div className="absolute inset-0 z-10 grid place-items-center bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.25),transparent_70%)] px-8">
      <div className="flex max-w-xs flex-col items-center text-center">
        <div className="glass mb-5 grid size-16 place-items-center rounded-3xl"><CameraOff className="size-7" /></div>
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="mt-2 text-sm text-white/70">{error.message}</p>
        <div className="mt-6 flex flex-col gap-2">
          {error.code !== 'unsupported' && error.code !== 'no-camera' && <Button onClick={onRetry}><RefreshCw className="size-4" /> Try again</Button>}
          <Button variant="glass" asChild>
            <label className="cursor-pointer"><Images className="size-4" /> Use a photo instead<input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f) }} /></label>
          </Button>
        </div>
      </div>
    </div>
  )
}
