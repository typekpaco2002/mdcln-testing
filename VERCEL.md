# Deploying to Vercel

**.env is not deployed.** Vercel does not use a `.env` file in production. You must set all variables in the dashboard.

## Required: set environment variables

In **Vercel Dashboard** → your project → **Settings** → **Environment Variables**, add at least:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (e.g. Neon) |
| `JWT_SECRET` | Secret for signing JWTs |
| `NODE_ENV` | `production` |

Plus any others your app uses (Stripe, APIs, etc.). Without `DATABASE_URL` and `JWT_SECRET`, the server will exit on startup.

## Note on this stack

This app is a **long-running Node server** (Express + Vite dev or built frontend). Vercel is **serverless**. For a standard Vercel deployment:

- The server entry skips Replit-only steps (pid2) and DB sync (prisma db push) when `VERCEL=1` is set (Vercel sets this automatically).
- Run Prisma migrations (e.g. `prisma migrate deploy`) separately (e.g. in a build step or CI), not on every cold start.

For a persistent server with DB push at startup, consider **Replit**, **Railway**, **Render**, or **Fly.io** instead.
