# Supabase Clinic App Setup

This version uses Supabase for shared live clinic data and avoids build-time Supabase fetching.

## Vercel Environment Variables

Add these in Vercel Project Settings > Environment Variables:

```text
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Only `NEXT_PUBLIC_` values are used because all data fetching happens in the browser after the page loads.

## Supabase Schema

Run this SQL once in Supabase SQL Editor:

```text
supabase/schema.sql
```

The schema creates:

- `clinic_users`
- `clients`
- `staff`
- `treatments`
- `appointments`
- simple shared access policies
- realtime publication entries

## Deploy To Vercel

1. Upload this folder to GitHub.
2. Import the project into Vercel.
3. Add the two Supabase environment variables above.
4. Deploy.

Vercel should run:

```bash
npm install
npm run build
```

## First Admin

Open the deployed app and create a user:

```text
Username: admin
Password: LTEadmin123
Admin creation code: 6871
```

Any account created without `6871` becomes Staff.

## Build-Time Safety

Supabase is not queried during static prerendering. `app/page.tsx` is marked dynamic and renders a client component. The client component loads Supabase data after the browser has mounted, which prevents Vercel failures during `Collecting page data...`.

## If You See A Client-Side Exception

The most common causes are:

- `NEXT_PUBLIC_SUPABASE_URL` is missing in the Production environment.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is missing in the Production environment.
- The Supabase SQL schema has not been run yet.
- The deployed app is still using an older Vercel build.

Redeploy after changing environment variables. Vercel only bakes `NEXT_PUBLIC_` variables into the browser bundle during build.
