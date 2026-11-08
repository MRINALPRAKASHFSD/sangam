import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const rawUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
// A path like "/supabase" goes through the Vite dev proxy, so remote previews reach a local stack.
const url = rawUrl?.startsWith('/') ? `${window.location.origin}${rawUrl}` : rawUrl
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !anonKey) {
  throw new Error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy web/.env.example to web/.env.local.')
}

export const supabase = createClient<Database>(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]
