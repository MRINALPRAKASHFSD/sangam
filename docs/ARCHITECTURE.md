# Sangam — Architecture (Phase 1)

Sangam ("confluence") is a camera-first social app for Indian Gen Z. People find each other through **interest tags and communities only**.

> **Non-negotiable product rule:** Sangam never requests, collects, infers, stores or uses location data. That covers GPS, geolocation permissions, IP-derived location, location history and location tags. It also never collects phone contacts. The rule is enforced in the code (no `navigator.geolocation`, no contacts APIs), in the database (no location columns, and EXIF is stripped from images by re-encoding them on canvas before upload), and in the HTTP `Permissions-Policy: geolocation=()` header (see `web/index.html` + deployment notes).

---

## 1. System architecture

```
┌──────────────────────────── Client (web, mobile-first PWA-ready) ───────────────────────────┐
│ React 19 + TypeScript + Vite                                                                 │
│  ├─ app/          Router, providers (QueryClient, Auth, Theme), AppShell + BottomNav         │
│  ├─ features/     auth · onboarding · camera · filters · discover · profile · settings       │
│  ├─ components/ui Design-system primitives (Button, Sheet, Chip, Avatar, Input, Toast…)      │
│  ├─ lib/          supabase client, media pipeline (canvas filters, compression, EXIF strip)  │
│  └─ platform/     CameraProvider interface → WebCameraProvider (getUserMedia)                │
│                   (future: NativeCameraProvider for Capacitor/React Native, AR SDK adapter)  │
└──────────────────────────────────────────────┬───────────────────────────────────────────────┘
                                               │ HTTPS (anon key + user JWT only)
┌──────────────────────────────────────────────▼───────────────────────────────────────────────┐
│ Supabase                                                                                     │
│  ├─ Auth (email + password; email OTP-ready)                                                 │
│  ├─ PostgreSQL + Row Level Security on every table                                           │
│  │   └─ SECURITY DEFINER RPCs for anything privileged (onboarding, discovery, consent)       │
│  ├─ Storage: private buckets `media` and `avatars`, per-user folder policies, signed URLs    │
│  ├─ Realtime (Phase 2: chat, typing, friend requests)                                        │
│  └─ Edge Functions (Phase 2+: points awards, moderation webhooks, transcoding callbacks)     │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

Principles:

- **The server is the source of truth for anything sensitive.** The client never computes points, moderation state, age bands or visibility. RLS plus RPCs enforce all of it.
- **Feature-sliced frontend.** Each feature owns its components, hooks and queries, so a future React Native app can reuse the hooks and API modules.
- **Platform abstraction for the camera and AR.** `CameraProvider` defines `start/stop/switch/capturePhoto/startRecording`. The web build uses `getUserMedia`. Native and AR providers can plug in later without changing the UI.
- **Low-bandwidth by design.** Images are compressed on the client to WebP/JPEG with a maximum edge length that depends on low-data mode. Lists are paginated, and media is fetched through short-lived signed URLs.

## 2. Database schema

All tables live in `public`, have `created_at timestamptz default now()`, and have RLS enabled. **Bold** = implemented in Phase 1 migrations. The other tables are designed now and will ship in later phases.

| Table | Key columns | Notes |
|---|---|---|
| **profiles** | `id uuid PK → auth.users`, `username citext unique`, `display_name`, `bio`, `avatar_path`, `birth_year smallint`, `age_band enum(minor_13_17, adult)`, `is_private bool`, `role enum(user, moderator, admin)`, `onboarded_at`, `points_balance int` | `age_band`, `role`, `points_balance` can only be written server-side (column privileges revoked for `authenticated`). Minors are forced to `is_private = true`. |
| **user_preferences** | `user_id PK`, `theme`, `language`, `low_data_mode`, `allow_messages_from enum(friends, shared_tags, nobody)`, `discoverable bool`, `read_receipts bool` | Created with defaults by trigger. Minors default to `allow_messages_from='friends'` and `discoverable=false`. |
| **tag_categories** | `id`, `slug unique`, `name`, `sort` | Technology, Entertainment, Education, Lifestyle, Indian Communities. |
| **tags** | `id`, `slug citext unique`, `name`, `category_id`, `created_by`, `is_official`, `status enum(active, pending, banned)`, `follower_count` | User-created tags start as `pending` until moderated. `follower_count` is maintained by a trigger. |
| **user_tags** | `(user_id, tag_id) PK`, `is_public bool` | **Only `is_public` rows are ever visible to other users.** |
| **consent_records** | `id`, `user_id`, `purpose enum`, `granted bool`, `policy_version`, `created_at` | Append-only ledger. The current state is the latest row per purpose. Withdrawal is a new `granted=false` row. |
| **media_assets** | `id`, `owner_id`, `bucket`, `path unique`, `kind enum(image, video)`, `mime`, `bytes`, `width`, `height`, `moderation_status enum(pending, approved, rejected, under_review)`, `visibility enum(private, friends, public)`, `filter_slug`, `expires_at` | Private gallery in Phase 1. Nothing is public until `approved`. |
| **filters** | `id`, `slug unique`, `name`, `category enum`, `kind enum(css, lut, shader, ar)`, `params jsonb`, `is_premium`, `created_by`, `status` | Catalog served from the DB, so community filters can be added later. |
| user_devices | `id`, `user_id`, `platform`, `push_token`, `last_seen_at` | No IP or location stored. |
| friend_requests | `id`, `from_id`, `to_id`, `status enum(pending, accepted, rejected, cancelled)`, unique pending pair | Phase 2. |
| friendships | `(user_a, user_b) PK` with `user_a < user_b` check | Phase 2. Canonical ordering prevents duplicate rows. |
| points_transactions | `id`, `user_id`, `amount`, `reason`, `idempotency_key unique`, `related_user_id` | Phase 2. Written only by a SECURITY DEFINER function inside a transaction, with a 50/day cap. |
| stories / story_views | `expires_at = created_at + 24h`, audience enum, hidden_from[] | Phase 2. |
| conversations / conversation_members / messages | `retention enum(keep, 24h, after_view)` | Phase 2 (Realtime). |
| notifications | `user_id`, `type`, `payload jsonb`, `read_at` | Phase 2. |
| reports | `reporter_id`, `target_type`, `target_id`, `category enum(harassment, bullying, sexual, impersonation, spam, hate, threats, other)`, `status` | Phase 4. |
| blocks | `(blocker_id, blocked_id) PK` | Already honoured by the Phase 1 discovery RPC. |
| moderation_queue | `media_id`, `status`, `reviewer_id`, `decision_reason` | Phase 4. |

Key indexes: `user_tags(tag_id) where is_public`, `tags using gin (name gin_trgm_ops)` for search, `media_assets(owner_id, created_at desc)`, `consent_records(user_id, purpose, created_at desc)`.

### Phase 1 RPCs (SECURITY DEFINER, `search_path` pinned)

- `complete_onboarding(username, display_name, birth_year, tag_ids[], public_tag_ids[], consents jsonb)` validates age (13+), derives `age_band`, applies minor defaults, writes tags and consent rows, and runs in a single transaction.
- `discover_people(tag_id?, limit, offset)` returns users who are discoverable, not blocked in either direction and not the caller. It returns **only the public tags shared with the caller** and a `shared_count`. Minors never appear to adults, and the reverse also holds.
- `trending_tags(limit)` ranks tags by follower count weighted by recent joins.
- `set_consent(purpose, granted)` appends to the ledger.

## 3. Navigation and component structure

```
/auth                         AuthScreen (sign in / sign up)
/onboarding                   OnboardingFlow: Welcome → Age → Profile → Interests → Consent
/ (AppShell, BottomNav)
  ├─ /camera   (default)      CameraScreen
  │     ├─ TopBar: settings · flash · flip
  │     ├─ SideRail: chats · friends · stories · creative tools
  │     ├─ FilterCarousel (above shutter)  ─▶ FilterLibrarySheet (bottom sheet)
  │     ├─ ShutterButton (tap = photo, hold = video)
  │     └─ CapturePreview overlay: retake · save to gallery · send (P2) · story (P2) · draft
  ├─ /chats                   ChatsScreen (Phase 2 shell)
  ├─ /discover                DiscoverScreen: tag search · categories · trending · people
  │     └─ /discover/tag/:slug  TagScreen: people sharing this tag
  ├─ /stories                 StoriesScreen (Phase 2 shell)
  ├─ /profile                 ProfileScreen: avatar, bio, public tags, gallery
  │     └─ ProfileEditSheet · TagManagerSheet (toggle public/private)
  └─ /settings                SettingsScreen: theme, low-data, privacy, consent, data, account
