import { CameraError, type CameraCapabilities, type CameraProvider, type Facing } from './types'

function mapError(err: unknown): CameraError {
  const name = err instanceof DOMException ? err.name : ''
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return new CameraError('permission-denied', 'Camera access was blocked. Allow camera access in your browser settings and try again.')
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
      return new CameraError('no-camera', 'No camera was found on this device.')
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return new CameraError('in-use', 'Your camera is being used by another app. Close it and try again.')
    case 'SecurityError':
      return new CameraError('insecure-context', 'The camera needs a secure (HTTPS) connection.')
    default:
      return new CameraError('unknown', err instanceof Error ? err.message : 'The camera could not be started.')
  }
}

export class WebCameraProvider implements CameraProvider {
  private stream: MediaStream | null = null
  private caps: CameraCapabilities = { torch: false, canSwitch: false }

  isSupported() {
    return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
  }

  async start(facing: Facing) {
    if (!window.isSecureContext) throw new CameraError('insecure-context', 'The camera needs a secure (HTTPS) connection.')
    if (!this.isSupported()) throw new CameraError('unsupported', 'This browser does not support camera access.')
    this.stop()
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
      })
    } catch (err) {
      throw mapError(err)
    }
    const track = this.stream.getVideoTracks()[0]
    const trackCaps = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { torch?: boolean }
    let videoInputs = 1
    try {
      videoInputs = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput').length
    } catch { /* enumerateDevices may be unavailable; assume a single camera */ }
    this.caps = { torch: !!trackCaps.torch, canSwitch: videoInputs > 1 }
    return this.stream
  }

  stop() {
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = null
  }

  capabilities() {
    return this.caps
  }

  async setTorch(on: boolean) {
    const track = this.stream?.getVideoTracks()[0]
    if (!track || !this.caps.torch) return false
    try {
      await track.applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet] })
      return true
    } catch {
      return false
    }
  }

  async requestMicrophone() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false })
      return s.getAudioTracks()[0] ?? null
    } catch {
      return null
    }
  }
}
