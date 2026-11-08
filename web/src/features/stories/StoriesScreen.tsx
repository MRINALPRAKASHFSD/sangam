import { CircleDashed } from 'lucide-react'
import { Link } from 'react-router'
import { Page } from '@/app/AppShell'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'

export function StoriesScreen() {
  return (
    <Page title="Stories">
      <EmptyState icon={CircleDashed} title="Stories are coming" body="24-hour stories with audience controls ship in Phase 2. Captures you save now stay in your private gallery." action={<Button asChild><Link to="/camera">Open camera</Link></Button>} />
    </Page>
  )
}
