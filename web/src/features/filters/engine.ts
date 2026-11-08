/**
 * Canvas filter engine. One code path renders the live preview and the final capture,
 * so what you see is exactly what you save. Advanced AR filters (face tracking,
 * segmentation) plug in through `requires` and are not rendered here.
 */
export type FilterEffect = 'mirror' | 'quad' | 'flip' | 'pixelate' | 'posterize' | 'scanlines' | 'glow' | 'letterbox'

export interface FilterParams {
  css?: string
  overlay?: { colors: string[]; blend: GlobalCompositeOperation; opacity: number }
  vignette?: number
  grain?: number
  effect?: FilterEffect
  requires?: 'face-tracking' | 'segmentation' | 'creative-studio'
}

export interface RenderOptions {
  mirrorX?: boolean
  /** Extra CSS filter applied after the filter's own chain (used by the adjust tools). */
  extraCss?: string
  time?: number
}

let ctxFilterSupport: boolean | null = null
export function supportsCtxFilter(): boolean {
  if (ctxFilterSupport === null) {
    const c = document.createElement('canvas').getContext('2d')
    ctxFilterSupport = !!c && typeof c.filter === 'string'
  }
  return ctxFilterSupport
}

const scratch = new Map<string, HTMLCanvasElement>()
function getScratch(key: string, w: number, h: number) {
  let c = scratch.get(key)
  if (!c) { c = document.createElement('canvas'); scratch.set(key, c) }
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h }
  return c
}