```

On desktop (≥ 1024px) the same shell is rendered as a centred phone-width app column. A side navigation rail replaces the bottom nav, and sheets become centred dialogs.

## 4. Design system

- **Theme:** dark first. CSS variables in `web/src/index.css` are mapped to Tailwind v4 `@theme` tokens. A light theme is toggled with `data-theme="light"` on `<html>`.
- **Colour:** `--bg #07060B`, `--surface #111018`, `--elevated #1A1824`, `--line rgba(255,255,255,.08)`, `--text #F5F3FF`, `--muted #A19DB5`, `--brand #8B5CF6` (violet), `--brand-2 #A855F7` (purple), `--accent #22D3EE` (cyan), `--danger #F43F5E`, `--ok #34D399`. Signature gradient: `linear-gradient(135deg,#8B5CF6,#A855F7 45%,#22D3EE)`.
- **Type:** "Plus Jakarta Sans" for UI and display, with Noto Sans script families as fallbacks (Devanagari, Bengali, Tamil, Telugu, Gujarati, Gurmukhi, Kannada, Malayalam, Oriya, Arabic/Urdu) so Indic text shapes correctly.
- **Shape:** radius 14/20/28px, pill buttons, and floating glass panels (`backdrop-blur-xl bg-white/5 border-white/10`).
- **Motion:** Framer Motion spring (stiffness 400, damping 32) for sheets, and 150 ms fades for overlays. `prefers-reduced-motion` is respected.
- **Primitives:** Button (variants: primary gradient, glass, ghost, danger), IconButton, Chip/TagChip, Avatar, Input, Textarea, Switch, Sheet (bottom sheet), Toast, Spinner, EmptyState.

