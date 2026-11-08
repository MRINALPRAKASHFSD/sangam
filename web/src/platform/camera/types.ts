/**
 * Platform-neutral camera contract. The web build uses getUserMedia; a native shell
 * (Capacitor / React Native) or an AR SDK can provide its own implementation later.
 */
export type Facing = 'user' | 'environment'

export type CameraErrorCode = 'unsupported' | 'insecure-context' | 'permission-denied' | 'no-camera' | 'in-use' | 'unknown'

export class CameraError extends Error {
  readonly code: CameraErrorCode
  constructor(code: CameraErrorCode, message: string) {
    super(message)
    this.code = code
  }
}

export interface CameraCapabilities {
  torch: boolean
  canSwitch: boolean
}

export interface CameraProvider {
  isSupported(): boolean
  start(facing: Facing): Promise<MediaStream>
  stop(): void
  capabilities(): CameraCapabilities
  setTorch(on: boolean): Promise<boolean>
  requestMicrophone(): Promise<MediaStreamTrack | null>
}