let noise: HTMLCanvasElement | null = null
function noiseTile() {
  if (noise) return noise
  noise = document.createElement('canvas')
  noise.width = noise.height = 192
  const ctx = noise.getContext('2d')!
  const img = ctx.createImageData(192, 192)
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v
    img.data[i + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  return noise
}

function sourceSize(src: CanvasImageSource): [number, number] {
  if (src instanceof HTMLVideoElement) return [src.videoWidth, src.videoHeight]
  if (src instanceof HTMLImageElement) return [src.naturalWidth, src.naturalHeight]
  if (src instanceof ImageBitmap) return [src.width, src.height]
  const c = src as HTMLCanvasElement
  return [c.width, c.height]
}

/** Centre-crop rectangle of the source that matches the target aspect ratio. */
function coverCrop(sw: number, sh: number, w: number, h: number) {
  const target = w / h
  if (sw / sh > target) {
    const cw = sh * target
    return { sx: (sw - cw) / 2, sy: 0, sWidth: cw, sHeight: sh }
  }
  const ch = sw / target
  return { sx: 0, sy: (sh - ch) / 2, sWidth: sw, sHeight: ch }
}

export function renderFrame(ctx: CanvasRenderingContext2D, src: CanvasImageSource, params: FilterParams, opts: RenderOptions = {}) {
  const { width: w, height: h } = ctx.canvas
  const [sw, sh] = sourceSize(src)
  if (!sw || !sh) return
  const crop = coverCrop(sw, sh, w, h)
  const cssChain = [params.css, opts.extraCss].filter(Boolean).join(' ')
  const nativeFilter = supportsCtxFilter()

  ctx.save()
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
  ctx.filter = nativeFilter && cssChain ? cssChain : 'none'
  ctx.imageSmoothingEnabled = true

  const draw = (dx: number, dy: number, dw: number, dh: number, c = crop) => ctx.drawImage(src, c.sx, c.sy, c.sWidth, c.sHeight, dx, dy, dw, dh)

  if (opts.mirrorX) { ctx.translate(w, 0); ctx.scale(-1, 1) }

  switch (params.effect) {
    case 'flip':
      ctx.translate(0, h); ctx.scale(1, -1); draw(0, 0, w, h); break
    case 'mirror': {
      const half = { ...crop, sWidth: crop.sWidth / 2 }
      draw(0, 0, w / 2, h, half)
      ctx.save(); ctx.translate(w, 0); ctx.scale(-1, 1); draw(0, 0, w / 2, h, half); ctx.restore()
      break
    }
    case 'quad':
      draw(0, 0, w / 2, h / 2); draw(w / 2, 0, w / 2, h / 2); draw(0, h / 2, w / 2, h / 2); draw(w / 2, h / 2, w / 2, h / 2); break
    case 'pixelate': {
      const px = Math.max(8, Math.round(w / 48))
      const small = getScratch('pixel', Math.ceil(w / px), Math.ceil(h / px))
      const sctx = small.getContext('2d')!
      sctx.filter = ctx.filter
      sctx.drawImage(src, crop.sx, crop.sy, crop.sWidth, crop.sHeight, 0, 0, small.width, small.height)
      ctx.filter = 'none'
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(small, 0, 0, w, h)
      break
    }
    default:
      draw(0, 0, w, h)
  }
  ctx.restore()

  if (!nativeFilter && cssChain) applyColorMatrix(ctx, cssToMatrix(cssChain))

  if (params.effect === 'glow') {
    const g = getScratch('glow', Math.round(w / 4), Math.round(h / 4))
    const gctx = g.getContext('2d')!
    gctx.filter = nativeFilter ? 'blur(6px) brightness(1.1)' : 'none'
    gctx.drawImage(ctx.canvas, 0, 0, g.width, g.height)
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.35; ctx.drawImage(g, 0, 0, w, h); ctx.restore()
  }

  if (params.effect === 'posterize') posterize(ctx, 5)

  if (params.overlay?.colors?.length) {
    const { colors, blend, opacity } = params.overlay
    ctx.save()
    ctx.globalCompositeOperation = blend
    ctx.globalAlpha = opacity
    if (colors.length === 1) ctx.fillStyle = colors[0]
    else {
      const grad = ctx.createLinearGradient(0, 0, w, h)
      colors.forEach((c, i) => grad.addColorStop(i / (colors.length - 1), c))
      ctx.fillStyle = grad
    }
    ctx.fillRect(0, 0, w, h)
    ctx.restore()
  }

  if (params.effect === 'scanlines') {
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.22)'
    const step = Math.max(3, Math.round(h / 300))
    for (let y = 0; y < h; y += step) ctx.fillRect(0, y, w, Math.max(1, step / 3))
    ctx.restore()
  }

  if (params.grain) {
    const tile = noiseTile()
    const t = opts.time ?? 0
    ctx.save()
    ctx.globalCompositeOperation = 'overlay'
    ctx.globalAlpha = params.grain
    const pattern = ctx.createPattern(tile, 'repeat')!
    pattern.setTransform(new DOMMatrix().translate((t * 7919) % 192, (t * 104729) % 192))
    ctx.fillStyle = pattern
    ctx.fillRect(0, 0, w, h)
    ctx.restore()
  }

  if (params.vignette) {
    const r = Math.hypot(w, h) / 2
    const grad = ctx.createRadialGradient(w / 2, h / 2, r * 0.35, w / 2, h / 2, r)
    grad.addColorStop(0, 'rgba(0,0,0,0)')
    grad.addColorStop(1, `rgba(0,0,0,${params.vignette})`)
    ctx.save(); ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h); ctx.restore()
  }

  if (params.effect === 'letterbox') {
    const bar = Math.round(h * 0.09)
    ctx.save(); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, bar); ctx.fillRect(0, h - bar, w, bar); ctx.restore()
  }
}

function posterize(ctx: CanvasRenderingContext2D, levels: number) {
  const { width: w, height: h } = ctx.canvas
  const img = ctx.getImageData(0, 0, w, h)
  const d = img.data
  const step = 255 / (levels - 1)
  const lut = new Uint8ClampedArray(256)
  for (let i = 0; i < 256; i++) lut[i] = Math.round(Math.round(i / step) * step)
  for (let i = 0; i < d.length; i += 4) { d[i] = lut[d[i]]; d[i + 1] = lut[d[i + 1]]; d[i + 2] = lut[d[i + 2]] }
  ctx.putImageData(img, 0, 0)
}

