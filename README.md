# Tridharaa Planning Hub

A collaborative planning web app built for **Tridharaa** — a Durga Puja committee — to manage ideas, track tasks, and coordinate across members leading up to Durga Puja 2026 (Oct 16–21).

## Purpose

Replace ad-hoc WhatsApp planning with a structured, shared workspace where committee members can submit ideas, get them approved, and convert them into tracked tasks — all in one place.

## Features

- Name-based login (localStorage session, no auth overhead)
- Live Durga Puja countdown on the home screen
- **Ideas board** — submit ideas with category tagging; status: `open → approved → task`
- **Task tracker** — tasks linked to approved ideas, assigned to members, progress: `todo → in-progress → done`
- **Dashboard** — central view of all ideas and tasks
- **Responsibilities** — role/responsibility mapping per member
- REST API routes (`/app/api/`) backed by Neon PostgreSQL

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router) |
| UI | React 19 |
| Language | TypeScript |
| Database | Neon PostgreSQL (serverless) |
| DB Client | `postgres` (node-postgres) |
| Styling | Inline styles + globals.css |

## Database Schema

```sql
ideas  (id, member_name, idea_text, category, status, created_at)
tasks  (id, idea_id, title, assigned_to, progress, created_at)
```

## Getting Started

```bash
npm install
# Set DATABASE_URL in .env.local (Neon connection string)
npm run dev        # http://localhost:4500
```

---

*Built by [Amrit Podder](https://amritpodder.dev) · Frontend Lead & Design Engineer*
