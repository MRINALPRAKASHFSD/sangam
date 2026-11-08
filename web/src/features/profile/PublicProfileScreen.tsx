import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Ban, Lock, UserPlus, UserX } from 'lucide-react'
import { useNavigate, useParams } from 'react-router'
import { Page } from '@/app/AppShell'
import { useUserId } from '@/app/auth'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { FullScreenLoader } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { supabase } from '@/lib/supabase'
import { errorMessage } from '@/lib/utils'
import { TagPill } from '../tags/TagPicker'
import type { PublicProfile } from './api'

export function PublicProfileScreen() {
  const { username = '' } = useParams()
  const nav = useNavigate()
  const uid = useUserId()
  const qc = useQueryClient()
  const toast = useToast()
  const { data, isLoading } = useQuery({
    queryKey: ['public-profile', username],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_public_profile', { p_username: username })
      if (error) throw error
      return data as unknown as PublicProfile | null
    },
  })
  const block = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('blocks').insert({ blocker_id: uid!, blocked_id: data!.id })
      if (error) throw error
    },
    onSuccess: () => {
      toast(`Blocked @${username}`, 'success')
      qc.invalidateQueries({ queryKey: ['discover'] })
      qc.invalidateQueries({ queryKey: ['blocked'] })
      nav(-1)
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  })

  const back = <Button variant="ghost" size="icon-sm" onClick={() => nav(-1)} aria-label="Back"><ArrowLeft className="size-5" /></Button>
  if (isLoading) return <FullScreenLoader />
  if (!data) return <Page title={back}><EmptyState icon={UserX} title="Profile not available" body="This account doesn't exist or isn't visible to you." /></Page>

  const isMe = data.id === uid
  const shared = data.public_tags.filter((t) => t.shared)
  return (
    <Page title={<span className="flex items-center gap-2">{back}@{data.username}</span>}>
      <section className="flex flex-col items-center px-5 pt-8 text-center">
        <Avatar path={data.avatar_path} name={data.display_name} size="xl" ring />
        <h2 className="mt-4 text-2xl font-extrabold">{data.display_name}</h2>
        <p className="text-sm text-muted">@{data.username}</p>
        {data.bio && <p className="mt-3 max-w-sm">{data.bio}</p>}
        {!isMe && (
          <div className="mt-5 flex gap-2">
            <Button disabled title="Friend requests arrive in Phase 2"><UserPlus className="size-4" /> Add friend · soon</Button>
            <Button variant="danger" size="icon" onClick={() => confirm(`Block @${data.username}? They won't be able to find you.`) && block.mutate()} aria-label="Block"><Ban className="size-4" /></Button>
          </div>
        )}
      </section>
      <section className="mt-8 px-5">
        {data.is_private ? (
          <div className="glass flex items-center gap-3 rounded-2xl p-4 text-sm text-muted"><Lock className="size-4" /> This account is private.</div>
        ) : (
          <>
            {shared.length > 0 && <p className="mb-3 text-sm font-semibold text-accent">You share {shared.length} interest{shared.length > 1 ? 's' : ''}</p>}
            <div className="flex flex-wrap gap-2">{data.public_tags.map((t) => <TagPill key={t.id} tag={{ ...t, status: 'active' }} selected={t.shared} size="sm" />)}</div>
          </>
        )}
      </section>
    </Page>
  )
}
