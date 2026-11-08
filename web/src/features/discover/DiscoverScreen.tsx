import { motion } from 'framer-motion'
import { Flame, Search, UsersRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Page } from '@/app/AppShell'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { useAllTags, useCategories, useMyTags, useSearchTags, useTrendingTags } from '../tags/api'
import { needsDiscoveryConsent, useDiscoverPeople } from './api'
import { DiscoveryConsentGate } from './ConsentGate'
import { PersonCard } from './PersonCard'

const GRADIENTS = [
  'from-violet-600/80 to-fuchsia-500/60', 'from-cyan-500/70 to-violet-600/70', 'from-fuchsia-600/70 to-rose-500/60',
  'from-indigo-600/80 to-cyan-500/60', 'from-purple-700/80 to-pink-500/60', 'from-sky-600/70 to-indigo-600/70',
]

export function DiscoverScreen() {
  const [q, setQ] = useState('')
  const { data: trending = [] } = useTrendingTags(10)
  const { data: cats = [] } = useCategories()
  const { data: tags = [] } = useAllTags()
  const { data: mine = [] } = useMyTags()
  const search = useSearchTags(q)
  const people = useDiscoverPeople()
  const mineIds = useMemo(() => new Set(mine.map((m) => m.tag_id)), [mine])
  const list = people.data?.pages.flat() ?? []

  return (
    <Page title="Discover">
      <div className="px-5 pt-4">
        <Input placeholder="Search tags & communities" value={q} onChange={(e) => setQ(e.target.value)} icon={<Search className="size-4" />} />
      </div>

      {q.trim().length >= 2 ? (
        <section className="space-y-2 px-5 pt-4">
          {search.data?.length === 0 && <p className="py-8 text-center text-sm text-muted">No tags match “{q}”. You can create one from Profile → Manage interests.</p>}
          {search.data?.map((t) => (
            <Link key={t.id} to={`/discover/tag/${t.slug}`} className="glass flex items-center gap-3 rounded-2xl px-4 py-3">
              <span className="grid size-10 place-items-center rounded-xl bg-[var(--glass)] text-lg">{t.emoji ?? '#'}</span>
              <span className="flex-1 font-semibold">{t.name}</span>
              <span className="text-xs text-muted">{t.follower_count} {t.follower_count === 1 ? 'member' : 'members'}</span>
            </Link>
          ))}
        </section>
      ) : (
        <>
          <section className="pt-6">
            <h2 className="mb-3 flex items-center gap-2 px-5 font-bold"><Flame className="size-4 text-orange-400" /> Trending tags</h2>
            <div className="no-scrollbar flex snap-x gap-3 overflow-x-auto px-5 pb-1">
              {trending.map((t, i) => (
                <motion.div key={t.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="snap-start">
                  <Link to={`/discover/tag/${t.slug}`} className={`relative flex h-36 w-32 flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br p-3.5 text-white ${GRADIENTS[i % GRADIENTS.length]}`}>
                    <span className="text-3xl">{t.emoji ?? '#'}</span>
                    <div>
                      <p className="text-sm leading-tight font-bold">{t.name}</p>
                      <p className="mt-0.5 text-[11px] text-white/80">{t.follower_count} members{t.recent_joins > 0 && ` · +${t.recent_joins} this week`}</p>
                    </div>
                    {mineIds.has(t.id) && <span className="absolute top-3 right-3 rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-bold">Joined</span>}
                  </Link>
                </motion.div>
              ))}
            </div>
          </section>

          <section className="px-5 pt-7">
            <h2 className="mb-3 flex items-center gap-2 font-bold"><UsersRound className="size-4 text-accent" /> People who share your interests</h2>
            {needsDiscoveryConsent(people.error) ? (
              <DiscoveryConsentGate />
            ) : people.isLoading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-3xl bg-[var(--glass)]" />)}</div>
            ) : list.length === 0 ? (
              <EmptyState icon={UsersRound} title="No matches yet" body="As more people join your tags, they'll show up here. Try adding more public interests." />
            ) : (
              <div className="space-y-2">
                {list.map((p, i) => <PersonCard key={p.user_id} person={p} index={i} />)}
                {people.hasNextPage && <Button variant="ghost" className="w-full" onClick={() => people.fetchNextPage()} loading={people.isFetchingNextPage}>Load more</Button>}
              </div>
            )}
          </section>

          {cats.map((c) => {
            const inCat = tags.filter((t) => t.category_id === c.id && t.status === 'active')
            if (!inCat.length) return null
            return (
              <section key={c.id} className="px-5 pt-7">
                <h2 className="mb-3 font-bold">{c.name}</h2>
                <div className="grid grid-cols-2 gap-2">
                  {inCat.slice(0, 8).map((t) => (
                    <Link key={t.id} to={`/discover/tag/${t.slug}`} className="glass flex items-center gap-2.5 rounded-2xl px-3 py-3 transition hover:border-brand/40">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--glass)] text-base">{t.emoji ?? '#'}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{t.name}</span>
                        <span className="block text-[11px] text-muted">{t.follower_count} members</span>
                      </span>
                      {mineIds.has(t.id) && <span className="size-2 shrink-0 rounded-full bg-accent" aria-label="Joined" />}
                    </Link>
                  ))}
                </div>
              </section>
            )
          })}
        </>
      )}
    </Page>
  )
}
