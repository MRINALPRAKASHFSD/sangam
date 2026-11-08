import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Eye, EyeOff, MapPinOff, ShieldCheck, Sparkles, UsersRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useMe } from '@/app/auth'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { LogoMark } from '@/components/ui/logo'
import { Switch } from '@/components/ui/switch'
import { supabase } from '@/lib/supabase'
import { cn, errorMessage } from '@/lib/utils'
import { CONSENT_PURPOSES, type ConsentPurpose } from '../privacy/consents'
import type { Tag } from '../tags/api'
import { TagPicker } from '../tags/TagPicker'

const STEPS = ['welcome', 'age', 'profile', 'interests', 'visibility', 'consent'] as const
type Step = (typeof STEPS)[number]
const THIS_YEAR = new Date().getFullYear()

export function OnboardingFlow() {
  const nav = useNavigate()
  const qc = useQueryClient()
  const { data: me } = useMe()
  const [step, setStep] = useState<Step>('welcome')
  const [birthYear, setBirthYear] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [tags, setTags] = useState<Map<string, Tag>>(new Map())
  const [privateTags, setPrivateTags] = useState<Set<string>>(new Set())
  const [consents, setConsents] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(CONSENT_PURPOSES.map((c) => [c.purpose, !!c.defaultOn])),
  )

  const age = birthYear.length === 4 ? THIS_YEAR - Number(birthYear) : null
  const isMinor = age !== null && age >= 13 && age < 18
  const idx = STEPS.indexOf(step)

  const uname = username.trim().toLowerCase()
  const unameValid = /^[a-z0-9_.]{3,20}$/.test(uname)
  const { data: available, isFetching: checking } = useQuery({
    queryKey: ['username-available', uname],
    enabled: unameValid,
    staleTime: 10_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('username_available', { p_username: uname })
      if (error) throw error
      return data
    },
  })

  const submit = useMutation({
    mutationFn: async () => {
      const ids = [...tags.keys()]
      const payload: Partial<Record<ConsentPurpose, boolean>> = {}
      for (const c of CONSENT_PURPOSES) {
        if (c.minorsOnly && !isMinor) continue
        payload[c.purpose] = !!consents[c.purpose]
      }
      const { error } = await supabase.rpc('complete_onboarding', {
        p_username: uname,
        p_display_name: displayName.trim(),
        p_birth_year: Number(birthYear),
        p_tag_ids: ids,
        p_public_tag_ids: ids.filter((id) => !privateTags.has(id)),
        p_consents: payload,
      })
      if (error) throw error
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['me'] })
      nav('/camera', { replace: true })
    },
  })

  if (me?.profile.onboarded_at) {
    nav('/camera', { replace: true })
    return null
  }

  const canNext: Record<Step, boolean> = {
    welcome: true,
    age: age !== null && age >= 13 && age <= 120,
    profile: unameValid && available === true && displayName.trim().length > 0,
    interests: tags.size >= 3,
    visibility: true,
    consent: !!consents.core_service && (!isMinor || !!consents.parental_consent),
  }

  const next = () => (idx < STEPS.length - 1 ? setStep(STEPS[idx + 1]) : submit.mutate())
  const back = () => idx > 0 && setStep(STEPS[idx - 1])

  return (
    <div className="relative mx-auto flex h-dvh max-w-lg flex-col overflow-hidden bg-bg">
      <div className="pointer-events-none absolute -top-32 left-1/2 size-[30rem] -translate-x-1/2 rounded-full bg-brand/25 blur-[120px]" />
      <header className="relative flex items-center gap-3 px-5 pt-safe pb-2">
        <Button variant="ghost" size="icon-sm" onClick={back} disabled={idx === 0} aria-label="Back" className={cn(idx === 0 && 'invisible')}>
          <ArrowLeft className="size-5" />
        </Button>
        <div className="flex flex-1 gap-1.5">
          {STEPS.map((s, i) => (
            <div key={s} className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
              <motion.div className="h-full bg-brand-gradient" initial={false} animate={{ width: i <= idx ? '100%' : '0%' }} />
            </div>
          ))}
        </div>
      </header>

      <div className="no-scrollbar relative min-h-0 flex-1 overflow-y-auto px-5 pt-4 pb-4">
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22 }}>
            {step === 'welcome' && (
              <div className="pt-6">
                <LogoMark className="size-16" />
                <h1 className="mt-6 text-4xl leading-tight font-extrabold tracking-tight">Find your people,<br /><span className="text-brand-gradient">not your neighbours.</span></h1>
                <p className="mt-3 text-muted">Sangam connects you through shared interests and communities. It never uses your location.</p>
                <div className="mt-8 space-y-3">
                  <Promise icon={MapPinOff} title="Zero location tracking" body="No GPS, no maps, no 'people nearby'. Ever." />
                  <Promise icon={UsersRound} title="Interest-first discovery" body="Meet people through tags you choose to make public." />
                  <Promise icon={ShieldCheck} title="You control your data" body="Separate consent for each purpose. Change it anytime." />
                </div>
              </div>
            )}

            {step === 'age' && (
              <div className="space-y-6">
                <StepTitle title="When were you born?" body="We store only your birth year. We use it to apply age-appropriate safety settings." />
                <Field label="Birth year" error={age !== null && age < 13 ? 'You need to be at least 13 to use Sangam.' : null} hint="You need to be 13 or older.">
                  <Input inputMode="numeric" maxLength={4} placeholder="e.g. 2006" value={birthYear} onChange={(e) => setBirthYear(e.target.value.replace(/\D/g, ''))} className="text-2xl font-bold tracking-widest" autoFocus />
                </Field>
                {isMinor && (
                  <div className="glass rounded-2xl p-4 text-sm">
                    <p className="font-semibold">Extra protection for under-18s</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
                      <li>Your account is private</li>
                      <li>Only friends can message you</li>
                      <li>You only see, and are seen by, people under 18</li>
                      <li>We need consent from your parent or guardian</li>
                    </ul>
                  </div>
                )}
              </div>
            )}

            {step === 'profile' && (
              <div className="space-y-5">
                <StepTitle title="Make it yours" body="Your username is how friends find you. You can change your display name later." />
                <Field
                  label="Username"
                  error={username && !unameValid ? '3–20 characters: a–z, 0–9, _ or .' : unameValid && available === false ? 'That username is taken' : null}
                  hint={unameValid && available ? <span className="text-ok">@{uname} is available</span> : checking ? 'Checking…' : 'Lowercase letters, numbers, _ and .'}
                >
                  <Input placeholder="username" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} autoCapitalize="none" autoCorrect="off" maxLength={20} icon={<span className="font-bold">@</span>} />
                </Field>
                <Field label="Display name" hint="Any language works: हिन्दी, தமிழ், বাংলা, اردو…">
                  <Input placeholder="Your name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={40} />
                </Field>
              </div>
            )}

            {step === 'interests' && (
              <div className="space-y-5">
                <StepTitle title="What are you into?" body={`Pick at least 3. ${tags.size} selected.`} />
                <TagPicker
                  selected={new Set(tags.keys())}
                  onToggle={(t) => setTags((m) => { const n = new Map(m); if (n.has(t.id)) n.delete(t.id); else n.set(t.id, t); return n })}
                />
              </div>
            )}

            {step === 'visibility' && (
              <VisibilityStep tags={[...tags.values()]} privateTags={privateTags} setPrivateTags={setPrivateTags} isMinor={isMinor} />
            )}

            {step === 'consent' && (
              <div className="space-y-4">
                <StepTitle title="Your data, your choice" body="Each purpose is optional unless it's marked required. You can change these anytime in Settings → Privacy." />
                {CONSENT_PURPOSES.filter((c) => !c.minorsOnly || isMinor).map((c) => (
                  <div key={c.purpose} className={cn('glass rounded-2xl p-4', c.required && !consents[c.purpose] && 'border-danger/40')}>
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <p className="font-semibold">{c.title} {c.required && <span className="ml-1 rounded-full bg-brand/20 px-2 py-0.5 text-[10px] font-bold text-brand-2 uppercase">Required</span>}</p>
                        <p className="mt-1 text-sm text-muted">{c.notice}</p>
                      </div>
                      <Switch checked={!!consents[c.purpose]} onChange={(v) => setConsents((s) => ({ ...s, [c.purpose]: v }))} label={c.title} />
                    </div>
                  </div>
                ))}
                <p className="text-xs text-muted">Policy version 2026-11-v1. If you have a complaint, you can reach our Grievance Officer from Settings → Privacy.</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <footer className="relative px-5 pt-3 pb-safe">
        {submit.error && <p className="mb-3 text-center text-sm text-danger" role="alert">{errorMessage(submit.error)}</p>}
        <Button size="lg" className="mb-2 w-full" disabled={!canNext[step]} loading={submit.isPending} onClick={next}>
          {step === 'welcome' ? 'Let’s go' : step === 'consent' ? 'Enter Sangam' : 'Continue'}
        </Button>
      </footer>
    </div>
  )
}

