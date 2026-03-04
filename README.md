# CivicMetrics

CivicMetrics is a production-oriented multi-tenant civic dashboard SaaS starter for local governments.

## Stack

- Next.js (App Router)
- TypeScript
- TailwindCSS
- PostgreSQL + Prisma ORM
- NextAuth (credentials)

## Features in this V1 foundation

- Multi-tenant organization data model
- Role-based access: `ADMIN`, `EDITOR`, `VIEWER`
- Credentials authentication with password hashing
- Organization-aware sign-in (`organizationSlug` + email + password)
- Protected dashboard route group
- Role-based middleware guard for grants view (`EDITOR` and `ADMIN`)

## Project structure

- `src/app/(public)` public landing route
- `src/app/auth` auth pages
- `src/app/dashboard` protected dashboard pages
- `src/lib` auth, Prisma, and permission helpers
- `prisma/schema.prisma` data model

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables:

```bash
cp .env.example .env
```

3. Generate Prisma client:

```bash
npx prisma generate
```

4. Run initial migration:

```bash
npx prisma migrate dev --name init
```

5. Start development server:

```bash
npm run dev
```

## Notes

- Registration endpoint creates a new organization and its first `ADMIN` user.
- Dashboard pages currently use placeholder KPI and grant content for V1 layout.
- This baseline is ready for adding tenant-scoped business logic and data services in the next phase.

## Production Architecture

- Web App -> Vercel
- Workers -> Railway
- Database -> Postgres
- Queue -> Redis
