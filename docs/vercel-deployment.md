# Vercel Deployment Guide

This repo is a good fit for Vercel:

- Next.js App Router app
- clean production build
- GitHub remote already set to `jcb79107/fairway-match`
- PostgreSQL via Prisma

## Recommended Hosting Shape

- App hosting: Vercel
- Database: managed Postgres connected through `DATABASE_URL`
- Source of truth: GitHub
- Custom domain: attached in Vercel, DNS managed either in Vercel or at your registrar

This is the fastest path to a live site on a purchased domain.

## Required Environment Variables

Set these in Vercel Project Settings -> Environment Variables:

- `DATABASE_URL`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `GOLF_COURSE_API_KEY` if you want course lookup

Suggested value for `NEXT_PUBLIC_APP_URL`:

- `https://www.yourdomain.com` if `www` is your canonical host
- `https://yourdomain.com` if apex is your canonical host

## Create the Vercel Project

1. In Vercel, create a new project from the GitHub repo `jcb79107/fairway-match`.
2. Let Vercel detect Next.js automatically.
3. Keep the repo root as the project root.
4. Deploy once to get the initial `.vercel.app` URL.

This repo includes [`vercel.json`](./../vercel.json), which forces Prisma Client generation before the Vercel build so schema changes do not get stuck behind cached dependencies.

## Create the Production Database

Use any managed PostgreSQL provider that gives you a standard Postgres connection string.

Two practical options:

- Prisma Postgres through the Vercel Marketplace
- Neon through the Vercel Marketplace

Once created, copy the production connection string into `DATABASE_URL` in Vercel.

## Initialize the Database Schema

This repo does not currently have a Prisma migrations folder, so the bootstrap path is `prisma db push`.

From your local machine, run against the production database:

```bash
cd /Users/jason/Developer/active/fairway-match
DATABASE_URL="your-production-connection-string" npx prisma db push
```

If you want to preload the tournament data for first launch, you can then run:

```bash
cd /Users/jason/Developer/active/fairway-match
DATABASE_URL="your-production-connection-string" npm run prisma:seed
```

Important:

- `npm run prisma:seed` clears and recreates tournament data
- only run it for first launch or an intentional reset
- do not run it on a live tournament database unless you mean to wipe it

## Add Your Domain

1. In Vercel, open the project and go to `Settings -> Domains`.
2. Add your apex domain, for example `yourdomain.com`.
3. Add `www.yourdomain.com` too.
4. Pick one canonical domain and redirect the other to it.

Vercel will show the exact DNS records required for your project. Commonly:

- apex domain uses an `A` record to `76.76.21.21`
- `www` uses a `CNAME` to `cname.vercel-dns-0.com`

Do not rely on those values blindly. Use the records Vercel shows for your project when you add the domain.

## Update Production URL

After the domain is connected, set:

```bash
NEXT_PUBLIC_APP_URL=https://www.yourdomain.com
```

Use your actual canonical host. Then redeploy so generated links use the real domain.

## Launch Checklist

1. Confirm the Vercel deployment loads.
2. Confirm `NEXT_PUBLIC_APP_URL` matches the final domain exactly.
3. Visit the homepage, standings, bracket, admin, invite links, and scorecard routes.
4. Confirm admin login works with the production password.
5. Confirm the database has the expected tournament data before sharing links.

## Preview Deployment Warning

Vercel preview deployments should not share the same writable production database if you are changing schema or test data. If you plan to use previews heavily, give Preview its own `DATABASE_URL`.
