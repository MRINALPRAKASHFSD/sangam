import { motion } from 'framer-motion'
import { Camera, Compass, MessageCircle, CircleDashed, UserRound } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { LogoMark } from '@/components/ui/logo'
import { cn } from '@/lib/utils'

export const NAV = [
  { to: '/camera', label: 'Camera', icon: Camera },
  { to: '/chats', label: 'Chats', icon: MessageCircle },
  { to: '/discover', label: 'Discover', icon: Compass },
  { to: '/stories', label: 'Stories', icon: CircleDashed },
  { to: '/profile', label: 'Profile', icon: UserRound },
] as const

export function AppShell() {
  const { pathname } = useLocation()
  const onCamera = pathname.startsWith('/camera')
  return (
    <div className="flex h-dvh w-full justify-center bg-bg lg:items-center lg:gap-6 lg:bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.18),transparent_60%),radial-gradient(ellipse_at_bottom_right,rgba(34,211,238,0.10),transparent_50%)]">
      <SideRail />
      <div className="relative flex h-full w-full max-w-[480px] flex-col overflow-hidden bg-bg lg:h-[min(900px,94dvh)] lg:rounded-[2.25rem] lg:border lg:border-line lg:shadow-[0_40px_120px_-30px_rgba(139,92,246,0.45)]">
        <main className={cn('relative min-h-0 flex-1', onCamera ? 'overflow-hidden' : 'no-scrollbar overflow-y-auto')}>
          <Outlet />
        </main>
        <BottomNav transparent={onCamera} />
      </div>
    </div>
  )
}

function BottomNav({ transparent }: { transparent: boolean }) {
  return (
    <nav
      className={cn(
        'z-30 flex items-center justify-around px-2 pt-2 pb-safe lg:hidden',
        transparent ? 'absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent' : 'glass-strong border-x-0 border-b-0',
      )}
      aria-label="Main"
    >
      {NAV.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} className="relative flex w-16 flex-col items-center gap-1 py-1.5" aria-label={label}>
          {({ isActive }) => (
            <>
              {isActive && <motion.span layoutId="nav-pill" className="absolute inset-x-2 inset-y-0 rounded-2xl bg-white/10" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
              <Icon className={cn('relative size-6 transition-colors', isActive ? 'text-white' : transparent ? 'text-white/70' : 'text-muted')} strokeWidth={isActive ? 2.4 : 2} />
              <span className={cn('relative text-[10px] font-semibold', isActive ? 'text-white light:text-fg' : transparent ? 'text-white/70' : 'text-muted')}>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

function SideRail() {
  return (
    <nav className="glass hidden h-[min(900px,94dvh)] w-20 flex-col items-center gap-2 rounded-[2rem] py-5 lg:flex" aria-label="Main">
      <LogoMark className="mb-4 size-11" />
      {NAV.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          title={label}
          className={({ isActive }) => cn('grid size-12 place-items-center rounded-2xl transition', isActive ? 'bg-brand-gradient text-white shadow-lg' : 'text-muted hover:bg-[var(--glass)] hover:text-fg')}
        >
          <Icon className="size-5" />
        </NavLink>
      ))}
    </nav>
  )
}

/** Standard page chrome for non-camera screens. */
export function Page({ title, actions, children, className }: { title?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('min-h-full pb-6', className)}>
      {(title || actions) && (
        <header className="glass-strong sticky top-0 z-20 flex items-center justify-between gap-3 border-x-0 border-t-0 px-5 pt-safe pb-3">
          <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
          <div className="flex items-center gap-1">{actions}</div>
        </header>
      )}
      {children}
    </div>
  )
}