function VisibilityStep({ tags, privateTags, setPrivateTags, isMinor }: { tags: Tag[]; privateTags: Set<string>; setPrivateTags: (fn: (s: Set<string>) => Set<string>) => void; isMinor: boolean }) {
  const sorted = useMemo(() => [...tags].sort((a, b) => a.name.localeCompare(b.name)), [tags])
  return (
    <div className="space-y-5">
      <StepTitle title="Who can see each interest?" body={isMinor ? 'Public tags are only shown to other users under 18 who share them.' : 'Public tags help people who share them find you. Private tags are only used for your own suggestions.'} />
      <div className="space-y-2">
        {sorted.map((t) => {
          const isPrivate = privateTags.has(t.id)
          return (
            <div key={t.id} className="glass flex items-center gap-3 rounded-2xl px-4 py-3">
              <span className="text-xl">{t.emoji ?? '#'}</span>
              <span className="flex-1 font-semibold">{t.name}</span>
              <button
                type="button"
                onClick={() => setPrivateTags((s) => { const n = new Set(s); if (n.has(t.id)) n.delete(t.id); else n.add(t.id); return n })}
                className={cn('flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition', isPrivate ? 'bg-white/10 text-muted' : 'bg-accent/15 text-accent')}
              >
                {isPrivate ? <><EyeOff className="size-3.5" /> Private</> : <><Eye className="size-3.5" /> Public</>}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StepTitle({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h2 className="text-3xl font-extrabold tracking-tight">{title}</h2>
      <p className="mt-2 text-muted">{body}</p>
    </div>
  )
}

function Promise({ icon: Icon, title, body }: { icon: typeof Sparkles; title: string; body: string }) {
  return (
    <div className="glass flex items-center gap-4 rounded-2xl p-4">
      <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-gradient"><Icon className="size-5 text-white" /></div>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted">{body}</p>
      </div>
    </div>
  )
}
