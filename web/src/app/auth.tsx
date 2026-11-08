import type { Session } from '@supabase/supabase-js'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase, type Tables } from '@/lib/supabase'

type AuthState = { session: Session | null; ready: boolean }
const AuthCtx = createContext<AuthState>({ session: null, ready: false })

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [state, setState] = useState<AuthState>({ session: null, ready: false })

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setState({ session: data.session, ready: true }))
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setState({ session, ready: true })
      if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') qc.clear()
    })
    return () => sub.subscription.unsubscribe()
  }, [qc])

  return <AuthCtx.Provider value={state}>{children}</AuthCtx.Provider>
}

export const useAuth = () => useContext(AuthCtx)

export function useUserId() {
  return useAuth().session?.user.id ?? null
}

export type Me = { profile: Tables<'profiles'>; prefs: Tables<'user_preferences'> }

export function useMe() {
  const uid = useUserId()
  return useQuery({
    queryKey: ['me', uid],
    enabled: !!uid,
    queryFn: async (): Promise<Me> => {
      const [p, pr] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', uid!).single(),
        supabase.from('user_preferences').select('*').eq('user_id', uid!).single(),
      ])
      if (p.error) throw p.error
      if (pr.error) throw pr.error
      return { profile: p.data, prefs: pr.data }
    },
  })
}
