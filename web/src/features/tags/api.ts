import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useUserId } from '@/app/auth'
import { supabase, type Tables } from '@/lib/supabase'

export type Tag = Pick<Tables<'tags'>, 'id' | 'slug' | 'name' | 'emoji' | 'category_id' | 'follower_count' | 'status'>
export type Category = Tables<'tag_categories'>

export function useCategories() {
  return useQuery({
    queryKey: ['tag-categories'],
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase.from('tag_categories').select('*').order('sort')
      if (error) throw error
      return data
    },
  })
}

export function useAllTags() {
  return useQuery({
    queryKey: ['tags'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tags')
        .select('id, slug, name, emoji, category_id, follower_count, status')
        .order('follower_count', { ascending: false })
        .order('name')
        .limit(500)
      if (error) throw error
      return data as Tag[]
    },
  })
}

export function useSearchTags(q: string) {
  const term = q.trim()
  return useQuery({
    queryKey: ['tags-search', term],
    enabled: term.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tags')
        .select('id, slug, name, emoji, category_id, follower_count, status')
        .ilike('name', `%${term.replace(/[%_]/g, '')}%`)
        .order('follower_count', { ascending: false })
        .limit(30)
      if (error) throw error
      return data as Tag[]
    },
  })
}

export function useTrendingTags(limit = 12) {
  return useQuery({
    queryKey: ['tags-trending', limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('trending_tags', { p_limit: limit })
      if (error) throw error
      return data
    },
  })
}

export type MyTag = { tag_id: string; is_public: boolean; tag: Tag }

export function useMyTags() {
  const uid = useUserId()
  return useQuery({
    queryKey: ['my-tags', uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_tags')
        .select('tag_id, is_public, tag:tags(id, slug, name, emoji, category_id, follower_count, status)')
        .eq('user_id', uid!)
        .order('created_at')
      if (error) throw error
      return data as unknown as MyTag[]
    },
  })
}

export function useCreateTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ name, category }: { name: string; category: string }) => {
      const { data, error } = await supabase.rpc('create_tag', { p_name: name, p_category_slug: category })
      if (error) throw error
      return data as Tag
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tags'] }),
  })
}

/** Follow / unfollow / toggle visibility. All writes are RLS-checked against auth.uid(). */
export function useTagMutations() {
  const qc = useQueryClient()
  const uid = useUserId()
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['my-tags'] })
    qc.invalidateQueries({ queryKey: ['tags'] })
    qc.invalidateQueries({ queryKey: ['discover'] })
  }
  const follow = useMutation({
    mutationFn: async ({ tagId, isPublic = true }: { tagId: string; isPublic?: boolean }) => {
      const { error } = await supabase.from('user_tags').upsert({ user_id: uid!, tag_id: tagId, is_public: isPublic }, { onConflict: 'user_id,tag_id', ignoreDuplicates: true })
      if (error) throw error
    },
    onSuccess: invalidate,
  })
  const unfollow = useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await supabase.from('user_tags').delete().eq('user_id', uid!).eq('tag_id', tagId)
      if (error) throw error
    },
    onSuccess: invalidate,
  })
  const setVisibility = useMutation({
    mutationFn: async ({ tagId, isPublic }: { tagId: string; isPublic: boolean }) => {
      const { error } = await supabase.from('user_tags').update({ is_public: isPublic }).eq('user_id', uid!).eq('tag_id', tagId)
      if (error) throw error
    },
    onSuccess: invalidate,
  })
  return { follow, unfollow, setVisibility }
}
