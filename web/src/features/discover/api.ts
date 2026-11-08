import { useInfiniteQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { PublicTag } from '../profile/api'

export type Person = { user_id: string; username: string; display_name: string; bio: string | null; avatar_path: string | null; shared_tags: PublicTag[]; shared_count: number }
const PAGE = 20

export function useDiscoverPeople(tagId?: string) {
  return useInfiniteQuery({
    queryKey: ['discover', tagId ?? 'all'],
    initialPageParam: 0,
    getNextPageParam: (last: Person[], all) => (last.length === PAGE ? all.length * PAGE : undefined),
    queryFn: async ({ pageParam }) => {
      const { data, error } = await supabase.rpc('discover_people', { p_tag_id: tagId, p_limit: PAGE, p_offset: pageParam })
      if (error) throw error
      return data as unknown as Person[]
    },
    retry: false,
  })
}

export const needsDiscoveryConsent = (err: unknown) => !!err && typeof err === 'object' && 'message' in err && String(err.message).includes('consent_required:interest_discovery')