## 5. Integrations and environment variables

| Variable | Where | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | web | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | web | Public anon key (safe in the browser; RLS protects data) |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions / CI only | **Never** in the frontend |
| `SUPABASE_DB_PASSWORD` | CI migrations | `supabase db push` |
| `MODERATION_API_KEY` (Phase 4) | Edge Functions | e.g. AWS Rekognition / Hive / Google SafeSearch |
| `TRANSCODE_API_KEY` (Phase 3) | Edge Functions | e.g. Mux / Cloudflare Stream |

## 6. Privacy and DPDP Act 2023 alignment (Phase 1 scope)

- **Purpose-specific consent** is collected at onboarding: `core_service` (required), `interest_discovery`, `personalisation`, `product_analytics` and `marketing`. Each purpose is a separate toggle with its own notice text. The ledger is append-only and can be withdrawn from Settings.
- **Data minimisation:** only birth *year* is stored (no full DOB) to derive the age band. There is no phone number, location or contacts data.
- **Children:** users aged 13–17 get private accounts, are not discoverable, receive messages from friends only, and are never shown to adults in discovery. The DPDP requirement for verifiable parental consent for under-18s is flagged as a launch blocker. The Phase 1 UI records a `parental_consent` purpose placeholder, and real verification must be integrated before production.
- **Rights:** Settings shows *Download my data* (a JSON export via RPC), *Correct* (edit profile) and *Delete account* (it queues a deletion request, which Phase 4 admin processes within the retention SLA).
- **Retention:** captures in the private gallery are kept until the user deletes them. Stories (Phase 2) are hard-deleted 24h after expiry by a scheduled job.

## 7. Phase 1 delivery checklist

- [x] Responsive app shell + bottom nav / desktop rail
- [x] Email auth (Supabase)
- [x] Onboarding: age gate, profile, interests (public/private per tag), granular consent
- [x] Camera: real `getUserMedia`, front/rear, torch where supported, permission/hardware error states, photo capture, short video recording, live filter preview, filter carousel + library sheet, preview/retake, save to private gallery, local drafts
- [x] Profiles + edit + gallery (signed URLs)
- [x] Tag discovery: categories, search, trending, create tag (pending), people sharing public tags
- [x] Settings: theme, low-data mode, discoverability, consent management
