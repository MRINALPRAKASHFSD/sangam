import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

export function DiscoveryConsentGate() {
  const qc = useQueryClient()
  const grant = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('set_consent', { p_purpose: 'interest_discovery', p_granted: true })
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['discover'] }); qc.invalidateQueries({ queryKey: ['consents'] }) },
  })
  return (
    <div className="glass rounded-3xl p-5 text-center">
      <ShieldCheck className="mx-auto mb-3 size-8 text-accent" />
      <p className="font-bold">Interest discovery is off</p>
      <p className="mt-1 text-sm text-muted">To see people who share your interests, allow Sangam to use your public interest tags for discovery. You can turn this off anytime in Settings.</p>
      <Button className="mt-4" onClick={() => grant.mutate()} loading={grant.isPending}>Turn on discovery</Button>
    </div>
  )
}