// ── Colour-matrix fallback for browsers without CanvasRenderingContext2D.filter ──
type Matrix = number[] // 4x5 row-major (r,g,b,a,offset)
const IDENTITY: Matrix = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0]

function multiply(a: Matrix, b: Matrix): Matrix {
  const out = new Array(20).fill(0)
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 5; c++) {
      let v = c === 4 ? a[r * 5 + 4] : 0
      for (let k = 0; k < 4; k++) v += a[r * 5 + k] * b[k * 5 + c]
      out[r * 5 + c] = v
    }
  }
  return out
}

function fnMatrix(name: string, v: number): Matrix | null {
  switch (name) {
    case 'brightness': return [v, 0, 0, 0, 0, 0, v, 0, 0, 0, 0, 0, v, 0, 0, 0, 0, 0, 1, 0]
    case 'contrast': { const o = 0.5 * (1 - v); return [v, 0, 0, 0, o, 0, v, 0, 0, o, 0, 0, v, 0, o, 0, 0, 0, 1, 0] }
    case 'invert': { const s = 1 - 2 * v; return [s, 0, 0, 0, v, 0, s, 0, 0, v, 0, 0, s, 0, v, 0, 0, 0, 1, 0] }
    case 'saturate': return [
      0.213 + 0.787 * v, 0.715 - 0.715 * v, 0.072 - 0.072 * v, 0, 0,
      0.213 - 0.213 * v, 0.715 + 0.285 * v, 0.072 - 0.072 * v, 0, 0,
      0.213 - 0.213 * v, 0.715 - 0.715 * v, 0.072 + 0.928 * v, 0, 0,
      0, 0, 0, 1, 0]
    case 'grayscale': return fnMatrix('saturate', 1 - Math.min(1, v))
    case 'sepia': {
      const i = 1 - Math.min(1, v)
      return [
        0.393 + 0.607 * i, 0.769 - 0.769 * i, 0.189 - 0.189 * i, 0, 0,
        0.349 - 0.349 * i, 0.686 + 0.314 * i, 0.168 - 0.168 * i, 0, 0,
        0.272 - 0.272 * i, 0.534 - 0.534 * i, 0.131 + 0.869 * i, 0, 0,
        0, 0, 0, 1, 0]
    }
    case 'hue-rotate': {
      const r = (v * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r)
      return [
        0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928, 0, 0,
        0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.14, 0.072 - c * 0.072 - s * 0.283, 0, 0,
        0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072, 0, 0,
        0, 0, 0, 1, 0]
    }
    default: return null
  }
}

export function cssToMatrix(css: string): Matrix {
  let m = IDENTITY
  for (const [, name, raw] of css.matchAll(/([a-z-]+)\(([^)]+)\)/g)) {
    const num = parseFloat(raw)
    const v = raw.trim().endsWith('%') ? num / 100 : num
    const fm = fnMatrix(name, v)
    if (fm) m = multiply(fm, m)
  }
  return m
}

function applyColorMatrix(ctx: CanvasRenderingContext2D, m: Matrix) {
  const { width: w, height: h } = ctx.canvas
  const img = ctx.getImageData(0, 0, w, h)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2]
    d[i] = m[0] * r + m[1] * g + m[2] * b + m[4] * 255
    d[i + 1] = m[5] * r + m[6] * g + m[7] * b + m[9] * 255
    d[i + 2] = m[10] * r + m[11] * g + m[12] * b + m[14] * 255
  }
  ctx.putImageData(img, 0, 0)
}

/** CSS approximation used for tiny carousel thumbnails. */
export function previewStyle(params: FilterParams): React.CSSProperties {
  return {
    filter: params.css,
    transform: params.effect === 'flip' ? 'scaleY(-1)' : undefined,
    imageRendering: params.effect === 'pixelate' ? 'pixelated' : undefined,
  }
}
