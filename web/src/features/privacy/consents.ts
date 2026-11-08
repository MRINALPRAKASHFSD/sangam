import type { Enums } from '@/lib/supabase'

export type ConsentPurpose = Enums<'consent_purpose'>

export const POLICY_VERSION = '2026-11-v1'

/** Purpose-specific notices (DPDP Act 2023 §5–6). Each purpose is consented to separately. */
export const CONSENT_PURPOSES: {
  purpose: ConsentPurpose
  title: string
  notice: string
  required?: boolean
  minorsOnly?: boolean
  defaultOn?: boolean
}[] = [
  {
    purpose: 'core_service',
    title: 'Run my account',
    notice: 'Process my email, username, birth year and the content I create to provide Sangam. This is needed to use the app. To withdraw it, delete your account.',
    required: true,
    defaultOn: true,
  },
  {
    purpose: 'interest_discovery',
    title: 'Interest-based discovery',
    notice: 'Use the interest tags I mark as public to suggest me to people who share them, and to show me people who share mine. No location or contacts are ever used.',
    defaultOn: true,
  },
  {
    purpose: 'personalisation',
    title: 'Personalised filters and tags',
    notice: 'Use my in-app activity (filters I use and tags I follow) to order suggestions for me.',
  },
  {
    purpose: 'product_analytics',
    title: 'Product analytics',
    notice: 'Use pseudonymous usage events to improve performance and features. Analytics are never sold or shared with advertisers.',
  },
  {
    purpose: 'marketing',
    title: 'Product updates',
    notice: 'Send me occasional emails about new features. You can unsubscribe anytime.',
  },
  {
    purpose: 'parental_consent',
    title: 'Parent / guardian consent',
    notice: 'I confirm that my parent or legal guardian has reviewed this notice and consents to my use of Sangam. Verifiable parental consent will be required before public launch.',
    required: true,
    minorsOnly: true,
  },
]
