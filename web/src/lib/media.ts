/**
 * Client-side media pipeline: every image is re-encoded through a canvas, which strips
 * EXIF metadata (including any GPS tags) before upload. Sizes adapt to low-data mode.
 */
export interface EncodeOptions { maxEdge: number; quality: number }

export const qualityProfile = (lowData: boolean) => ({
  image: lowData ? { maxEdge: 1280, quality: 0.72 } : { maxEdge: 1920, quality: 0.85 },
  thumb: { maxEdge: 360, quality: 0.7 },
  videoBitrate: lowData ? 900_000 : 2_500_000,
  maxVideoMs: lowData ? 10_000 : 15_000,
})

export function scaledSize(w: number, h: number, maxEdge: number) {
  const s = Math.min(1, maxEdge / Math.max(w, h))
  return { width: Math.round(w * s), height: Math.round(h * s) }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))
}

/** Encode as WebP where supported, otherwise JPEG. */
export async function encodeCanvas(source: HTMLCanvasElement, { maxEdge, quality }: EncodeOptions) {
  const { width, height } = scaledSize(source.width, source.height, maxEdge)
  let canvas = source
  if (width !== source.width || height !== source.height) {
    canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(source, 0, 0, width, height)
  }
  let blob = await toBlob(canvas, 'image/webp', quality)
  if (!blob || blob.type !== 'image/webp') blob = await toBlob(canvas, 'image/jpeg', quality)
  if (!blob) throw new Error('Could not encode image')
  return { blob, width, height }
}

export async function imageFileToCanvas(file: Blob, maxEdge = 1024) {
  const bmp = await createImageBitmap(file)
  const { width, height } = scaledSize(bmp.width, bmp.height, maxEdge)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, width, height)
  bmp.close()
  return canvas
}

export function pickRecorderMime() {
  const candidates = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
  if (typeof MediaRecorder === 'undefined') return null
  return candidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? ''
}

export const baseMime = (mime: string) => mime.split(';')[0].trim()
export const extFor = (mime: string) => ({ 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png', 'video/mp4': 'mp4', 'video/webm': 'webm' })[baseMime(mime)] ?? 'bin'
