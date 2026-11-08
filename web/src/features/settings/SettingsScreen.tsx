import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Ban, Download, LogOut, Mail, MapPinOff, Moon, Smartphone, Sun, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { Page } from '@/app/AppShell'
import { useMe } from '@/app/auth'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/toast'
import { supabase } from '@/lib/supabase'
import { cn, errorMessage } from '@/lib/utils'
import { CONSENT_PURPOSES, type ConsentPurpose } from '../privacy/consents'
import { useUpdatePrefs } from '../profile/api'

const LANGUAGES: [string, string][] = [
  ['en', 'English'], ['hi', 'हिन्दी'], ['bn', 'বাংলা'], ['ta', 'தமிழ்'], ['te', 'తెలుగు'], ['mr', 'मराठी'], ['gu', 'ગુજરાતી'],
  ['kn', 'ಕನ್ನಡ'], ['ml', 'മലയാളം'], ['pa', 'ਪੰਜਾਬੀ'], ['as', 'অসমীয়া'], ['or', 'ଓଡ଼ିଆ'], ['ur', 'اردو'],
]

export function SettingsScreen() {
  const nav = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()
  const { data: me } = useMe()
  const prefs = useUpdatePrefs()
  const onErr = (e: unknown) => toast(errorMessage(e), 'error')

  const consents = useQuery({
    queryKey: ['consents'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('my_consents')
      if (error) throw error
      return new Map(data.map((c) => [c.purpose, c.granted]))
    },
  })
  const setConsent = useMutation({
    mutationFn: async ({ purpose, granted }: { purpose: ConsentPurpose; granted: boolean }) => {
      const { error } = await supabase.rpc('set_consent', { p_purpose: purpose, p_granted: granted })
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['consents'] }); qc.invalidateQueries({ queryKey: ['discover'] }) },
    onError: onErr,
  })
  const blocked = useQuery({
    queryKey: ['blocked'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('my_blocked_users')
      if (error) throw error
      return data
    },
  })
  const unblock = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('blocks').delete().eq('blocker_id', me!.profile.id).eq('blocked_id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['blocked'] }); qc.invalidateQueries({ queryKey: ['discover'] }) },
    onError: onErr,
  })
  const deletion = useMutation({
    mutationFn: async (cancel: boolean) => {
      const { error } = cancel ? await supabase.rpc('cancel_account_deletion') : await supabase.rpc('request_account_deletion')
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
    onError: onErr,
  })

  async function exportData() {
    const { data, error } = await supabase.rpc('export_my_data')
    if (error) return onErr(error)
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
    a.download = `sangam-data-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  if (!me) return null
  const p = me.prefs
  const isMinor = me.profile.age_band === 'minor'
  const update = (patch: Parameters<typeof prefs.mutate>[0]) => prefs.mutate(patch, { onError: onErr })

  return (
    <Page title={<span className="flex items-center gap-2"><Button variant="ghost" size="icon-sm" onClick={() => nav(-1)} aria-label="Back"><ArrowLeft className="size-5" /></Button>Settings</span>}>
      <div className="space-y-7 px-5 pt-5">
        <Section title="Appearance">
          <div className="grid grid-cols-3 gap-2 p-3">
            {([['dark', Moon, 'Dark'], ['light', Sun, 'Light'], ['system', Smartphone, 'System']] as const).map(([v, Icon, label]) => (
              <button key={v} onClick={() => update({ theme: v })} className={cn('flex flex-col items-center gap-1.5 rounded-2xl py-3 text-xs font-semibold transition', p.theme === v ? 'bg-brand-gradient text-white' : 'bg-[var(--glass)] text-muted')}>
                <Icon className="size-5" />{label}
              </button>
            ))}
          </div>
          <Row title="Language" body="Full interface translations are rolling out. Your choice is saved now.">
            <select value={p.language} onChange={(e) => update({ language: e.target.value })} className="h-10 rounded-xl border border-line bg-elevated px-3 text-sm">
              {LANGUAGES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
            </select>
          </Row>
          <Row title="Data saver" body="Smaller photos, lower video bitrate and shorter clips. Built for mobile data.">
            <Switch checked={p.low_data_mode} onChange={(v) => update({ low_data_mode: v })} label="Data saver" />
          </Row>
        </Section>

        <Section title="Privacy">
          <Row title="Discoverable by interests" body={isMinor ? 'Only shown to other users under 18.' : 'Let people who share your public tags find you.'}>
            <Switch checked={p.discoverable} onChange={(v) => update({ discoverable: v })} label="Discoverable" />
          </Row>
          <Row title="Who can message me" body={isMinor ? 'Locked to friends for users under 18.' : 'Applies when chat launches.'}>
            <select disabled={isMinor} value={p.allow_messages_from} onChange={(e) => update({ allow_messages_from: e.target.value as typeof p.allow_messages_from })} className="h-10 rounded-xl border border-line bg-elevated px-3 text-sm disabled:opacity-50">
              <option value="friends">Friends</option><option value="shared_tags">Shared interests</option><option value="nobody">Nobody</option>
            </select>
          </Row>
          <Row title="Read receipts" body="Show friends when you've read their messages.">
            <Switch checked={p.read_receipts} onChange={(v) => update({ read_receipts: v })} label="Read receipts" />
          </Row>
          <div className="flex items-center gap-3 px-4 py-3.5 text-sm text-muted"><MapPinOff className="size-4 shrink-0 text-accent" /> Sangam never accesses your location or contacts, so there's nothing to turn off.</div>
        </Section>

        <Section title="Consent management">
          {CONSENT_PURPOSES.filter((c) => !c.minorsOnly || isMinor).map((c) => (
            <Row key={c.purpose} title={c.title} body={c.notice}>
              <Switch checked={!!consents.data?.get(c.purpose)} disabled={c.required || setConsent.isPending} onChange={(v) => setConsent.mutate({ purpose: c.purpose, granted: v })} label={c.title} />
            </Row>
          ))}
        </Section>

        <Section title="Blocked accounts">
          {!blocked.data?.length ? <p className="px-4 py-3.5 text-sm text-muted">You haven't blocked anyone.</p> : blocked.data.map((b) => (
            <div key={b.user_id} className="flex items-center gap-3 px-4 py-3">
              <Avatar path={b.avatar_path} name={b.display_name} size="sm" />
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{b.display_name}</p><p className="text-xs text-muted">@{b.username}</p></div>
              <Button variant="outline" size="sm" onClick={() => unblock.mutate(b.user_id)}><Ban className="size-3.5" /> Unblock</Button>
            </div>
          ))}
        </Section>

        <Section title="Your data">
          <Row title="Download my data" body="A JSON copy of everything Sangam stores about you.">
            <Button variant="glass" size="sm" onClick={exportData}><Download className="size-4" /> Export</Button>
          </Row>
          <Row title="Grievance officer" body="Questions or complaints about your data under the DPDP Act, 2023.">
            <Button variant="glass" size="sm" asChild><a href="mailto:grievance@sangam.app"><Mail className="size-4" /> Contact</a></Button>
          </Row>
          <Row title={me.profile.deletion_requested_at ? 'Deletion requested' : 'Delete account'} body={me.profile.deletion_requested_at ? `Requested ${new Date(me.profile.deletion_requested_at).toLocaleDateString()}. Your account will be erased within 30 days. You can still cancel.` : 'Permanently erase your account and media within 30 days.'}>
            {me.profile.deletion_requested_at ? (
              <Button variant="outline" size="sm" onClick={() => deletion.mutate(true)}>Cancel</Button>
            ) : (
              <Button variant="danger" size="sm" onClick={() => confirm('Request permanent deletion of your account?') && deletion.mutate(false)}><Trash2 className="size-4" /> Delete</Button>
            )}
          </Row>
        </Section>

        <Button variant="outline" className="w-full" onClick={() => supabase.auth.signOut()}><LogOut className="size-4" /> Sign out</Button>
        <p className="text-center text-xs text-muted">Sangam · Phase 1 · Policy 2026-11-v1</p>
      </div>
    </Page>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-xs font-bold tracking-wider text-muted uppercase">{title}</h2>
      <div className="glass divide-y divide-[var(--line)] overflow-hidden rounded-3xl">{children}</div>
    </section>
  )
}

function Row({ title, body, children }: { title: string; body?: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5">
      <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{title}</p>{body && <p className="mt-0.5 text-xs text-muted">{body}</p>}</div>
      {children}
    </div>
  )
}
