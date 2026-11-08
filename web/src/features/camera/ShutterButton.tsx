import { motion } from 'framer-motion'
import { useRef } from 'react'
import { cn } from '@/lib/utils'

const HOLD_MS = 280

/** Tap to take a photo, press and hold to record video. */
export function ShutterButton({ recording, progress, disabled, onPhoto, onRecordStart, onRecordStop }: {
  recording: boolean
  progress: number
  disabled?: boolean
  onPhoto: () => void
  onRecordStart: () => void
  onRecordStop: () => void
}) {
  const timer = useRef<number | null>(null)
  const holding = useRef(false)

  const down = (e: React.PointerEvent) => {
    if (disabled) return
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    holding.current = false
    timer.current = window.setTimeout(() => { holding.current = true; onRecordStart() }, HOLD_MS)
  }
  const up = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    if (holding.current) { holding.current = false; onRecordStop() }
    else if (!disabled) onPhoto()
  }
  const cancel = () => {
    if (timer.current) clearTimeout(timer.current)
    if (holding.current) { holding.current = false; onRecordStop() }
  }

  const C = 2 * Math.PI * 44
  return (
    <button
      type="button"
      aria-label={recording ? 'Recording — release to stop' : 'Capture. Tap for photo, hold for video'}
      disabled={disabled}
      onPointerDown={down}
      onPointerUp={up}
      onPointerCancel={cancel}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onPhoto() } }}
      className="relative grid size-[88px] touch-none place-items-center select-none disabled:opacity-50"
    >
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r="44" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="5" />
        {recording && <circle cx="48" cy="48" r="44" fill="none" stroke="url(#rec)" strokeWidth="6" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - progress)} />}
        <defs><linearGradient id="rec"><stop offset="0" stopColor="#f43f5e" /><stop offset="1" stopColor="#a855f7" /></linearGradient></defs>
      </svg>
      <motion.span animate={{ scale: recording ? 0.55 : 1, borderRadius: recording ? 14 : 999 }} className={cn('block size-[68px]', recording ? 'bg-danger' : 'bg-white/25 backdrop-blur-sm')} />
    </button>
  )
}
