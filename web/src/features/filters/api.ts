import { useQuery } from '@tanstack/react-query'
import { supabase, type Tables } from '@/lib/supabase'
import type { FilterParams } from './engine'

export type Filter = Omit<Tables<'filters'>, 'params'> & { params: FilterParams }

export const FILTER_CATEGORIES: { key: Tables<'filters'>['category']; label: string }[] = [
  { key: 'trending', label: 'Trending' },
  { key: 'color', label: 'Colour Grading' },
  { key: 'beauty', label: 'Beauty' },
  { key: 'vintage', label: 'Vintage' },
  { key: 'cinematic', label: 'Cinematic' },
  { key: 'artistic', label: 'Anime & Artistic' },
  { key: 'funny', label: 'Funny Effects' },
  { key: 'face', label: 'Face Filters' },
  { key: 'background', label: 'Background' },
  { key: 'text', label: 'Text Effects' },
  { key: 'community', label: 'Community' },
]

export const REQUIRES_LABEL: Record<NonNullable<FilterParams['requires']>, string> = {
  'face-tracking': 'Needs the AR face-tracking engine (Phase 3)',
  segmentation: 'Needs background segmentation (Phase 3)',
  'creative-studio': 'Part of the Creative Studio (Phase 3)',
}

export const isAvailable = (f: Filter) => f.kind === 'canvas' && !f.params.requires

export function useFilters() {
  return useQuery({
    queryKey: ['filters'],
    staleTime: 30 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('filters').select('*').order('category').order('sort')
      if (error) throw error
      return data as unknown as Filter[]
    },
  })
}
