import { useEffect, useState } from 'react'

/** Object URL tied to the effect lifecycle, so StrictMode's re-run never leaves a revoked URL in use. */
export function useObjectUrl(blob: Blob | null | undefined) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!blob) return
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  return url
}
