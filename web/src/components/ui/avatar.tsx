import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

export function useAvatarUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ['avatar-url', path],
    enabled: !!path,
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from('avatars').createSignedUrl(path!, 60 * 60)
      if (error) throw error
      return data.signedUrl
    },
  })
}

const sizes = { sm: 'size-9 text-xs', md: 'size-12 text-sm', lg: 'size-20 text-xl', xl: 'size-28 text-3xl' }

export function Avatar({ path, name, size = 'md', ring, className }: { path?: string | null; name?: string | null; size?: keyof typeof sizes; ring?: boolean; className?: string }) {
  const { data: url } = useAvatarUrl(path)
  const initials = (name ?? '?').trim().split(/\s+/).map((s) => s[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div className={cn('relative shrink-0 rounded-full', ring && 'bg-brand-gradient p-[2px]', className)}>
      <div className={cn('grid place-items-center overflow-hidden rounded-full bg-elevated font-bold text-fg', sizes[size])}>
        {url ? <img src={url} alt="" className="size-full object-cover" loading="lazy" /> : <span>{initials}</span>}
      </div>
    </div>
  )
}
