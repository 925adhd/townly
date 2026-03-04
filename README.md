# Townly

A hyperlocal community platform for small towns — built to help neighbors discover local businesses, post lost & found, share events, and stay connected.

## Stack

- **React 19** + **TypeScript** — UI and type safety
- **Vite** — dev server and build
- **Tailwind CSS** — styling
- **Supabase** — auth, database, and file storage
- **React Router** — client-side routing (HashRouter)
- **Lucide React** — icons
- **Recharts** — analytics charts

## Features

- Business directory with search, category filters, and reviews
- Provider claim flow — owners can claim and manage their listing
- Lost & Found board
- Community events / Spotlights page
- Community alerts (admin-managed)
- Ask the Community (recommendations)
- Admin panel — manage providers, claims, reviews, and alerts
- Multi-tenant — supports multiple county/town deployments via `VITE_TENANT_ID`
- PWA-ready

## Run Locally

**Prerequisites:** Node.js 18+

1. Install dependencies:
   ```
   npm install
   ```
2. Copy `.env.example` to `.env.local` and fill in your Supabase project URL and anon key:
   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```
3. Run the app:
   ```
   npm run dev
   ```

## Multi-Tenancy

Tenant is resolved from the `VITE_TENANT_ID` env var, then subdomain, then defaults to `grayscounty`. Add new counties in `tenants.ts`.
