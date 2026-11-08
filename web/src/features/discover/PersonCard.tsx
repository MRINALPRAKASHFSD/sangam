import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { Avatar } from '@/components/ui/avatar'
import type { Person } from './api'

export function PersonCard({ person, index = 0 }: { person: Person; index?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index, 8) * 0.04 }}>
      <Link to={`/u/${person.username}`} className="glass flex items-center gap-3 rounded-3xl p-3.5 transition hover:border-brand/40">
        <Avatar path={person.avatar_path} name={person.display_name} size="md" ring={person.shared_count >= 3} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{person.display_name}</p>
          <p className="truncate text-xs text-muted">@{person.username}</p>
          {person.shared_tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {person.shared_tags.slice(0, 3).map((t) => (
                <span key={t.id} className="rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-semibold text-brand-2 light:text-brand">{t.emoji} {t.name}</span>
              ))}
              {person.shared_tags.length > 3 && <span className="px-1 text-[11px] font-semibold text-muted">+{person.shared_tags.length - 3}</span>}
            </div>
          )}
        </div>
        <ChevronRight className="size-5 text-muted" />
      </Link>
    </motion.div>
  )
}
