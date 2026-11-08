import { MessageCircle } from 'lucide-react'
import { Link } from 'react-router'
import { Page } from '@/app/AppShell'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'

export function ChatsScreen() {
  return (
    <Page title="Chats">
      <EmptyState icon={MessageCircle} title="Real-time chat is next" body="Private one-to-one messaging with friends ships in Phase 2. Find people who share your interests in the meantime." action={<Button asChild><Link to="/discover">Discover people</Link></Button>} />
    </Page>
  )
}
