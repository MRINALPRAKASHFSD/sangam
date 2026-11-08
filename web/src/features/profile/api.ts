import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useUserId } from '@/app/auth'
import { supabase, type Tables } from '@/lib/supabase'

type ProfileUpdate = Partial<Pick<Tables<'profiles'>, 'display_name' | 'bio' | 'avatar_path' | 'is_private'>>
type PrefsUpdate = Partial<Pick<Tables<'user_preferences'>, 'theme' | 'language' | 'low_data_mode' | 'discoverable' | 'allow_messages_from' | 'read_receipts'>>

export function useUpdateProfile() {
  const uid = useUserId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: ProfileUpdate) => {
      const { error } = await supabase.from('profiles').update(patch).eq('id', uid!)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  })
}

export function useUpdatePrefs() {
  const uid = useUserId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: PrefsUpdate) => {
      const { error } = await supabase.from('user_preferences').update(patch).eq('user_id', uid!)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] })
      qc.invalidateQueries({ queryKey: ['discover'] })
    },
  })
}

export type PublicTag = { id: string; slug: string; name: string; emoji: string | null; shared?: boolean }
export type PublicProfile = {
  id: string
  username: string
  display_name: string
  avatar_path: string | null
  is_private: boolean
  bio: string | null
  public_tags: PublicTag[]
}
