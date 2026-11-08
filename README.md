# Sangam

Camera-first social app for India's Gen Z. Friend discovery uses **interest tags only**. Sangam never collects location or contacts.

- Architecture, schema, design system and env vars: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Frontend: `web/` (React 19, TypeScript, Vite, Tailwind v4, Framer Motion, React Router, TanStack Query)
- Backend: `supabase/` (Postgres migrations with RLS, SECURITY DEFINER RPCs, private storage buckets)

## Run locally

Requirements: Node 22+, Docker, [Supabase CLI](https://supabase.com/docs/guides/cli).

```bash
supabase start              # local Postgres/Auth/Storage; applies supabase/migrations
cd web
cp .env.example .env.local  # set VITE_SUPABASE_ANON_KEY to the publishable/anon key that `supabase status` prints
npm install
npm run dev
```

Camera access needs a secure context: `localhost` or HTTPS.

## Deploy to a hosted Supabase project

```bash
supabase link --project-ref <ref>
supabase db push
```

Then set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in your hosting provider. Also send the `Permissions-Policy: geolocation=()` header (see `web/vite.config.ts`). Never ship a service-role key to the frontend.

## Phase status

Phase 1 (foundation) is done. Phase 2 (friends, points, stories, chat) is next.
