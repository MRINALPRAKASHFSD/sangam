import { motion } from 'framer-motion'
import { Lock, Mail, ShieldCheck, MapPinOff } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LogoMark, Wordmark } from '@/components/ui/logo'
import { useToast } from '@/components/ui/toast'
import { supabase } from '@/lib/supabase'
import { errorMessage } from '@/lib/utils'

export function AuthScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const toast = useToast()

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}/onboarding` } })
        if (error) throw error
        if (!data.session) toast('Check your inbox to confirm your email', 'info')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-bg px-5 py-10">
      <div className="pointer-events-none absolute -top-40 -left-32 size-[28rem] rounded-full bg-brand/30 blur-[120px]" />
      <div className="pointer-events-none absolute -right-24 -bottom-40 size-[26rem] rounded-full bg-accent/20 blur-[120px]" />
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <LogoMark className="mb-4 size-16 drop-shadow-[0_10px_40px_rgba(139,92,246,0.6)]" />
          <Wordmark className="text-4xl" />
          <p className="mt-2 text-balance text-muted">Capture the moment. Find your people through what you love.</p>
        </div>

        <div className="glass rounded-[var(--radius-sheet)] p-5">
          <div className="mb-5 grid grid-cols-2 rounded-full bg-[var(--glass)] p-1">
            {(['signup', 'signin'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(null) }}
                className={`relative h-10 rounded-full text-sm font-semibold transition ${mode === m ? 'text-white' : 'text-muted'}`}
              >
                {mode === m && <motion.span layoutId="auth-tab" className="absolute inset-0 rounded-full bg-brand-gradient" />}
                <span className="relative">{m === 'signup' ? 'Create account' : 'Sign in'}</span>
              </button>
            ))}
          </div>
          <form onSubmit={submit} className="space-y-3">
            <Input type="email" required autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} icon={<Mail className="size-4" />} />
            <Input
              type="password"
              required
              minLength={8}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              placeholder="Password (min 8 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock className="size-4" />}
            />
            {error && <p className="text-sm text-danger" role="alert">{error}</p>}
            <Button type="submit" size="lg" className="w-full" loading={loading}>
              {mode === 'signup' ? 'Get started' : 'Sign in'}
            </Button>
          </form>
        </div>

        <div className="mt-6 flex justify-center gap-5 text-xs text-muted">
          <span className="flex items-center gap-1.5"><MapPinOff className="size-3.5 text-accent" /> Never tracks location</span>
          <span className="flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-accent" /> No contact syncing</span>
        </div>
      </motion.div>
    </div>
  )
}
