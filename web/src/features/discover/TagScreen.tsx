import { ArrowLeft, Check, Eye, EyeOff, Plus, UsersRound } from 'lucide-react'
import { useNavigate, useParams } from 'react-router'
import { Page } from '@/app/AppShell'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'
import { errorMessage } from '@/lib/utils'
import { useAllTags, useMyTags, useTagMutations } from '../tags/api'
import { needsDiscoveryConsent, useDiscoverPeople } from './api'
import { DiscoveryConsentGate } from './ConsentGate'
import { PersonCard } from './PersonCard'

export function TagScreen() {
  const { slug = '' } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const { data: tags = [] } = useAllTags()
  const { data: mine = [] } = useMyTags()
  const tag = tags.find((t) => t.slug === slug)
  const membership = mine.find((m) => m.tag_id === tag?.id)
  const { follow, unfollow, setVisibility } = useTagMutations()
  const people = useDiscoverPeople(tag?.id)
  const list = tag ? people.data?.pages.flat() ?? [] : []
  const onErr = (e: unknown) => toast(errorMessage(e), 'error')

  return (
    <Page title={<span className="flex items-center gap-2"><Button variant="ghost" size="icon-sm" onClick={() => nav(-1)} aria-label="Back"><ArrowLeft className="size-5" /></Button>#{slug}</span>}>
      {tag && (
        <section className="relative overflow-hidden px-5 pt-8 pb-6 text-center">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.35),transparent_70%)]" />
          <div className="relative">
            <div className="glass mx-auto grid size-20 place-items-center rounded-3xl text-4xl">{tag.emoji ?? '#'}</div>
            <h2 className="mt-4 text-3xl font-extrabold">{tag.name}</h2>
            <p className="mt-1 text-sm text-muted">{tag.follower_count} members</p>
            <div className="mt-5 flex justify-center gap-2">
              {membership ? (
                <>
                  <Button variant="glass" onClick={() => unfollow.mutate(tag.id, { onError: onErr })} loading={unfollow.isPending}><Check className="size-4" /> Joined</Button>
                  <Button variant="glass" onClick={() => setVisibility.mutate({ tagId: tag.id, isPublic: !membership.is_public }, { onError: onErr })}>
                    {membership.is_public ? <><Eye className="size-4" /> Public</> : <><EyeOff className="size-4" /> Private</>}
                  </Button>
                </>
              ) : (
                <Button onClick={() => follow.mutate({ tagId: tag.id }, { onError: onErr })} loading={follow.isPending}><Plus className="size-4" /> Join tag</Button>
              )}
            </div>
          </div>
        </section>
      )}
      <section className="px-5">
        <h3 className="mb-3 font-bold">People in #{tag?.name ?? slug}</h3>
        {needsDiscoveryConsent(people.error) ? <DiscoveryConsentGate /> : list.length === 0 ? (
          <EmptyState icon={UsersRound} title="No one to show yet" body="Only people who've made this tag public and turned on discovery appear here." />
        ) : (
          <div className="space-y-2">
            {list.map((p, i) => <PersonCard key={p.user_id} person={p} index={i} />)}
            {people.hasNextPage && <Button variant="ghost" className="w-full" onClick={() => people.fetchNextPage()}>Load more</Button>}
          </div>
        )}
      </section>
    </Page>
  )
}
