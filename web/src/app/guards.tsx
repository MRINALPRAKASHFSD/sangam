import { Navigate, Outlet, useLocation } from 'react-router'
import { FullScreenLoader } from '@/components/ui/spinner'
import { useAuth, useMe } from './auth'

export function RequireAuth() {
  const { session, ready } = useAuth()
  const loc = useLocation()
  if (!ready) return <FullScreenLoader />
  if (!session) return <Navigate to="/auth" replace state={{ from: loc.pathname }} />
  return <Outlet />
}

export function RequireOnboarded() {
  const { data, isLoading } = useMe()
  if (isLoading || !data) return <FullScreenLoader />
  if (!data.profile.onboarded_at) return <Navigate to="/onboarding" replace />
  return <Outlet />
}

export function RedirectIfAuthed() {
  const { session, ready } = useAuth()
  if (!ready) return <FullScreenLoader />
  if (session) return <Navigate to="/camera" replace />
  return <Outlet />
}
