import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useUserId } from '@/app/auth'
import { baseMime, extFor } from '@/lib/media'
import { supabase, type Tables } from '@/lib/supabase'

export type MediaAsset = Tables<'media_assets'>

export interface SaveMediaInput {
  kind: 'image' | 'video'
  blob: Blob
  thumb: Blob
  width: number
  height: number
  durationMs?: number
  filterSlug?: string
}

async function uploadWithRetry(path: string, blob: Blob, contentType: string, attempts = 3) {
  let lastErr: unknown
  for (let i = 0; i < attempts; i++) {
    const { error } = await supabase.storage.from('media').upload(path, blob, { contentType, upsert: false, cacheControl: '31536000' })
    if (!error) return
    lastErr = error
    await new Promise((r) => setTimeout(r, 600 * 2 ** i))
  }
  throw lastErr
}

/** Uploads to the caller's private folder, then records the asset (moderation_status = pending). */
export function useSaveMedia() {
  const uid = useUserId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (m: SaveMediaInput) => {
      const id = crypto.randomUUID()
      const mime = baseMime(m.blob.type || (m.kind === 'image' ? 'image/jpeg' : 'video/webm'))
      const path = `${uid}/${id}.${extFor(mime)}`
      const thumbMime = baseMime(m.thumb.type || 'image/jpeg')
      const thumbPath = `${uid}/${id}_thumb.${extFor(thumbMime)}`
      await uploadWithRetry(path, m.blob, mime)
      await uploadWithRetry(thumbPath, m.thumb, thumbMime)
      const { data, error } = await supabase
        .from('media_assets')
        .insert({ path, thumb_path: thumbPath, kind: m.kind, mime, bytes: m.blob.size, width: m.width, height: m.height, duration_ms: m.durationMs ?? null, filter_slug: m.filterSlug ?? null })
        .select()
        .single()
      if (error) {
        await supabase.storage.from('media').remove([path, thumbPath])
        throw error
      }
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gallery'] }),
  })
}

const PAGE = 24

export function useGallery() {
  const uid = useUserId()
  return useQuery({
    queryKey: ['gallery', uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase.from('media_assets').select('*').eq('owner_id', uid!).order('created_at', { ascending: false }).limit(PAGE)
      if (error) throw error
      const thumbs = data.map((m) => m.thumb_path ?? m.path)
      const signed = thumbs.length ? await supabase.storage.from('media').createSignedUrls(thumbs, 3600) : { data: [], error: null }
      if (signed.error) throw signed.error
      const byPath = new Map(signed.data.map((s) => [s.path, s.signedUrl]))
      return data.map((m) => ({ ...m, thumbUrl: byPath.get(m.thumb_path ?? m.path) ?? null }))
    },
  })
}

export async function signedMediaUrl(path: string) {
  const { data, error } = await supabase.storage.from('media').createSignedUrl(path, 3600)
  if (error) throw error
  return data.signedUrl
}

export function useDeleteMedia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (m: MediaAsset) => {
      const { error } = await supabase.from('media_assets').delete().eq('id', m.id)
      if (error) throw error
      await supabase.storage.from('media').remove([m.path, ...(m.thumb_path ? [m.thumb_path] : [])])
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gallery'] }),
  })
}
